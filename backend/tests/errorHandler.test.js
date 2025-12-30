const errorHandler = require('../middleware/errorHandler');

// Mock logger
jest.mock('../utils/logger', () => ({
  error: jest.fn(),
}));

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      originalUrl: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('Generic errors', () => {
    it('should handle generic errors with 500 status', () => {
      const error = new Error('Generic error');
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Generic error',
      });
    });
  });

  describe('Mongoose errors', () => {
    it('should handle CastError with 404 status', () => {
      const error = new Error('Cast error');
      error.name = 'CastError';
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Resource not found',
      });
    });

    it('should handle duplicate key error with 400 status', () => {
      const error = new Error('Duplicate key');
      error.code = 11000;
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Duplicate field value entered',
      });
    });

    it('should handle ValidationError with 400 status', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = {
        field1: { message: 'Field 1 is required' },
        field2: { message: 'Field 2 is invalid' },
      };
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Field 1 is required, Field 2 is invalid',
      });
    });
  });

  describe('JWT errors', () => {
    it('should handle JsonWebTokenError with 401 status', () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token',
      });
    });

    it('should handle TokenExpiredError with 401 status', () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token expired',
      });
    });
  });

  describe('File upload errors', () => {
    it('should handle file size limit error with 400 status', () => {
      const error = new Error('File too large');
      error.code = 'LIMIT_FILE_SIZE';
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'File too large',
      });
    });

    it('should handle unexpected file error with 400 status', () => {
      const error = new Error('Unexpected file');
      error.code = 'LIMIT_UNEXPECTED_FILE';
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unexpected file field',
      });
    });
  });

  describe('Blockchain errors', () => {
    it('should handle network error with 503 status', () => {
      const error = new Error('Network error');
      error.code = 'NETWORK_ERROR';
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Blockchain network error',
      });
    });

    it('should handle insufficient funds error with 400 status', () => {
      const error = new Error('Insufficient funds');
      error.code = 'INSUFFICIENT_FUNDS';
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient funds for transaction',
      });
    });
  });

  describe('IPFS errors', () => {
    it('should handle IPFS errors with 503 status', () => {
      const error = new Error('IPFS connection failed');
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'File storage service unavailable',
      });
    });
  });

  describe('Rate limiting errors', () => {
    it('should handle rate limit error with 429 status', () => {
      const error = new Error('Too many requests');
      error.status = 429;
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Too many requests, please try again later',
      });
    });
  });

  describe('Development environment', () => {
    it('should include stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      
      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Test error',
        stack: 'Error stack trace',
      });

      process.env.NODE_ENV = originalEnv;
    });
  });
});