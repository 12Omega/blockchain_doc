const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Comprehensive audit logging system for security and compliance
 */

// Audit log schema
const auditLogSchema = new mongoose.Schema({
  // Event identification
  eventId: {
    type: String,
    required: true,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      // Authentication events
      'auth_login_success',
      'auth_login_failure',
      'auth_logout',
      'auth_token_refresh',
      'auth_nonce_request',
      'auth_signature_verification',
      
      // Document events
      'document_upload',
      'document_download',
      'document_verify',
      'document_share',
      'document_access_grant',
      'document_access_revoke',
      'document_delete',
      
      // User management events
      'user_create',
      'user_update',
      'user_role_change',
      'user_verify',
      'user_delete',
      
      // Security events
      'security_violation',
      'suspicious_activity',
      'rate_limit_exceeded',
      'invalid_input_detected',
      'unauthorized_access_attempt',
      'file_validation_failure',
      
      // System events
      'system_startup',
      'system_shutdown',
      'database_connection',
      'blockchain_interaction',
      'ipfs_operation',
      
      // Admin events
      'admin_action',
      'config_change',
      'backup_created',
      'maintenance_mode'
    ],
    index: true
  },
  
  // Timestamp information
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // User information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  walletAddress: {
    type: String,
    index: true
  },
  userRole: String,
  
  // Request information
  requestId: String,
  sessionId: String,
  ipAddress: {
    type: String,
    index: true
  },
  userAgent: String,
  
  // Resource information
  resourceType: {
    type: String,
    enum: ['document', 'user', 'system', 'auth', 'api']
  },
  resourceId: String,
  
  // Action details
  action: {
    type: String,
    required: true
  },
  method: String, // HTTP method
  endpoint: String, // API endpoint
  
  // Event data
  eventData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Security context
  securityContext: {
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    threatIndicators: [String],
    geolocation: {
      country: String,
      region: String,
      city: String
    }
  },
  
  // Result information
  result: {
    type: String,
    enum: ['success', 'failure', 'error', 'blocked'],
    required: true,
    index: true
  },
  errorCode: String,
  errorMessage: String,
  
  // Performance metrics
  responseTime: Number, // in milliseconds
  
  // Compliance flags
  complianceFlags: {
    gdprRelevant: { type: Boolean, default: false },
    hipaaRelevant: { type: Boolean, default: false },
    pciRelevant: { type: Boolean, default: false }
  },
  
  // Retention information
  retentionPeriod: {
    type: Number,
    default: 2555 // 7 years in days
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'audit_logs'
});

// Indexes for performance
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ eventType: 1, timestamp: -1 });
auditLogSchema.index({ walletAddress: 1, timestamp: -1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });
auditLogSchema.index({ 'securityContext.riskLevel': 1, timestamp: -1 });
auditLogSchema.index({ result: 1, timestamp: -1 });

