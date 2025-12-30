const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const { monitoring } = require('../utils/monitoring');
const ipfsService = require('../services/ipfsService');
const blockchainService = require('../services/blockchainService');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

/**
 * Comprehensive monitoring and health check API routes
 * Provides system status, service health, and performance metrics
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
 * @route GET /api/monitoring/health
 * @desc Comprehensive health check for all services
 * @access Public (basic info) / Admin (detailed info)
 */
router.get('/health', async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    
    // Basic health checks
    const [
      ipfsHealth,
      blockchainHealth,
      databaseHealth,
      cacheHealth
    ] = await Promise.all([
      checkIPFSHealth(),
      checkBlockchainHealth(),
      checkDatabaseHealth(),
      checkCacheHealth()
    ]);

    const overallStatus = determineOverallStatus([
      ipfsHealth.status,
      blockchainHealth.status,
      databaseHealth.status,
      cacheHealth.status
    ]);

    const response = {
      success: true,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        ipfs: ipfsHealth,
        blockchain: blockchainHealth,
        database: databaseHealth,
        cache: cacheHealth
      }
    };

    // Add detailed metrics for admin users
    if (isAdmin) {
      response.system = {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      };
    }

    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    res.status(statusCode).json(response);

  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/monitoring/health/ipfs
 * @desc Detailed IPFS provider health check
 * @access Admin
 */
router.get('/health/ipfs', auth, requireAdmin, async (req, res) => {
  try {
    const ipfsHealth = await ipfsService.checkIPFSHealth();
    const queueStatus = ipfsService.getQueueStatus();
    const enabledProviders = ipfsService.getEnabledProviders();

    res.json({
      success: true,
      data: {
        providers: ipfsHealth,
        queue: queueStatus,
        enabledProviders,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('IPFS health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'IPFS health check failed',
      error: error.message
    });
  }
});

/**
 * @route GET /api/monitoring/health/blockchain
 * @desc Detailed blockchain connectivity check
 * @access Admin
 */
router.get('/health/blockchain', auth, requireAdmin, async (req, res) => {
  try {
    const health = await checkBlockchainHealth(true);

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    logger.error('Blockchain health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Blockchain health check failed',
      error: error.message
    });
  }
});

/**
 * @route GET /api/monitoring/health/database
 * @desc Detailed database health check
 * @access Admin
 */
router.get('/health/database', auth, requireAdmin, async (req, res) => {
  try {
    const health = await checkDatabaseHealth(true);

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    logger.error('Database health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Database health check failed',
      error: error.message
    });
  }
});

/**
 * @route GET /api/monitoring/metrics
 * @desc Get performance metrics
 * @access Admin
 */
router.get('/metrics', auth, requireAdmin, async (req, res) => {
  try {
    const { timeRange = '1h' } = req.query;
    
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const rangeMs = timeRanges[timeRange] || timeRanges['1h'];
    const startDate = new Date(Date.now() - rangeMs);
    const endDate = new Date();

    const report = await monitoring.generateMonitoringReport(startDate, endDate);

    res.json({
      success: true,
      data: {
        ...report,
        timeRange,
        startDate,
        endDate
      }
    });

  } catch (error) {
    logger.error('Failed to get metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve metrics',
      error: error.message
    });
  }
});

/**
 * @route GET /api/monitoring/alerts
 * @desc Get security and performance alerts
 * @access Admin
 */
