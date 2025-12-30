const mongoose = require('mongoose');
const logger = require('./logger');
const { auditLogger } = require('./auditLogger');

/**
 * System monitoring and alerting utilities
 */

// Performance metrics schema
const performanceMetricSchema = new mongoose.Schema({
  metricType: {
    type: String,
    required: true,
    enum: [
      'response_time',
      'memory_usage',
      'cpu_usage',
      'database_query_time',
      'blockchain_transaction_time',
      'ipfs_operation_time',
      'file_upload_time',
      'concurrent_users',
      'request_rate',
      'error_rate'
    ],
    index: true
  },
  
  value: {
    type: Number,
    required: true
  },
  
  unit: {
    type: String,
    required: true,
    enum: ['ms', 'seconds', 'bytes', 'mb', 'gb', 'percent', 'count', 'rate']
  },
  
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  endpoint: String,
  method: String,
  userId: String,
  
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'performance_metrics'
});

// TTL index for automatic cleanup (keep metrics for 30 days)
performanceMetricSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

const PerformanceMetric = mongoose.model('PerformanceMetric', performanceMetricSchema);

// Security alert schema
const securityAlertSchema = new mongoose.Schema({
  alertType: {
    type: String,
    required: true,
    enum: [
      'brute_force_attempt',
      'suspicious_login_pattern',
      'multiple_failed_attempts',
      'unusual_access_pattern',
      'potential_data_breach',
      'malicious_file_upload',
      'sql_injection_attempt',
      'xss_attempt',
      'command_injection_attempt',
      'rate_limit_exceeded',
      'unauthorized_admin_access',
      'system_resource_exhaustion',
      'database_connection_failure',
      'blockchain_interaction_failure'
    ],
    index: true
  },
  
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    index: true
  },
  
  description: {
    type: String,
    required: true
  },
  
  source: {
    ipAddress: String,
    userAgent: String,
    walletAddress: String,
    endpoint: String
  },
  
  evidence: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  status: {
    type: String,
    enum: ['open', 'investigating', 'resolved', 'false_positive'],
    default: 'open',
    index: true
  },
  
  resolvedAt: Date,
  resolvedBy: String,
  resolution: String,
  
  notificationsSent: [{
    channel: String,
    sentAt: Date,
    recipient: String
  }],
  
  relatedEvents: [String], // Event IDs from audit log
  
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'security_alerts'
});

const SecurityAlert = mongoose.model('SecurityAlert', securityAlertSchema);

/**
 * Monitoring System Class
 */
class MonitoringSystem {
  constructor() {
    this.metrics = new Map();
    this.alertThresholds = {
      response_time: 5000, // 5 seconds
      error_rate: 0.05, // 5%
      failed_login_attempts: 5,
      concurrent_failed_attempts: 3,
      memory_usage: 0.85, // 85%
      cpu_usage: 0.80 // 80%
    };
    
    this.alertCooldowns = new Map();
    this.performanceBuffer = [];
    
    // Start periodic monitoring only in non-test environment
    if (process.env.NODE_ENV !== 'test') {
      this.startPeriodicMonitoring();
    }
  }

  /**
   * Record performance metric
   */
  async recordMetric(metricType, value, unit, metadata = {}) {
    try {
      const metric = new PerformanceMetric({
        metricType,
        value,
        unit,
        metadata,
        endpoint: metadata.endpoint,
        method: metadata.method,
        userId: metadata.userId
      });

      await metric.save();
      
      // Check for performance alerts
      await this.checkPerformanceThresholds(metricType, value, metadata);
      
      return metric;
    } catch (error) {
      logger.error('Failed to record performance metric:', {
        error: error.message,
        metricType,
        value,
        unit
      });
    }
  }

  /**
   * Record response time
   */
  async recordResponseTime(req, res, responseTime) {
    const metadata = {
      endpoint: req.originalUrl,
      method: req.method,
      statusCode: res.statusCode,
      userId: req.user?.walletAddress
    };

    await this.recordMetric('response_time', responseTime, 'ms', metadata);
  }

  /**
   * Record error rate
   */
  async recordError(req, error, statusCode) {
    const metadata = {
      endpoint: req.originalUrl,
      method: req.method,
      statusCode,
      errorType: error.name,
      errorMessage: error.message,
      userId: req.user?.walletAddress
    };

    await this.recordMetric('error_rate', 1, 'count', metadata);
    
    // Check if this indicates a security issue
    if (statusCode === 401 || statusCode === 403) {
      await this.checkSecurityPatterns(req, error);
    }
  }

