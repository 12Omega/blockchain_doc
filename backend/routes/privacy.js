const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken: auth } = require('../middleware/auth');
const { privacyService } = require('../services/privacyService');
const { auditLogger } = require('../utils/auditLogger');
const logger = require('../utils/logger');

/**
 * Privacy and compliance API routes
 */

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * @route POST /api/privacy/consent
 * @desc Record user consent
 * @access Private
 */
router.post('/consent',
  auth,
  body('consentType')
    .isIn(['data_processing', 'document_storage', 'blockchain_storage', 'analytics', 'marketing', 'third_party_sharing', 'audit_logging'])
    .withMessage('Invalid consent type'),
  body('consentGiven')
    .isBoolean()
    .withMessage('Consent given must be a boolean'),
  body('purpose')
    .optional()
    .isLength({ min: 10, max: 500 })
    .withMessage('Purpose must be between 10 and 500 characters'),
  body('dataCategories')
    .optional()
    .isArray()
    .withMessage('Data categories must be an array'),
  body('legalBasis')
    .optional()
    .isIn(['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'])
    .withMessage('Invalid legal basis'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { consentType, consentGiven, purpose, dataCategories, legalBasis, retentionPeriod } = req.body;
      
      const consent = await privacyService.recordConsent(
        req.user._id,
        req.user.walletAddress,
        consentType,
        consentGiven,
        req,
        {
          purpose,
          dataCategories,
          legalBasis,
          retentionPeriod
        }
      );

      res.json({
        success: true,
        message: 'Consent recorded successfully',
        data: {
          consentId: consent._id,
          consentType,
          consentGiven,
          consentDate: consent.consentDate
        }
      });

    } catch (error) {
      logger.error('Consent recording failed:', {
        error: error.message,
        userId: req.user._id,
        consentType: req.body.consentType
      });

      await auditLogger.logUserEvent(
        'user_consent_failed',
        req,
        req.user._id,
        'failure',
        { error: error.message, consentType: req.body.consentType }
      );

      res.status(500).json({
        success: false,
        message: 'Failed to record consent',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/privacy/consent
 * @desc Get user's consent history
 * @access Private
 */
router.get('/consent',
  auth,
  async (req, res) => {
    try {
      const consents = await privacyService.getConsentHistory(req.user._id);

      res.json({
        success: true,
        data: consents
      });

    } catch (error) {
      logger.error('Failed to get consent history:', {
        error: error.message,
        userId: req.user._id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve consent history',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/privacy/consent/withdraw
 * @desc Withdraw user consent
 * @access Private
 */
router.post('/consent/withdraw',
  auth,
  body('consentType')
    .isIn(['data_processing', 'document_storage', 'blockchain_storage', 'analytics', 'marketing', 'third_party_sharing', 'audit_logging'])
    .withMessage('Invalid consent type'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { consentType } = req.body;
      
      const consent = await privacyService.withdrawConsent(req.user._id, consentType, req);

      res.json({
        success: true,
        message: 'Consent withdrawn successfully',
        data: {
          consentId: consent._id,
          consentType,
          withdrawalDate: consent.withdrawalDate
        }
      });

    } catch (error) {
      logger.error('Consent withdrawal failed:', {
        error: error.message,
        userId: req.user._id,
        consentType: req.body.consentType
      });

      res.status(500).json({
        success: false,
        message: 'Failed to withdraw consent',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/privacy/delete-request
 * @desc Create data deletion request
 * @access Private
 */
router.post('/delete-request',
  auth,
  body('requestType')
    .isIn(['full_deletion', 'partial_deletion', 'anonymization', 'data_export'])
    .withMessage('Invalid request type'),
  body('reason')
    .isIn(['gdpr_right_to_erasure', 'user_request', 'data_retention_expired', 'consent_withdrawn', 'other'])
    .withMessage('Invalid reason'),
  body('dataCategories')
    .optional()
    .isArray()
    .withMessage('Data categories must be an array'),
  body('specificDocuments')
    .optional()
    .isArray()
    .withMessage('Specific documents must be an array'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { requestType, reason, dataCategories, specificDocuments } = req.body;
      
      const deletionRequest = await privacyService.createDataDeletionRequest(
        req.user._id,
        req.user.walletAddress,
        {
          requestType,
          reason,
          dataCategories,
          specificDocuments
        },
        req
      );

      res.json({
        success: true,
        message: 'Data deletion request created successfully',
        data: {
          requestId: deletionRequest._id,
          verificationCode: deletionRequest.verificationCode,
          verificationExpiry: deletionRequest.verificationExpiry,
          status: deletionRequest.status
        }
      });

    } catch (error) {
      logger.error('Data deletion request failed:', {
        error: error.message,
        userId: req.user._id,
        requestType: req.body.requestType
      });

      res.status(500).json({
        success: false,
        message: 'Failed to create data deletion request',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/privacy/delete-request/:requestId/verify
 * @desc Verify and process data deletion request
 * @access Private
 */
router.post('/delete-request/:requestId/verify',
  auth,
  param('requestId')
    .isMongoId()
    .withMessage('Invalid request ID'),
  body('verificationCode')
    .isLength({ min: 10 })
    .withMessage('Invalid verification code'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { verificationCode } = req.body;
      
      const processedRequest = await privacyService.processDataDeletionRequest(
        requestId,
        verificationCode,
        req
      );

      res.json({
        success: true,
        message: 'Data deletion request processed successfully',
        data: {
          requestId: processedRequest._id,
          status: processedRequest.status,
          completionDate: processedRequest.completionDate,
          deletionResults: processedRequest.deletionResults
        }
      });

    } catch (error) {
      logger.error('Data deletion processing failed:', {
        error: error.message,
        userId: req.user._id,
        requestId: req.params.requestId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to process data deletion request',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/privacy/export-request
 * @desc Create data export request
 * @access Private
 */
router.post('/export-request',
  auth,
  body('exportFormat')
    .optional()
    .isIn(['json', 'csv', 'xml', 'pdf'])
    .withMessage('Invalid export format'),
  body('dataCategories')
    .optional()
    .isArray()
    .withMessage('Data categories must be an array'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { exportFormat, dataCategories } = req.body;
      
      const exportRequest = await privacyService.createDataExportRequest(
        req.user._id,
        req.user.walletAddress,
        {
          exportFormat,
          dataCategories
        },
        req
      );

      res.json({
        success: true,
        message: 'Data export request created successfully',
        data: {
          requestId: exportRequest._id,
          status: exportRequest.status,
          exportFormat: exportRequest.exportFormat,
          expiryDate: exportRequest.expiryDate
        }
      });

    } catch (error) {
      logger.error('Data export request failed:', {
        error: error.message,
        userId: req.user._id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to create data export request',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/privacy/export-requests
 * @desc Get user's data export requests
 * @access Private
 */
router.get('/export-requests',
  auth,
  async (req, res) => {
    try {
      const { DataExportRequest } = require('../services/privacyService');
      
      const exportRequests = await DataExportRequest.find({
        userId: req.user._id
      }).sort({ createdAt: -1 });

      res.json({
        success: true,
        data: exportRequests
      });

    } catch (error) {
      logger.error('Failed to get export requests:', {
        error: error.message,
        userId: req.user._id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve export requests',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/privacy/export/:requestId/download
 * @desc Download exported data
 * @access Private
 */
router.get('/export/:requestId/download',
  auth,
  param('requestId')
    .isMongoId()
    .withMessage('Invalid request ID'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { DataExportRequest } = require('../services/privacyService');
      const { requestId } = req.params;
      
      const exportRequest = await DataExportRequest.findOne({
        _id: requestId,
        userId: req.user._id
      });

      if (!exportRequest) {
        return res.status(404).json({
          success: false,
          message: 'Export request not found'
        });
      }

      if (exportRequest.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Export is not ready for download'
        });
      }

      if (exportRequest.expiryDate < new Date()) {
        return res.status(410).json({
          success: false,
          message: 'Export has expired'
        });
      }

      if (exportRequest.downloadCount >= exportRequest.maxDownloads) {
        return res.status(429).json({
          success: false,
          message: 'Maximum download limit reached'
        });
      }

      // In a real implementation, you would retrieve the file from secure storage
      // For now, we'll regenerate the export data
      const exportData = await privacyService.gatherExportData(exportRequest);
      const fileContent = await privacyService.generateExportFile(exportData, exportRequest.exportFormat);

      // Update download count
      exportRequest.downloadCount += 1;
      await exportRequest.save();

      // Set appropriate headers
      const filename = `data-export-${requestId}.${exportRequest.exportFormat}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', this.getContentType(exportRequest.exportFormat));

      await auditLogger.logUserEvent(
        'data_export_downloaded',
        req,
        req.user._id,
        'success',
        { requestId, downloadCount: exportRequest.downloadCount }
      );

      res.send(fileContent);

    } catch (error) {
      logger.error('Data export download failed:', {
        error: error.message,
        userId: req.user._id,
        requestId: req.params.requestId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to download export',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/privacy/deletion-requests
 * @desc Get user's data deletion requests
 * @access Private
 */
router.get('/deletion-requests',
  auth,
  async (req, res) => {
    try {
      const { DataDeletionRequest } = require('../services/privacyService');
      
      const deletionRequests = await DataDeletionRequest.find({
        userId: req.user._id
      }).sort({ createdAt: -1 });

      res.json({
        success: true,
        data: deletionRequests
      });

    } catch (error) {
      logger.error('Failed to get deletion requests:', {
        error: error.message,
        userId: req.user._id
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve deletion requests',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/privacy/check-consent/:consentType
 * @desc Check if user has given specific consent
 * @access Private
 */
router.get('/check-consent/:consentType',
  auth,
  param('consentType')
    .isIn(['data_processing', 'document_storage', 'blockchain_storage', 'analytics', 'marketing', 'third_party_sharing', 'audit_logging'])
    .withMessage('Invalid consent type'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { consentType } = req.params;
      
      const hasConsent = await privacyService.hasConsent(req.user._id, consentType);

      res.json({
        success: true,
        data: {
          consentType,
          hasConsent
        }
      });

    } catch (error) {
      logger.error('Failed to check consent:', {
        error: error.message,
        userId: req.user._id,
        consentType: req.params.consentType
      });

      res.status(500).json({
        success: false,
        message: 'Failed to check consent',
        error: error.message
      });
    }
  }
);

/**
 * Helper function to get content type for export format
 */
function getContentType(format) {
  const contentTypes = {
    'json': 'application/json',
    'csv': 'text/csv',
    'xml': 'application/xml',
    'pdf': 'application/pdf'
  };
  return contentTypes[format] || 'application/octet-stream';
}

module.exports = router;