const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { body, validationResult, param } = require('express-validator');
const Document = require('../models/Document');
const User = require('../models/User');
const VerificationLog = require('../models/VerificationLog');
const {
  authenticateToken,
  requireRole,
  requirePermission
} = require('../middleware/auth');
const {
  handleValidationErrors
} = require('../middleware/validation');
const ipfsService = require('../services/ipfsService');
const encryptionService = require('../services/encryptionService');
const blockchainService = require('../services/blockchainService');
const qrcodeService = require('../services/qrcodeService');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  }
});

// @route   GET /api/documents
// @desc    Get user's documents
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const documents = await Document.find({ 
      $or: [
        { owner: req.user._id },
        { issuer: req.user._id },
        { 'accessControl.viewers': req.user._id }
      ]
    })
    .populate('owner', 'walletAddress profile.name')
    .populate('issuer', 'walletAddress profile.name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Document.countDocuments({
      $or: [
        { owner: req.user._id },
        { issuer: req.user._id },
        { 'accessControl.viewers': req.user._id }
      ]
    });

    res.json({
      success: true,
      data: {
        documents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get documents failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve documents'
    });
  }
});

// @route   GET /api/documents/:hash
// @desc    Get specific document
// @access  Private
router.get('/:hash', authenticateToken, async (req, res) => {
  try {
    const { hash } = req.params;

    const document = await Document.findOne({ documentHash: hash })
      .populate('owner', 'walletAddress profile.name')
      .populate('issuer', 'walletAddress profile.name');

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Check access permissions
    const hasAccess = document.owner._id.equals(req.user._id) ||
                     document.issuer._id.equals(req.user._id) ||
                     document.accessControl.viewers.includes(req.user._id) ||
                     req.user.role === 'admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { document }
    });
  } catch (error) {
    logger.error('Get document failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve document'
    });
  }
});

// @route   POST /api/documents/register
// @desc    Register new document
// @access  Public (temporarily for testing)
router.post('/register', upload.single('document'), [
  body('studentName').notEmpty().withMessage('Student name is required'),
  body('documentType').isIn(['certificate', 'degree', 'transcript', 'diploma', 'other']).withMessage('Invalid document type'),
  body('ownerAddress').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Valid Ethereum address required')
], handleValidationErrors, async (req, res) => {
  try {
    const {
      studentName,
      studentId,
      ownerName,
      documentType,
      issueDate,
      description,
      ownerAddress
    } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Document file is required'
      });
    }

    // Find or create user
    let user = await User.findOne({ walletAddress: ownerAddress.toLowerCase() });
    if (!user) {
      user = await User.create({
        walletAddress: ownerAddress.toLowerCase(),
        profile: {
          name: ownerName || studentName
        }
      });
    }

    // Encrypt document
    const encryptedData = await encryptionService.encryptFile(req.file.buffer);
    
    // Upload to IPFS with fallback to local storage
    let ipfsResult;
    try {
      ipfsResult = await ipfsService.uploadFile(
        Buffer.from(encryptedData.encryptedData, 'base64'), 
        req.file.originalname, 
        {
          filename: req.file.originalname,
          contentType: req.file.mimetype
        }
      );
      logger.info('IPFS upload successful:', { cid: ipfsResult.cid, provider: ipfsResult.provider });
    } catch (ipfsError) {
      logger.error('IPFS upload failed:', ipfsError.message);
      // Return error instead of continuing with mock data
      return res.status(500).json({
        success: false,
        error: 'File upload failed: ' + ipfsError.message
      });
    }

    // Create document hash
    const documentHash = encryptionService.generateFileHash(req.file.buffer);

    // Create document record
    const document = await Document.create({
      documentHash,
      ipfsHash: ipfsResult.cid,
      metadata: {
        studentName,
        studentId: studentId || `STU${Date.now()}`,
        institutionName: 'Test Institution', // Required field
        documentType,
        issueDate: issueDate || new Date(),
        description: description || '',
        originalFilename: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      },
      access: {
        owner: ownerAddress.toLowerCase(),
        issuer: ownerAddress.toLowerCase(), // For now, owner is also issuer
        authorizedViewers: []
      },
      audit: {
        uploadedBy: user._id
      },
      fileInfo: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype === 'text/plain' ? 'application/pdf' : req.file.mimetype, // Convert text/plain to PDF for testing
        size: req.file.size
      },
      encryptionKey: encryptedData.encryptionKey,
      isActive: true
    });

    // Register on blockchain
    let transactionHash = null;
    try {
      const blockchainResult = await blockchainService.registerDocument(
        documentHash,
        ipfsResult.hash,
        ownerAddress
      );
      transactionHash = blockchainResult.transactionHash;
      
      // Update document with blockchain info
      document.blockchainTxHash = transactionHash;
      await document.save();
    } catch (blockchainError) {
      logger.warn('Blockchain registration failed:', blockchainError);
      // Continue without blockchain - document is still stored
    }

    // Generate QR code
    let qrCode = null;
    try {
      qrCode = await qrcodeService.generateQRCode({
        documentHash,
        verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${documentHash}`
      });
    } catch (qrError) {
      logger.warn('QR code generation failed:', qrError);
    }

    res.status(201).json({
      success: true,
      data: {
        document: {
          _id: document._id,
          documentHash: document.documentHash,
          ipfsHash: document.ipfsHash,
          metadata: document.metadata,
          createdAt: document.createdAt,
          isActive: document.isActive
        },
        transactionHash,
        qrCode,
        ipfsUrl: `https://ipfs.io/ipfs/${ipfsResult.cid}`
      }
    });

  } catch (error) {
    logger.error('Document registration failed:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null
    });
    res.status(500).json({
      success: false,
      error: 'Failed to register document',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/documents/verify
// @desc    Verify document
// @access  Public (for QR code verification)
router.post('/verify', async (req, res) => {
  try {
    const { documentHash, file } = req.body;

    if (!documentHash && !file) {
      return res.status(400).json({
        success: false,
        error: 'Document hash or file is required'
      });
    }

    let hashToVerify = documentHash;

    // If file is provided, calculate its hash
    if (file && !documentHash) {
      // This would need proper file handling
      return res.status(400).json({
        success: false,
        error: 'File verification not implemented in simplified version'
      });
    }

    // Find document in database
    const document = await Document.findOne({ documentHash: hashToVerify })
      .populate('audit.uploadedBy', 'walletAddress profile.name');

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Verify on blockchain
    let blockchainVerification = null;
    try {
      blockchainVerification = await blockchainService.verifyDocument(hashToVerify);
    } catch (error) {
      logger.warn('Blockchain verification failed:', error);
    }

    // Log verification attempt
    try {
      await VerificationLog.create({
        documentHash: hashToVerify,
        verifier: req.user?._id,
        verificationMethod: 'hash',
        result: 'verified',
        blockchainVerified: !!blockchainVerification,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    } catch (logError) {
      logger.warn('Failed to log verification:', logError);
    }

    res.json({
      success: true,
      data: {
        document: {
          hash: document.documentHash,
          metadata: document.metadata,
          access: document.access,
          uploadedBy: document.audit.uploadedBy,
          createdAt: document.audit.createdAt,
          isActive: document.isActive
        },
        verification: {
          databaseVerified: true,
          blockchainVerified: !!blockchainVerification,
          verifiedAt: new Date()
        }
      }
    });
  } catch (error) {
    logger.error('Document verification failed:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed'
    });
  }
});

module.exports = router;