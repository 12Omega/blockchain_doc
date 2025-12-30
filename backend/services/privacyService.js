const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { auditLogger, AuditLog } = require('../utils/auditLogger');
const ipfsService = require('./ipfsService');

/**
 * Privacy and compliance service for GDPR and data protection
 */

// User consent schema
const userConsentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  consentType: {
    type: String,
    required: true,
    enum: [
      'data_processing',
      'document_storage',
      'blockchain_storage',
      'analytics',
      'marketing',
      'third_party_sharing',
      'audit_logging'
    ],
    index: true
  },
  consentGiven: {
    type: Boolean,
    required: true,
    default: false
  },
  consentVersion: {
    type: String,
    required: true,
    default: '1.0'
  },
  consentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  withdrawalDate: {
    type: Date
  },
  ipAddress: String,
  userAgent: String,
  legalBasis: {
    type: String,
    enum: ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'],
    default: 'consent'
  },
  purpose: {
    type: String,
    required: true,
    maxlength: 500
  },
  dataCategories: [{
    type: String,
    enum: ['personal_data', 'sensitive_data', 'biometric_data', 'financial_data', 'academic_data']
  }],
  retentionPeriod: {
    type: Number, // in days
    default: 2555 // 7 years
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'user_consents'
});

// Indexes for performance
userConsentSchema.index({ userId: 1, consentType: 1 });
userConsentSchema.index({ walletAddress: 1, consentType: 1 });
userConsentSchema.index({ consentDate: -1 });

const UserConsent = mongoose.model('UserConsent', userConsentSchema);

// Data deletion request schema
const dataDeletionRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  requestType: {
    type: String,
    required: true,
    enum: ['full_deletion', 'partial_deletion', 'anonymization', 'data_export'],
    index: true
  },
  reason: {
    type: String,
    required: true,
    enum: ['gdpr_right_to_erasure', 'user_request', 'data_retention_expired', 'consent_withdrawn', 'other']
  },
  dataCategories: [{
    type: String,
    enum: ['profile_data', 'document_metadata', 'audit_logs', 'performance_metrics', 'ipfs_files']
  }],
  specificDocuments: [{
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document'
    },
    documentHash: String,
    ipfsHash: String
  }],
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'rejected'],
    default: 'pending',
    index: true
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  completionDate: Date,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verificationRequired: {
    type: Boolean,
    default: true
  },
  verificationCode: String,
  verificationExpiry: Date,
  deletionResults: {
    profileDataDeleted: { type: Boolean, default: false },
    documentsDeleted: { type: Number, default: 0 },
    ipfsFilesDeleted: { type: Number, default: 0 },
    auditLogsAnonymized: { type: Number, default: 0 },
    blockchainDataHandled: { type: Boolean, default: false }
  },
  notes: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'data_deletion_requests'
});

const DataDeletionRequest = mongoose.model('DataDeletionRequest', dataDeletionRequestSchema);

// Data export request schema
const dataExportRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  exportFormat: {
    type: String,
    enum: ['json', 'csv', 'xml', 'pdf'],
    default: 'json'
  },
  dataCategories: [{
    type: String,
    enum: ['profile_data', 'document_metadata', 'audit_logs', 'consent_history', 'all']
  }],
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'expired'],
    default: 'pending',
    index: true
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  completionDate: Date,
  expiryDate: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  },
  downloadUrl: String,
  downloadCount: {
    type: Number,
    default: 0
  },
  maxDownloads: {
    type: Number,
    default: 3
  },
  fileSize: Number,
  encryptionKey: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'data_export_requests'
});

const DataExportRequest = mongoose.model('DataExportRequest', dataExportRequestSchema);

/**
 * Privacy Service Class
 */
class PrivacyService {
  constructor() {
    this.consentVersions = {
      'data_processing': '1.0',
      'document_storage': '1.0',
      'blockchain_storage': '1.0',
      'analytics': '1.0',
      'marketing': '1.0',
      'third_party_sharing': '1.0',
      'audit_logging': '1.0'
    };
  }

