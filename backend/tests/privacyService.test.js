const mongoose = require('mongoose');
const { privacyService, UserConsent, DataDeletionRequest, DataExportRequest } = require('../services/privacyService');
const User = require('../models/User');
const Document = require('../models/Document');

// Mock dependencies
jest.mock('../utils/logger');
jest.mock('../utils/auditLogger');
jest.mock('../services/ipfsService');

describe('Privacy Service', () => {
  let testUser;
  let testUserId;
  let mockReq;

  // Use the global test setup from setup.js
  // No need for additional database setup here

  beforeEach(async () => {
    // Clear collections if needed
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  beforeEach(async () => {
    // Clean up test data
    await User.deleteMany({});
    await UserConsent.deleteMany({});
    await DataDeletionRequest.deleteMany({});
    await DataExportRequest.deleteMany({});
    await Document.deleteMany({});

    // Create test user
    testUser = await User.create({
      walletAddress: '0x1234567890123456789012345678901234567890',
      role: 'student',
      profile: {
        name: 'Test User',
        email: 'test@example.com'
      }
    });
    testUserId = testUser._id;

    // Mock request object
    mockReq = {
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
      user: testUser,
      originalUrl: '/api/test'
    };
  });

  afterEach(async () => {
    // Clean up after each test
    await User.deleteMany({});
    await UserConsent.deleteMany({});
    await DataDeletionRequest.deleteMany({});
    await DataExportRequest.deleteMany({});
    await Document.deleteMany({});
  });

  describe('Consent Management', () => {
    test('should record user consent successfully', async () => {
      const consent = await privacyService.recordConsent(
        testUserId,
        testUser.walletAddress,
        'data_processing',
        true,
        mockReq,
        {
          purpose: 'Test data processing',
          dataCategories: ['personal_data'],
          legalBasis: 'consent'
        }
      );

      expect(consent).toBeDefined();
      expect(consent.consentType).toBe('data_processing');
      expect(consent.consentGiven).toBe(true);
      expect(consent.purpose).toBe('Test data processing');
      expect(consent.dataCategories).toContain('personal_data');
    });

    test('should update existing consent', async () => {
      // Create initial consent
      await privacyService.recordConsent(
        testUserId,
        testUser.walletAddress,
        'data_processing',
        true,
        mockReq
      );

      // Update consent
      const updatedConsent = await privacyService.recordConsent(
        testUserId,
        testUser.walletAddress,
        'data_processing',
        false,
        mockReq
      );

      expect(updatedConsent.consentGiven).toBe(false);
      expect(updatedConsent.withdrawalDate).toBeDefined();
    });

    test('should check consent correctly', async () => {
      // No consent initially
      let hasConsent = await privacyService.hasConsent(testUserId, 'data_processing');
      expect(hasConsent).toBe(false);

      // Record consent
      await privacyService.recordConsent(
        testUserId,
        testUser.walletAddress,
        'data_processing',
        true,
        mockReq
      );

      // Should have consent now
      hasConsent = await privacyService.hasConsent(testUserId, 'data_processing');
      expect(hasConsent).toBe(true);
    });

    test('should withdraw consent successfully', async () => {
      // Record consent first
      await privacyService.recordConsent(
        testUserId,
        testUser.walletAddress,
        'data_processing',
        true,
        mockReq
      );

      // Withdraw consent
      const withdrawnConsent = await privacyService.withdrawConsent(
        testUserId,
        'data_processing',
        mockReq
      );

      expect(withdrawnConsent.consentGiven).toBe(false);
      expect(withdrawnConsent.withdrawalDate).toBeDefined();

      // Should not have consent anymore
      const hasConsent = await privacyService.hasConsent(testUserId, 'data_processing');
      expect(hasConsent).toBe(false);
    });

    test('should get consent history', async () => {
      // Record multiple consents
      await privacyService.recordConsent(
        testUserId,
        testUser.walletAddress,
        'data_processing',
        true,
        mockReq
      );

      await privacyService.recordConsent(
        testUserId,
        testUser.walletAddress,
        'document_storage',
        true,
        mockReq
      );

      const history = await privacyService.getConsentHistory(testUserId);
      expect(history).toHaveLength(2);
      expect(history.map(c => c.consentType)).toContain('data_processing');
      expect(history.map(c => c.consentType)).toContain('document_storage');
    });
  });

  describe('Data Deletion', () => {
    test('should create data deletion request', async () => {
      const deletionRequest = await privacyService.createDataDeletionRequest(
        testUserId,
        testUser.walletAddress,
        {
          requestType: 'full_deletion',
          reason: 'user_request',
          dataCategories: ['profile_data', 'document_metadata']
        },
        mockReq
      );

      expect(deletionRequest).toBeDefined();
      expect(deletionRequest.requestType).toBe('full_deletion');
      expect(deletionRequest.reason).toBe('user_request');
      expect(deletionRequest.status).toBe('pending');
      expect(deletionRequest.verificationCode).toBeDefined();
      expect(deletionRequest.verificationExpiry).toBeDefined();
    });

    test('should process data deletion request with valid verification code', async () => {
      const deletionRequest = await privacyService.createDataDeletionRequest(
        testUserId,
        testUser.walletAddress,
        {
          requestType: 'anonymization',
          reason: 'user_request',
          dataCategories: ['profile_data']
        },
        mockReq
      );

      const processedRequest = await privacyService.processDataDeletionRequest(
        deletionRequest._id,
        deletionRequest.verificationCode,
        mockReq
      );

      expect(processedRequest.status).toBe('completed');
      expect(processedRequest.completionDate).toBeDefined();
      expect(processedRequest.deletionResults).toBeDefined();
    });

    test('should reject data deletion request with invalid verification code', async () => {
      const deletionRequest = await privacyService.createDataDeletionRequest(
        testUserId,
        testUser.walletAddress,
        {
          requestType: 'full_deletion',
          reason: 'user_request'
        },
        mockReq
      );

      await expect(
        privacyService.processDataDeletionRequest(
          deletionRequest._id,
          'invalid_code',
          mockReq
        )
      ).rejects.toThrow('Invalid verification code');
    });

    test('should reject expired verification code', async () => {
      const deletionRequest = await privacyService.createDataDeletionRequest(
        testUserId,
        testUser.walletAddress,
        {
          requestType: 'full_deletion',
          reason: 'user_request'
        },
        mockReq
      );

      // Manually expire the verification code
      deletionRequest.verificationExpiry = new Date(Date.now() - 1000);
      await deletionRequest.save();

      await expect(
        privacyService.processDataDeletionRequest(
          deletionRequest._id,
          deletionRequest.verificationCode,
          mockReq
        )
      ).rejects.toThrow('Verification code has expired');
    });
  });

  describe('Data Export', () => {
    test('should create data export request', async () => {
      const exportRequest = await privacyService.createDataExportRequest(
        testUserId,
        testUser.walletAddress,
        {
          exportFormat: 'json',
          dataCategories: ['profile_data', 'consent_history']
        },
        mockReq
      );

      expect(exportRequest).toBeDefined();
      expect(exportRequest.exportFormat).toBe('json');
      expect(exportRequest.dataCategories).toContain('profile_data');
      expect(exportRequest.status).toBe('pending');
      expect(exportRequest.expiryDate).toBeDefined();
    });

    test('should gather export data correctly', async () => {
      // Create some test data
      await privacyService.recordConsent(
        testUserId,
        testUser.walletAddress,
        'data_processing',
        true,
        mockReq
      );

      const exportRequest = await DataExportRequest.create({
        userId: testUserId,
        walletAddress: testUser.walletAddress,
        exportFormat: 'json',
        dataCategories: ['profile_data', 'consent_history']
      });

      const exportData = await privacyService.gatherExportData(exportRequest);

      expect(exportData.profile).toBeDefined();
      expect(exportData.profile.walletAddress).toBe(testUser.walletAddress);
      expect(exportData.consents).toBeDefined();
      expect(exportData.consents).toHaveLength(1);
    });

    test('should generate JSON export file', async () => {
      const testData = {
        profile: { name: 'Test User', email: 'test@example.com' },
        consents: [{ consentType: 'data_processing', consentGiven: true }]
      };

      const jsonFile = await privacyService.generateExportFile(testData, 'json');
      const parsedData = JSON.parse(jsonFile);

      expect(parsedData.profile.name).toBe('Test User');
      expect(parsedData.consents[0].consentType).toBe('data_processing');
    });

    test('should generate CSV export file', async () => {
      const testData = {
        profile: { name: 'Test User', email: 'test@example.com' }
      };

      const csvFile = await privacyService.generateExportFile(testData, 'csv');

      expect(csvFile).toContain('--- PROFILE ---');
      expect(csvFile).toContain('name,email');
      expect(csvFile).toContain('"Test User","test@example.com"');
    });

    test('should generate XML export file', async () => {
      const testData = {
        profile: { name: 'Test User', email: 'test@example.com' }
      };

      const xmlFile = await privacyService.generateExportFile(testData, 'xml');

      expect(xmlFile).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xmlFile).toContain('<export>');
      expect(xmlFile).toContain('<profile>');
      expect(xmlFile).toContain('<name>Test User</name>');
      expect(xmlFile).toContain('<email>test@example.com</email>');
    });
  });

  describe('Data Minimization', () => {
    test('should execute data deletion for anonymization', async () => {
      // Create test document
      const testDoc = await Document.create({
        documentHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        ipfsHash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        encryptionKey: 'test-key',
        metadata: {
          studentName: 'Test Student',
          studentId: 'STU001',
          institutionName: 'Test University',
          documentType: 'degree',
          issueDate: new Date()
        },
        access: {
          owner: testUser.walletAddress,
          issuer: testUser.walletAddress
        },
        audit: {
          uploadedBy: testUserId
        },
        fileInfo: {
          originalName: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1000
        }
      });

      const deletionRequest = await DataDeletionRequest.create({
        userId: testUserId,
        walletAddress: testUser.walletAddress,
        requestType: 'anonymization',
        reason: 'user_request',
        dataCategories: ['profile_data', 'document_metadata'],
        status: 'in_progress'
      });

      const results = await privacyService.executeDataDeletion(deletionRequest);

      expect(results.profileDataDeleted).toBe(true);
      expect(results.documentsDeleted).toBe(1);

      // Check that user profile was anonymized
      const updatedUser = await User.findById(testUserId);
      expect(updatedUser.profile.name).toBe('[ANONYMIZED]');
      expect(updatedUser.profile.email).toBe('[anonymized]'); // lowercase due to schema

      // Check that document was soft deleted
      const updatedDoc = await Document.findById(testDoc._id);
      expect(updatedDoc.isActive).toBe(false);
      expect(updatedDoc.metadata.studentName).toBe('[DELETED]');
    });

    test('should handle retention compliance check', async () => {
      // Create expired consent
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 10); // 10 days ago

      await UserConsent.create({
        userId: testUserId,
        walletAddress: testUser.walletAddress,
        consentType: 'data_processing',
        purpose: 'Test data processing for retention compliance',
        consentGiven: true,
        consentDate: expiredDate,
        retentionPeriod: 5 // 5 days retention
      });

      const results = await privacyService.checkRetentionCompliance();

      expect(results.expiredConsents).toBe(1);
      expect(results.deletionRequestsCreated).toBe(1);

      // Check that deletion request was created
      const deletionRequests = await DataDeletionRequest.find({
        userId: testUserId,
        reason: 'data_retention_expired'
      });
      expect(deletionRequests).toHaveLength(1);
    });
  });

  describe('Utility Functions', () => {
    test('should get default purpose for consent type', () => {
      const purpose = privacyService.getDefaultPurpose('data_processing');
      expect(purpose).toContain('Processing personal data');
    });

    test('should escape XML special characters', () => {
      const testString = '<script>alert("test")</script>';
      const escaped = privacyService.escapeXML(testString);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;');
    });

    test('should handle non-string values in XML escape', () => {
      expect(privacyService.escapeXML(123)).toBe(123);
      expect(privacyService.escapeXML(null)).toBe(null);
      expect(privacyService.escapeXML(undefined)).toBe(undefined);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid user ID in consent recording', async () => {
      const invalidUserId = new mongoose.Types.ObjectId();
      
      await expect(
        privacyService.recordConsent(
          invalidUserId,
          testUser.walletAddress,
          'data_processing',
          true,
          mockReq
        )
      ).resolves.toBeDefined(); // Should not throw, just create the consent record
    });

    test('should handle missing consent in withdrawal', async () => {
      await expect(
        privacyService.withdrawConsent(testUserId, 'data_processing', mockReq)
      ).rejects.toThrow('No active consent found to withdraw');
    });

    test('should handle invalid deletion request ID', async () => {
      const invalidId = new mongoose.Types.ObjectId();
      
      await expect(
        privacyService.processDataDeletionRequest(invalidId, 'test-code', mockReq)
      ).rejects.toThrow('Deletion request not found');
    });
  });
});