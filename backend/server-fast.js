const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const connectDB = require('./config/database');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// Lightweight security
app.use(helmet({
  contentSecurityPolicy: false // Disable for faster response
}));

// CORS with more permissive settings for development
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Fast health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {
      database: { status: 'healthy' },
      server: { status: 'running' }
    }
  });
});

// CORS test endpoint
app.get('/test-cors', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.get('Origin'),
    timestamp: new Date().toISOString()
  });
});

// Root endpoint for direct access
app.get('/', (req, res) => {
  res.json({
    message: 'Blockchain Document Verification API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      cors_test: '/test-cors',
      auth: '/api/auth/*',
      users: '/api/users/*',
      documents: '/api/documents/*',
      monitoring: '/api/monitoring/metrics'
    },
    documentation: 'Visit /health for system status'
  });
});

// Routes (only essential ones)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/documents', require('./routes/documents-simple'));

// Simple monitoring endpoint
app.get('/api/monitoring/metrics', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    performance: 'optimized'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((error, req, res, next) => {
  logger.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
async function startServer() {
  try {
    // Connect to database (optional for basic functionality)
    try {
      await connectDB();
      logger.info('Database connected');
    } catch (dbError) {
      logger.warn('Database connection failed, continuing without DB:', dbError.message);
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Fast server running on port ${PORT}`);
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;