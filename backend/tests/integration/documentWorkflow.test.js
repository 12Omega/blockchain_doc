const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const Document = require('../../models/Document');
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { createTestUser, createTestDocument, generateAuthToken } = require('../setup');

/**
 * Integration tests for complete document workflows
 */

describe('Document Workflow Integration Tests', () => {
  let adminToken, issuerToken, studentToken, verifierToken;
  let adminUser, issuerUser, studentUser, verifierUser;
  let testDocumentHash, testDocumentId;
  let testWallet;

  beforeAll(async () => {
    // Create test wallet
    testWallet = ethers.Wallet.createRandom();
  });

  beforeEach(async () => {
    // Create test users with different roles using helper
    adminUser = await createTestUser({
      walletAddress: testWallet.address.toLowerCase(),
      role: 'admin',
      profile: {
        name: 'Admin User',
        email: 'admin@test.com',
        institution: 'Test University'
      },
      permissions: {
        canIssue: true,
        canVerify: true,
        canTransfer: true
      }
    });

    issuerUser = await createTestUser({
      walletAddress: ethers.Wallet.createRandom().address.toLowerCase(),
      role: 'issuer',
      profile: {
        name: 'Issuer User',
        email: 'issuer@test.com',
        institution: 'Test University'
      },
      permissions: {
        canIssue: true,
        canVerify: true,
        canTransfer: false
      }
    });

    studentUser = await createTestUser({
      walletAddress: ethers.Wallet.createRandom().address.toLowerCase(),
      role: 'student',
      profile: {
        name: 'Student User',
        email: 'student@test.com'
      },
      permissions: {
        canIssue: false,
        canVerify: true,
        canTransfer: false
      }
    });

    verifierUser = await createTestUser({
      walletAddress: ethers.Wallet.createRandom().address.toLowerCase(),
      role: 'verifier',
      profile: {
        name: 'Verifier User',
        email: 'verifier@test.com',
        institution: 'Verification Agency'
      },
      permissions: {
        canIssue: false,
        canVerify: true,
        canTransfer: false
      }
    });

    // Generate auth tokens
    adminToken = generateAuthToken(adminUser);
    issuerToken = generateAuthToken(issuerUser);
    studentToken = generateAuthToken(studentUser);
    verifierToken = generateAuthToken(verifierUser);
  });

  describe('Complete Document Upload Workflow', () => {
    test('should complete full document upload workflow as issuer', async () => {
      // Create test PDF file buffer
      const testPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000074 00000 n \n0000000120 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n179\n%%EOF');

      // Step 1: Upload document
      const uploadResponse = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${issuerToken}`)
        .attach('document', testPdfBuffer, 'test-certificate.pdf')
        .field('metadata.studentName', 'John Doe')
        .field('metadata.studentId', 'STU001')
        .field('metadata.institutionName', 'Test University')
        .field('metadata.documentType', 'degree')
        .field('metadata.issueDate', '2023-06-15')
        .field('metadata.course', 'Computer Science')
        .field('metadata.grade', 'A')
        .expect(201);

      expect(uploadResponse.body.success).toBe(true);
      expect(uploadResponse.body.data.documentHash).toBeDefined();
      expect(uploadResponse.body.data.ipfsHash).toBeDefined();
      expect(uploadResponse.body.data.status).toBe('uploaded');

      testDocumentHash = uploadResponse.body.data.documentHash;
      testDocumentId = uploadResponse.body.data._id;

      // Step 2: Verify document was stored in database
      const document = await Document.findById(testDocumentId);
      expect(document).toBeTruthy();
      expect(document.metadata.studentName).toBe('John Doe');
      expect(document.access.issuer).toBe(issuerUser.walletAddress);

      // Step 3: Retrieve document details
      const detailsResponse = await request(app)
        .get(`/api/documents/${testDocumentHash}`)
        .set('Authorization', `Bearer ${issuerToken}`)
        .expect(200);

      expect(detailsResponse.body.success).toBe(true);
      expect(detailsResponse.body.data.documentHash).toBe(testDocumentHash);
      expect(detailsResponse.body.data.metadata.studentName).toBe('John Doe');
    });

    test('should handle document upload validation errors', async () => {
      // Test missing required fields
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${issuerToken}`)
        .attach('document', Buffer.from('invalid file'), 'test.txt')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });

    test('should reject unauthorized document upload', async () => {
      const testPdfBuffer = Buffer.from('%PDF-1.4\ntest content');

      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${studentToken}`) // Student cannot upload
        .attach('document', testPdfBuffer, 'test.pdf')
        .field('metadata.studentName', 'John Doe')
        .field('metadata.studentId', 'STU001')
        .field('metadata.institutionName', 'Test University')
        .field('metadata.documentType', 'degree')
        .field('metadata.issueDate', '2023-06-15')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('permission');
    });
  });

  describe('Document Verification Workflow', () => {
    beforeEach(async () => {
      // Create a test document for verification
      const testDocument = await createTestDocument(studentUser.walletAddress, {
        documentHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        ipfsHash: 'QmTest123456789012345678901234567890123456789',
        encryptionKey: 'test-encryption-key',
        metadata: {
          studentName: 'Jane Smith',
          studentId: 'STU002',
          institutionName: 'Test University',
          documentType: 'certificate',
          issueDate: new Date('2023-06-15'),
          course: 'Mathematics',
          grade: 'B+'
        },
        access: {
          owner: studentUser.walletAddress,
          issuer: issuerUser.walletAddress,
          authorizedViewers: [verifierUser.walletAddress]
        },
        audit: {
          uploadedBy: issuerUser._id,
          verificationCount: 0
        },
        fileInfo: {
          originalName: 'certificate.pdf',
          mimeType: 'application/pdf',
          size: 1024
        },
        status: 'blockchain_stored'
      });

      testDocumentHash = testDocument.documentHash;
    });

    test('should complete document verification workflow', async () => {
      // Step 1: Verify document by hash
      const verifyResponse = await request(app)
        .get(`/api/documents/verify/${testDocumentHash}`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.data.isValid).toBe(true);
      expect(verifyResponse.body.data.metadata.studentName).toBe('Jane Smith');

      // Step 2: Check verification count increased
      const document = await Document.findOne({ documentHash: testDocumentHash });
      expect(document.audit.verificationCount).toBe(1);
      expect(document.audit.lastVerified).toBeDefined();
    });

    test('should handle file-based verification', async () => {
      const testFileBuffer = Buffer.from('test file content for verification');

      const verifyResponse = await request(app)
        .post('/api/documents/verify')
        .set('Authorization', `Bearer ${verifierToken}`)
        .attach('document', testFileBuffer, 'test-document.pdf')
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.data).toBeDefined();
    });

    test('should reject verification of non-existent document', async () => {
      const nonExistentHash = '0x9999999999999999999999999999999999999999999999999999999999999999';

      const response = await request(app)
        .get(`/api/documents/verify/${nonExistentHash}`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('Document Access Control Workflow', () => {
    beforeEach(async () => {
      // Create test document
      const testDocument = await createTestDocument(studentUser.walletAddress, {
        documentHash: '0xabcdef1234567890123456789012345678901234567890123456789012345678',
        ipfsHash: 'QmTestAccess123456789012345678901234567890123',
        encryptionKey: 'test-key',
        metadata: {
          studentName: 'Access Test Student',
          studentId: 'STU003',
          institutionName: 'Test University',
          documentType: 'transcript',
          issueDate: new Date('2023-06-15')
        },
        access: {
          owner: studentUser.walletAddress,
          issuer: issuerUser.walletAddress,
          authorizedViewers: []
        },
        audit: {
          uploadedBy: issuerUser._id
        },
        fileInfo: {
          originalName: 'transcript.pdf',
          mimeType: 'application/pdf',
          size: 2048
        }
      });

      testDocumentHash = testDocument.documentHash;
    });

    test('should complete document sharing workflow', async () => {
      // Step 1: Share document with verifier
      const shareResponse = await request(app)
        .post(`/api/documents/${testDocumentHash}/share`)
        .set('Authorization', `Bearer ${studentToken}`) // Owner sharing
        .send({
          walletAddress: verifierUser.walletAddress,
          permissions: ['view']
        })
        .expect(200);

      expect(shareResponse.body.success).toBe(true);

      // Step 2: Verify access was granted
      const document = await Document.findOne({ documentHash: testDocumentHash });
      expect(document.access.authorizedViewers).toContain(verifierUser.walletAddress);

      // Step 3: Verifier should now be able to access document
      const accessResponse = await request(app)
        .get(`/api/documents/${testDocumentHash}`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .expect(200);

      expect(accessResponse.body.success).toBe(true);
      expect(accessResponse.body.data.metadata.studentName).toBe('Access Test Student');
    });

    test('should revoke document access', async () => {
      // First grant access
      await Document.findOneAndUpdate(
        { documentHash: testDocumentHash },
        { $push: { 'access.authorizedViewers': verifierUser.walletAddress } }
      );

      // Step 1: Revoke access
      const revokeResponse = await request(app)
        .delete(`/api/documents/${testDocumentHash}/share`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          walletAddress: verifierUser.walletAddress
        })
        .expect(200);

      expect(revokeResponse.body.success).toBe(true);

      // Step 2: Verify access was revoked
      const document = await Document.findOne({ documentHash: testDocumentHash });
      expect(document.access.authorizedViewers).not.toContain(verifierUser.walletAddress);

      // Step 3: Verifier should no longer be able to access document
      const accessResponse = await request(app)
        .get(`/api/documents/${testDocumentHash}`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .expect(403);

      expect(accessResponse.body.success).toBe(false);
    });

    test('should prevent unauthorized sharing', async () => {
      // Verifier trying to share document they don't own
      const response = await request(app)
        .post(`/api/documents/${testDocumentHash}/share`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          walletAddress: adminUser.walletAddress,
          permissions: ['view']
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('permission');
    });
  });

  describe('Document Audit Trail Workflow', () => {
    beforeEach(async () => {
      // Create test document with some audit history
      const testDocument = await createTestDocument(studentUser.walletAddress, {
        documentHash: '0xaudit1234567890123456789012345678901234567890123456789012345678',
        ipfsHash: 'QmAuditTest123456789012345678901234567890123',
        encryptionKey: 'audit-test-key',
        metadata: {
          studentName: 'Audit Test Student',
          studentId: 'STU004',
          institutionName: 'Test University',
          documentType: 'diploma',
          issueDate: new Date('2023-06-15')
        },
        access: {
          owner: studentUser.walletAddress,
          issuer: issuerUser.walletAddress,
          authorizedViewers: [verifierUser.walletAddress]
        },
        audit: {
          uploadedBy: issuerUser._id,
          verificationCount: 5,
          lastVerified: new Date()
        },
        fileInfo: {
          originalName: 'diploma.pdf',
          mimeType: 'application/pdf',
          size: 3072
        }
      });

      testDocumentHash = testDocument.documentHash;
    });

    test('should retrieve document audit trail', async () => {
      const auditResponse = await request(app)
        .get(`/api/documents/audit/${testDocumentHash}`)
        .set('Authorization', `Bearer ${issuerToken}`)
        .expect(200);

      expect(auditResponse.body.success).toBe(true);
      expect(auditResponse.body.data.documentHash).toBe(testDocumentHash);
      expect(auditResponse.body.data.audit.verificationCount).toBe(5);
      expect(auditResponse.body.data.audit.uploadedBy).toBeDefined();
    });

    test('should restrict audit trail access to authorized users', async () => {
      // Random user without access should be denied
      const unauthorizedUser = await User.create({
        walletAddress: ethers.Wallet.createRandom().address,
        role: 'student',
        profile: { name: 'Unauthorized User' }
      });

      // Mock token for unauthorized user
      jest.doMock('../../middleware/auth', () => ({
        authenticateToken: (req, res, next) => {
          const token = req.headers.authorization?.replace('Bearer ', '');
          if (token === 'unauthorized-token') {
            req.user = unauthorizedUser;
          }
          next();
        }
      }));

      const response = await request(app)
        .get(`/api/documents/audit/${testDocumentHash}`)
        .set('Authorization', 'Bearer unauthorized-token')
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed document hash', async () => {
      const malformedHash = 'invalid-hash-format';

      const response = await request(app)
        .get(`/api/documents/${malformedHash}`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid document hash format');
    });

    test('should handle missing authentication token', async () => {
      const response = await request(app)
        .get('/api/documents')
        .expect(401);

      expect(response.body.error).toContain('Unauthorized');
    });

    test('should handle database connection errors gracefully', async () => {
      // Temporarily close database connection
      await mongoose.connection.close();

      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);

      // Reconnect for cleanup
      const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/blockchain-doc-integration-test';
      await mongoose.connect(mongoUri);
    });

    test('should handle large file uploads within limits', async () => {
      // Create a large but valid file (within 10MB limit)
      const largeBuffer = Buffer.alloc(5 * 1024 * 1024, 'a'); // 5MB

      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${issuerToken}`)
        .attach('document', largeBuffer, 'large-document.pdf')
        .field('metadata.studentName', 'Large File Test')
        .field('metadata.studentId', 'STU005')
        .field('metadata.institutionName', 'Test University')
        .field('metadata.documentType', 'thesis')
        .field('metadata.issueDate', '2023-06-15')
        .expect(413); // Should be rejected due to size

      expect(response.body.success).toBe(false);
    });

    test('should handle concurrent document operations', async () => {
      // Create multiple documents concurrently
      const uploadPromises = [];
      
      for (let i = 0; i < 5; i++) {
        const testBuffer = Buffer.from(`%PDF-1.4\nTest document ${i}`);
        
        const uploadPromise = request(app)
          .post('/api/documents/upload')
          .set('Authorization', `Bearer ${issuerToken}`)
          .attach('document', testBuffer, `test-${i}.pdf`)
          .field('metadata.studentName', `Student ${i}`)
          .field('metadata.studentId', `STU00${i}`)
          .field('metadata.institutionName', 'Test University')
          .field('metadata.documentType', 'certificate')
          .field('metadata.issueDate', '2023-06-15');
        
        uploadPromises.push(uploadPromise);
      }

      const responses = await Promise.all(uploadPromises);
      
      // All uploads should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Verify all documents were created
      const documentCount = await Document.countDocuments({});
      expect(documentCount).toBe(5);
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle multiple concurrent verification requests', async () => {
      // Create test document
      const testDocument = await createTestDocument(studentUser.walletAddress, {
        documentHash: '0xload1234567890123456789012345678901234567890123456789012345678',
        ipfsHash: 'QmLoadTest123456789012345678901234567890123',
        encryptionKey: 'load-test-key',
        metadata: {
          studentName: 'Load Test Student',
          studentId: 'STU006',
          institutionName: 'Test University',
          documentType: 'certificate',
          issueDate: new Date('2023-06-15')
        },
        access: {
          owner: studentUser.walletAddress,
          issuer: issuerUser.walletAddress,
          authorizedViewers: [verifierUser.walletAddress]
        },
        audit: {
          uploadedBy: issuerUser._id,
          verificationCount: 0
        },
        fileInfo: {
          originalName: 'load-test.pdf',
          mimeType: 'application/pdf',
          size: 1024
        }
      });

      // Create multiple concurrent verification requests
      const verificationPromises = [];
      
      for (let i = 0; i < 10; i++) {
        const verifyPromise = request(app)
          .get(`/api/documents/verify/${testDocument.documentHash}`)
          .set('Authorization', `Bearer ${verifierToken}`);
        
        verificationPromises.push(verifyPromise);
      }

      const responses = await Promise.all(verificationPromises);
      
      // All verifications should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Verification count should be updated correctly
      const updatedDocument = await Document.findOne({ documentHash: testDocument.documentHash });
      expect(updatedDocument.audit.verificationCount).toBe(10);
    });

    test('should maintain performance under load', async () => {
      const startTime = Date.now();
      
      // Create multiple document retrieval requests
      const retrievalPromises = [];
      
      for (let i = 0; i < 20; i++) {
        const retrievalPromise = request(app)
          .get('/api/documents')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ limit: 10, page: 1 });
        
        retrievalPromises.push(retrievalPromise);
      }

      const responses = await Promise.all(retrievalPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should complete successfully
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Performance should be reasonable (less than 10 seconds for 20 requests)
      expect(totalTime).toBeLessThan(10000);
      
      console.log(`Load test completed in ${totalTime}ms for 20 concurrent requests`);
    });
  });
});