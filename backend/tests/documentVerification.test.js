const request = require('supertest');
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const Document = require('../models/Document');
const User = require('../models/User');
const encryptionService = require('../services/encryptionService');

// Mock services
jest.mock('../services/ipfsService', () => ({
  retrieveFile: jest.fn().mockResolvedValue(Buffer.from(JSON.stringify({
    encryptedData: 'encrypted-data-base64',
    iv: 'iv-base64',
    authTag: 'auth-tag-base64',
    algorithm: 'aes-256-gcm'
  }))),
  isValidIPFSHash: jest.fn().mockReturnValue(true)
}));

jest.mock('../services/blockchainService', () => ({
  verifyDocument: jest.fn().mockResolvedValue({
    isValid: true,
    documentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    ipfsHash: 'QmTestHash123456789',
    issuer: '0x1234567890123456789012345678901234567890',
    owner: '0x1234567890123456789012345678901234567890',
    timestamp: '1234567890',
    isActive: true
  })
}));

jest.mock('../services/encryptionService', () => ({
  generateFileHash: jest.fn().mockReturnValue('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'),
  verifyFileIntegrity: jest.fn().mockReturnValue(true),
  decryptFile: jest.fn().mockReturnValue(Buffer.from('decrypted file content')),
  generateKey: jest.fn().mockReturnValue('test-encryption-key')
}));

jest.mock('../config/database', () => jest.fn());

