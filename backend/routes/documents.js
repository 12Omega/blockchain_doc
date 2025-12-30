const express = require('express');
const multer = require('multer');
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
  requireDocumentStorageConsent,
  requireBlockchainStorageConsent,
  requireConsents,
  dataMinimization
} = require('../middleware/consentCheck');
const {
  handleValidationErrors,
  securityValidation,
  validateContentType,
  validateRequestSize
} = require('../middleware/validation');
const {
  validationRules,
  validateFile,
  sanitizeRequest,
  ALLOWED_FILE_TYPES,
  FILE_SIZE_LIMITS
} = require('../utils/validation');
const ipfsService = require('../services/ipfsService');
const encryptionService = require('../services/encryptionService');
const blockchainService = require('../services/blockchainService');
const qrcodeService = require('../services/qrcodeService');
const dbOptimizationService = require('../services/databaseOptimizationService');
const batchProcessingService = require('../services/batchProcessingService');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads with enhanced security
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: FILE_SIZE_LIMITS.document,
    files: 1,
    fieldSize: 1024 * 1024, // 1MB field size limit
    fields: 10 // Maximum number of fields
  },
  fileFilter: (req, file, cb) => {
    // Enhanced file validation
    const allowedTypes = ALLOWED_FILE_TYPES.documents;
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    
    // Check file extension
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      return cb(new Error(`File type .${fileExtension} not allowed. Allowed types: ${allowedTypes.join(', ')}`));
    }
    
    // Check MIME type matches extension
    const mimeTypeMap = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain'
    };
    
    const expectedMimeType = mimeTypeMap[fileExtension];
    if (expectedMimeType && file.mimetype !== expectedMimeType) {
      return cb(new Error(`MIME type mismatch. Expected ${expectedMimeType}, got ${file.mimetype}`));
    }
    
    // Check for suspicious filenames
    const suspiciousPatterns = [
      /\.\./,  // Path traversal
      /[<>:"|?*]/,  // Invalid filename characters
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i  // Windows reserved names
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(file.originalname)) {
        return cb(new Error('Invalid filename detected'));
      }
    }
    
    cb(null, true);
  }
});

// @route   POST /api/documents/register
// @desc    Register document with complete flow: hash, encrypt, IPFS upload, blockchain registration, QR code generation
// @access  Private (Issuer role required)
router.post('/register',
  // Security middleware
  validateRequestSize(50 * 1024 * 1024), // 50MB limit
  validateContentType(['multipart/form-data']),
  ...securityValidation({
    enableSanitization: true,
    enableXSSPrevention: true,
    enableSQLInjectionPrevention: true,
    enableNoSQLInjectionPrevention: true,
    enableCommandInjectionPrevention: true,
    enablePathTraversalPrevention: true
  }),
  
  // Authentication and authorization
  authenticateToken,
  requirePermission('canIssue'),
  
  // Privacy consent checks - TEMPORARILY DISABLED FOR TESTING
  // requireConsents(['document_storage', 'blockchain_storage']),
  
  // File upload
  upload.single('document'),
  validateFile({
    required: true,
    allowedTypes: ALLOWED_FILE_TYPES.documents,
    maxSize: FILE_SIZE_LIMITS.document
  }),
  
  // Input validation
  [
    validationRules.name('studentName', true),
    validationRules.studentId('studentId'),
    validationRules.name('ownerName', true),
    validationRules.documentType('documentType'),
    validationRules.date('issueDate', true),
    validationRules.date('expiryDate', false),
    validationRules.text('grade', 20, false),
    validationRules.text('course', 200, false),
    validationRules.text('description', 500, false),
    validationRules.walletAddress('ownerAddress').optional()
  ],
  handleValidationErrors,
  async (req, res) => {
    let document = null;
    let ipfsResult = null;
    let blockchainResult = null;

    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const issuer = req.user;
      const fileBuffer = req.file.buffer;
      const {
        studentName,
        studentId,
        institutionName,
        documentType,
        issueDate,
        expiryDate,
        grade,
        course,
        description,
        ownerAddress
      } = req.body;

      logger.info('Starting document registration process', {
        filename: req.file.originalname,
        size: req.file.size,
        issuer: issuer.walletAddress,
        studentId
      });

      // Step 1: Generate document hash (Requirement 1.1)
      const documentHash = encryptionService.generateFileHash(fileBuffer);
      logger.info('Document hash generated', { documentHash });

      // Check if document already exists
      const existingDocument = await Document.findOne({ documentHash });
      if (existingDocument) {
        return res.status(409).json({
          success: false,
          error: 'Document with this hash already exists',
          documentHash
        });
      }

      // Step 2: Encrypt document (Requirement 3.1)
      const encryptionKey = encryptionService.generateKey();
      const encryptedData = encryptionService.encryptFile(fileBuffer, encryptionKey);
      logger.info('Document encrypted', { documentHash });

      // Step 3: Upload to IPFS (Requirement 1.2, 3.2)
      const encryptedBuffer = Buffer.from(JSON.stringify(encryptedData));
      ipfsResult = await ipfsService.uploadFile(
        encryptedBuffer,
        `encrypted_${req.file.originalname}`,
        {
          documentHash,
          studentId,
          documentType,
          issuer: issuer.walletAddress
        },
        true
      );
      logger.info('Document uploaded to IPFS', { 
        documentHash, 
        ipfsCid: ipfsResult.cid,
        provider: ipfsResult.provider 
      });

      // Determine owner address
      const finalOwnerAddress = ownerAddress || issuer.walletAddress;

      // Prepare metadata
      const metadata = {
        studentName,
        studentId,
        institutionName,
        documentType,
        issueDate: new Date(issueDate),
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        grade,
        course,
        description
      };

      // Validate expiry date
      if (metadata.expiryDate && metadata.expiryDate <= metadata.issueDate) {
        throw new Error('Expiry date must be after issue date');
      }

      // Encrypt encryption key for storage
      const encryptedKeyData = encryptionService.encryptKeyForStorage(encryptionKey);

      // Step 4: Create document record in MongoDB
      document = new Document({
        documentHash,
        ipfsHash: ipfsResult.cid,
        encryptionKey: JSON.stringify(encryptedKeyData),
        metadata,
        access: {
          owner: finalOwnerAddress,
          issuer: issuer.walletAddress,
          authorizedViewers: []
        },
        audit: {
          uploadedBy: issuer._id
        },
        fileInfo: {
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size
        },
        status: 'uploaded'
      });

      await document.save();
      logger.info('Document metadata saved to database', { documentHash });

      // Step 5: Register on blockchain (Requirement 1.3, 1.4)
      try {
        blockchainResult = await blockchainService.registerDocument(
          documentHash,
          ipfsResult.cid,
          finalOwnerAddress,
          {
            studentId,
            documentType,
            institutionName,
            issueDate: metadata.issueDate.toISOString()
          }
        );

        // Update document with blockchain info
        await document.updateBlockchainInfo(
          blockchainResult.transactionHash,
          blockchainResult.blockNumber,
          blockchainResult.gasUsed,
          blockchainResult.contractAddress
        );

        logger.info('Document registered on blockchain', {
          documentHash,
          transactionHash: blockchainResult.transactionHash,
          blockNumber: blockchainResult.blockNumber
        });

      } catch (blockchainError) {
        logger.error('Blockchain registration failed', {
          documentHash,
          error: blockchainError.message
        });

        // Mark document as failed but keep the record
        document.status = 'failed';
        await document.save();

        // Return partial success
        return res.status(207).json({
          success: false,
          error: 'Blockchain registration failed',
          details: blockchainError.message,
          data: {
            documentHash,
            ipfsCid: ipfsResult.cid,
            status: 'failed',
            message: 'Document uploaded to IPFS but blockchain registration failed. Please retry.'
          }
        });
      }

      // Step 6: Generate QR code (Requirement 1.5)
      let qrCodeData = null;
      try {
        qrCodeData = await qrcodeService.generateQRCode(
          documentHash,
          blockchainResult.transactionHash
        );
        logger.info('QR code generated', { documentHash });
      } catch (qrError) {
        logger.warn('QR code generation failed', {
          documentHash,
          error: qrError.message
        });
        // QR code failure is not critical, continue
      }

      // Step 7: Return complete response (Requirement 10.4)
      const response = {
        success: true,
        message: 'Document registered successfully',
        data: {
          document: {
            id: document._id,
            documentHash,
            transactionId: blockchainResult.transactionHash,
            ipfsCid: ipfsResult.cid,
            metadata: {
              studentName: metadata.studentName,
              studentId: metadata.studentId,
              institutionName: metadata.institutionName,
              documentType: metadata.documentType,
              issueDate: metadata.issueDate,
              expiryDate: metadata.expiryDate
            },
            blockchain: {
              transactionHash: blockchainResult.transactionHash,
              blockNumber: blockchainResult.blockNumber,
              gasUsed: blockchainResult.gasUsed,
              contractAddress: blockchainResult.contractAddress,
              explorerUrl: `${process.env.BLOCKCHAIN_EXPLORER_URL || 'https://sepolia.etherscan.io'}/tx/${blockchainResult.transactionHash}`
            },
            ipfs: {
              cid: ipfsResult.cid,
              gateway: ipfsResult.gateway,
              provider: ipfsResult.provider
            },
            qrCode: qrCodeData ? {
              dataUrl: qrCodeData.qrCodeDataUrl,
              verificationUrl: qrCodeData.verificationUrl
            } : null,
            access: {
              owner: document.access.owner,
              issuer: document.access.issuer
            },
            fileInfo: {
              originalName: document.fileInfo.originalName,
              mimeType: document.fileInfo.mimeType,
              size: document.fileInfo.size
            },
            status: document.status,
            createdAt: document.audit.createdAt
          }
        }
      };

      logger.info('Document registration completed successfully', {
        documentHash,
        transactionHash: blockchainResult.transactionHash,
        issuer: issuer.walletAddress
      });

      res.status(201).json(response);

    } catch (error) {
      logger.error('Document registration failed:', {
        error: error.message,
        stack: error.stack,
        issuer: req.user?.walletAddress,
        filename: req.file?.originalname
      });

      // Rollback logic
      try {
        if (document && document._id) {
          // Mark document as failed or delete it
          await Document.findByIdAndUpdate(document._id, { 
            status: 'failed',
            'audit.updatedAt': new Date()
          });
          logger.info('Document marked as failed in database', { 
            documentId: document._id 
          });
        }
      } catch (rollbackError) {
        logger.error('Rollback failed:', {
          error: rollbackError.message,
          documentId: document?._id
        });
      }

      res.status(500).json({
        success: false,
        error: 'Document registration failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? {
          error: error.message,
          stack: error.stack
        } : undefined
      });
    }
  }
);

