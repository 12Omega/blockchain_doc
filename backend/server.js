const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { privacyCompliantLogging, checkConsentWithdrawal } = require('./middleware/consentCheck');
const retentionComplianceJob = require('./jobs/retentionCompliance');
const {
  requestTiming,
  responseCache,
  memoryMonitoring,
  queryOptimization,
  responseOptimization,
  metricsCollection,
  healthCheckOptimization
} = require('./middleware/performanceMiddleware');
const cacheService = require('./services/cacheService');
const dbOptimizationService = require('./services/databaseOptimizationService');
const blockchainOptimizationService = require('./services/blockchainOptimizationService');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database connection flag
let isDBConnected = false;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Performance middleware
app.use(healthCheckOptimization);
app.use(requestTiming);
app.use(memoryMonitoring);
app.use(responseOptimization);
app.use(metricsCollection);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Query optimization middleware
app.use(queryOptimization);

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Privacy-compliant logging middleware
app.use(privacyCompliantLogging);

// Check consent withdrawal middleware
app.use(checkConsentWithdrawal);

// Health check endpoint with performance metrics
app.get('/health', async (req, res) => {
  try {
    const [dbHealth, cacheHealth, blockchainHealth] = await Promise.all([
      dbOptimizationService.healthCheck(),
      cacheService.healthCheck(),
      blockchainOptimizationService.healthCheck()
    ]);

    const performanceStats = await dbOptimizationService.getPerformanceStats();

    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: dbHealth,
        cache: cacheHealth,
        blockchain: blockchainHealth
      },
      performance: performanceStats
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/privacy', require('./routes/privacy'));
app.use('/api/performance', require('./routes/performance'));
app.use('/api/monitoring', require('./routes/monitoring'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  // Connect to MongoDB first, then start server
  connectDB()
    .then(() => {
      isDBConnected = true;
      app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
        
        // Start retention compliance job
        if (process.env.NODE_ENV === 'production') {
          retentionComplianceJob.start();
          logger.info('Retention compliance job started');
        }
      });
    })
    .catch((error) => {
      logger.error('Failed to start server:', error);
      process.exit(1);
    });
}

module.exports = app;