  /**
   * Record user consent
   */
  async recordConsent(userId, walletAddress, consentType, consentGiven, req, options = {}) {
    try {
      const {
        purpose,
        dataCategories = [],
        legalBasis = 'consent',
        retentionPeriod = 2555
      } = options;

      // Check if consent already exists
      const existingConsent = await UserConsent.findOne({
        userId,
        consentType,
        consentVersion: this.consentVersions[consentType]
      });

      if (existingConsent) {
        // Update existing consent
        existingConsent.consentGiven = consentGiven;
        existingConsent.consentDate = new Date();
        if (!consentGiven) {
          existingConsent.withdrawalDate = new Date();
        }
        existingConsent.ipAddress = req.ip;
        existingConsent.userAgent = req.get('User-Agent');
        await existingConsent.save();

        await auditLogger.logUserEvent(
          consentGiven ? 'user_consent_given' : 'user_consent_withdrawn',
          req,
          userId,
          'success',
          { consentType, consentVersion: this.consentVersions[consentType] }
        );

        return existingConsent;
      }

      // Create new consent record
      const consent = new UserConsent({
        userId,
        walletAddress: walletAddress.toLowerCase(),
        consentType,
        consentGiven,
        consentVersion: this.consentVersions[consentType],
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        legalBasis,
        purpose: purpose || this.getDefaultPurpose(consentType),
        dataCategories,
        retentionPeriod
      });

      await consent.save();

      await auditLogger.logUserEvent(
        'user_consent_recorded',
        req,
        userId,
        'success',
        { consentType, consentGiven, consentVersion: this.consentVersions[consentType] }
      );

      logger.info('User consent recorded:', {
        userId,
        walletAddress,
        consentType,
        consentGiven
      });

      return consent;
    } catch (error) {
      logger.error('Failed to record consent:', {
        error: error.message,
        userId,
        consentType
      });
      throw error;
    }
  }

  /**
   * Check if user has given consent for specific type
   */
  async hasConsent(userId, consentType) {
    try {
      const consent = await UserConsent.findOne({
        userId,
        consentType,
        consentGiven: true,
        withdrawalDate: { $exists: false }
      });

      return !!consent;
    } catch (error) {
      logger.error('Failed to check consent:', {
        error: error.message,
        userId,
        consentType
      });
      return false;
    }
  }