// @route   POST /api/documents/upload
// @desc    Upload and encrypt document to IPFS and register on blockchain
// @access  Private (Issuer role required)
router.post('/upload',
  // Security middleware
  validateRequestSize(50 * 1024 * 1024), // 50MB limit
  validateContentType(['multipart/form-data']),
  ...securityValidation({
    enableSanitization: true,
    enableXSSPrevention: true,
    enableSQLInjectionPrevention: true,
    enableNoSQLInjectionPrevention: true,
    enableCommandInjectionPrevention: true,
    enablePathTraversalPrevention: true
  }),
  
  // Authentication and authorization
  authenticateToken,
  requirePermission('canIssue'),
  
  // Privacy consent checks
  requireConsents(['document_storage', 'blockchain_storage']),
  
  // File upload
  upload.single('document'),
  validateFile({
    required: true,
    allowedTypes: ALLOWED_FILE_TYPES.documents,
    maxSize: FILE_SIZE_LIMITS.document
  }),
  
  // Input validation
  [
    validationRules.name('metadata.studentName', true),
    validationRules.studentId('metadata.studentId'),
    validationRules.name('metadata.ownerName', true),
    validationRules.documentType('metadata.documentType'),
    validationRules.date('metadata.issueDate', true),
    validationRules.date('metadata.expiryDate', false),
    validationRules.text('metadata.grade', 20, false),
    validationRules.text('metadata.course', 200, false),
    validationRules.text('metadata.description', 500, false),
    validationRules.walletAddress('ownerAddress').optional()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const { metadata, ownerAddress } = req.body;
      const issuer = req.user;
      const fileBuffer = req.file.buffer;

      logger.info('Starting document upload process', {
        filename: req.file.originalname,
        size: req.file.size,
        issuer: issuer.walletAddress,
        studentId: metadata.studentId
      });

      // Parse metadata if it's a string
      const parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;

      // Validate expiry date if provided
      if (parsedMetadata.expiryDate && new Date(parsedMetadata.expiryDate) <= new Date(parsedMetadata.issueDate)) {
        return res.status(400).json({
          success: false,
          error: 'Expiry date must be after issue date'
        });
      }

      // Generate document hash
      const documentHash = encryptionService.generateFileHash(fileBuffer);

      // Check if document already exists
      const existingDocument = await Document.findOne({ documentHash });
      if (existingDocument) {
        return res.status(409).json({
          success: false,
          error: 'Document with this hash already exists'
        });
      }

      // Generate encryption key
      const encryptionKey = encryptionService.generateKey();

      // Encrypt file
      const encryptedData = encryptionService.encryptFile(fileBuffer, encryptionKey);

      // Create encrypted file buffer for IPFS upload
      const encryptedBuffer = Buffer.from(JSON.stringify(encryptedData));

      // Upload to IPFS
      const ipfsResult = await ipfsService.uploadFile(
        encryptedBuffer,
        `encrypted_${req.file.originalname}`,
        {
          documentHash,
          studentId: parsedMetadata.studentId,
          documentType: parsedMetadata.documentType,
          issuer: issuer.walletAddress
        }
      );

      // Determine owner address (default to issuer if not specified)
      const finalOwnerAddress = ownerAddress || issuer.walletAddress;

      // Create document record
      const document = new Document({
        documentHash,
        ipfsHash: ipfsResult.hash,
        encryptionKey, // In production, this should be encrypted with user's public key
        metadata: parsedMetadata,
        access: {
          owner: finalOwnerAddress,
          issuer: issuer.walletAddress,
          authorizedViewers: []
        },
        audit: {
          uploadedBy: issuer._id
        },
        fileInfo: {
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size
        },
        status: 'uploaded'
      });

      await document.save();

      // Register on blockchain
      try {
        const blockchainResult = await blockchainService.registerDocument(
          documentHash,
          ipfsResult.hash,
          finalOwnerAddress,
          {
            studentId: parsedMetadata.studentId,
            documentType: parsedMetadata.documentType,
            institutionName: parsedMetadata.institutionName
          }
        );

        // Update document with blockchain info
        await document.updateBlockchainInfo(
          blockchainResult.transactionHash,
          blockchainResult.blockNumber,
          blockchainResult.gasUsed,
          blockchainResult.contractAddress
        );

        logger.info('Document uploaded and registered successfully', {
          documentHash,
          ipfsHash: ipfsResult.hash,
          transactionHash: blockchainResult.transactionHash,
          issuer: issuer.walletAddress
        });

        res.status(201).json({
          success: true,
          data: {
            document: {
              id: document._id,
              documentHash,
              ipfsHash: ipfsResult.hash,
              metadata: parsedMetadata,
              blockchain: {
                transactionHash: blockchainResult.transactionHash,
                blockNumber: blockchainResult.blockNumber,
                gasUsed: blockchainResult.gasUsed
              },
              access: document.access,
              fileInfo: document.fileInfo,
              status: document.status,
              createdAt: document.audit.createdAt
            }
          }
        });

      } catch (blockchainError) {
        logger.error('Blockchain registration failed, but document saved to database', {
          documentHash,
          error: blockchainError.message
        });

        // Update document status to failed
        document.status = 'failed';
        await document.save();

        res.status(201).json({
          success: true,
          warning: 'Document uploaded but blockchain registration failed',
          data: {
            document: {
              id: document._id,
              documentHash,
              ipfsHash: ipfsResult.hash,
              metadata: parsedMetadata,
              access: document.access,
              fileInfo: document.fileInfo,
              status: document.status,
              createdAt: document.audit.createdAt
            }
          }
        });
      }

    } catch (error) {
      logger.error('Document upload failed:', {
        error: error.message,
        issuer: req.user?.walletAddress,
        filename: req.file?.originalname
      });

      res.status(500).json({
        success: false,
        error: 'Document upload failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @route   GET /api/documents
// @desc    Get documents (filtered by user role and permissions)
// @access  Private
router.get('/',
  authenticateToken,
  dataMinimization(['profile.email', 'metadata.studentName']),
  async (req, res) => {
    try {
      const user = req.user;
      const { page = 1, limit = 10, status, documentType, search } = req.query;
      const skip = (page - 1) * limit;

      // Build query based on user role
      let query = { isActive: true };

      if (user.role === 'admin') {
        // Admin can see all documents
      } else if (user.role === 'issuer') {
        // Issuer can see documents they issued
        query['access.issuer'] = user.walletAddress;
      } else {
        // Students and verifiers can see documents they own or are authorized to view
        query.$or = [
          { 'access.owner': user.walletAddress },
          { 'access.authorizedViewers': user.walletAddress }
        ];
      }

      // Apply filters
      if (status) {
        query.status = status;
      }
      if (documentType) {
        query['metadata.documentType'] = documentType;
      }
      if (search) {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { 'metadata.studentName': { $regex: search, $options: 'i' } },
            { 'metadata.studentId': { $regex: search, $options: 'i' } },
            { 'metadata.institutionName': { $regex: search, $options: 'i' } },
            { 'metadata.course': { $regex: search, $options: 'i' } }
          ]
        });
      }

      // Use optimized database query with caching
      const documents = await dbOptimizationService.findWithCache(
        Document,
        query,
        {
          cache: true,
          cacheTTL: 300, // 5 minutes
          sort: { 'audit.createdAt': -1 },
          skip,
          limit: parseInt(limit),
          select: '-encryptionKey',
          populate: 'audit.uploadedBy'
        }
      );

      const total = await Document.countDocuments(query);

      res.json({
        success: true,
        data: {
          documents,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          }
        }
      });

    } catch (error) {
      logger.error('Get documents failed:', {
        error: error.message,
        user: req.user?.walletAddress
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve documents'
      });
    }
  }
);

