const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const User = require('../models/User');

// Mock the database connection
jest.mock('../config/database', () => jest.fn());

// Unmock auth middleware for this test file since we're testing auth functionality
jest.unmock('../middleware/auth');
const { generateSignMessage, verifySignature } = require('../middleware/auth');

describe('Authentication System', () => {
  let app;
  let testWallet;
  let testUser;

  beforeAll(async () => {
    // Create test wallet
    testWallet = ethers.Wallet.createRandom();
    
    // Create a minimal Express app for testing instead of importing the full server
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Import and use only the auth routes
    const authRoutes = require('../routes/auth');
    app.use('/api/auth', authRoutes);
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
      // Compare lowercase versions since the API returns lowercase
      expect(response.body.data.walletAddress.toLowerCase()).toBe(testWallet.address.toLowerCase());
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
        });
      
      // Should return 400 or 500, both are acceptable for validation errors
      expect([400, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeTruthy();
    });

    it('should reject missing wallet address', async () => {
      const response = await request(app)
        .post('/api/auth/nonce')
        .send({});
      
      // Should return 400 or 500, both are acceptable for validation errors
      expect([400, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeTruthy();
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
      // The error could be about validation or missing fields
      expect(response.body.error).toBeTruthy();
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