  /**
   * Get user's consent history
   */
  async getConsentHistory(userId) {
    try {
      const consents = await UserConsent.find({ userId })
        .sort({ consentDate: -1 })
        .lean();

      return consents;
    } catch (error) {
      logger.error('Failed to get consent history:', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(userId, consentType, req) {
    try {
      const consent = await UserConsent.findOne({
        userId,
        consentType,
        consentGiven: true,
        withdrawalDate: { $exists: false }
      });

      if (!consent) {
        throw new Error('No active consent found to withdraw');
      }

      consent.consentGiven = false;
      consent.withdrawalDate = new Date();
      await consent.save();

      await auditLogger.logUserEvent(
        'user_consent_withdrawn',
        req,
        userId,
        'success',
        { consentType }
      );

      // Check if this withdrawal requires data deletion
      if (consentType === 'data_processing') {
        await this.createDataDeletionRequest(userId, req.user.walletAddress, {
          requestType: 'full_deletion',
          reason: 'consent_withdrawn',
          dataCategories: ['profile_data', 'document_metadata', 'audit_logs']
        }, req);
      }

      return consent;
    } catch (error) {
      logger.error('Failed to withdraw consent:', {
        error: error.message,
        userId,
        consentType
      });
      throw error;
    }
  }

  /**
   * Create data deletion request
   */
  async createDataDeletionRequest(userId, walletAddress, options, req) {
    try {
      const {
        requestType = 'full_deletion',
        reason = 'user_request',
        dataCategories = [],
        specificDocuments = []
      } = options;

      // Generate verification code
      const verificationCode = Math.random().toString(36).substring(2, 15) + 
                              Math.random().toString(36).substring(2, 15);
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const deletionRequest = new DataDeletionRequest({
        userId,
        walletAddress: walletAddress.toLowerCase(),
        requestType,
        reason,
        dataCategories,
        specificDocuments,
        verificationCode,
        verificationExpiry
      });

      await deletionRequest.save();

      await auditLogger.logUserEvent(
        'data_deletion_requested',
        req,
        userId,
        'success',
        { requestType, reason, requestId: deletionRequest._id }
      );

      logger.info('Data deletion request created:', {
        requestId: deletionRequest._id,
        userId,
        requestType,
        reason
      });

      return deletionRequest;
    } catch (error) {
      logger.error('Failed to create data deletion request:', {
        error: error.message,
        userId,
        requestType: options.requestType
      });
      throw error;
    }
  }

  /**
   * Process data deletion request
   */
  async processDataDeletionRequest(requestId, verificationCode, req) {
    try {
      const request = await DataDeletionRequest.findById(requestId);
      
      if (!request) {
        throw new Error('Deletion request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('Request has already been processed');
      }

      if (request.verificationExpiry < new Date()) {
        throw new Error('Verification code has expired');
      }

      if (request.verificationCode !== verificationCode) {
        throw new Error('Invalid verification code');
      }

      request.status = 'in_progress';
      await request.save();

      // Process the deletion based on request type
      const results = await this.executeDataDeletion(request);
      
      request.status = 'completed';
      request.completionDate = new Date();
      request.processedBy = req.user._id;
      request.deletionResults = results;
      await request.save();

      await auditLogger.logUserEvent(
        'data_deletion_completed',
        req,
        request.userId,
        'success',
        { requestId, deletionResults: results }
      );

      logger.info('Data deletion request completed:', {
        requestId,
        userId: request.userId,
        results
      });

      return request;
    } catch (error) {
      logger.error('Failed to process data deletion request:', {
        error: error.message,
        requestId
      });
      
      // Update request status to failed
      if (requestId) {
        await DataDeletionRequest.findByIdAndUpdate(requestId, {
          status: 'failed',
          notes: error.message
        });
      }
      
      throw error;
    }
  }

  /**
   * Execute data deletion
   */
  async executeDataDeletion(request) {
    const results = {
      profileDataDeleted: false,
      documentsDeleted: 0,
      ipfsFilesDeleted: 0,
      auditLogsAnonymized: 0,
      blockchainDataHandled: false
    };

    try {
      const User = mongoose.model('User');
      const Document = mongoose.model('Document');

      // Delete or anonymize profile data
      if (request.dataCategories.includes('profile_data') || request.requestType === 'full_deletion') {
        if (request.requestType === 'anonymization') {
          await User.findByIdAndUpdate(request.userId, {
            'profile.name': '[ANONYMIZED]',
            'profile.email': '[ANONYMIZED]',
            'profile.organization': '[ANONYMIZED]',
            'profile.department': '[ANONYMIZED]'
          });
        } else {
          await User.findByIdAndDelete(request.userId);
        }
        results.profileDataDeleted = true;
      }

      // Handle document deletion
      if (request.dataCategories.includes('document_metadata') || request.requestType === 'full_deletion') {
        const documents = await Document.find({
          $or: [
            { 'access.owner': request.walletAddress },
            { 'audit.uploadedBy': request.userId }
          ]
        });

        for (const doc of documents) {
          // Delete from IPFS if possible
          try {
            await ipfsService.unpinFile(doc.ipfsHash);
            results.ipfsFilesDeleted++;
          } catch (error) {
            logger.warn('Failed to unpin IPFS file:', {
              ipfsHash: doc.ipfsHash,
              error: error.message
            });
          }

          // Mark document as deleted (soft delete to maintain blockchain integrity)
          doc.isActive = false;
          doc.metadata.studentName = '[DELETED]';
          doc.metadata.studentId = '[DELETED]';
          await doc.save();
          
          results.documentsDeleted++;
        }
      }

      // Handle specific documents
      if (request.specificDocuments.length > 0) {
        for (const docRef of request.specificDocuments) {
          const doc = await Document.findById(docRef.documentId);
          if (doc) {
            try {
              await ipfsService.unpinFile(doc.ipfsHash);
              results.ipfsFilesDeleted++;
            } catch (error) {
              logger.warn('Failed to unpin specific IPFS file:', {
                ipfsHash: doc.ipfsHash,
                error: error.message
              });
            }

            doc.isActive = false;
            doc.metadata.studentName = '[DELETED]';
            doc.metadata.studentId = '[DELETED]';
            await doc.save();
            
            results.documentsDeleted++;
          }
        }
      }

      // Anonymize audit logs
      if (request.dataCategories.includes('audit_logs') || request.requestType === 'full_deletion') {
        const updateResult = await AuditLog.updateMany(
          { walletAddress: request.walletAddress },
          {
            $set: {
              walletAddress: '[ANONYMIZED]',
              'eventData.studentName': '[ANONYMIZED]',
              'eventData.email': '[ANONYMIZED]'
            }
          }
        );
        results.auditLogsAnonymized = updateResult.modifiedCount;
      }

      // Note about blockchain data (cannot be deleted)
      results.blockchainDataHandled = true; // Hashes remain on blockchain for integrity

      return results;
    } catch (error) {
      logger.error('Failed to execute data deletion:', {
        error: error.message,
        requestId: request._id
      });
      throw error;
    }
  }

  /**
   * Create data export request
   */
  async createDataExportRequest(userId, walletAddress, options, req) {
    try {
      const {
        exportFormat = 'json',
        dataCategories = ['all']
      } = options;

      const exportRequest = new DataExportRequest({
        userId,
        walletAddress: walletAddress.toLowerCase(),
        exportFormat,
        dataCategories
      });

      await exportRequest.save();

      await auditLogger.logUserEvent(
        'data_export_requested',
        req,
        userId,
        'success',
        { exportFormat, dataCategories, requestId: exportRequest._id }
      );

      // Process export asynchronously
      this.processDataExport(exportRequest._id);

      return exportRequest;
    } catch (error) {
      logger.error('Failed to create data export request:', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Process data export request
   */
  async processDataExport(requestId) {
    try {
      const request = await DataExportRequest.findById(requestId);
      if (!request) {
        throw new Error('Export request not found');
      }

      request.status = 'processing';
      await request.save();

      const exportData = await this.gatherExportData(request);
      const exportFile = await this.generateExportFile(exportData, request.exportFormat);
      
      // In a real implementation, you would upload this to a secure temporary storage
      // and provide a download URL
      request.status = 'completed';
      request.completionDate = new Date();
      request.fileSize = Buffer.byteLength(exportFile);
      request.downloadUrl = `/api/privacy/export/${requestId}/download`;
      
      await request.save();

      logger.info('Data export completed:', {
        requestId,
        userId: request.userId,
        fileSize: request.fileSize
      });

    } catch (error) {
      logger.error('Failed to process data export:', {
        error: error.message,
        requestId
      });
      
      await DataExportRequest.findByIdAndUpdate(requestId, {
        status: 'failed'
      });
    }
  }

  /**
   * Gather data for export
   */
  async gatherExportData(request) {
    const User = mongoose.model('User');
    const Document = mongoose.model('Document');

    const exportData = {};

    // Profile data
    if (request.dataCategories.includes('profile_data') || request.dataCategories.includes('all')) {
      const user = await User.findById(request.userId).lean();
      exportData.profile = user;
    }

    // Document metadata
    if (request.dataCategories.includes('document_metadata') || request.dataCategories.includes('all')) {
      const documents = await Document.find({
        $or: [
          { 'access.owner': request.walletAddress },
          { 'audit.uploadedBy': request.userId }
        ],
        isActive: true
      }).lean();
      exportData.documents = documents;
    }

    // Consent history
    if (request.dataCategories.includes('consent_history') || request.dataCategories.includes('all')) {
      const consents = await UserConsent.find({ userId: request.userId }).lean();
      exportData.consents = consents;
    }

    // Audit logs (limited to user's actions)
    if (request.dataCategories.includes('audit_logs') || request.dataCategories.includes('all')) {
      const auditLogs = await AuditLog.find({
        walletAddress: request.walletAddress
      }).limit(1000).lean();
      exportData.auditLogs = auditLogs;
    }

    return exportData;
  }

  /**
   * Generate export file in specified format
   */
  async generateExportFile(data, format) {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        // Simplified CSV generation - in production, use a proper CSV library
        return this.convertToCSV(data);
      case 'xml':
        return this.convertToXML(data);
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    // Simplified CSV conversion
    let csv = '';
    
    Object.keys(data).forEach(section => {
      csv += `\n--- ${section.toUpperCase()} ---\n`;
      if (Array.isArray(data[section])) {
        if (data[section].length > 0) {
          const headers = Object.keys(data[section][0]);
          csv += headers.join(',') + '\n';
          data[section].forEach(item => {
            csv += headers.map(header => JSON.stringify(item[header] || '')).join(',') + '\n';
          });
        }
      } else if (data[section]) {
        const headers = Object.keys(data[section]);
        csv += headers.join(',') + '\n';
        csv += headers.map(header => JSON.stringify(data[section][header] || '')).join(',') + '\n';
      }
    });
    
    return csv;
  }

  /**
   * Convert data to XML format
   */
  convertToXML(data) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<export>\n';
    
    Object.keys(data).forEach(section => {
      xml += `  <${section}>\n`;
      if (Array.isArray(data[section])) {
        data[section].forEach((item, index) => {
          xml += `    <item_${index}>\n`;
          Object.keys(item).forEach(key => {
            xml += `      <${key}>${this.escapeXML(item[key])}</${key}>\n`;
          });
          xml += `    </item_${index}>\n`;
        });
      } else if (data[section]) {
        Object.keys(data[section]).forEach(key => {
          xml += `    <${key}>${this.escapeXML(data[section][key])}</${key}>\n`;
        });
      }
      xml += `  </${section}>\n`;
    });
    
    xml += '</export>';
    return xml;
  }

  /**
   * Escape XML special characters
   */
  escapeXML(str) {
    if (typeof str !== 'string') {
      return str;
    }
    return str.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case "'": return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  /**
   * Get default purpose for consent type
   */
  getDefaultPurpose(consentType) {
    const purposes = {
      'data_processing': 'Processing personal data for document verification services',
      'document_storage': 'Storing encrypted documents on IPFS for verification purposes',
      'blockchain_storage': 'Storing document hashes on blockchain for immutable verification',
      'analytics': 'Analyzing system usage for performance improvements',
      'marketing': 'Sending marketing communications about our services',
      'third_party_sharing': 'Sharing data with authorized third parties for verification',
      'audit_logging': 'Maintaining audit logs for security and compliance purposes'
    };
    
    return purposes[consentType] || 'Data processing for service provision';
  }

  /**
   * Check data retention compliance
   */
  async checkRetentionCompliance() {
    try {
      const now = new Date();
      
      // Find expired consents
      const expiredConsents = await UserConsent.find({
        $expr: {
          $lt: [
            { $add: ['$consentDate', { $multiply: ['$retentionPeriod', 24 * 60 * 60 * 1000] }] },
            now
          ]
        },
        consentGiven: true
      });

      // Create automatic deletion requests for expired data
      for (const consent of expiredConsents) {
        // Map consent types to data categories
        const dataCategoryMap = {
          'data_processing': 'profile_data',
          'document_storage': 'document_metadata',
          'blockchain_storage': 'document_metadata',
          'analytics': 'performance_metrics',
          'marketing': 'profile_data',
          'third_party_sharing': 'profile_data',
          'audit_logging': 'audit_logs'
        };
        
        const dataCategory = dataCategoryMap[consent.consentType] || 'profile_data';
        
        await this.createDataDeletionRequest(
          consent.userId,
          consent.walletAddress,
          {
            requestType: 'partial_deletion',
            reason: 'data_retention_expired',
            dataCategories: [dataCategory]
          },
          { user: { _id: 'system' } } // System request
        );
      }

      logger.info('Retention compliance check completed:', {
        expiredConsents: expiredConsents.length
      });

      return {
        expiredConsents: expiredConsents.length,
        deletionRequestsCreated: expiredConsents.length
      };
    } catch (error) {
      logger.error('Failed to check retention compliance:', error);
      throw error;
    }
  }
}

// Create singleton instance
const privacyService = new PrivacyService();

module.exports = {
  UserConsent,
  DataDeletionRequest,
  DataExportRequest,
  privacyService
};