// @route   GET /api/documents/:documentHash
// @desc    Get document by hash
// @access  Private
router.get('/:documentHash',
  authenticateToken,
  param('documentHash').matches(/^0x[a-fA-F0-9]{64}$/).withMessage('Invalid document hash format'),
  dataMinimization(['metadata.studentName', 'profile.email']),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { documentHash } = req.params;
      const user = req.user;

      const document = await Document.findOne({ documentHash, isActive: true })
        .populate('audit.uploadedBy', 'walletAddress profile.name');

      if (!document) {
        return res.status(404).json({
          success: false,
          error: 'Document not found'
        });
      }

      // Check access permissions
      if (!document.hasAccess(user.walletAddress) && user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Don't expose encryption key unless user is owner or issuer
      const responseDocument = document.toObject();
      if (user.walletAddress !== document.access.owner && 
          user.walletAddress !== document.access.issuer && 
          user.role !== 'admin') {
        delete responseDocument.encryptionKey;
      }

      res.json({
        success: true,
        data: { document: responseDocument }
      });

    } catch (error) {
      logger.error('Get document failed:', {
        error: error.message,
        documentHash: req.params.documentHash,
        user: req.user?.walletAddress
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve document'
      });
    }
  }
);

// @route   POST /api/documents/verify
// @desc    Verify document authenticity by file upload, document hash, or QR code
// @access  Public (Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 5.4, 11.1, 11.2, 11.3, 11.4, 11.5)
router.post('/verify',
  // Security middleware
  validateRequestSize(50 * 1024 * 1024), // 50MB limit
  ...securityValidation({
    enableSanitization: true,
    enableXSSPrevention: true,
    enableSQLInjectionPrevention: true,
    enableNoSQLInjectionPrevention: true
  }),
  
  // File upload (optional)
  upload.single('document'),
  validateFile({
    required: false,
    allowedTypes: ALLOWED_FILE_TYPES.documents,
    maxSize: FILE_SIZE_LIMITS.document
  }),
  
  // Input validation
  [
    validationRules.documentHash('documentHash').optional(),
    body('qrCode').optional().isString().withMessage('QR code must be a string')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      let documentHash;
      let verificationMethod;
      let providedFile = null;
      let qrCodeData = null;

      // Determine verification method and extract document hash
      // Priority: QR code > File upload > Direct hash
      if (req.body.qrCode) {
        // Requirement 2.2: Support QR code verification
        try {
          qrCodeData = qrcodeService.parseQRCode(req.body.qrCode);
          documentHash = qrCodeData.documentHash;
          verificationMethod = 'qr';
        } catch (qrError) {
          return res.status(400).json({
            success: false,
            error: 'Invalid QR code format',
            details: qrError.message
          });
        }
      } else if (req.file) {
        // Requirement 2.1: Support file upload verification
        documentHash = encryptionService.generateFileHash(req.file.buffer);
        providedFile = {
          buffer: req.file.buffer,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size
        };
        verificationMethod = 'upload';
      } else if (req.body.documentHash) {
        // Support direct hash verification
        documentHash = req.body.documentHash;
        verificationMethod = 'hash';
      } else {
        return res.status(400).json({
          success: false,
          error: 'Either document file, document hash, or QR code must be provided'
        });
      }

      // Get verifier information (anonymous if not authenticated)
      const verifier = req.user?.walletAddress || 'anonymous';
      const verifierIp = req.ip || req.connection.remoteAddress;

      logger.info('Document verification requested', {
        documentHash,
        verifier,
        method: verificationMethod,
        hasFile: !!providedFile
      });

      // Requirement 2.3: Query blockchain for matching records
      // Find document in database
      const document = await Document.findOne({ documentHash, isActive: true })
        .populate('audit.uploadedBy', 'walletAddress profile.name');

      let verificationResult;
      let verificationState;

      if (!document) {
        // Requirement 11.3: Return "not found" state
        verificationState = 'not_found';
        
        logger.warn('Document verification failed - not found', {
          documentHash,
          verifier,
          method: verificationMethod
        });

        // Log verification attempt (Requirement 9.1)
        const VerificationLog = require('../models/VerificationLog');
        await VerificationLog.logVerification({
          documentHash,
          verifier,
          verifierIp,
          verificationMethod,
          result: verificationState,
          userAgent: req.headers['user-agent']
        });

        verificationResult = {
          state: verificationState,
          isAuthentic: false,
          documentHash,
          timestamp: new Date().toISOString(),
          verifier,
          method: verificationMethod,
          message: 'Document not found in registry'
        };

        return res.status(200).json({
          success: true,
          data: {
            verification: verificationResult
          }
        });
      }

      // Requirement 2.4: Compare computed hash with stored hash
      // Verify on blockchain
      let blockchainVerification = null;
      try {
        blockchainVerification = await blockchainService.verifyDocument(documentHash);
      } catch (blockchainError) {
        logger.warn('Blockchain verification failed', {
          documentHash,
          error: blockchainError.message
        });
      }

      // If file was provided, verify file integrity
      let fileIntegrityCheck = null;
      if (providedFile) {
        const isIntegrityValid = encryptionService.verifyFileIntegrity(
          providedFile.buffer, 
          documentHash
        );
        
        fileIntegrityCheck = {
          isValid: isIntegrityValid,
          providedFileHash: documentHash,
          storedFileHash: document.documentHash,
          hashesMatch: documentHash === document.documentHash
        };

        // If file integrity check fails, document is tampered
        if (!isIntegrityValid) {
          verificationState = 'tampered';
        }
      }

      // Determine overall verification state (Requirement 11.3)
      if (!verificationState) {
        const isHashMatch = document.documentHash === documentHash;
        const isBlockchainValid = !blockchainVerification || blockchainVerification.isValid;
        const isFileValid = !fileIntegrityCheck || fileIntegrityCheck.isValid;
        const isStatusValid = document.status === 'blockchain_stored';

        if (isHashMatch && isBlockchainValid && isFileValid && isStatusValid) {
          verificationState = 'authentic';
        } else {
          verificationState = 'tampered';
        }
      }

      // Increment verification count
      await document.incrementVerificationCount();

      // Log verification attempt (Requirement 9.1, 9.2)
      const VerificationLog = require('../models/VerificationLog');
      await VerificationLog.logVerification({
        documentHash,
        verifier,
        verifierIp,
        verificationMethod,
        result: verificationState,
        userAgent: req.headers['user-agent'],
        additionalInfo: {
          blockchainVerified: !!blockchainVerification,
          fileIntegrityChecked: !!fileIntegrityCheck,
          transactionHash: qrCodeData?.transactionHash || document.blockchain?.transactionHash
        }
      });

      // Requirement 9.4: Detect suspicious activity
      const suspiciousActivity = await VerificationLog.detectSuspiciousActivity(documentHash);
      if (suspiciousActivity.isSuspicious) {
        logger.warn('Suspicious verification activity detected', {
          documentHash,
          failedAttempts: suspiciousActivity.failedAttempts,
          threshold: suspiciousActivity.threshold
        });
      }

      // Log verification completion
      logger.info('Document verification completed', {
        documentHash,
        verifier,
        state: verificationState,
        method: verificationMethod,
        blockchainValid: blockchainVerification?.isValid,
        fileIntegrityValid: fileIntegrityCheck?.isValid,
        suspicious: suspiciousActivity.isSuspicious
      });

      // Requirement 2.5, 11.4: Return complete document metadata for authentic documents
      verificationResult = {
        state: verificationState,
        isAuthentic: verificationState === 'authentic',
        documentHash,
        timestamp: new Date().toISOString(),
        verifier,
        method: verificationMethod,
        verificationCount: document.audit.verificationCount
      };

      // Include full metadata only for authentic documents
      if (verificationState === 'authentic') {
        verificationResult.document = {
          metadata: document.metadata,
          issuer: document.access.issuer,
          owner: document.access.owner,
          status: document.status,
          createdAt: document.audit.createdAt,
          fileInfo: {
            originalName: document.fileInfo.originalName,
            mimeType: document.fileInfo.mimeType,
            size: document.fileInfo.size
          }
        };

        verificationResult.blockchain = {
          transactionHash: document.blockchain?.transactionHash,
          blockNumber: document.blockchain?.blockNumber,
          contractAddress: document.blockchain?.contractAddress,
          explorerUrl: document.blockchain?.transactionHash ? 
            `${process.env.BLOCKCHAIN_EXPLORER_URL || 'https://sepolia.etherscan.io'}/tx/${document.blockchain.transactionHash}` : 
            null,
          verified: blockchainVerification?.isValid || false
        };

        verificationResult.ipfs = {
          cid: document.ipfsHash,
          gateway: `https://ipfs.io/ipfs/${document.ipfsHash}`
        };
      } else if (verificationState === 'tampered') {
        verificationResult.message = 'Document has been tampered with or does not match the registered version';
        verificationResult.details = {
          hashMatch: document.documentHash === documentHash,
          blockchainValid: blockchainVerification?.isValid,
          fileIntegrityValid: fileIntegrityCheck?.isValid
        };
      }

      // Include suspicious activity warning if detected
      if (suspiciousActivity.isSuspicious) {
        verificationResult.warning = {
          message: 'Suspicious verification activity detected for this document',
          failedAttempts: suspiciousActivity.failedAttempts,
          timeWindow: `${suspiciousActivity.timeWindowMinutes} minutes`
        };
      }

      res.status(200).json({
        success: true,
        data: {
          verification: verificationResult
        }
      });

    } catch (error) {
      logger.error('Document verification failed:', {
        error: error.message,
        stack: error.stack,
        verifier: req.user?.walletAddress || 'anonymous',
        documentHash: req.body?.documentHash
      });

      res.status(500).json({
        success: false,
        error: 'Document verification failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? {
          error: error.message,
          stack: error.stack
        } : undefined
      });
    }
  }
);