router.get('/alerts', auth, requireAdmin, async (req, res) => {
  try {
    const { SecurityAlert } = require('../utils/monitoring');
    const { 
      limit = 50, 
      severity, 
      status = 'open',
      alertType 
    } = req.query;
    
    const query = {};
    
    if (severity) {
      query.severity = severity;
    }
    
    if (status !== 'all') {
      query.status = status === 'open' ? { $in: ['open', 'investigating'] } : status;
    }
    
    if (alertType) {
      query.alertType = alertType;
    }
    
    const [alerts, totalCount, criticalCount] = await Promise.all([
      SecurityAlert.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean(),
      SecurityAlert.countDocuments(query),
      SecurityAlert.countDocuments({ 
        ...query, 
        severity: 'critical',
        status: { $in: ['open', 'investigating'] }
      })
    ]);
    
    res.json({
      success: true,
      data: {
        alerts,
        totalCount,
        criticalCount,
        filters: { limit, severity, status, alertType }
      }
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
 * @route PUT /api/monitoring/alerts/:alertId
 * @desc Update alert status
 * @access Admin
 */
router.put('/alerts/:alertId', auth, requireAdmin, async (req, res) => {
  try {
    const { SecurityAlert } = require('../utils/monitoring');
    const { alertId } = req.params;
    const { status, resolution } = req.body;
    
    const updateData = { status };
    
    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = req.user.walletAddress || req.user._id;
      updateData.resolution = resolution;
    }
    
    const alert = await SecurityAlert.findByIdAndUpdate(
      alertId,
      updateData,
      { new: true }
    );
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }
    
    logger.info('Alert updated', { alertId, status, updatedBy: req.user.walletAddress });
    
    res.json({
      success: true,
      message: 'Alert updated successfully',
      data: alert
    });

  } catch (error) {
    logger.error('Failed to update alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update alert',
      error: error.message
    });
  }
});

/**
 * @route GET /api/monitoring/system
 * @desc Get system resource usage
 * @access Admin
 */
router.get('/system', auth, requireAdmin, async (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const systemInfo = {
      uptime: process.uptime(),
      memory: {
        total: memUsage.heapTotal,
        used: memUsage.heapUsed,
        external: memUsage.external,
        rss: memUsage.rss,
        usagePercent: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
      environment: process.env.NODE_ENV || 'development'
    };

    res.json({
      success: true,
      data: systemInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get system info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system information',
      error: error.message
    });
  }
});

/**
 * @route GET /api/monitoring/logs
 * @desc Get recent logs
 * @access Admin
 */
router.get('/logs', auth, requireAdmin, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const { type = 'app', lines = 100 } = req.query;
    
    const logFile = type === 'error' 
      ? path.join(__dirname, '../logs/error.log')
      : path.join(__dirname, '../logs/app.log');
    
    if (!fs.existsSync(logFile)) {
      return res.json({
        success: true,
        data: {
          logs: [],
          message: 'Log file not found'
        }
      });
    }
    
    const logContent = fs.readFileSync(logFile, 'utf-8');
    const logLines = logContent.split('\n').filter(line => line.trim());
    const recentLogs = logLines.slice(-parseInt(lines));
    
    res.json({
      success: true,
      data: {
        logs: recentLogs,
        totalLines: logLines.length,
        returnedLines: recentLogs.length,
        type
      }
    });

  } catch (error) {
    logger.error('Failed to get logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve logs',
      error: error.message
    });
  }
});

/**
 * @route GET /api/monitoring/dashboard
 * @desc Get comprehensive dashboard data
 * @access Admin
 */
