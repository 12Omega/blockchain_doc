const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Configure Mongoose settings
mongoose.set('bufferCommands', false);

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/blockchain-documents';
    
    const options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: process.env.NODE_ENV === 'test' ? 5000 : 30000,
      socketTimeoutMS: process.env.NODE_ENV === 'test' ? 10000 : 45000,
      connectTimeoutMS: process.env.NODE_ENV === 'test' ? 5000 : 30000,
    };

    const conn = await mongoose.connect(mongoURI, options);
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        logger.error('Error closing MongoDB connection:', err);
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    logger.warn('Server will continue without database connection. Some features may not work.');
    // Don't exit - allow server to run without MongoDB
  }
};

module.exports = connectDB;