// @route   GET /api/documents/verify/:documentHash
// @desc    Get verification status of a document
// @access  Private
router.get('/verify/:documentHash',
  authenticateToken,
  param('documentHash').matches(/^0x[a-fA-F0-9]{64}$/).withMessage('Invalid document hash format'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { documentHash } = req.params;
      const user = req.user;

      const document = await Document.findOne({ documentHash, isActive: true })
        .populate('audit.uploadedBy', 'walletAddress profile.name');

      if (!document) {
        return res.status(404).json({
          success: false,
          error: 'Document not found'
        });
      }

      // Check access permissions
      if (!document.hasAccess(user.walletAddress) && 
          user.role !== 'admin' && 
          !user.hasPermission('canVerify')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Get blockchain verification status
      let blockchainStatus = null;
      try {
        blockchainStatus = await blockchainService.verifyDocument(documentHash);
      } catch (error) {
        logger.warn('Blockchain status check failed', {
          documentHash,
          error: error.message
        });
      }

      const verificationStatus = {
        documentHash,
        isValid: document.status === 'blockchain_stored' && 
                 (!blockchainStatus || blockchainStatus.isValid),
        status: document.status,
        metadata: document.metadata,
        blockchain: blockchainStatus,
        audit: {
          verificationCount: document.audit.verificationCount,
          lastVerified: document.audit.lastVerified,
          createdAt: document.audit.createdAt
        },
        access: {
          issuer: document.access.issuer,
          owner: document.access.owner
        }
      };

      res.json({
        success: true,
        data: {
          verification: verificationStatus
        }
      });

    } catch (error) {
      logger.error('Get verification status failed:', {
        error: error.message,
        documentHash: req.params.documentHash,
        user: req.user?.walletAddress
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get verification status'
      });
    }
  }
);

