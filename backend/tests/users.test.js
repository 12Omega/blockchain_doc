const request = require('supertest');
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const User = require('../models/User');

// Mock the database connection
jest.mock('../config/database', () => jest.fn());

describe('User Management System', () => {
  let app;
  let adminWallet, userWallet;
  let adminToken, userToken;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';
    
    // Create test wallets
    adminWallet = ethers.Wallet.createRandom();
    userWallet = ethers.Wallet.createRandom();
    
    app = require('../server');
  });

  beforeEach(async () => {
    // Clear users collection
    if (mongoose.connection.readyState !== 0) {
      await User.deleteMany({});
    }

    // Create admin user
    const adminUser = await User.createWithRole(adminWallet.address, 'admin');
    
    // Create regular user
    const regularUser = await User.createWithRole(userWallet.address, 'student');

    // Get auth tokens
    adminToken = await getAuthToken(adminWallet);
    userToken = await getAuthToken(userWallet);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  // Helper function to get auth token
  async function getAuthToken(wallet) {
    const nonceResponse = await request(app)
      .post('/api/auth/nonce')
      .send({ walletAddress: wallet.address });

    const { nonce, message } = nonceResponse.body.data;
    const signature = await wallet.signMessage(message);

    const authResponse = await request(app)
      .post('/api/auth/verify')
      .send({
        walletAddress: wallet.address,
        signature,
        message,
        nonce
      });

    return authResponse.body.data.token;
  }

  describe('GET /api/users', () => {
    it('should allow admin to get all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toHaveLength(2);
      expect(response.body.data.pagination).toHaveProperty('total', 2);
    });

    it('should reject non-admin access', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.users).toHaveLength(1);
      expect(response.body.data.pagination.limit).toBe(1);
      expect(response.body.data.pagination.pages).toBe(2);
    });

    it('should support role filtering', async () => {
      const response = await request(app)
        .get('/api/users?role=admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.users).toHaveLength(1);
      expect(response.body.data.users[0].role).toBe('admin');
    });

    it('should support search', async () => {
      // Update user profile for search
      await User.findByWallet(userWallet.address).then(user => {
        user.profile.name = 'John Doe';
        return user.save();
      });

      const response = await request(app)
        .get('/api/users?search=John')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.users).toHaveLength(1);
      expect(response.body.data.users[0].profile.name).toBe('John Doe');
    });
  });

  describe('GET /api/users/:walletAddress', () => {
    it('should allow user to get their own profile', async () => {
      const response = await request(app)
        .get(`/api/users/${userWallet.address}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.walletAddress).toBe(userWallet.address.toLowerCase());
    });

    it('should allow admin to get any user profile', async () => {
      const response = await request(app)
        .get(`/api/users/${userWallet.address}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.walletAddress).toBe(userWallet.address.toLowerCase());
    });

    it('should reject user accessing other profiles', async () => {
      const response = await request(app)
        .get(`/api/users/${adminWallet.address}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentWallet = ethers.Wallet.createRandom();
      
      const response = await request(app)
        .get(`/api/users/${nonExistentWallet.address}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });

    it('should reject invalid wallet address format', async () => {
      const response = await request(app)
        .get('/api/users/invalid-address')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should allow user to update their profile', async () => {
      const profileData = {
        profile: {
          name: 'John Doe',
          email: 'john@example.com',
          institution: 'Test University',
          department: 'Computer Science'
        }
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(profileData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.profile.name).toBe('John Doe');
      expect(response.body.data.user.profile.email).toBe('john@example.com');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          profile: {
            email: 'invalid-email'
          }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should validate field lengths', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          profile: {
            name: 'a'.repeat(101) // Exceeds 100 character limit
          }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('PUT /api/users/:walletAddress/role', () => {
    it('should allow admin to update user role', async () => {
      const response = await request(app)
        .put(`/api/users/${userWallet.address}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'issuer' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('issuer');
      expect(response.body.data.user.permissions.canIssue).toBe(true);
    });

    it('should reject non-admin role updates', async () => {
      const response = await request(app)
        .put(`/api/users/${userWallet.address}/role`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ role: 'admin' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should validate role values', async () => {
      const response = await request(app)
        .put(`/api/users/${userWallet.address}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'invalid-role' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentWallet = ethers.Wallet.createRandom();
      
      const response = await request(app)
        .put(`/api/users/${nonExistentWallet.address}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'issuer' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('PUT /api/users/:walletAddress/verify', () => {
    it('should allow admin to verify user', async () => {
      const response = await request(app)
        .put(`/api/users/${userWallet.address}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.isVerified).toBe(true);
    });

    it('should reject non-admin verification', async () => {
      const response = await request(app)
        .put(`/api/users/${userWallet.address}/verify`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions');
    });
  });

  describe('DELETE /api/users/:walletAddress', () => {
    it('should allow admin to delete user', async () => {
      const response = await request(app)
        .delete(`/api/users/${userWallet.address}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User deleted successfully');
    });

    it('should prevent admin from deleting themselves', async () => {
      const response = await request(app)
        .delete(`/api/users/${adminWallet.address}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Cannot delete your own account');
    });

    it('should reject non-admin deletion', async () => {
      const response = await request(app)
        .delete(`/api/users/${adminWallet.address}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions');
    });
  });

  describe('User Model', () => {
    it('should create user with correct default permissions', async () => {
      const user = await User.createWithRole('0x1234567890123456789012345678901234567890', 'issuer');
      
      expect(user.role).toBe('issuer');
      expect(user.permissions.canIssue).toBe(true);
      expect(user.permissions.canVerify).toBe(true);
      expect(user.permissions.canTransfer).toBe(false);
    });

    it('should validate wallet address format', async () => {
      try {
        await User.create({
          walletAddress: 'invalid-address',
          role: 'student'
        });
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).toBe('ValidationError');
      }
    });

    it('should generate nonce correctly', async () => {
      const user = await User.createWithRole(userWallet.address, 'student');
      const originalNonce = user.session.nonce;
      
      const newNonce = user.generateNonce();
      
      expect(newNonce).not.toBe(originalNonce);
      expect(typeof newNonce).toBe('string');
      expect(newNonce.length).toBeGreaterThan(10);
    });

    it('should check permissions correctly', async () => {
      const adminUser = await User.createWithRole(adminWallet.address, 'admin');
      const studentUser = await User.createWithRole(userWallet.address, 'student');
      
      expect(adminUser.hasPermission('canIssue')).toBe(true);
      expect(adminUser.hasPermission('canVerify')).toBe(true);
      expect(adminUser.hasPermission('canTransfer')).toBe(true);
      
      expect(studentUser.hasPermission('canIssue')).toBe(false);
      expect(studentUser.hasPermission('canVerify')).toBe(true);
      expect(studentUser.hasPermission('canTransfer')).toBe(false);
    });
  });
});