const request = require('supertest');
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const User = require('../models/User');
const encryptionService = require('../services/encryptionService');

// Mock services
jest.mock('../services/ipfsService', () => ({
  uploadFile: jest.fn().mockResolvedValue({
    hash: 'QmTestHash123456789',
    size: 1024,
    gateway: 'https://ipfs.io/ipfs/QmTestHash123456789',
    pinned: true
  }),
  retrieveFile: jest.fn().mockResolvedValue(Buffer.from('test file content')),
  isValidIPFSHash: jest.fn().mockReturnValue(true)
}));

jest.mock('../services/blockchainService', () => ({
  registerDocument: jest.fn().mockResolvedValue({
    transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    blockNumber: 12345,
    gasUsed: '21000',
    contractAddress: '0x1234567890123456789012345678901234567890',
    success: true
  }),
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

jest.mock('../config/database', () => jest.fn());

describe('Document Upload and IPFS Integration', () => {
  let app;
  let issuerWallet, studentWallet;
  let issuerToken, studentToken;
  let testFileBuffer;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';
    
    // Create test wallets
    issuerWallet = ethers.Wallet.createRandom();
    studentWallet = ethers.Wallet.createRandom();
    
    // Create test file buffer
    testFileBuffer = Buffer.from('This is a test PDF document content');
    
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
    await User.createWithRole(studentWallet.address, 'student');

    // Get auth tokens
    issuerToken = await getAuthToken(issuerWallet);
    studentToken = await getAuthToken(studentWallet);
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

  describe('POST /api/documents/upload', () => {
    const validMetadata = {
      studentName: 'John Doe',
      studentId: 'STU001',
      institutionName: 'Test University',
      documentType: 'degree',
      issueDate: '2023-06-15T00:00:00.000Z',
      course: 'Computer Science',
      grade: 'A'
    };

    it('should upload document successfully with valid data', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${issuerToken}`)
        .attach('document', testFileBuffer, 'test-degree.pdf')
        .field('metadata', JSON.stringify(validMetadata))
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.document).toHaveProperty('documentHash');
      expect(response.body.data.document).toHaveProperty('ipfsHash');
      expect(response.body.data.document.metadata.studentName).toBe('John Doe');
      expect(response.body.data.document.blockchain).toHaveProperty('transactionHash');
    });

    it('should reject upload without issuer permission', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${studentToken}`)
        .attach('document', testFileBuffer, 'test-degree.pdf')
        .field('metadata', JSON.stringify(validMetadata))
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Permission 'canIssue' required");
    });

    it('should reject upload without authentication', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .attach('document', testFileBuffer, 'test-degree.pdf')
        .field('metadata', JSON.stringify(validMetadata))
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });

    it('should reject upload without file', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${issuerToken}`)
        .field('metadata', JSON.stringify(validMetadata))
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No file uploaded');
    });

    it('should validate required metadata fields', async () => {
      const invalidMetadata = {
        studentName: 'John Doe',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${issuerToken}`)
        .attach('document', testFileBuffer, 'test-degree.pdf')
        .field('metadata', JSON.stringify(invalidMetadata))
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeInstanceOf(Array);
    });

    it('should validate document type', async () => {
      const invalidMetadata = {
        ...validMetadata,
        documentType: 'invalid-type'
      };

      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${issuerToken}`)
        .attach('document', testFileBuffer, 'test-degree.pdf')
        .field('metadata', JSON.stringify(invalidMetadata))
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should validate date formats', async () => {
      const invalidMetadata = {
        ...validMetadata,
        issueDate: 'invalid-date'
      };

      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${issuerToken}`)
        .attach('document', testFileBuffer, 'test-degree.pdf')
        .field('metadata', JSON.stringify(invalidMetadata))
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should validate expiry date is after issue date', async () => {
      const invalidMetadata = {
        ...validMetadata,
        issueDate: '2023-06-15T00:00:00.000Z',
        expiryDate: '2023-06-14T00:00:00.000Z' // Before issue date
      };

      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${issuerToken}`)
        .attach('document', testFileBuffer, 'test-degree.pdf')
        .field('metadata', JSON.stringify(invalidMetadata))
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Expiry date must be after issue date');
    });

    it('should set custom owner address when provided', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${issuerToken}`)
        .attach('document', testFileBuffer, 'test-degree.pdf')
        .field('metadata', JSON.stringify(validMetadata))
        .field('ownerAddress', studentWallet.address)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.document.access.owner).toBe(studentWallet.address.toLowerCase());
      expect(response.body.data.document.access.issuer).toBe(issuerWallet.address.toLowerCase());
    });

    it('should reject duplicate document hash', async () => {
      // Upload first document
      await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${issuerToken}`)
        .attach('document', testFileBuffer, 'test-degree.pdf')
        .field('metadata', JSON.stringify(validMetadata))
        .expect(201);

      // Try to upload same document again
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${issuerToken}`)
        .attach('document', testFileBuffer, 'test-degree.pdf')
        .field('metadata', JSON.stringify(validMetadata))
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Document with this hash already exists');
    });
  });

  describe('GET /api/documents', () => {
    beforeEach(async () => {
      // Create test documents
      const documentHash1 = encryptionService.generateFileHash(Buffer.from('test1'));
      const documentHash2 = encryptionService.generateFileHash(Buffer.from('test2'));

      await Document.create({
        documentHash: documentHash1,
        ipfsHash: 'QmTestHash1',
        encryptionKey: 'test-key-1',
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
          authorizedViewers: []
        },
        audit: {
          uploadedBy: (await User.findByWallet(issuerWallet.address))._id
        },
        fileInfo: {
          originalName: 'test1.pdf',
          mimeType: 'application/pdf',
          size: 1024
        },
        status: 'blockchain_stored'
      });

      await Document.create({
        documentHash: documentHash2,
        ipfsHash: 'QmTestHash2',
        encryptionKey: 'test-key-2',
        metadata: {
          studentName: 'Jane Smith',
          studentId: 'STU002',
          institutionName: 'Test University',
          documentType: 'certificate',
          issueDate: new Date('2023-07-15')
        },
        access: {
          owner: issuerWallet.address,
          issuer: issuerWallet.address,
          authorizedViewers: []
        },
        audit: {
          uploadedBy: (await User.findByWallet(issuerWallet.address))._id
        },
        fileInfo: {
          originalName: 'test2.pdf',
          mimeType: 'application/pdf',
          size: 2048
        },
        status: 'blockchain_stored'
      });
    });

    it('should return documents for issuer', async () => {
      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${issuerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.documents).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
    });

    it('should return only owned documents for student', async () => {
      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.documents).toHaveLength(1);
      expect(response.body.data.documents[0].access.owner).toBe(studentWallet.address.toLowerCase());
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/documents?page=1&limit=1')
        .set('Authorization', `Bearer ${issuerToken}`)
        .expect(200);

      expect(response.body.data.documents).toHaveLength(1);
      expect(response.body.data.pagination.limit).toBe(1);
      expect(response.body.data.pagination.pages).toBe(2);
    });

    it('should support filtering by document type', async () => {
      const response = await request(app)
        .get('/api/documents?documentType=degree')
        .set('Authorization', `Bearer ${issuerToken}`)
        .expect(200);

      expect(response.body.data.documents).toHaveLength(1);
      expect(response.body.data.documents[0].metadata.documentType).toBe('degree');
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/documents?search=John')
        .set('Authorization', `Bearer ${issuerToken}`)
        .expect(200);

      expect(response.body.data.documents).toHaveLength(1);
      expect(response.body.data.documents[0].metadata.studentName).toBe('John Doe');
    });

    it('should not expose encryption keys', async () => {
      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${issuerToken}`)
        .expect(200);

      response.body.data.documents.forEach(doc => {
        expect(doc).not.toHaveProperty('encryptionKey');
      });
    });
  });

  describe('GET /api/documents/:documentHash', () => {
    let testDocument;

    beforeEach(async () => {
      const documentHash = encryptionService.generateFileHash(Buffer.from('test'));
      
      testDocument = await Document.create({
        documentHash,
        ipfsHash: 'QmTestHash',
        encryptionKey: 'test-key',
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
          authorizedViewers: []
        },
        audit: {
          uploadedBy: (await User.findByWallet(issuerWallet.address))._id
        },
        fileInfo: {
          originalName: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024
        },
        status: 'blockchain_stored'
      });
    });

    it('should return document for owner', async () => {
      const response = await request(app)
        .get(`/api/documents/${testDocument.documentHash}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.document.documentHash).toBe(testDocument.documentHash);
      expect(response.body.data.document).toHaveProperty('encryptionKey');
    });

    it('should return document for issuer', async () => {
      const response = await request(app)
        .get(`/api/documents/${testDocument.documentHash}`)
        .set('Authorization', `Bearer ${issuerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.document.documentHash).toBe(testDocument.documentHash);
      expect(response.body.data.document).toHaveProperty('encryptionKey');
    });

    it('should reject access for unauthorized user', async () => {
      const unauthorizedWallet = ethers.Wallet.createRandom();
      await User.createWithRole(unauthorizedWallet.address, 'student');
      const unauthorizedToken = await getAuthToken(unauthorizedWallet);

      const response = await request(app)
        .get(`/api/documents/${testDocument.documentHash}`)
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    it('should return 404 for non-existent document', async () => {
      const nonExistentHash = '0x' + '0'.repeat(64);
      
      const response = await request(app)
        .get(`/api/documents/${nonExistentHash}`)
        .set('Authorization', `Bearer ${issuerToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Document not found');
    });

    it('should validate document hash format', async () => {
      const response = await request(app)
        .get('/api/documents/invalid-hash')
        .set('Authorization', `Bearer ${issuerToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('Document Model', () => {
    it('should generate correct document hash', () => {
      const fileBuffer = Buffer.from('test content');
      const hash = Document.generateDocumentHash(fileBuffer);
      
      expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(hash).toBe(encryptionService.generateFileHash(fileBuffer));
    });

    it('should check access permissions correctly', async () => {
      const document = new Document({
        documentHash: '0x' + '1'.repeat(64),
        ipfsHash: 'QmTestHash',
        encryptionKey: 'test-key',
        metadata: {
          studentName: 'Test Student',
          studentId: 'STU001',
          institutionName: 'Test University',
          documentType: 'degree',
          issueDate: new Date()
        },
        access: {
          owner: studentWallet.address,
          issuer: issuerWallet.address,
          authorizedViewers: []
        },
        audit: {
          uploadedBy: new mongoose.Types.ObjectId()
        },
        fileInfo: {
          originalName: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024
        }
      });

      expect(document.hasAccess(studentWallet.address)).toBe(true);
      expect(document.hasAccess(issuerWallet.address)).toBe(true);
      expect(document.hasAccess(ethers.Wallet.createRandom().address)).toBe(false);
    });

    it('should add and remove authorized viewers', async () => {
      const document = new Document({
        documentHash: '0x' + '1'.repeat(64),
        ipfsHash: 'QmTestHash',
        encryptionKey: 'test-key',
        metadata: {
          studentName: 'Test Student',
          studentId: 'STU001',
          institutionName: 'Test University',
          documentType: 'degree',
          issueDate: new Date()
        },
        access: {
          owner: studentWallet.address,
          issuer: issuerWallet.address,
          authorizedViewers: []
        },
        audit: {
          uploadedBy: new mongoose.Types.ObjectId()
        },
        fileInfo: {
          originalName: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024
        }
      });

      const viewerAddress = ethers.Wallet.createRandom().address;
      
      // Add viewer
      document.addAuthorizedViewer(viewerAddress);
      expect(document.access.authorizedViewers).toContain(viewerAddress.toLowerCase());
      expect(document.hasAccess(viewerAddress)).toBe(true);
      
      // Remove viewer
      document.removeAuthorizedViewer(viewerAddress);
      expect(document.access.authorizedViewers).not.toContain(viewerAddress.toLowerCase());
      expect(document.hasAccess(viewerAddress)).toBe(false);
    });
  });
});