  /**
   * Record system resource usage
   */
  async recordSystemMetrics() {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Memory metrics
      await this.recordMetric('memory_usage', memUsage.heapUsed, 'bytes');
      
      // Database connection metrics
      const dbState = mongoose.connection.readyState;
      if (dbState !== 1) { // Not connected
        await this.createAlert('database_connection_failure', 'high', 
          'Database connection is not in ready state', {}, { connectionState: dbState });
      }
      
    } catch (error) {
      logger.error('Failed to record system metrics:', error);
    }
  }

  /**
   * Check performance thresholds and create alerts
   */
  async checkPerformanceThresholds(metricType, value, metadata) {
    const threshold = this.alertThresholds[metricType];
    if (!threshold) return;

    let shouldAlert = false;
    let severity = 'medium';

    switch (metricType) {
      case 'response_time':
        shouldAlert = value > threshold;
        severity = value > threshold * 2 ? 'high' : 'medium';
        break;
      case 'error_rate':
        shouldAlert = value > threshold;
        severity = value > threshold * 2 ? 'high' : 'medium';
        break;
      case 'memory_usage':
      case 'cpu_usage':
        shouldAlert = value > threshold;
        severity = value > 0.95 ? 'critical' : 'high';
        break;
    }

    if (shouldAlert) {
      const alertKey = `${metricType}_${metadata.endpoint || 'system'}`;
      
      // Check cooldown to prevent spam
      if (this.isInCooldown(alertKey)) return;
      
      await this.createAlert(
        `system_resource_exhaustion`,
        severity,
        `${metricType} exceeded threshold: ${value} > ${threshold}`,
        metadata,
        { metricType, value, threshold }
      );
      
      this.setCooldown(alertKey, 300000); // 5 minutes cooldown
    }
  }

  /**
   * Check for security patterns and anomalies
   */
  async checkSecurityPatterns(req, error) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const endpoint = req.originalUrl;
    const userAgent = req.get('User-Agent');
    
    // Check for brute force attempts
    await this.checkBruteForceAttempts(ipAddress, endpoint);
    
    // Check for suspicious patterns
    await this.checkSuspiciousPatterns(req, error);
    
    // Check for unusual access patterns
    await this.checkUnusualAccessPatterns(req);
  }

  /**
   * Check for brute force attempts
   */
  async checkBruteForceAttempts(ipAddress, endpoint) {
    const timeWindow = 15 * 60 * 1000; // 15 minutes
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindow);

    // Count failed attempts from this IP in the time window
    const failedAttempts = await PerformanceMetric.countDocuments({
      metricType: 'error_rate',
      'metadata.statusCode': { $in: [401, 403] },
      'metadata.ipAddress': ipAddress,
      createdAt: { $gte: windowStart }
    });

    if (failedAttempts >= this.alertThresholds.failed_login_attempts) {
      await this.createAlert(
        'brute_force_attempt',
        'high',
        `Multiple failed authentication attempts from IP: ${ipAddress}`,
        { ipAddress, endpoint },
        { failedAttempts, timeWindow: '15 minutes' }
      );
    }
  }

  /**
   * Check for suspicious patterns
   */
  async checkSuspiciousPatterns(req, error) {
    const patterns = [
      // SQL injection patterns
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      // XSS patterns
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      // Command injection patterns
      /(\||&|;|`|\$\(|\$\{)/g
    ];

    const requestData = JSON.stringify({
      body: req.body,
      query: req.query,
      params: req.params
    });

    for (const pattern of patterns) {
      if (pattern.test(requestData)) {
        let alertType = 'suspicious_login_pattern';
        if (pattern.source.includes('SELECT|INSERT')) {
          alertType = 'sql_injection_attempt';
        } else if (pattern.source.includes('script')) {
          alertType = 'xss_attempt';
        } else if (pattern.source.includes('\\|')) {
          alertType = 'command_injection_attempt';
        }

        await this.createAlert(
          alertType,
          'high',
          `Potential attack pattern detected in request`,
          {
            ipAddress: req.ip,
            endpoint: req.originalUrl,
            userAgent: req.get('User-Agent')
          },
          {
            pattern: pattern.source,
            matchedContent: requestData.substring(0, 200)
          }
        );
        break;
      }
    }
  }

  /**
   * Check for unusual access patterns
   */
  async checkUnusualAccessPatterns(req) {
    const userAgent = req.get('User-Agent');
    const ipAddress = req.ip;
    
    // Check for bot-like behavior
    if (!userAgent || userAgent.includes('bot') || userAgent.includes('crawler')) {
      await this.createAlert(
        'unusual_access_pattern',
        'medium',
        'Potential bot access detected',
        { ipAddress, userAgent, endpoint: req.originalUrl },
        { reason: 'suspicious_user_agent' }
      );
    }
    
    // Check for rapid requests from same IP
    const recentRequests = await PerformanceMetric.countDocuments({
      'metadata.ipAddress': ipAddress,
      createdAt: { $gte: new Date(Date.now() - 60000) } // Last minute
    });
    
    if (recentRequests > 100) { // More than 100 requests per minute
      await this.createAlert(
        'rate_limit_exceeded',
        'medium',
        'Unusually high request rate detected',
        { ipAddress, endpoint: req.originalUrl },
        { requestsPerMinute: recentRequests }
      );
    }
  }

  /**
   * Create security alert
   */
  async createAlert(alertType, severity, description, source, evidence) {
    try {
      // Check if similar alert exists recently
      const recentAlert = await SecurityAlert.findOne({
        alertType,
        'source.ipAddress': source.ipAddress,
        createdAt: { $gte: new Date(Date.now() - 3600000) }, // Last hour
        status: { $in: ['open', 'investigating'] }
      });

      if (recentAlert) {
        // Update existing alert with new evidence
        recentAlert.evidence = { ...recentAlert.evidence, ...evidence };
        await recentAlert.save();
        return recentAlert;
      }

      const alert = new SecurityAlert({
        alertType,
        severity,
        description,
        source,
        evidence
      });

      await alert.save();
      
      // Log the alert
      logger.warn('Security alert created:', {
        alertId: alert._id,
        alertType,
        severity,
        description,
        source
      });

      // Send notifications for high/critical alerts
      if (severity === 'high' || severity === 'critical') {
        await this.sendAlertNotification(alert);
      }

      return alert;
    } catch (error) {
      logger.error('Failed to create security alert:', {
        error: error.message,
        alertType,
        severity,
        description
      });
    }
  }

  /**
   * Send alert notification
   */
  async sendAlertNotification(alert) {
    try {
      // In a real implementation, this would send notifications via:
      // - Email
      // - Slack/Discord webhooks
      // - SMS
      // - Push notifications
      
      logger.error('SECURITY ALERT', {
        alertId: alert._id,
        type: alert.alertType,
        severity: alert.severity,
        description: alert.description,
        source: alert.source,
        timestamp: alert.createdAt
      });

      // Record notification
      alert.notificationsSent.push({
        channel: 'logger',
        sentAt: new Date(),
        recipient: 'system_admin'
      });
      
      await alert.save();
    } catch (error) {
      logger.error('Failed to send alert notification:', error);
    }
  }

  /**
   * Check if alert is in cooldown period
   */
  isInCooldown(alertKey) {
    const cooldownEnd = this.alertCooldowns.get(alertKey);
    return cooldownEnd && Date.now() < cooldownEnd;
  }

  /**
   * Set cooldown for alert type
   */
  setCooldown(alertKey, duration) {
    this.alertCooldowns.set(alertKey, Date.now() + duration);
  }

  /**
   * Get system health status
   */
  async getSystemHealth() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);

    // Get recent metrics
    const recentMetrics = await PerformanceMetric.aggregate([
      { $match: { createdAt: { $gte: oneHourAgo } } },
      {
        $group: {
          _id: '$metricType',
          avgValue: { $avg: '$value' },
          maxValue: { $max: '$value' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get open alerts
    const openAlerts = await SecurityAlert.countDocuments({
      status: { $in: ['open', 'investigating'] }
    });

    // Get critical alerts
    const criticalAlerts = await SecurityAlert.countDocuments({
      status: { $in: ['open', 'investigating'] },
      severity: 'critical'
    });

    // Determine overall health status
    let healthStatus = 'healthy';
    if (criticalAlerts > 0) {
      healthStatus = 'critical';
    } else if (openAlerts > 5) {
      healthStatus = 'warning';
    }

    return {
      status: healthStatus,
      timestamp: now,
      metrics: recentMetrics,
      alerts: {
        open: openAlerts,
        critical: criticalAlerts
      },
      database: {
        connected: mongoose.connection.readyState === 1
      }
    };
  }

  /**
   * Start periodic monitoring tasks
   */
  startPeriodicMonitoring() {
    // Record system metrics every 5 minutes
    setInterval(() => {
      this.recordSystemMetrics();
    }, 5 * 60 * 1000);

    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000);

    // Clear alert cooldowns every hour
    setInterval(() => {
      this.alertCooldowns.clear();
    }, 60 * 60 * 1000);
  }

  /**
   * Clean up old metrics
   */
  async cleanupOldMetrics() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days

      const result = await PerformanceMetric.deleteMany({
        createdAt: { $lt: cutoffDate }
      });

      logger.info('Performance metrics cleanup completed', {
        deletedCount: result.deletedCount,
        cutoffDate
      });
    } catch (error) {
      logger.error('Failed to cleanup old metrics:', error);
    }
  }

  /**
   * Generate monitoring report
   */
  async generateMonitoringReport(startDate, endDate) {
    const dateFilter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    // Performance summary
    const performanceSummary = await PerformanceMetric.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$metricType',
          avgValue: { $avg: '$value' },
          minValue: { $min: '$value' },
          maxValue: { $max: '$value' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Security alerts summary
    const alertsSummary = await SecurityAlert.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            alertType: '$alertType',
            severity: '$severity'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Top endpoints by response time
    const slowEndpoints = await PerformanceMetric.aggregate([
      {
        $match: {
          ...dateFilter,
          metricType: 'response_time'
        }
      },
      {
        $group: {
          _id: '$endpoint',
          avgResponseTime: { $avg: '$value' },
          maxResponseTime: { $max: '$value' },
          requestCount: { $sum: 1 }
        }
      },
      { $sort: { avgResponseTime: -1 } },
      { $limit: 10 }
    ]);

    return {
      period: { startDate, endDate },
      performance: performanceSummary,
      security: alertsSummary,
      slowEndpoints,
      generatedAt: new Date()
    };
  }
}

// Create singleton instance
const monitoring = new MonitoringSystem();

module.exports = {
  PerformanceMetric,
  SecurityAlert,
  monitoring
};