// TTL index for automatic cleanup based on retention period
auditLogSchema.index({ 
  createdAt: 1 
}, { 
  expireAfterSeconds: 0,
  partialFilterExpression: { retentionPeriod: { $exists: true } }
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

/**
 * Audit Logger Class
 */
class AuditLogger {
  constructor() {
    this.requestCounter = 0;
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${++this.requestCounter}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log audit event
   */
  async logEvent(eventData) {
    try {
      const auditEntry = new AuditLog({
        eventId: this.generateEventId(),
        ...eventData,
        timestamp: new Date()
      });

      await auditEntry.save();
      
      // Also log to application logger for immediate visibility
      const logLevel = this.getLogLevel(eventData.eventType, eventData.result);
      logger[logLevel]('Audit Event', {
        eventId: auditEntry.eventId,
        eventType: eventData.eventType,
        action: eventData.action,
        result: eventData.result,
        userId: eventData.userId,
        walletAddress: eventData.walletAddress,
        ipAddress: eventData.ipAddress,
        riskLevel: eventData.securityContext?.riskLevel
      });

      return auditEntry.eventId;
    } catch (error) {
      logger.error('Failed to log audit event:', {
        error: error.message,
        eventData: JSON.stringify(eventData, null, 2)
      });
      throw error;
    }
  }

  /**
   * Determine log level based on event type and result
   */
  getLogLevel(eventType, result) {
    if (result === 'failure' || result === 'error' || result === 'blocked') {
      return 'warn';
    }
    
    if (eventType.includes('security') || eventType.includes('suspicious')) {
      return 'warn';
    }
    
    return 'info';
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(eventType, req, result, additionalData = {}) {
    const eventData = {
      eventType,
      action: `Authentication ${eventType.split('_').pop()}`,
      method: req.method,
      endpoint: req.originalUrl,
      result,
      resourceType: 'auth',
      walletAddress: req.body?.walletAddress || req.user?.walletAddress,
      userId: req.user?._id,
      userRole: req.user?.role,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      requestId: req.id,
      eventData: {
        ...additionalData,
        requestBody: this.sanitizeRequestBody(req.body, ['password', 'signature', 'nonce'])
      },
      securityContext: {
        riskLevel: this.assessRiskLevel(eventType, result, req),
        threatIndicators: this.detectThreatIndicators(req)
      }
    };

    return await this.logEvent(eventData);
  }

  /**
   * Log document events
   */
  async logDocumentEvent(eventType, req, documentHash, result, additionalData = {}) {
    const eventData = {
      eventType,
      action: `Document ${eventType.split('_').pop()}`,
      method: req.method,
      endpoint: req.originalUrl,
      result,
      resourceType: 'document',
      resourceId: documentHash,
      walletAddress: req.user?.walletAddress,
      userId: req.user?._id,
      userRole: req.user?.role,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      requestId: req.id,
      eventData: {
        documentHash,
        ...additionalData,
        fileInfo: req.file ? {
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype
        } : undefined
      },
      securityContext: {
        riskLevel: this.assessRiskLevel(eventType, result, req),
        threatIndicators: this.detectThreatIndicators(req)
      }
    };

    return await this.logEvent(eventData);
  }

  /**
   * Log security events
   */
  async logSecurityEvent(eventType, req, threatType, result, additionalData = {}) {
    const eventData = {
      eventType,
      action: `Security ${eventType.split('_').pop()}`,
      method: req?.method,
      endpoint: req?.originalUrl,
      result,
      resourceType: 'system',
      walletAddress: req?.user?.walletAddress,
      userId: req?.user?._id,
      userRole: req?.user?.role,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get?.('User-Agent'),
      requestId: req?.id,
      eventData: {
        threatType,
        ...additionalData
      },
      securityContext: {
        riskLevel: 'high',
        threatIndicators: [threatType, ...this.detectThreatIndicators(req)]
      }
    };

    return await this.logEvent(eventData);
  }

  /**
   * Log user management events
   */
  async logUserEvent(eventType, req, targetUserId, result, additionalData = {}) {
    const eventData = {
      eventType,
      action: `User ${eventType.split('_').pop()}`,
      method: req.method,
      endpoint: req.originalUrl,
      result,
      resourceType: 'user',
      resourceId: targetUserId,
      walletAddress: req.user?.walletAddress,
      userId: req.user?._id,
      userRole: req.user?.role,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      requestId: req.id,
      eventData: {
        targetUserId,
        ...additionalData
      },
      securityContext: {
        riskLevel: this.assessRiskLevel(eventType, result, req),
        threatIndicators: this.detectThreatIndicators(req)
      }
    };

    return await this.logEvent(eventData);
  }

  /**
   * Log system events
   */
  async logSystemEvent(eventType, action, result, additionalData = {}) {
    const eventData = {
      eventType,
      action,
      result,
      resourceType: 'system',
      eventData: additionalData,
      securityContext: {
        riskLevel: 'low'
      }
    };

    return await this.logEvent(eventData);
  }

  /**
   * Assess risk level based on event characteristics
   */
  assessRiskLevel(eventType, result, req) {
    // Critical risk indicators
    if (eventType.includes('security') || eventType.includes('suspicious')) {
      return 'critical';
    }
    
    if (result === 'blocked' || result === 'failure') {
      return 'high';
    }
    
    // Check for admin actions
    if (req?.user?.role === 'admin' && eventType.includes('user')) {
      return 'medium';
    }
    
    // Check for sensitive operations
    if (eventType.includes('document_delete') || eventType.includes('role_change')) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Detect threat indicators from request
   */
  detectThreatIndicators(req) {
    const indicators = [];
    
    if (!req) return indicators;
    
    // Check for suspicious user agents
    const userAgent = req.get?.('User-Agent') || '';
    if (!userAgent || userAgent.includes('bot') || userAgent.includes('crawler')) {
      indicators.push('suspicious_user_agent');
    }
    
    // Check for unusual request patterns
    if (req.method === 'POST' && !req.body) {
      indicators.push('empty_post_body');
    }
    
    // Check for potential automation
    if (req.headers?.['x-requested-with'] === 'XMLHttpRequest' && 
        !req.headers?.referer) {
      indicators.push('potential_automation');
    }
    
    return indicators;
  }

  /**
   * Sanitize request body for logging
   */
  sanitizeRequestBody(body, sensitiveFields = []) {
    if (!body || typeof body !== 'object') {
      return body;
    }
    
    const sanitized = { ...body };
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Query audit logs
   */
  async queryLogs(filters = {}, options = {}) {
    const {
      eventType,
      walletAddress,
      ipAddress,
      result,
      riskLevel,
      startDate,
      endDate,
      resourceType,
      resourceId
    } = filters;

    const {
      page = 1,
      limit = 100,
      sortBy = 'timestamp',
      sortOrder = -1
    } = options;

    const query = {};
    
    if (eventType) query.eventType = eventType;
    if (walletAddress) query.walletAddress = walletAddress;
    if (ipAddress) query.ipAddress = ipAddress;
    if (result) query.result = result;
    if (riskLevel) query['securityContext.riskLevel'] = riskLevel;
    if (resourceType) query.resourceType = resourceType;
    if (resourceId) query.resourceId = resourceId;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    return {
      logs,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    };
  }

  /**
   * Generate audit report
   */
  async generateReport(filters = {}, reportType = 'summary') {
    const { startDate, endDate } = filters;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.timestamp = {};
      if (startDate) dateFilter.timestamp.$gte = new Date(startDate);
      if (endDate) dateFilter.timestamp.$lte = new Date(endDate);
    }

    switch (reportType) {
      case 'summary':
        return await this.generateSummaryReport(dateFilter);
      case 'security':
        return await this.generateSecurityReport(dateFilter);
      case 'user_activity':
        return await this.generateUserActivityReport(dateFilter);
      case 'document_activity':
        return await this.generateDocumentActivityReport(dateFilter);
      default:
        throw new Error('Invalid report type');
    }
  }

  /**
   * Generate summary report
   */
  async generateSummaryReport(dateFilter) {
    const pipeline = [
      { $match: dateFilter },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ['$result', 'success'] }, 1, 0] }
          },
          failureCount: {
            $sum: { $cond: [{ $eq: ['$result', 'failure'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ];

    const eventSummary = await AuditLog.aggregate(pipeline);
    
    const totalEvents = await AuditLog.countDocuments(dateFilter);
    const securityEvents = await AuditLog.countDocuments({
      ...dateFilter,
      eventType: { $regex: /security|suspicious/ }
    });

    return {
      totalEvents,
      securityEvents,
      eventBreakdown: eventSummary,
      generatedAt: new Date()
    };
  }

  /**
   * Generate security report
   */
  async generateSecurityReport(dateFilter) {
    const securityEvents = await AuditLog.find({
      ...dateFilter,
      $or: [
        { eventType: { $regex: /security|suspicious/ } },
        { result: 'blocked' },
        { 'securityContext.riskLevel': { $in: ['high', 'critical'] } }
      ]
    }).sort({ timestamp: -1 }).limit(1000);

    const threatIndicators = await AuditLog.aggregate([
      { $match: { ...dateFilter, 'securityContext.threatIndicators': { $exists: true, $ne: [] } } },
      { $unwind: '$securityContext.threatIndicators' },
      { $group: { _id: '$securityContext.threatIndicators', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const riskLevelDistribution = await AuditLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$securityContext.riskLevel', count: { $sum: 1 } } }
    ]);

    return {
      securityEvents,
      threatIndicators,
      riskLevelDistribution,
      generatedAt: new Date()
    };
  }

  /**
   * Generate user activity report
   */
  async generateUserActivityReport(dateFilter) {
    const userActivity = await AuditLog.aggregate([
      { $match: { ...dateFilter, walletAddress: { $exists: true } } },
      {
        $group: {
          _id: '$walletAddress',
          totalActions: { $sum: 1 },
          lastActivity: { $max: '$timestamp' },
          eventTypes: { $addToSet: '$eventType' }
        }
      },
      { $sort: { totalActions: -1 } },
      { $limit: 100 }
    ]);

    return {
      userActivity,
      generatedAt: new Date()
    };
  }

  /**
   * Generate document activity report
   */
  async generateDocumentActivityReport(dateFilter) {
    const documentActivity = await AuditLog.aggregate([
      { 
        $match: { 
          ...dateFilter, 
          resourceType: 'document',
          resourceId: { $exists: true }
        } 
      },
      {
        $group: {
          _id: '$resourceId',
          totalActions: { $sum: 1 },
          lastActivity: { $max: '$timestamp' },
          eventTypes: { $addToSet: '$eventType' },
          uniqueUsers: { $addToSet: '$walletAddress' }
        }
      },
      { $sort: { totalActions: -1 } },
      { $limit: 100 }
    ]);

    return {
      documentActivity,
      generatedAt: new Date()
    };
  }

  /**
   * Clean up old audit logs based on retention policy
   */
  async cleanupOldLogs() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 2555); // 7 years default

    const result = await AuditLog.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    logger.info('Audit log cleanup completed', {
      deletedCount: result.deletedCount,
      cutoffDate
    });

    return result;
  }
}

// Create singleton instance
const auditLogger = new AuditLogger();

module.exports = {
  AuditLog,
  auditLogger
};