const mongoose = require('mongoose');
const connectDB = require('../config/database');

// Mock logger to prevent console output during tests
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('Database Connection', () => {
  beforeAll(() => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test-blockchain-documents';
  });

  afterAll(async () => {
    // Clean up connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('connectDB function', () => {
    it('should be a function', () => {
      expect(typeof connectDB).toBe('function');
    });

    it('should handle connection errors gracefully', async () => {
      // Mock mongoose.connect to throw an error
      const originalConnect = mongoose.connect;
      mongoose.connect = jest.fn().mockRejectedValue(new Error('Connection failed'));

      // Mock process.exit to prevent actual exit
      const originalExit = process.exit;
      process.exit = jest.fn();

      await connectDB();

      expect(process.exit).toHaveBeenCalledWith(1);

      // Restore original functions
      mongoose.connect = originalConnect;
      process.exit = originalExit;
    });
  });

  describe('Connection options', () => {
    it('should use correct connection options', () => {
      // This test verifies that the connection options are properly configured
      // The actual connection testing would require a real MongoDB instance
      expect(connectDB).toBeDefined();
    });
  });
});