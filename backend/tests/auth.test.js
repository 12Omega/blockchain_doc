const request = require('supertest');
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const User = require('../models/User');
const { generateSignMessage, verifySignature } = require('../middleware/auth');

// Mock the database connection
jest.mock('../config/database', () => jest.fn());

describe('Authentication System', () => {
  let app;
  let testWallet;
  let testUser;

  beforeAll(async () => {
    // Create test wallet
    testWallet = ethers.Wallet.createRandom();
    
    // Import app (environment already set in setup.js)
    app = require('../server');
  });

  afterAll(async () => {
    // Cleanup handled by setup.js
  });

  describe('POST /api/auth/nonce', () => {
    it('should generate nonce for new wallet', async () => {
      const response = await request(app)
        .post('/api/auth/nonce')
        .send({
          walletAddress: testWallet.address
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('nonce');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data.walletAddress).toBe(testWallet.address.toLowerCase());
    });

    it('should return nonce for existing wallet', async () => {
      // Create user first
      await User.createWithRole(testWallet.address, 'student');

      const response = await request(app)
        .post('/api/auth/nonce')
        .send({
          walletAddress: testWallet.address
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('nonce');
    });

    it('should reject invalid wallet address', async () => {
      const response = await request(app)
        .post('/api/auth/nonce')
        .send({
          walletAddress: 'invalid-address'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid wallet address format');
    });

    it('should reject missing wallet address', async () => {
      const response = await request(app)
        .post('/api/auth/nonce')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Wallet address is required');
    });
  });

  describe('POST /api/auth/verify', () => {
    let nonce, message, signature;

    beforeEach(async () => {
      // Get nonce first
      const nonceResponse = await request(app)
        .post('/api/auth/nonce')
        .send({
          walletAddress: testWallet.address
        });

      nonce = nonceResponse.body.data.nonce;
      message = nonceResponse.body.data.message;
      signature = await testWallet.signMessage(message);
    });

    it('should authenticate user with valid signature', async () => {
      const response = await request(app)
        .post('/api/auth/verify')
        .send({
          walletAddress: testWallet.address,
          signature,
          message,
          nonce
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.walletAddress).toBe(testWallet.address.toLowerCase());
      expect(response.body.data.user.role).toBe('student');
    });

    it('should reject invalid signature', async () => {
      const response = await request(app)
        .post('/api/auth/verify')
        .send({
          walletAddress: testWallet.address,
          signature: 'invalid-signature',
          message,
          nonce
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid signature');
    });

    it('should reject invalid nonce', async () => {
      const response = await request(app)
        .post('/api/auth/verify')
        .send({
          walletAddress: testWallet.address,
          signature,
          message,
          nonce: 'invalid-nonce'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid or expired nonce');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/verify')
        .send({
          walletAddress: testWallet.address
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('Authentication Middleware', () => {
    let authToken;

    beforeEach(async () => {
      // Get authenticated token
      const nonceResponse = await request(app)
        .post('/api/auth/nonce')
        .send({ walletAddress: testWallet.address });

      const { nonce, message } = nonceResponse.body.data;
      const signature = await testWallet.signMessage(message);

      const authResponse = await request(app)
        .post('/api/auth/verify')
        .send({
          walletAddress: testWallet.address,
          signature,
          message,
          nonce
        });

      authToken = authResponse.body.data.token;
    });

    it('should allow access with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.walletAddress).toBe(testWallet.address.toLowerCase());
    });

    it('should reject access without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });

    it('should reject access with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('Signature Verification Utility', () => {
    it('should verify valid signature', () => {
      const message = 'Test message';
      const signature = testWallet.signMessageSync(message);
      
      const isValid = verifySignature(message, signature, testWallet.address);
      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const message = 'Test message';
      const invalidSignature = 'invalid-signature';
      
      const isValid = verifySignature(message, invalidSignature, testWallet.address);
      expect(isValid).toBe(false);
    });

    it('should reject signature from different wallet', () => {
      const message = 'Test message';
      const otherWallet = ethers.Wallet.createRandom();
      const signature = otherWallet.signMessageSync(message);
      
      const isValid = verifySignature(message, signature, testWallet.address);
      expect(isValid).toBe(false);
    });
  });

  describe('Message Generation', () => {
    it('should generate consistent message format', () => {
      const walletAddress = testWallet.address;
      const nonce = 'test-nonce';
      const timestamp = 1234567890;
      
      const message = generateSignMessage(walletAddress, nonce, timestamp);
      
      expect(message).toContain(walletAddress);
      expect(message).toContain(nonce);
      expect(message).toContain(timestamp.toString());
      expect(message).toContain('Blockchain Document Verification System');
    });
  });
});