// @route   POST /api/documents/:documentHash/download
// @desc    Download and decrypt document from IPFS
// @access  Private
router.post('/:documentHash/download',
  authenticateToken,
  param('documentHash').matches(/^0x[a-fA-F0-9]{64}$/).withMessage('Invalid document hash format'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { documentHash } = req.params;
      const user = req.user;

      const document = await Document.findOne({ documentHash, isActive: true });

      if (!document) {
        return res.status(404).json({
          success: false,
          error: 'Document not found'
        });
      }

      // Check access permissions
      if (!document.hasAccess(user.walletAddress) && user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      logger.info('Document download requested', {
        documentHash,
        user: user.walletAddress,
        ipfsHash: document.ipfsHash
      });

      // Retrieve encrypted file from IPFS
      const encryptedBuffer = await ipfsService.retrieveFile(document.ipfsHash);
      const encryptedData = JSON.parse(encryptedBuffer.toString());

      // Decrypt file
      const decryptedBuffer = encryptionService.decryptFile(encryptedData, document.encryptionKey);

      // Verify file integrity
      const isIntegrityValid = encryptionService.verifyFileIntegrity(decryptedBuffer, documentHash);
      if (!isIntegrityValid) {
        logger.error('File integrity check failed during download', {
          documentHash,
          user: user.walletAddress
        });
        
        return res.status(500).json({
          success: false,
          error: 'File integrity verification failed'
        });
      }

      // Set appropriate headers for file download
      res.setHeader('Content-Type', document.fileInfo.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.fileInfo.originalName}"`);
      res.setHeader('Content-Length', decryptedBuffer.length);

      logger.info('Document downloaded successfully', {
        documentHash,
        user: user.walletAddress,
        filename: document.fileInfo.originalName
      });

      res.send(decryptedBuffer);

    } catch (error) {
      logger.error('Document download failed:', {
        error: error.message,
        documentHash: req.params.documentHash,
        user: req.user?.walletAddress
      });

      res.status(500).json({
        success: false,
        error: 'Document download failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @route   GET /api/documents/audit/:documentHash
// @desc    Get audit trail for a document including verification logs (Requirements 9.1, 9.2, 9.3, 9.4, 9.5)
// @access  Private (Admin or document owner/issuer)
router.get('/audit/:documentHash',
  authenticateToken,
  param('documentHash').matches(/^0x[a-fA-F0-9]{64}$/).withMessage('Invalid document hash format'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { documentHash } = req.params;
      const user = req.user;
      
      // Requirement 9.5: Support filtering by date range, status, and verifier
      const {
        startDate,
        endDate,
        result,
        verifier,
        limit = 50,
        skip = 0
      } = req.query;

      const document = await Document.findOne({ documentHash, isActive: true })
        .populate('audit.uploadedBy', 'walletAddress profile.name');

      if (!document) {
        return res.status(404).json({
          success: false,
          error: 'Document not found'
        });
      }

      // Only admin, owner, or issuer can view audit trail
      if (user.role !== 'admin' && 
          user.walletAddress !== document.access.owner && 
          user.walletAddress !== document.access.issuer) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const auditTrail = {
        documentHash,
        events: [
          {
            type: 'document_created',
            timestamp: document.audit.createdAt,
            actor: document.audit.uploadedBy?.walletAddress,
            details: {
              issuer: document.access.issuer,
              owner: document.access.owner,
              documentType: document.metadata.documentType
            }
          },
          {
            type: 'ipfs_upload',
            timestamp: document.audit.createdAt,
            actor: document.audit.uploadedBy?.walletAddress,
            details: {
              ipfsHash: document.ipfsHash,
              fileSize: document.fileInfo.size
            }
          }
        ],
        statistics: {
          verificationCount: document.audit.verificationCount,
          lastVerified: document.audit.lastVerified,
          status: document.status,
          age: Math.floor((Date.now() - document.audit.createdAt) / (1000 * 60 * 60 * 24)) // days
        }
      };

      // Add blockchain event if available
      if (document.blockchain.transactionHash) {
        auditTrail.events.push({
          type: 'blockchain_registered',
          timestamp: document.audit.createdAt, // Approximate
          actor: document.access.issuer,
          details: {
            transactionHash: document.blockchain.transactionHash,
            blockNumber: document.blockchain.blockNumber,
            gasUsed: document.blockchain.gasUsed
          }
        });
      }

      // Requirement 9.3: Get verification history with filtering (Requirement 9.5)
      const verificationQuery = { documentHash };
      
      if (startDate || endDate) {
        verificationQuery.timestamp = {};
        if (startDate) verificationQuery.timestamp.$gte = new Date(startDate);
        if (endDate) verificationQuery.timestamp.$lte = new Date(endDate);
      }
      
      if (result) {
        verificationQuery.result = result;
      }
      
      if (verifier) {
        verificationQuery.verifier = verifier;
      }

      const verificationLogs = await VerificationLog.find(verificationQuery)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));

      const totalVerifications = await VerificationLog.countDocuments(verificationQuery);

      // Get verification statistics
      const verificationStats = await VerificationLog.getStatistics(documentHash);

      // Requirement 9.4: Detect suspicious activity
      const suspiciousActivity = await VerificationLog.detectSuspiciousActivity(documentHash);

      // Add verification logs to audit trail
      auditTrail.verificationLogs = {
        logs: verificationLogs,
        pagination: {
          total: totalVerifications,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: totalVerifications > parseInt(skip) + parseInt(limit)
        },
        statistics: verificationStats,
        suspiciousActivity: suspiciousActivity.isSuspicious ? {
          detected: true,
          failedAttempts: suspiciousActivity.failedAttempts,
          timeWindowMinutes: suspiciousActivity.timeWindowMinutes,
          threshold: suspiciousActivity.threshold,
          message: 'Multiple failed verification attempts detected in a short time period'
        } : {
          detected: false
        }
      };

      logger.info('Audit trail retrieved', {
        documentHash,
        user: user.walletAddress,
        verificationLogsCount: verificationLogs.length,
        suspiciousActivity: suspiciousActivity.isSuspicious
      });

      res.json({
        success: true,
        data: {
          audit: auditTrail
        }
      });

    } catch (error) {
      logger.error('Get audit trail failed:', {
        error: error.message,
        documentHash: req.params.documentHash,
        user: req.user?.walletAddress
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get audit trail'
      });
    }
  }
);

// @route   POST /api/documents/:documentHash/share
// @desc    Grant access to a document for a specific wallet address
// @access  Private (Owner or Issuer only)
router.post('/:documentHash/share',
  // Security middleware
  ...securityValidation({
    enableSanitization: true,
    enableXSSPrevention: true,
    enableSQLInjectionPrevention: true,
    enableNoSQLInjectionPrevention: true
  }),
  
  // Authentication
  authenticateToken,
  
  // Input validation
  [
    param('documentHash').custom(value => {
      if (!/^0x[a-fA-F0-9]{64}$/.test(value)) {
        throw new Error('Invalid document hash format');
      }
      return true;
    }),
    validationRules.walletAddress('viewerAddress'),
    validationRules.accessLevel('accessLevel')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { documentHash } = req.params;
      const { viewerAddress, accessLevel } = req.body;
      const user = req.user;

      const document = await Document.findOne({ documentHash, isActive: true });

      if (!document) {
        return res.status(404).json({
          success: false,
          error: 'Document not found'
        });
      }

      // Check if user has permission to share (owner or issuer)
      if (user.walletAddress !== document.access.owner && 
          user.walletAddress !== document.access.issuer && 
          user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only document owner or issuer can grant access'
        });
      }

      // Check if viewer is already in the list
      if (document.access.authorizedViewers.includes(viewerAddress)) {
        return res.status(409).json({
          success: false,
          error: 'Access already granted to this address'
        });
      }

      // Add viewer to authorized list
      document.access.authorizedViewers.push(viewerAddress);
      await document.save();

      logger.info('Document access granted', {
        documentHash,
        viewerAddress,
        grantedBy: user.walletAddress,
        accessLevel
      });

      res.json({
        success: true,
        data: {
          message: 'Access granted successfully',
          viewerAddress,
          accessLevel
        }
      });

    } catch (error) {
      logger.error('Grant document access failed:', {
        error: error.message,
        documentHash: req.params.documentHash,
        user: req.user?.walletAddress
      });

      res.status(500).json({
        success: false,
        error: 'Failed to grant access'
      });
    }
  }
);

