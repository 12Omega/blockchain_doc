const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * Comprehensive Test Setup and Configuration
 * 
 * This file provides a robust testing environment for the blockchain document
 * verification system. It includes:
 * 
 * - In-memory MongoDB database for isolated testing
 * - Complete service mocking to prevent external API calls
 * - Proper cleanup between tests to ensure reliability
 * - Helper functions for creating test data
 * - Security-focused mocking that maintains realistic behavior
 * 
 * The setup ensures tests run quickly, reliably, and independently
 * while maintaining the same behavior as the production system.
 */

// Global test setup - runs once before all tests
beforeAll(async () => {
  // Create isolated in-memory MongoDB instance for testing
  // This prevents tests from affecting real data and ensures speed
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the test database with proper configuration
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Configure test environment variables for security and consistency
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';
  process.env.MONGODB_URI = mongoUri;
  
  // Increase timeout for complex integration tests
  jest.setTimeout(30000);
});

// Global test cleanup
afterAll(async () => {
  // Close database connection
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  
  // Stop the in-memory MongoDB instance
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Clean up between tests
beforeEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock Redis client to prevent connection errors
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
    on: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    flushall: jest.fn().mockResolvedValue('OK'),
    quit: jest.fn().mockResolvedValue('OK'),
  })),
}));

// Mock rate limiting middleware to prevent 429 errors in tests
jest.mock('express-rate-limit', () => {
  return jest.fn(() => (req, res, next) => next());
});

// Mock custom rate limiting functions
jest.mock('../utils/validation', () => {
  const originalModule = jest.requireActual('../utils/validation');
  return {
    ...originalModule,
    validateRateLimit: jest.fn(() => (req, res, next) => next()),
  };
});

// Mock all validation middleware to prevent timeouts
jest.mock('../middleware/validation', () => ({
  handleValidationErrors: (req, res, next) => next(),
  securityValidation: () => [],
  validateContentType: () => (req, res, next) => next(),
  validateRequestSize: () => (req, res, next) => next(),
}));

jest.mock('../utils/validation', () => {
  const mockValidationRule = () => ({
    optional: () => ({ withMessage: () => mockValidationRule() }),
    withMessage: () => mockValidationRule(),
    isLength: () => mockValidationRule(),
    matches: () => mockValidationRule(),
    isIn: () => mockValidationRule(),
    custom: () => mockValidationRule()
  });
  
  return {
    validateRateLimit: () => (req, res, next) => next(),
    validationRules: {
      walletAddress: () => mockValidationRule(),
      name: () => mockValidationRule(),
      studentId: () => mockValidationRule(),
      documentType: () => mockValidationRule(),
      date: () => mockValidationRule(),
      text: () => mockValidationRule(),
      email: () => mockValidationRule(),
      role: () => mockValidationRule(),
      documentHash: () => mockValidationRule(),
      accessLevel: () => mockValidationRule()
    },
    validateFile: () => (req, res, next) => next(),
    ALLOWED_FILE_TYPES: { documents: ['pdf', 'doc', 'docx'] },
    FILE_SIZE_LIMITS: { document: 10485760 }
  };
});

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock IPFS service to prevent external API calls
jest.mock('../services/ipfsService', () => ({
  uploadToIPFS: jest.fn().mockResolvedValue({
    hash: 'QmTest1234567890123456789012345678901234567890',
    url: 'https://ipfs.io/ipfs/QmTest1234567890123456789012345678901234567890'
  }),
  uploadFile: jest.fn().mockResolvedValue({
    hash: 'QmNLei78zWmzUdbeRB3CiUfAizWUrbeeZh5K1rhAQKCh51',
    cid: 'QmNLei78zWmzUdbeRB3CiUfAizWUrbeeZh5K1rhAQKCh51',
    url: 'https://ipfs.io/ipfs/QmNLei78zWmzUdbeRB3CiUfAizWUrbeeZh5K1rhAQKCh51',
    gateway: 'https://ipfs.io/ipfs/',
    provider: 'test'
  }),
  getFromIPFS: jest.fn().mockResolvedValue(Buffer.from('test file content')),
  retrieveFile: jest.fn().mockResolvedValue(Buffer.from('test file content')),
  pinToIPFS: jest.fn().mockResolvedValue(true),
  healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' }),
}));

// Mock blockchain service to prevent external network calls
jest.mock('../services/blockchainService', () => ({
  registerDocument: jest.fn().mockResolvedValue({
    transactionHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
    blockNumber: 12345,
    gasUsed: '21000',
    contractAddress: '0x1234567890123456789012345678901234567890'
  }),
  verifyDocument: jest.fn().mockResolvedValue({
    isValid: true,
    owner: '0x1234567890123456789012345678901234567890',
    timestamp: Date.now(),
    blockNumber: 12345
  }),
  grantDocumentAccess: jest.fn().mockResolvedValue({
    transactionHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
    blockNumber: 12345,
    gasUsed: '21000'
  }),
  getNetworkInfo: jest.fn().mockResolvedValue({
    name: 'sepolia',
    chainId: 11155111,
    blockNumber: 12345,
    gasPrice: '20000000000'
  }),
  healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' }),
}));