describe('Document Verification API', () => {
  let app;
  let issuerWallet, verifierWallet, studentWallet;
  let issuerToken, verifierToken, studentToken;
  let testDocument;
  let testFileBuffer;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';
    
    // Create test wallets
    issuerWallet = ethers.Wallet.createRandom();
    verifierWallet = ethers.Wallet.createRandom();
    studentWallet = ethers.Wallet.createRandom();
    
    testFileBuffer = Buffer.from('This is a test document for verification');
    
    app = require('../server');
  });

  beforeEach(async () => {
    // Clear collections
    if (mongoose.connection.readyState !== 0) {
      await Document.deleteMany({});
      await User.deleteMany({});
    }

    // Create test users
    await User.createWithRole(issuerWallet.address, 'issuer');
    await User.createWithRole(verifierWallet.address, 'verifier');
    await User.createWithRole(studentWallet.address, 'student');

    // Get auth tokens
    issuerToken = await getAuthToken(issuerWallet);
    verifierToken = await getAuthToken(verifierWallet);
    studentToken = await getAuthToken(studentWallet);

    // Create test document
    const documentHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    
    testDocument = await Document.create({
      documentHash,
      ipfsHash: 'QmTestHash123456789',
      encryptionKey: 'test-encryption-key',
      metadata: {
        studentName: 'John Doe',
        studentId: 'STU001',
        institutionName: 'Test University',
        documentType: 'degree',
        issueDate: new Date('2023-06-15')
      },
      access: {
        owner: studentWallet.address,
        issuer: issuerWallet.address,
        authorizedViewers: [verifierWallet.address]
      },
      audit: {
        uploadedBy: (await User.findByWallet(issuerWallet.address))._id,
        verificationCount: 0
      },
      fileInfo: {
        originalName: 'test-degree.pdf',
        mimeType: 'application/pdf',
        size: 1024
      },
      blockchain: {
        transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        blockNumber: 12345,
        gasUsed: '21000'
      },
      status: 'blockchain_stored'
    });
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

  describe('POST /api/documents/verify', () => {
    it('should verify document with valid hash', async () => {
      const response = await request(app)
        .post('/api/documents/verify')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          documentHash: testDocument.documentHash
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.verification.isValid).toBe(true);
      expect(response.body.data.verification.documentHash).toBe(testDocument.documentHash);
      expect(response.body.data.verification.document.metadata.studentName).toBe('John Doe');
      expect(response.body.data.verification.blockchain.isValid).toBe(true);
    });

    it('should verify document with uploaded file', async () => {
      const response = await request(app)
        .post('/api/documents/verify')
        .set('Authorization', `Bearer ${verifierToken}`)
        .attach('document', testFileBuffer, 'test-document.pdf')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.verification.isValid).toBe(true);
      expect(response.body.data.verification.fileIntegrity.isValid).toBe(true);
    });

    it('should reject verification without hash or file', async () => {
      const response = await request(app)
        .post('/api/documents/verify')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Either document hash or file must be provided');
    });

    it('should return not found for non-existent document', async () => {
      const nonExistentHash = '0x' + '9'.repeat(64);
      
      const response = await request(app)
        .post('/api/documents/verify')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          documentHash: nonExistentHash
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Document not found');
      expect(response.body.verification.isValid).toBe(false);
      expect(response.body.verification.reason).toBe('Document not found in database');
    });

    it('should increment verification count', async () => {
      const initialCount = testDocument.audit.verificationCount;
      
      await request(app)
        .post('/api/documents/verify')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          documentHash: testDocument.documentHash
        })
        .expect(200);

      const updatedDocument = await Document.findById(testDocument._id);
      expect(updatedDocument.audit.verificationCount).toBe(initialCount + 1);
      expect(updatedDocument.audit.lastVerified).toBeDefined();
    });

    it('should validate document hash format', async () => {
      const response = await request(app)
        .post('/api/documents/verify')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          documentHash: 'invalid-hash'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/documents/verify')
        .send({
          documentHash: testDocument.documentHash
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });

    it('should allow owner to verify their document', async () => {
      const response = await request(app)
        .post('/api/documents/verify')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          documentHash: testDocument.documentHash
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.verification.isValid).toBe(true);
    });

    it('should allow issuer to verify their issued document', async () => {
      const response = await request(app)
        .post('/api/documents/verify')
        .set('Authorization', `Bearer ${issuerToken}`)
        .send({
          documentHash: testDocument.documentHash
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.verification.isValid).toBe(true);
    });
  });

  describe('GET /api/documents/verify/:documentHash', () => {
    it('should get verification status for authorized user', async () => {
      const response = await request(app)
        .get(`/api/documents/verify/${testDocument.documentHash}`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.verification.documentHash).toBe(testDocument.documentHash);
      expect(response.body.data.verification.isValid).toBe(true);
      expect(response.body.data.verification.status).toBe('blockchain_stored');
    });

    it('should return 404 for non-existent document', async () => {
      const nonExistentHash = '0x' + '9'.repeat(64);
      
      const response = await request(app)
        .get(`/api/documents/verify/${nonExistentHash}`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Document not found');
    });

    it('should validate document hash format', async () => {
      const response = await request(app)
        .get('/api/documents/verify/invalid-hash')
        .set('Authorization', `Bearer ${verifierToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/documents/verify/${testDocument.documentHash}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('POST /api/documents/:documentHash/download', () => {
    it('should download document for authorized user', async () => {
      const response = await request(app)
        .post(`/api/documents/${testDocument.documentHash}/download`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toContain('test-degree.pdf');
      expect(Buffer.isBuffer(response.body)).toBe(true);
    });

    it('should reject download for unauthorized user', async () => {
      const unauthorizedWallet = ethers.Wallet.createRandom();
      await User.createWithRole(unauthorizedWallet.address, 'student');
      const unauthorizedToken = await getAuthToken(unauthorizedWallet);

      const response = await request(app)
        .post(`/api/documents/${testDocument.documentHash}/download`)
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    it('should return 404 for non-existent document', async () => {
      const nonExistentHash = '0x' + '9'.repeat(64);
      
      const response = await request(app)
        .post(`/api/documents/${nonExistentHash}/download`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Document not found');
    });

    it('should validate document hash format', async () => {
      const response = await request(app)
        .post('/api/documents/invalid-hash/download')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/documents/audit/:documentHash', () => {
    it('should get audit trail for document owner', async () => {
      const response = await request(app)
        .get(`/api/documents/audit/${testDocument.documentHash}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.audit.documentHash).toBe(testDocument.documentHash);
      expect(response.body.data.audit.events).toBeInstanceOf(Array);
      expect(response.body.data.audit.events.length).toBeGreaterThan(0);
      expect(response.body.data.audit.statistics).toHaveProperty('verificationCount');
    });

    it('should get audit trail for document issuer', async () => {
      const response = await request(app)
        .get(`/api/documents/audit/${testDocument.documentHash}`)
        .set('Authorization', `Bearer ${issuerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.audit.documentHash).toBe(testDocument.documentHash);
    });

    it('should reject audit access for unauthorized user', async () => {
      const response = await request(app)
        .get(`/api/documents/audit/${testDocument.documentHash}`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    it('should return 404 for non-existent document', async () => {
      const nonExistentHash = '0x' + '9'.repeat(64);
      
      const response = await request(app)
        .get(`/api/documents/audit/${nonExistentHash}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Document not found');
    });

    it('should include blockchain events in audit trail', async () => {
      const response = await request(app)
        .get(`/api/documents/audit/${testDocument.documentHash}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const events = response.body.data.audit.events;
      const blockchainEvent = events.find(event => event.type === 'blockchain_registered');
      
      expect(blockchainEvent).toBeDefined();
      expect(blockchainEvent.details.transactionHash).toBe(testDocument.blockchain.transactionHash);
    });

    it('should calculate document age correctly', async () => {
      const response = await request(app)
        .get(`/api/documents/audit/${testDocument.documentHash}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const age = response.body.data.audit.statistics.age;
      expect(typeof age).toBe('number');
      expect(age).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle IPFS retrieval errors gracefully', async () => {
      // Mock IPFS service to throw error
      const ipfsService = require('../services/ipfsService');
      ipfsService.retrieveFile.mockRejectedValueOnce(new Error('IPFS retrieval failed'));

      const response = await request(app)
        .post(`/api/documents/${testDocument.documentHash}/download`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Document download failed');
    });

    it('should handle blockchain verification errors gracefully', async () => {
      // Mock blockchain service to throw error
      const blockchainService = require('../services/blockchainService');
      blockchainService.verifyDocument.mockRejectedValueOnce(new Error('Blockchain error'));

      const response = await request(app)
        .post('/api/documents/verify')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          documentHash: testDocument.documentHash
        })
        .expect(200);

      // Should still succeed but without blockchain verification
      expect(response.body.success).toBe(true);
      expect(response.body.data.verification.blockchain).toBeNull();
    });

    it('should handle file integrity check failures', async () => {
      // Mock encryption service to return false for integrity check
      const encryptionService = require('../services/encryptionService');
      encryptionService.verifyFileIntegrity.mockReturnValueOnce(false);

      const response = await request(app)
        .post(`/api/documents/${testDocument.documentHash}/download`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('File integrity verification failed');
    });
  });
});