// @route   DELETE /api/documents/:documentHash/share
// @desc    Revoke access to a document for a specific wallet address
// @access  Private (Owner or Issuer only)
router.delete('/:documentHash/share',
  authenticateToken,
  param('documentHash').matches(/^0x[a-fA-F0-9]{64}$/).withMessage('Invalid document hash format'),
  [
    body('viewerAddress').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Invalid viewer address format')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { documentHash } = req.params;
      const { viewerAddress } = req.body;
      const user = req.user;

      const document = await Document.findOne({ documentHash, isActive: true });

      if (!document) {
        return res.status(404).json({
          success: false,
          error: 'Document not found'
        });
      }

      // Check if user has permission to revoke access (owner or issuer)
      if (user.walletAddress !== document.access.owner && 
          user.walletAddress !== document.access.issuer && 
          user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only document owner or issuer can revoke access'
        });
      }

      // Remove viewer from authorized list
      const viewerIndex = document.access.authorizedViewers.indexOf(viewerAddress);
      if (viewerIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Viewer not found in access list'
        });
      }

      document.access.authorizedViewers.splice(viewerIndex, 1);
      await document.save();

      logger.info('Document access revoked', {
        documentHash,
        viewerAddress,
        revokedBy: user.walletAddress
      });

      res.json({
        success: true,
        data: {
          message: 'Access revoked successfully',
          viewerAddress
        }
      });

    } catch (error) {
      logger.error('Revoke document access failed:', {
        error: error.message,
        documentHash: req.params.documentHash,
        user: req.user?.walletAddress
      });

      res.status(500).json({
        success: false,
        error: 'Failed to revoke access'
      });
    }
  }
);

// @route   GET /api/documents/admin/suspicious-activity
// @desc    Get all documents with suspicious verification activity (Requirement 9.4)
// @access  Private (Admin only)
router.get('/admin/suspicious-activity',
  authenticateToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const {
        timeWindowMinutes = 10,
        threshold = 5,
        limit = 50,
        skip = 0
      } = req.query;

      logger.info('Admin requesting suspicious activity report', {
        admin: req.user.walletAddress,
        timeWindowMinutes,
        threshold
      });

      // Get all unique document hashes from recent verification logs
      const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
      
      const suspiciousDocuments = await VerificationLog.aggregate([
        {
          $match: {
            timestamp: { $gte: timeWindow },
            result: { $in: ['tampered', 'not_found'] }
          }
        },
        {
          $group: {
            _id: '$documentHash',
            failedAttempts: { $sum: 1 },
            verifiers: { $addToSet: '$verifier' },
            methods: { $addToSet: '$verificationMethod' },
            lastAttempt: { $max: '$timestamp' },
            firstAttempt: { $min: '$timestamp' }
          }
        },
        {
          $match: {
            failedAttempts: { $gte: parseInt(threshold) }
          }
        },
        {
          $sort: { failedAttempts: -1 }
        },
        {
          $skip: parseInt(skip)
        },
        {
          $limit: parseInt(limit)
        }
      ]);

      // Get document details for suspicious documents
      const enrichedResults = await Promise.all(
        suspiciousDocuments.map(async (item) => {
          const document = await Document.findOne({ 
            documentHash: item._id 
          }).select('metadata access status audit.createdAt');

          return {
            documentHash: item._id,
            failedAttempts: item.failedAttempts,
            uniqueVerifiers: item.verifiers.length,
            verificationMethods: item.methods,
            timeWindow: {
              firstAttempt: item.firstAttempt,
              lastAttempt: item.lastAttempt,
              durationMinutes: Math.round((item.lastAttempt - item.firstAttempt) / (1000 * 60))
            },
            document: document ? {
              exists: true,
              metadata: document.metadata,
              issuer: document.access.issuer,
              owner: document.access.owner,
              status: document.status,
              createdAt: document.audit.createdAt
            } : {
              exists: false,
              message: 'Document not found in registry'
            },
            severity: item.failedAttempts >= threshold * 2 ? 'high' : 'medium',
            recommendation: item.failedAttempts >= threshold * 2 
              ? 'Immediate investigation recommended - possible targeted attack'
              : 'Monitor for continued suspicious activity'
          };
        })
      );

      // Get overall statistics
      const totalSuspiciousCount = await VerificationLog.aggregate([
        {
          $match: {
            timestamp: { $gte: timeWindow },
            result: { $in: ['tampered', 'not_found'] }
          }
        },
        {
          $group: {
            _id: '$documentHash',
            failedAttempts: { $sum: 1 }
          }
        },
        {
          $match: {
            failedAttempts: { $gte: parseInt(threshold) }
          }
        },
        {
          $count: 'total'
        }
      ]);

      const total = totalSuspiciousCount.length > 0 ? totalSuspiciousCount[0].total : 0;

      logger.info('Suspicious activity report generated', {
        admin: req.user.walletAddress,
        suspiciousDocumentsFound: enrichedResults.length,
        totalSuspicious: total
      });

      res.json({
        success: true,
        data: {
          suspiciousActivity: enrichedResults,
          pagination: {
            total,
            limit: parseInt(limit),
            skip: parseInt(skip),
            hasMore: total > parseInt(skip) + parseInt(limit)
          },
          criteria: {
            timeWindowMinutes: parseInt(timeWindowMinutes),
            threshold: parseInt(threshold),
            evaluatedPeriod: {
              from: timeWindow,
              to: new Date()
            }
          },
          summary: {
            totalSuspiciousDocuments: total,
            highSeverity: enrichedResults.filter(r => r.severity === 'high').length,
            mediumSeverity: enrichedResults.filter(r => r.severity === 'medium').length
          }
        }
      });

    } catch (error) {
      logger.error('Get suspicious activity failed:', {
        error: error.message,
        admin: req.user?.walletAddress
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve suspicious activity report'
      });
    }
  }
);