router.get('/dashboard', auth, requireAdmin, async (req, res) => {
  try {
    const [
      systemHealth,
      recentAlerts,
      systemInfo,
      ipfsHealth,
      blockchainHealth
    ] = await Promise.all([
      monitoring.getSystemHealth(),
      getRecentAlerts(),
      getSystemInfo(),
      checkIPFSHealth(),
      checkBlockchainHealth()
    ]);

    res.json({
      success: true,
      data: {
        health: systemHealth,
        alerts: recentAlerts,
        system: systemInfo,
        services: {
          ipfs: ipfsHealth,
          blockchain: blockchainHealth
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to get dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard data',
      error: error.message
    });
  }
});

// Helper functions

async function checkIPFSHealth() {
  try {
    const health = await ipfsService.checkIPFSHealth();
    const enabledProviders = ipfsService.getEnabledProviders();
    const queueStatus = ipfsService.getQueueStatus();
    
    const availableCount = Object.values(health).filter(p => p.available).length;
    const totalCount = enabledProviders.length;
    
    let status = 'healthy';
    if (availableCount === 0) {
      status = 'critical';
    } else if (availableCount < totalCount) {
      status = 'degraded';
    }
    
    return {
      status,
      available: availableCount,
      total: totalCount,
      providers: health,
      queueLength: queueStatus.queueLength,
      message: `${availableCount}/${totalCount} providers available`
    };
  } catch (error) {
    logger.error('IPFS health check error:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
}

async function checkBlockchainHealth(detailed = false) {
  try {
    const startTime = Date.now();
    
    // Check if we can get block number
    const blockNumber = await blockchainService.getBlockNumber();
    const responseTime = Date.now() - startTime;
    
    const health = {
      status: 'healthy',
      connected: true,
      blockNumber,
      responseTime,
      message: 'Blockchain node is responsive'
    };
    
    if (detailed) {
      try {
        const [gasPrice, walletAddress] = await Promise.all([
          blockchainService.getGasPrice(),
          Promise.resolve(blockchainService.wallet?.address || null)
        ]);
        
        health.gasPrice = gasPrice;
        health.walletAddress = walletAddress;
        
        if (walletAddress) {
          health.balance = await blockchainService.getBalance(walletAddress);
        }
      } catch (detailError) {
        logger.warn('Could not fetch detailed blockchain info:', detailError);
      }
    }
    
    return health;
  } catch (error) {
    logger.error('Blockchain health check error:', error);
    return {
      status: 'critical',
      connected: false,
      message: error.message
    };
  }
}

async function checkDatabaseHealth(detailed = false) {
  try {
    const state = mongoose.connection.readyState;
    const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    
    const health = {
      status: state === 1 ? 'healthy' : 'critical',
      connected: state === 1,
      state: stateNames[state] || 'unknown',
      message: state === 1 ? 'Database connected' : 'Database not connected'
    };
    
    if (detailed && state === 1) {
      try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        const stats = await mongoose.connection.db.stats();
        
        health.collections = collections.length;
        health.dataSize = stats.dataSize;
        health.storageSize = stats.storageSize;
        health.indexes = stats.indexes;
      } catch (detailError) {
        logger.warn('Could not fetch detailed database info:', detailError);
      }
    }
    
    return health;
  } catch (error) {
    logger.error('Database health check error:', error);
    return {
      status: 'error',
      connected: false,
      message: error.message
    };
  }
}

async function checkCacheHealth() {
  try {
    const stats = await cacheService.getStats();
    
    return {
      status: stats.connected ? 'healthy' : 'critical',
      connected: stats.connected,
      hitRate: stats.hitRate,
      keys: stats.keys,
      message: stats.connected ? 'Cache is operational' : 'Cache not connected'
    };
  } catch (error) {
    logger.error('Cache health check error:', error);
    return {
      status: 'error',
      connected: false,
      message: error.message
    };
  }
}

function determineOverallStatus(statuses) {
  if (statuses.includes('critical') || statuses.includes('error')) {
    return 'critical';
  }
  if (statuses.includes('degraded')) {
    return 'degraded';
  }
  return 'healthy';
}

async function getRecentAlerts() {
  try {
    const { SecurityAlert } = require('../utils/monitoring');
    
    const [openAlerts, criticalAlerts, recentAlerts] = await Promise.all([
      SecurityAlert.countDocuments({ status: { $in: ['open', 'investigating'] } }),
      SecurityAlert.countDocuments({ 
        status: { $in: ['open', 'investigating'] },
        severity: 'critical'
      }),
      SecurityAlert.find({ status: { $in: ['open', 'investigating'] } })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    ]);
    
    return {
      open: openAlerts,
      critical: criticalAlerts,
      recent: recentAlerts
    };
  } catch (error) {
    logger.error('Failed to get recent alerts:', error);
    return {
      open: 0,
      critical: 0,
      recent: []
    };
  }
}

function getSystemInfo() {
  const memUsage = process.memoryUsage();
  
  return {
    uptime: process.uptime(),
    memory: {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      usagePercent: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2)
    },
    platform: process.platform,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  };
}

module.exports = router;