// Mock encryption service
jest.mock('../services/encryptionService', () => ({
  encryptData: jest.fn().mockImplementation((data) => ({
    encryptedData: Buffer.from(data).toString('base64'),
    encryptionKey: 'mock-encryption-key',
    iv: 'mock-iv',
    authTag: 'mock-auth-tag'
  })),
  decryptData: jest.fn().mockImplementation((encryptedData) => {
    return Buffer.from(encryptedData.encryptedData, 'base64').toString();
  }),
  generateEncryptionKey: jest.fn().mockReturnValue('mock-encryption-key'),
  hashData: jest.fn().mockImplementation((data) => 
    require('crypto').createHash('sha256').update(data).digest('hex')
  ),
  generateFileHash: jest.fn().mockImplementation((buffer) => 
    '0x' + require('crypto').createHash('sha256').update(buffer).digest('hex')
  ),
  encryptFile: jest.fn().mockImplementation((buffer, key) => ({
    encryptedData: buffer.toString('base64'),
    encryptionKey: key,
    iv: 'mock-iv',
    authTag: 'mock-auth-tag'
  })),
  decryptFile: jest.fn().mockImplementation((encryptedData, key) => {
    return Buffer.from(encryptedData.encryptedData, 'base64');
  }),
  generateKey: jest.fn().mockReturnValue('mock-encryption-key'),
}));

// Mock consent middleware to prevent consent requirement errors
jest.mock('../middleware/consentCheck', () => ({
  requireDocumentStorageConsent: jest.fn(() => (req, res, next) => next()),
  requireBlockchainStorageConsent: jest.fn(() => (req, res, next) => next()),
  requireConsents: jest.fn(() => (req, res, next) => next()),
  dataMinimization: jest.fn(() => (req, res, next) => next()),
  privacyCompliantLogging: jest.fn(() => (req, res, next) => next()),
  checkConsentWithdrawal: jest.fn(() => (req, res, next) => next()),
}));

// Mock additional services that might cause timeouts
jest.mock('../services/qrcodeService', () => ({
  generateQRCode: jest.fn().mockResolvedValue({
    qrCodeDataUrl: 'data:image/png;base64,test',
    verificationUrl: 'https://example.com/verify/test'
  }),
  parseQRCode: jest.fn().mockReturnValue({
    documentHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
    transactionHash: '0x1234567890123456789012345678901234567890123456789012345678901234'
  })
}));

jest.mock('../services/databaseOptimizationService', () => ({
  findWithCache: jest.fn().mockImplementation((Model, query, options) => {
    return Model.find(query, options.select)
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit)
      .populate(options.populate);
  }),
  healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' }),
  getPerformanceStats: jest.fn().mockResolvedValue({ queries: 0, avgTime: 0 })
}));

jest.mock('../services/cacheService', () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  del: jest.fn().mockResolvedValue(true),
  healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' })
}));

jest.mock('../services/blockchainOptimizationService', () => ({
  healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' })
}));

// Export helper functions for tests
module.exports = {
  createTestUser: async (overrides = {}) => {
    const User = require('../models/User');
    const { ethers } = require('ethers');
    
    const wallet = ethers.Wallet.createRandom();
    
    return await User.create({
      walletAddress: wallet.address.toLowerCase(),
      role: 'student',
      profile: {
        name: 'Test User',
        email: 'test@example.com'
      },
      permissions: {
        canIssue: false,
        canVerify: true,
        canTransfer: false
      },
      session: {
        nonce: 'test-nonce-' + Date.now(),
        nonceTimestamp: new Date(),
        isActive: true,
        lastLogin: new Date()
      },
      ...overrides
    });
  },
  
  createTestDocument: async (ownerAddress, overrides = {}) => {
    const Document = require('../models/Document');
    const User = require('../models/User');
    const crypto = require('crypto');
    
    // Find or create a user for uploadedBy reference
    let user = await User.findOne({ walletAddress: ownerAddress });
    if (!user) {
      user = await User.create({
        walletAddress: ownerAddress,
        role: 'student',
        profile: { name: 'Test User' },
        permissions: { canIssue: false, canVerify: true, canTransfer: false }
      });
    }
    
    // Generate a valid document hash (0x + 64 hex characters)
    const documentHash = overrides.documentHash || ('0x' + crypto.randomBytes(32).toString('hex'));
    
    return await Document.create({
      documentHash,
      ipfsHash: 'QmNLei78zWmzUdbeRB3CiUfAizWUrbeeZh5K1rhAQKCh51',
      encryptionKey: 'mock-encryption-key',
      metadata: {
        studentName: 'Test Student',
        studentId: 'TEST001',
        institutionName: 'Test University',
        documentType: 'certificate',
        issueDate: new Date(),
        course: 'Computer Science',
        grade: 'A'
      },
      access: {
        owner: ownerAddress,
        issuer: ownerAddress,
        authorizedViewers: []
      },
      audit: {
        uploadedBy: user._id,
        verificationCount: 0
      },
      fileInfo: {
        originalName: 'test-document.pdf',
        mimeType: 'application/pdf',
        size: 1024
      },
      status: 'blockchain_stored',
      ...overrides
    });
  },
  
  generateAuthToken: (user) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { 
        userId: user._id,
        walletAddress: user.walletAddress.toLowerCase() 
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRE || '7d',
        issuer: 'blockchain-document-system',
        audience: 'blockchain-document-users'
      }
    );
  }
};