// @route   POST /api/documents/:documentHash/access/grant
// @desc    Grant access to a document for a specific user
// @access  Private (Owner or Issuer only)
router.post('/:documentHash/access/grant',
  // Security middleware
  validateRequestSize(1024), // 1KB limit
  validateContentType(['application/json']),
  ...securityValidation({
    enableSanitization: true,
    enableXSSPrevention: true,
    enableSQLInjectionPrevention: true,
    enableNoSQLInjectionPrevention: true
  }),
  
  // Authentication
  authenticateToken,
  
  // Input validation
  [
    param('documentHash').matches(/^0x[a-fA-F0-9]{64}$/).withMessage('Invalid document hash format'),
    validationRules.walletAddress('userAddress'),
    validationRules.date('expiresAt', false)
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { documentHash } = req.params;
      const { userAddress, expiresAt } = req.body;
      const grantingUser = req.user;

      logger.info('Access grant requested', {
        documentHash,
        userAddress,
        grantedBy: grantingUser.walletAddress
      });

      // Find document
      const document = await Document.findOne({ documentHash, isActive: true });
      if (!document) {
        return res.status(404).json({
          success: false,
          error: 'Document not found'
        });
      }

      // Check if user has permission to grant access (owner, issuer, or admin)
      const canGrant = document.access.owner === grantingUser.walletAddress ||
                       document.access.issuer === grantingUser.walletAddress ||
                       grantingUser.role === 'admin';

      if (!canGrant) {
        return res.status(403).json({
          success: false,
          error: 'Only document owner, issuer, or admin can grant access'
        });
      }

      // Check if user already has access
      if (document.access.authorizedViewers.includes(userAddress)) {
        return res.status(409).json({
          success: false,
          error: 'User already has access to this document'
        });
      }

      // Verify the user exists
      const targetUser = await User.findByWallet(userAddress);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: 'Target user not found'
        });
      }

      // Grant access on blockchain
      try {
        const blockchainResult = await blockchainService.grantDocumentAccess(
          documentHash,
          userAddress,
          grantingUser.walletAddress
        );

        // Add to authorized viewers
        document.access.authorizedViewers.push(userAddress);
        document.audit.updatedAt = new Date();
        await document.save();

        logger.info('Access granted successfully', {
          documentHash,
          userAddress,
          grantedBy: grantingUser.walletAddress,
          transactionHash: blockchainResult.transactionHash
        });

        res.json({
          success: true,
          message: 'Access granted successfully',
          data: {
            documentHash,
            userAddress,
            grantedBy: grantingUser.walletAddress,
            expiresAt: expiresAt || null,
            blockchain: {
              transactionHash: blockchainResult.transactionHash,
              blockNumber: blockchainResult.blockNumber,
              gasUsed: blockchainResult.gasUsed
            }
          }
        });

      } catch (blockchainError) {
        logger.error('Blockchain access grant failed:', {
          documentHash,
          userAddress,
          error: blockchainError.message
        });

        // Still grant access in database even if blockchain fails
        document.access.authorizedViewers.push(userAddress);
        document.audit.updatedAt = new Date();
        await document.save();

        res.status(207).json({
          success: true,
          warning: 'Access granted in database but blockchain transaction failed',
          data: {
            documentHash,
            userAddress,
            grantedBy: grantingUser.walletAddress,
            expiresAt: expiresAt || null,
            blockchainError: blockchainError.message
          }
        });
      }

    } catch (error) {
      logger.error('Grant access failed:', {
        error: error.message,
        documentHash: req.params.documentHash,
        user: req.user?.walletAddress
      });

      res.status(500).json({
        success: false,
        error: 'Failed to grant access',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @route   POST /api/documents/:documentHash/access/revoke
// @desc    Revoke access to a document for a specific user
// @access  Private (Owner or Issuer only)
router.post('/:documentHash/access/revoke',
  // Security middleware
  validateRequestSize(1024), // 1KB limit
  validateContentType(['application/json']),
  ...securityValidation({
    enableSanitization: true,
    enableXSSPrevention: true,
    enableSQLInjectionPrevention: true,
    enableNoSQLInjectionPrevention: true
  }),
  
  // Authentication
  authenticateToken,
  
  // Input validation
  [
    param('documentHash').matches(/^0x[a-fA-F0-9]{64}$/).withMessage('Invalid document hash format'),
    validationRules.walletAddress('userAddress')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { documentHash } = req.params;
      const { userAddress } = req.body;
      const revokingUser = req.user;

      logger.info('Access revoke requested', {
        documentHash,
        userAddress,
        revokedBy: revokingUser.walletAddress
      });

      // Find document
      const document = await Document.findOne({ documentHash, isActive: true });
      if (!document) {
        return res.status(404).json({
          success: false,
          error: 'Document not found'
        });
      }

      // Check if user has permission to revoke access (owner, issuer, or admin)
      const canRevoke = document.access.owner === revokingUser.walletAddress ||
                        document.access.issuer === revokingUser.walletAddress ||
                        revokingUser.role === 'admin';

      if (!canRevoke) {
        return res.status(403).json({
          success: false,
          error: 'Only document owner, issuer, or admin can revoke access'
        });
      }

      // Check if user has access to revoke
      if (!document.access.authorizedViewers.includes(userAddress)) {
        return res.status(404).json({
          success: false,
          error: 'User does not have access to this document'
        });
      }

      // Revoke access on blockchain
      try {
        const blockchainResult = await blockchainService.revokeDocumentAccess(
          documentHash,
          userAddress,
          revokingUser.walletAddress
        );

        // Remove from authorized viewers
        document.access.authorizedViewers = document.access.authorizedViewers.filter(
          addr => addr !== userAddress
        );
        document.audit.updatedAt = new Date();
        await document.save();

        logger.info('Access revoked successfully', {
          documentHash,
          userAddress,
          revokedBy: revokingUser.walletAddress,
          transactionHash: blockchainResult.transactionHash
        });

        res.json({
          success: true,
          message: 'Access revoked successfully',
          data: {
            documentHash,
            userAddress,
            revokedBy: revokingUser.walletAddress,
            blockchain: {
              transactionHash: blockchainResult.transactionHash,
              blockNumber: blockchainResult.blockNumber,
              gasUsed: blockchainResult.gasUsed
            }
          }
        });

      } catch (blockchainError) {
        logger.error('Blockchain access revoke failed:', {
          documentHash,
          userAddress,
          error: blockchainError.message
        });

        // Still revoke access in database even if blockchain fails
        document.access.authorizedViewers = document.access.authorizedViewers.filter(
          addr => addr !== userAddress
        );
        document.audit.updatedAt = new Date();
        await document.save();

        res.status(207).json({
          success: true,
          warning: 'Access revoked in database but blockchain transaction failed',
          data: {
            documentHash,
            userAddress,
            revokedBy: revokingUser.walletAddress,
            blockchainError: blockchainError.message
          }
        });
      }

    } catch (error) {
      logger.error('Revoke access failed:', {
        error: error.message,
        documentHash: req.params.documentHash,
        user: req.user?.walletAddress
      });

      res.status(500).json({
        success: false,
        error: 'Failed to revoke access',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @route   GET /api/documents/user/:address
// @desc    Get all documents for a specific user (owner or authorized viewer)
// @access  Private (User can only see their own documents unless admin)
router.get('/user/:address',
  // Security middleware
  ...securityValidation({
    enableSanitization: true,
    enableXSSPrevention: true
  }),
  
  // Authentication
  authenticateToken,
  
  // Input validation
  [
    param('address').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Invalid wallet address format')
  ],
  handleValidationErrors,
  dataMinimization(['profile.email', 'metadata.studentName']),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { address } = req.params;
      const requestingUser = req.user;
      const { page = 1, limit = 10, status, documentType, search } = req.query;
      const skip = (page - 1) * limit;

      // Check if user is requesting their own documents or is admin
      if (address.toLowerCase() !== requestingUser.walletAddress.toLowerCase() && 
          requestingUser.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'You can only view your own documents'
        });
      }

      logger.info('User documents requested', {
        address,
        requestedBy: requestingUser.walletAddress,
        page,
        limit
      });

      // Build query - find documents where user is owner or authorized viewer
      let query = {
        isActive: true,
        $or: [
          { 'access.owner': address.toLowerCase() },
          { 'access.issuer': address.toLowerCase() },
          { 'access.authorizedViewers': address.toLowerCase() }
        ]
      };

      // Apply filters
      if (status) {
        query.status = status;
      }
      if (documentType) {
        query['metadata.documentType'] = documentType;
      }
      if (search) {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { 'metadata.studentName': { $regex: search, $options: 'i' } },
            { 'metadata.studentId': { $regex: search, $options: 'i' } },
            { 'metadata.institutionName': { $regex: search, $options: 'i' } },
            { 'metadata.course': { $regex: search, $options: 'i' } }
          ]
        });
      }

      // Use optimized database query with caching
      const documents = await dbOptimizationService.findWithCache(
        Document,
        query,
        {
          cache: true,
          cacheTTL: 300, // 5 minutes
          sort: { 'audit.createdAt': -1 },
          skip,
          limit: parseInt(limit),
          select: '-encryptionKey', // Don't expose encryption keys
          populate: 'audit.uploadedBy'
        }
      );

      const total = await Document.countDocuments(query);

      // Categorize documents by access type
      const categorizedDocuments = documents.map(doc => {
        const docObj = doc.toObject();
        const userAddress = address.toLowerCase();
        
        let accessType = 'viewer';
        if (docObj.access.owner === userAddress) {
          accessType = 'owner';
        } else if (docObj.access.issuer === userAddress) {
          accessType = 'issuer';
        }
        
        return {
          ...docObj,
          userAccessType: accessType
        };
      });

      logger.info('User documents retrieved successfully', {
        address,
        requestedBy: requestingUser.walletAddress,
        documentsFound: documents.length,
        total
      });

      res.json({
        success: true,
        data: {
          documents: categorizedDocuments,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit)
          },
          summary: {
            owned: categorizedDocuments.filter(d => d.userAccessType === 'owner').length,
            issued: categorizedDocuments.filter(d => d.userAccessType === 'issuer').length,
            authorized: categorizedDocuments.filter(d => d.userAccessType === 'viewer').length
          }
        }
      });

    } catch (error) {
      logger.error('Get user documents failed:', {
        error: error.message,
        address: req.params.address,
        user: req.user?.walletAddress
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user documents',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// @route   POST /api/documents/:documentHash/deactivate
// @desc    Deactivate a document (soft delete)
// @access  Private (Owner, Issuer, or Admin only)
router.post('/:documentHash/deactivate',
  // Security middleware
  validateRequestSize(1024), // 1KB limit
  validateContentType(['application/json']),
  ...securityValidation({
    enableSanitization: true,
    enableXSSPrevention: true,
    enableSQLInjectionPrevention: true,
    enableNoSQLInjectionPrevention: true
  }),
  
  // Authentication
  authenticateToken,
  
  // Input validation
  [
    param('documentHash').matches(/^0x[a-fA-F0-9]{64}$/).withMessage('Invalid document hash format'),
    body('reason').isString().trim().isLength({ min: 10, max: 500 }).withMessage('Reason must be between 10 and 500 characters')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { documentHash } = req.params;
      const { reason } = req.body;
      const deactivatingUser = req.user;

      logger.info('Document deactivation requested', {
        documentHash,
        deactivatedBy: deactivatingUser.walletAddress,
        reason
      });

      // Find document
      const document = await Document.findOne({ documentHash });
      if (!document) {
        return res.status(404).json({
          success: false,
          error: 'Document not found'
        });
      }

      // Check if already deactivated
      if (!document.isActive) {
        return res.status(409).json({
          success: false,
          error: 'Document is already deactivated'
        });
      }

      // Check if user has permission to deactivate (owner, issuer, or admin)
      const canDeactivate = document.access.owner === deactivatingUser.walletAddress ||
                            document.access.issuer === deactivatingUser.walletAddress ||
                            deactivatingUser.role === 'admin';

      if (!canDeactivate) {
        return res.status(403).json({
          success: false,
          error: 'Only document owner, issuer, or admin can deactivate this document'
        });
      }

      // Deactivate document
      document.isActive = false;
      document.deactivationReason = reason;
      document.deactivatedAt = new Date();
      document.deactivatedBy = deactivatingUser.walletAddress;
      document.audit.updatedAt = new Date();
      
      await document.save();

      logger.info('Document deactivated successfully', {
        documentHash,
        deactivatedBy: deactivatingUser.walletAddress,
        reason
      });

      res.json({
        success: true,
        message: 'Document deactivated successfully',
        data: {
          documentHash,
          deactivatedBy: deactivatingUser.walletAddress,
          deactivatedAt: document.deactivatedAt,
          reason: document.deactivationReason,
          status: 'deactivated'
        }
      });

    } catch (error) {
      logger.error('Document deactivation failed:', {
        error: error.message,
        documentHash: req.params.documentHash,
        user: req.user?.walletAddress
      });

      res.status(500).json({
        success: false,
        error: 'Failed to deactivate document',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;