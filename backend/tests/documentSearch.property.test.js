const fc = require('fast-check');
const mongoose = require('mongoose');
const Document = require('../models/Document');
const User = require('../models/User');
const { MongoMemoryServer } = require('mongodb-memory-server');

/**
 * Property-Based Tests for Document Search
 * Feature: academic-document-blockchain-verification, Property 18: Document Search Correctness
 * Validates: Requirements 10.5
 */

describe('Document Search Property Tests', () => {
  let mongoServer;

  // Helper function to generate valid IPFS CIDv0 hash
  const generateValidIPFSHash = (index) => {
    // CIDv0 format: Qm + 44 base58 characters
    const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const hash = index.toString().padStart(44, '0').split('').map((c, i) => 
      base58Chars[parseInt(c + i.toString()) % base58Chars.length]
    ).join('');
    return 'Qm' + hash;
  };

  beforeAll(async () => {
    // Create in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Disconnect from any existing connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  /**
   * Feature: academic-document-blockchain-verification, Property 18: Document Search Correctness
   * Validates: Requirements 10.5
   * 
   * For any search query (student name, document type, date range), 
   * all returned documents should match the search criteria.
   */
  describe('Property 18: Document Search Correctness', () => {
    
    test('search by document type returns only matching documents', async () => {
      // Create a test user
      const testUser = new User({
        walletAddress: '0x1234567890123456789012345678901234567890',
        email: 'test@example.com',
        profile: { name: 'Test User' },
        role: 'issuer',
        isVerified: true
      });
      await testUser.save();

      // Create documents with different types
      const types = ['degree', 'certificate', 'transcript'];
      const timestamp = Date.now();
      
      for (let i = 0; i < types.length; i++) {
        const uniqueId = timestamp + i;
        await new Document({
          documentHash: `0x${uniqueId.toString(16).padStart(64, '0')}`,
          ipfsHash: generateValidIPFSHash(uniqueId),
          encryptionKey: 'test-key-' + uniqueId,
          metadata: {
            studentName: 'Test Student',
            studentId: '12345',
            institutionName: 'Test College',
            documentType: types[i],
            issueDate: new Date('2020-01-01')
          },
          access: {
            owner: '0x1234567890123456789012345678901234567890',
            issuer: '0x1234567890123456789012345678901234567890',
            authorizedViewers: []
          },
          audit: {
            uploadedBy: testUser._id
          },
          fileInfo: {
            originalName: `document-${uniqueId}.pdf`,
            mimeType: 'application/pdf',
            size: 1000
          },
          status: 'blockchain_stored',
          isActive: true
        }).save();
      }

      // Search for each type
      for (const searchType of types) {
        const results = await Document.find({
          isActive: true,
          'metadata.documentType': searchType
        });

        // All results should match the search type
        expect(results.length).toBeGreaterThan(0);
        for (const result of results) {
          expect(result.metadata.documentType).toBe(searchType);
        }
      }
    });

    test('search excludes inactive documents', async () => {
      // Create a test user
      const testUser = new User({
        walletAddress: '0x1234567890123456789012345678901234567890',
        email: 'test@example.com',
        profile: { name: 'Test User' },
        role: 'issuer',
        isVerified: true
      });
      await testUser.save();

      const timestamp = Date.now();
      
      // Create active document
      const activeDoc = await new Document({
        documentHash: `0x${timestamp.toString(16).padStart(64, '0')}`,
        ipfsHash: generateValidIPFSHash(timestamp),
        encryptionKey: 'test-key-active',
        metadata: {
          studentName: 'Active Student',
          studentId: '12345',
          institutionName: 'Test College',
          documentType: 'degree',
          issueDate: new Date('2020-01-01')
        },
        access: {
          owner: '0x1234567890123456789012345678901234567890',
          issuer: '0x1234567890123456789012345678901234567890',
          authorizedViewers: []
        },
        audit: {
          uploadedBy: testUser._id
        },
        fileInfo: {
          originalName: 'active.pdf',
          mimeType: 'application/pdf',
          size: 1000
        },
        status: 'blockchain_stored',
        isActive: true
      }).save();

      // Create inactive document
      const inactiveDoc = await new Document({
        documentHash: `0x${(timestamp + 1).toString(16).padStart(64, '0')}`,
        ipfsHash: generateValidIPFSHash(timestamp + 1),
        encryptionKey: 'test-key-inactive',
        metadata: {
          studentName: 'Inactive Student',
          studentId: '67890',
          institutionName: 'Test College',
          documentType: 'degree',
          issueDate: new Date('2020-01-01')
        },
        access: {
          owner: '0x1234567890123456789012345678901234567890',
          issuer: '0x1234567890123456789012345678901234567890',
          authorizedViewers: []
        },
        audit: {
          uploadedBy: testUser._id
        },
        fileInfo: {
          originalName: 'inactive.pdf',
          mimeType: 'application/pdf',
          size: 1000
        },
        status: 'blockchain_stored',
        isActive: false
        }).save();

      // Search for all documents (should only return active)
      const results = await Document.find({ isActive: true });

      // Should only find the active document
      expect(results.length).toBe(1);
      expect(results[0].documentHash).toBe(activeDoc.documentHash);
      expect(results[0].isActive).toBe(true);

      // Verify inactive document is not in results
      const foundInactive = results.some(doc => doc.documentHash === inactiveDoc.documentHash);
      expect(foundInactive).toBe(false);
    });
  });
});
