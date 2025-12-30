const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const { monitoring } = require('../utils/monitoring');
const cacheService = require('../services/cacheService');
const dbOptimizationService = require('../services/databaseOptimizationService');
const blockchainOptimizationService = require('../services/blockchainOptimizationService');
const batchProcessingService = require('../services/batchProcessingService');
const logger = require('../utils/logger');

/**
 * Performance monitoring and optimization API routes
 * @access Admin only
 */

// Middleware to require admin role
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

/**
 * @route GET /api/performance/stats
 * @desc Get comprehensive performance statistics
 * @access Admin
 */
router.get('/stats', auth, requireAdmin, async (req, res) => {
  try {
    const [
      systemHealth,
      dbStats,
      cacheStats,
      blockchainStats,
      batchStats,
      monitoringReport
    ] = await Promise.all([
      monitoring.getSystemHealth(),
      dbOptimizationService.getPerformanceStats(),
      cacheService.getStats(),
      blockchainOptimizationService.getGasStats(),
      batchProcessingService.getAllQueueStatuses(),
      monitoring.generateMonitoringReport(
        new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        new Date()
      )
    ]);

    res.json({
      success: true,
      data: {
        systemHealth,
        database: dbStats,
        cache: cacheStats,
        blockchain: blockchainStats,
        batchProcessing: batchStats,
        monitoring: monitoringReport,
        timestamp: new Date()
      }
    });

  } catch (error) {
    logger.error('Failed to get performance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve performance statistics',
      error: error.message
    });
  }
});

/**
 * @route GET /api/performance/cache/stats
 * @desc Get cache performance statistics
 * @access Admin
 */
router.get('/cache/stats', auth, requireAdmin, async (req, res) => {
  try {
    const stats = await cacheService.getStats();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to get cache stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cache statistics',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/performance/cache/clear
 * @desc Clear cache (specific namespace or all)
 * @access Admin
 */
router.delete('/cache/clear', auth, requireAdmin, async (req, res) => {
  try {
    const { namespace } = req.query;
    
    let clearedCount = 0;
    
    if (namespace) {
      clearedCount = await cacheService.invalidateNamespace(namespace);
    } else {
      await cacheService.flushAll();
      clearedCount = 'all';
    }

    res.json({
      success: true,
      message: 'Cache cleared successfully',
      data: {
        namespace: namespace || 'all',
        clearedCount
      }
    });

  } catch (error) {
    logger.error('Failed to clear cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      error: error.message
    });
  }
});

/**
 * @route GET /api/performance/database/stats
 * @desc Get database performance statistics
 * @access Admin
 */
router.get('/database/stats', auth, requireAdmin, async (req, res) => {
  try {
    const stats = await dbOptimizationService.getPerformanceStats();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to get database stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve database statistics',
      error: error.message
    });
  }
});

/**
 * @route POST /api/performance/database/optimize
 * @desc Optimize database indexes
 * @access Admin
 */
router.post('/database/optimize', auth, requireAdmin, async (req, res) => {
  try {
    const optimizationResults = await dbOptimizationService.optimizeIndexes();
    
    res.json({
      success: true,
      message: 'Database optimization analysis completed',
      data: optimizationResults
    });

  } catch (error) {
    logger.error('Failed to optimize database:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to optimize database',
      error: error.message
    });
  }
});

/**
 * @route GET /api/performance/blockchain/stats
 * @desc Get blockchain performance statistics
 * @access Admin
 */
router.get('/blockchain/stats', auth, requireAdmin, async (req, res) => {
  try {
    const [gasStats, networkCongestion] = await Promise.all([
      blockchainOptimizationService.getGasStats(),
      blockchainOptimizationService.getNetworkCongestion()
    ]);
    
    res.json({
      success: true,
      data: {
        gasOptimization: gasStats,
        networkCongestion
      }
    });

  } catch (error) {
    logger.error('Failed to get blockchain stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve blockchain statistics',
      error: error.message
    });
  }
});

/**
 * @route POST /api/performance/blockchain/reset-stats
 * @desc Reset blockchain gas statistics
 * @access Admin
 */
router.post('/blockchain/reset-stats', auth, requireAdmin, async (req, res) => {
  try {
    blockchainOptimizationService.resetGasStats();
    
    res.json({
      success: true,
      message: 'Blockchain statistics reset successfully'
    });

  } catch (error) {
    logger.error('Failed to reset blockchain stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset blockchain statistics',
      error: error.message
    });
  }
});

/**
 * @route GET /api/performance/batch/status
 * @desc Get batch processing status
 * @access Admin
 */
router.get('/batch/status', auth, requireAdmin, async (req, res) => {
  try {
    const status = batchProcessingService.getAllQueueStatuses();
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Failed to get batch status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve batch processing status',
      error: error.message
    });
  }
});

/**
 * @route POST /api/performance/batch/flush
 * @desc Flush all batch queues
 * @access Admin
 */
router.post('/batch/flush', auth, requireAdmin, async (req, res) => {
  try {
    await batchProcessingService.flushAll();
    
    res.json({
      success: true,
      message: 'All batch queues flushed successfully'
    });

  } catch (error) {
    logger.error('Failed to flush batch queues:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to flush batch queues',
      error: error.message
    });
  }
});

/**
 * @route GET /api/performance/monitoring/report
 * @desc Generate monitoring report
 * @access Admin
 */
router.get('/monitoring/report', auth, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, type = 'summary' } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const report = await monitoring.generateMonitoringReport(start, end);
    
    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    logger.error('Failed to generate monitoring report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate monitoring report',
      error: error.message
    });
  }
});

/**
 * @route GET /api/performance/alerts
 * @desc Get recent security alerts
 * @access Admin
 */
router.get('/alerts', auth, requireAdmin, async (req, res) => {
  try {
    const { SecurityAlert } = require('../utils/monitoring');
    const { limit = 50, severity } = req.query;
    
    const query = {};
    if (severity) {
      query.severity = severity;
    }
    
    const alerts = await SecurityAlert.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json({
      success: true,
      data: alerts
    });

  } catch (error) {
    logger.error('Failed to get alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve alerts',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/performance/alerts/:alertId/resolve
 * @desc Resolve a security alert
 * @access Admin
 */
router.put('/alerts/:alertId/resolve', auth, requireAdmin, async (req, res) => {
  try {
    const { SecurityAlert } = require('../utils/monitoring');
    const { alertId } = req.params;
    const { resolution } = req.body;
    
    const alert = await SecurityAlert.findByIdAndUpdate(
      alertId,
      {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: req.user._id,
        resolution
      },
      { new: true }
    );
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Alert resolved successfully',
      data: alert
    });

  } catch (error) {
    logger.error('Failed to resolve alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve alert',
      error: error.message
    });
  }
});

/**
 * @route GET /api/performance/system/health
 * @desc Get comprehensive system health check
 * @access Admin
 */
router.get('/system/health', auth, requireAdmin, async (req, res) => {
  try {
    const health = await monitoring.getSystemHealth();
    
    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    logger.error('Failed to get system health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system health',
      error: error.message
    });
  }
});

module.exports = router;