const cron = require('node-cron');
const { privacyService } = require('../services/privacyService');
const { auditLogger } = require('../utils/auditLogger');
const logger = require('../utils/logger');

/**
 * Data retention compliance job
 * Runs daily to check for expired data and create deletion requests
 */

class RetentionComplianceJob {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.schedule = '0 2 * * *'; // Run daily at 2 AM
  }

  /**
   * Start the retention compliance job
   */
  start() {
    logger.info('Starting retention compliance job with schedule:', this.schedule);
    
    cron.schedule(this.schedule, async () => {
      await this.run();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });
  }

  /**
   * Run the retention compliance check
   */
  async run() {
    if (this.isRunning) {
      logger.warn('Retention compliance job is already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();
    
    try {
      logger.info('Starting retention compliance check...');
      
      // Log system event
      await auditLogger.logSystemEvent(
        'system_maintenance',
        'Data retention compliance check started',
        'success',
        { jobType: 'retention_compliance', startTime }
      );

      // Check retention compliance
      const results = await privacyService.checkRetentionCompliance();
      
      // Additional cleanup tasks
      await this.cleanupExpiredExportRequests();
      await this.cleanupOldDeletionRequests();
      
      const endTime = new Date();
      const duration = endTime - startTime;
      
      logger.info('Retention compliance check completed:', {
        duration: `${duration}ms`,
        expiredConsents: results.expiredConsents,
        deletionRequestsCreated: results.deletionRequestsCreated
      });

      // Log completion
      await auditLogger.logSystemEvent(
        'system_maintenance',
        'Data retention compliance check completed',
        'success',
        {
          jobType: 'retention_compliance',
          duration,
          results
        }
      );

      this.lastRun = endTime;
      
    } catch (error) {
      logger.error('Retention compliance job failed:', {
        error: error.message,
        stack: error.stack
      });

      // Log failure
      await auditLogger.logSystemEvent(
        'system_maintenance',
        'Data retention compliance check failed',
        'failure',
        {
          jobType: 'retention_compliance',
          error: error.message
        }
      );
      
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Clean up expired data export requests
   */
  async cleanupExpiredExportRequests() {
    try {
      const { DataExportRequest } = require('../services/privacyService');
      
      const expiredRequests = await DataExportRequest.find({
        expiryDate: { $lt: new Date() },
        status: { $in: ['completed', 'processing'] }
      });

      let cleanedCount = 0;
      
      for (const request of expiredRequests) {
        // In a real implementation, you would also delete the actual export files
        // from your storage system here
        
        request.status = 'expired';
        request.downloadUrl = null;
        await request.save();
        
        cleanedCount++;
      }

      if (cleanedCount > 0) {
        logger.info('Cleaned up expired export requests:', { count: cleanedCount });
      }

      return cleanedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired export requests:', error);
      throw error;
    }
  }

  /**
   * Clean up old completed deletion requests
   */
  async cleanupOldDeletionRequests() {
    try {
      const { DataDeletionRequest } = require('../services/privacyService');
      
      // Keep completed deletion requests for 1 year for audit purposes
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
      
      const oldRequests = await DataDeletionRequest.find({
        status: 'completed',
        completionDate: { $lt: cutoffDate }
      });

      let archivedCount = 0;
      
      for (const request of oldRequests) {
        // Archive the request by removing sensitive data but keeping audit trail
        request.verificationCode = '[ARCHIVED]';
        request.notes = (request.notes || '') + ' [ARCHIVED - ' + new Date().toISOString() + ']';
        
        // Remove specific document references but keep counts
        request.specificDocuments = [];
        
        await request.save();
        archivedCount++;
      }

      if (archivedCount > 0) {
        logger.info('Archived old deletion requests:', { count: archivedCount });
      }

      return archivedCount;
    } catch (error) {
      logger.error('Failed to cleanup old deletion requests:', error);
      throw error;
    }
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      schedule: this.schedule,
      nextRun: this.getNextRunTime()
    };
  }

  /**
   * Get next scheduled run time
   */
  getNextRunTime() {
    // Simple calculation for next 2 AM UTC
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(2, 0, 0, 0);
    
    if (next <= now) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    
    return next;
  }

  /**
   * Manual run for testing/admin purposes
   */
  async manualRun() {
    logger.info('Manual retention compliance check triggered');
    await this.run();
  }
}

// Create singleton instance
const retentionComplianceJob = new RetentionComplianceJob();

module.exports = retentionComplianceJob;