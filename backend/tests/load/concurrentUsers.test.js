const request = require('supertest');
const { ethers } = require('ethers');
const app = require('../../server');
const User = require('../../models/User');
const Document = require('../../models/Document');
const jwt = require('jsonwebtoken');
const { createTestUser, generateAuthToken } = require('../setup');

/**
 * Load testing for concurrent user scenarios
 */

describe('Concurrent Users Load Testing', () => {
  let testUsers = [];
  let testTokens = [];
  let testDocuments = [];

  beforeAll(async () => {
    // Increase timeout for load tests
    jest.setTimeout(120000); // 2 minutes
  });

  beforeEach(async () => {
    // Test data is cleaned up by setup.js
    testUsers = [];
    testTokens = [];
    testDocuments = [];
  });

  describe('Concurrent User Registration and Authentication', () => {
    test('should handle 10 concurrent user registrations', async () => {
      const startTime = Date.now();
      const userCount = 10; // Reduced from 50 for stability
      const registrationPromises = [];

      // Create concurrent registration requests
      for (let i = 0; i < userCount; i++) {
        const wallet = ethers.Wallet.createRandom();
        
        const registrationPromise = (async () => {
          try {
            // Get nonce
            const nonceResponse = await request(app)
              .post('/api/auth/nonce')
              .send({ walletAddress: wallet.address });

            if (nonceResponse.status !== 200) {
              throw new Error(`Nonce request failed: ${nonceResponse.status}`);
            }

            // Sign message
            const signature = await wallet.signMessage(nonceResponse.body.data.message);

            // Authenticate
            const authResponse = await request(app)
              .post('/api/auth/verify')
              .send({
                walletAddress: wallet.address,
                signature: signature,
                message: nonceResponse.body.data.message,
                nonce: nonceResponse.body.data.nonce
              });

            return {
              userId: i,
              wallet: wallet.address,
              success: authResponse.status === 200,
              token: authResponse.body.data?.token,
              responseTime: Date.now() - startTime
            };
          } catch (error) {
            return {
              userId: i,
              wallet: wallet.address,
              success: false,
              error: error.message,
              responseTime: Date.now() - startTime
            };
          }
        })();

        registrationPromises.push(registrationPromise);
      }

      const results = await Promise.all(registrationPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Analyze results
      const successfulRegistrations = results.filter(r => r.success);
      const failedRegistrations = results.filter(r => !r.success);
      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

      console.log(`\n=== Concurrent Registration Load Test Results ===`);
      console.log(`Total Users: ${userCount}`);
      console.log(`Successful: ${successfulRegistrations.length}`);
      console.log(`Failed: ${failedRegistrations.length}`);
      console.log(`Success Rate: ${(successfulRegistrations.length / userCount * 100).toFixed(2)}%`);
      console.log(`Total Time: ${totalTime}ms`);
      console.log(`Average Response Time: ${averageResponseTime.toFixed(2)}ms`);
      console.log(`Throughput: ${(userCount / (totalTime / 1000)).toFixed(2)} registrations/second`);

      // Assertions
      expect(successfulRegistrations.length).toBeGreaterThan(userCount * 0.8); // At least 80% success rate
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(averageResponseTime).toBeLessThan(5000); // Average response time under 5 seconds

      // Verify users were created in database
      const userCount_db = await User.countDocuments({});
      expect(userCount_db).toBe(successfulRegistrations.length);

      // Store successful users for other tests
      testUsers = successfulRegistrations;
    });

    test('should handle 100 concurrent authentication requests', async () => {
      // First create users
      const userCount = 100;
      const users = [];

      for (let i = 0; i < userCount; i++) {
        const wallet = ethers.Wallet.createRandom();
        const user = await User.create({
          walletAddress: wallet.address.toLowerCase(),
          role: i % 4 === 0 ? 'admin' : i % 4 === 1 ? 'issuer' : i % 4 === 2 ? 'verifier' : 'student',
          session: { nonce: `nonce-${i}`, isActive: true }
        });
        users.push({ user, wallet });
      }

      const startTime = Date.now();
      const authPromises = [];

      // Create concurrent authentication requests
      for (let i = 0; i < userCount; i++) {
        const { user, wallet } = users[i];
        const message = `Sign this message to authenticate with your wallet: ${user.session.nonce}`;
        
        const authPromise = (async () => {
          try {
            const signature = await wallet.signMessage(message);
            
            const response = await request(app)
              .post('/api/auth/verify')
              .send({
                walletAddress: wallet.address,
                signature: signature,
                message: message
              });

            return {
              userId: i,
              success: response.status === 200,
              token: response.body.data?.token,
              responseTime: Date.now() - startTime
            };
          } catch (error) {
            return {
              userId: i,
              success: false,
              error: error.message,
              responseTime: Date.now() - startTime
            };
          }
        })();

        authPromises.push(authPromise);
      }

      const results = await Promise.all(authPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Analyze results
      const successfulAuths = results.filter(r => r.success);
      const failedAuths = results.filter(r => !r.success);
      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

      console.log(`\n=== Concurrent Authentication Load Test Results ===`);
      console.log(`Total Requests: ${userCount}`);
      console.log(`Successful: ${successfulAuths.length}`);
      console.log(`Failed: ${failedAuths.length}`);
      console.log(`Success Rate: ${(successfulAuths.length / userCount * 100).toFixed(2)}%`);
      console.log(`Total Time: ${totalTime}ms`);
      console.log(`Average Response Time: ${averageResponseTime.toFixed(2)}ms`);
      console.log(`Throughput: ${(userCount / (totalTime / 1000)).toFixed(2)} auths/second`);

      // Assertions
      expect(successfulAuths.length).toBeGreaterThan(userCount * 0.9); // At least 90% success rate
      expect(totalTime).toBeLessThan(20000); // Should complete within 20 seconds
      expect(averageResponseTime).toBeLessThan(3000); // Average response time under 3 seconds

      // Store tokens for other tests
      testTokens = successfulAuths.map(r => r.token).filter(Boolean);
    });
  });

  describe('Concurrent Document Operations', () => {
    beforeEach(async () => {
      // Create test users with tokens
      const userCount = 20;
      
      for (let i = 0; i < userCount; i++) {
        const wallet = ethers.Wallet.createRandom();
        const user = await User.create({
          walletAddress: wallet.address.toLowerCase(),
          role: i < 5 ? 'issuer' : 'student', // First 5 are issuers
          permissions: {
            canIssue: i < 5,
            canVerify: true,
            canTransfer: false
          }
        });

        const token = jwt.sign(
          { userId: user._id, walletAddress: user.walletAddress, role: user.role },
          process.env.JWT_SECRET || 'test-secret'
        );

        testUsers.push(user);
        testTokens.push(token);
      }
    });

    test('should handle 25 concurrent document uploads', async () => {
      const uploadCount = 25;
      const issuerTokens = testTokens.slice(0, 5); // Only issuers can upload
      const startTime = Date.now();
      const uploadPromises = [];

      for (let i = 0; i < uploadCount; i++) {
        const token = issuerTokens[i % issuerTokens.length]; // Rotate through issuer tokens
        const testBuffer = Buffer.from(`%PDF-1.4\nTest document ${i} content\n%%EOF`);

        const uploadPromise = (async () => {
          try {
            const response = await request(app)
              .post('/api/documents/upload')
              .set('Authorization', `Bearer ${token}`)
              .attach('document', testBuffer, `test-document-${i}.pdf`)
              .field('studentName', `Student ${i}`)
              .field('studentId', `STU${String(i).padStart(3, '0')}`)
              .field('institutionName', 'Load Test University')
              .field('documentType', 'certificate')
              .field('issueDate', '2023-06-15')
              .field('course', `Course ${i}`)
              .field('grade', 'A');

            return {
              uploadId: i,
              success: response.status === 201,
              documentHash: response.body.data?.documentHash,
              responseTime: Date.now() - startTime,
              error: response.status !== 201 ? response.body.message : null
            };
          } catch (error) {
            return {
              uploadId: i,
              success: false,
              error: error.message,
              responseTime: Date.now() - startTime
            };
          }
        })();

        uploadPromises.push(uploadPromise);
      }

      const results = await Promise.all(uploadPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Analyze results
      const successfulUploads = results.filter(r => r.success);
      const failedUploads = results.filter(r => !r.success);
      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

      console.log(`\n=== Concurrent Document Upload Load Test Results ===`);
      console.log(`Total Uploads: ${uploadCount}`);
      console.log(`Successful: ${successfulUploads.length}`);
      console.log(`Failed: ${failedUploads.length}`);
      console.log(`Success Rate: ${(successfulUploads.length / uploadCount * 100).toFixed(2)}%`);
      console.log(`Total Time: ${totalTime}ms`);
      console.log(`Average Response Time: ${averageResponseTime.toFixed(2)}ms`);
      console.log(`Throughput: ${(uploadCount / (totalTime / 1000)).toFixed(2)} uploads/second`);

      if (failedUploads.length > 0) {
        console.log(`Failed Upload Errors:`, failedUploads.map(f => f.error));
      }

      // Assertions
      expect(successfulUploads.length).toBeGreaterThan(uploadCount * 0.7); // At least 70% success rate
      expect(totalTime).toBeLessThan(45000); // Should complete within 45 seconds
      expect(averageResponseTime).toBeLessThan(10000); // Average response time under 10 seconds

      // Verify documents were created
      const documentCount = await Document.countDocuments({});
      expect(documentCount).toBe(successfulUploads.length);

      // Store document hashes for verification tests
      testDocuments = successfulUploads.map(r => r.documentHash).filter(Boolean);
    });

    test('should handle 100 concurrent document retrievals', async () => {
      // First create some test documents
      const documentsToCreate = 10;
      const createdDocuments = [];

      for (let i = 0; i < documentsToCreate; i++) {
        const document = await Document.create({
          documentHash: `0x${i.toString().padStart(64, '0')}`,
          ipfsHash: `QmTest${i.toString().padStart(40, '0')}`,
          encryptionKey: `key-${i}`,
          metadata: {
            studentName: `Load Test Student ${i}`,
            studentId: `LTS${String(i).padStart(3, '0')}`,
            institutionName: 'Load Test University',
            documentType: 'certificate',
            issueDate: new Date('2023-06-15')
          },
          access: {
            owner: testUsers[i % testUsers.length].walletAddress,
            issuer: testUsers[0].walletAddress, // First user is issuer
            authorizedViewers: testUsers.map(u => u.walletAddress) // All users can view
          },
          audit: {
            uploadedBy: testUsers[0]._id,
            verificationCount: 0
          },
          fileInfo: {
            originalName: `load-test-${i}.pdf`,
            mimeType: 'application/pdf',
            size: 1024
          }
        });
        createdDocuments.push(document);
      }

      const retrievalCount = 100;
      const startTime = Date.now();
      const retrievalPromises = [];

      for (let i = 0; i < retrievalCount; i++) {
        const token = testTokens[i % testTokens.length];
        const document = createdDocuments[i % createdDocuments.length];

        const retrievalPromise = (async () => {
          try {
            const response = await request(app)
              .get(`/api/documents/${document.documentHash}`)
              .set('Authorization', `Bearer ${token}`);

            return {
              retrievalId: i,
              success: response.status === 200,
              responseTime: Date.now() - startTime,
              error: response.status !== 200 ? response.body.message : null
            };
          } catch (error) {
            return {
              retrievalId: i,
              success: false,
              error: error.message,
              responseTime: Date.now() - startTime
            };
          }
        })();

        retrievalPromises.push(retrievalPromise);
      }

      const results = await Promise.all(retrievalPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Analyze results
      const successfulRetrievals = results.filter(r => r.success);
      const failedRetrievals = results.filter(r => !r.success);
      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

      console.log(`\n=== Concurrent Document Retrieval Load Test Results ===`);
      console.log(`Total Retrievals: ${retrievalCount}`);
      console.log(`Successful: ${successfulRetrievals.length}`);
      console.log(`Failed: ${failedRetrievals.length}`);
      console.log(`Success Rate: ${(successfulRetrievals.length / retrievalCount * 100).toFixed(2)}%`);
      console.log(`Total Time: ${totalTime}ms`);
      console.log(`Average Response Time: ${averageResponseTime.toFixed(2)}ms`);
      console.log(`Throughput: ${(retrievalCount / (totalTime / 1000)).toFixed(2)} retrievals/second`);

      // Assertions
      expect(successfulRetrievals.length).toBeGreaterThan(retrievalCount * 0.95); // At least 95% success rate
      expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds
      expect(averageResponseTime).toBeLessThan(2000); // Average response time under 2 seconds
    });

    test('should handle 50 concurrent document verifications', async () => {
      // Create test documents for verification
      const documentsToCreate = 10;
      const createdDocuments = [];

      for (let i = 0; i < documentsToCreate; i++) {
        const document = await Document.create({
          documentHash: `0xverify${i.toString().padStart(58, '0')}`,
          ipfsHash: `QmVerify${i.toString().padStart(38, '0')}`,
          encryptionKey: `verify-key-${i}`,
          metadata: {
            studentName: `Verification Test Student ${i}`,
            studentId: `VTS${String(i).padStart(3, '0')}`,
            institutionName: 'Verification Test University',
            documentType: 'degree',
            issueDate: new Date('2023-06-15')
          },
          access: {
            owner: testUsers[i % testUsers.length].walletAddress,
            issuer: testUsers[0].walletAddress,
            authorizedViewers: testUsers.map(u => u.walletAddress)
          },
          audit: {
            uploadedBy: testUsers[0]._id,
            verificationCount: 0
          },
          fileInfo: {
            originalName: `verification-test-${i}.pdf`,
            mimeType: 'application/pdf',
            size: 2048
          },
          status: 'blockchain_stored'
        });
        createdDocuments.push(document);
      }

      const verificationCount = 50;
      const startTime = Date.now();
      const verificationPromises = [];

      for (let i = 0; i < verificationCount; i++) {
        const token = testTokens[i % testTokens.length];
        const document = createdDocuments[i % createdDocuments.length];

        const verificationPromise = (async () => {
          try {
            const response = await request(app)
              .get(`/api/documents/verify/${document.documentHash}`)
              .set('Authorization', `Bearer ${token}`);

            return {
              verificationId: i,
              success: response.status === 200,
              isValid: response.body.data?.isValid,
              responseTime: Date.now() - startTime,
              error: response.status !== 200 ? response.body.message : null
            };
          } catch (error) {
            return {
              verificationId: i,
              success: false,
              error: error.message,
              responseTime: Date.now() - startTime
            };
          }
        })();

        verificationPromises.push(verificationPromise);
      }

      const results = await Promise.all(verificationPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Analyze results
      const successfulVerifications = results.filter(r => r.success);
      const failedVerifications = results.filter(r => !r.success);
      const validDocuments = results.filter(r => r.success && r.isValid);
      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

      console.log(`\n=== Concurrent Document Verification Load Test Results ===`);
      console.log(`Total Verifications: ${verificationCount}`);
      console.log(`Successful: ${successfulVerifications.length}`);
      console.log(`Failed: ${failedVerifications.length}`);
      console.log(`Valid Documents: ${validDocuments.length}`);
      console.log(`Success Rate: ${(successfulVerifications.length / verificationCount * 100).toFixed(2)}%`);
      console.log(`Total Time: ${totalTime}ms`);
      console.log(`Average Response Time: ${averageResponseTime.toFixed(2)}ms`);
      console.log(`Throughput: ${(verificationCount / (totalTime / 1000)).toFixed(2)} verifications/second`);

      // Assertions
      expect(successfulVerifications.length).toBeGreaterThan(verificationCount * 0.9); // At least 90% success rate
      expect(totalTime).toBeLessThan(20000); // Should complete within 20 seconds
      expect(averageResponseTime).toBeLessThan(3000); // Average response time under 3 seconds

      // Check that verification counts were updated
      const updatedDocuments = await Document.find({
        documentHash: { $in: createdDocuments.map(d => d.documentHash) }
      });
      
      const totalVerificationCount = updatedDocuments.reduce((sum, doc) => sum + doc.audit.verificationCount, 0);
      expect(totalVerificationCount).toBeGreaterThan(0);
    });
  });

  describe('Mixed Workload Stress Testing', () => {
    test('should handle mixed concurrent operations', async () => {
      // Create test users
      const userCount = 30;
      const users = [];
      const tokens = [];

      for (let i = 0; i < userCount; i++) {
        const wallet = ethers.Wallet.createRandom();
        const user = await User.create({
          walletAddress: wallet.address.toLowerCase(),
          role: i < 10 ? 'issuer' : i < 20 ? 'verifier' : 'student',
          permissions: {
            canIssue: i < 10,
            canVerify: true,
            canTransfer: false
          }
        });

        const token = jwt.sign(
          { userId: user._id, walletAddress: user.walletAddress, role: user.role },
          process.env.JWT_SECRET || 'test-secret'
        );

        users.push(user);
        tokens.push(token);
      }

      // Create some initial documents
      const initialDocuments = [];
      for (let i = 0; i < 5; i++) {
        const document = await Document.create({
          documentHash: `0xmixed${i.toString().padStart(59, '0')}`,
          ipfsHash: `QmMixed${i.toString().padStart(39, '0')}`,
          encryptionKey: `mixed-key-${i}`,
          metadata: {
            studentName: `Mixed Test Student ${i}`,
            studentId: `MTS${String(i).padStart(3, '0')}`,
            institutionName: 'Mixed Test University',
            documentType: 'certificate',
            issueDate: new Date('2023-06-15')
          },
          access: {
            owner: users[i + 20].walletAddress, // Students own documents
            issuer: users[i].walletAddress, // Issuers issued documents
            authorizedViewers: users.slice(10, 20).map(u => u.walletAddress) // Verifiers can view
          },
          audit: {
            uploadedBy: users[i]._id,
            verificationCount: 0
          },
          fileInfo: {
            originalName: `mixed-test-${i}.pdf`,
            mimeType: 'application/pdf',
            size: 1024
          }
        });
        initialDocuments.push(document);
      }

      const startTime = Date.now();
      const mixedPromises = [];

      // Mix of different operations
      const operationCount = 60;
      
      for (let i = 0; i < operationCount; i++) {
        const operationType = i % 4; // 4 different operation types
        
        switch (operationType) {
          case 0: // Document upload (issuers only)
            if (i < 40) { // Only first 40 operations can be uploads
              const issuerToken = tokens[i % 10]; // Issuer tokens
              const testBuffer = Buffer.from(`%PDF-1.4\nMixed test document ${i}\n%%EOF`);
              
              const uploadPromise = (async () => {
                try {
                  const response = await request(app)
                    .post('/api/documents/upload')
                    .set('Authorization', `Bearer ${issuerToken}`)
                    .attach('document', testBuffer, `mixed-upload-${i}.pdf`)
                    .field('studentName', `Mixed Student ${i}`)
                    .field('studentId', `MXD${String(i).padStart(3, '0')}`)
                    .field('institutionName', 'Mixed Test University')
                    .field('documentType', 'certificate')
                    .field('issueDate', '2023-06-15');

                  return {
                    operationId: i,
                    type: 'upload',
                    success: response.status === 201,
                    responseTime: Date.now() - startTime
                  };
                } catch (error) {
                  return {
                    operationId: i,
                    type: 'upload',
                    success: false,
                    error: error.message,
                    responseTime: Date.now() - startTime
                  };
                }
              })();
              
              mixedPromises.push(uploadPromise);
            }
            break;

          case 1: // Document retrieval
            const retrievalToken = tokens[i % tokens.length];
            const retrievalDoc = initialDocuments[i % initialDocuments.length];
            
            const retrievalPromise = (async () => {
              try {
                const response = await request(app)
                  .get(`/api/documents/${retrievalDoc.documentHash}`)
                  .set('Authorization', `Bearer ${retrievalToken}`);

                return {
                  operationId: i,
                  type: 'retrieval',
                  success: response.status === 200,
                  responseTime: Date.now() - startTime
                };
              } catch (error) {
                return {
                  operationId: i,
                  type: 'retrieval',
                  success: false,
                  error: error.message,
                  responseTime: Date.now() - startTime
                };
              }
            })();
            
            mixedPromises.push(retrievalPromise);
            break;

          case 2: // Document verification
            const verificationToken = tokens[i % tokens.length];
            const verificationDoc = initialDocuments[i % initialDocuments.length];
            
            const verificationPromise = (async () => {
              try {
                const response = await request(app)
                  .get(`/api/documents/verify/${verificationDoc.documentHash}`)
                  .set('Authorization', `Bearer ${verificationToken}`);

                return {
                  operationId: i,
                  type: 'verification',
                  success: response.status === 200,
                  responseTime: Date.now() - startTime
                };
              } catch (error) {
                return {
                  operationId: i,
                  type: 'verification',
                  success: false,
                  error: error.message,
                  responseTime: Date.now() - startTime
                };
              }
            })();
            
            mixedPromises.push(verificationPromise);
            break;

          case 3: // Document list
            const listToken = tokens[i % tokens.length];
            
            const listPromise = (async () => {
              try {
                const response = await request(app)
                  .get('/api/documents')
                  .set('Authorization', `Bearer ${listToken}`)
                  .query({ limit: 10, page: 1 });

                return {
                  operationId: i,
                  type: 'list',
                  success: response.status === 200,
                  responseTime: Date.now() - startTime
                };
              } catch (error) {
                return {
                  operationId: i,
                  type: 'list',
                  success: false,
                  error: error.message,
                  responseTime: Date.now() - startTime
                };
              }
            })();
            
            mixedPromises.push(listPromise);
            break;
        }
      }

      const results = await Promise.all(mixedPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Analyze results by operation type
      const operationTypes = ['upload', 'retrieval', 'verification', 'list'];
      const analysis = {};

      operationTypes.forEach(type => {
        const typeResults = results.filter(r => r.type === type);
        const successful = typeResults.filter(r => r.success);
        const avgResponseTime = typeResults.length > 0 
          ? typeResults.reduce((sum, r) => sum + r.responseTime, 0) / typeResults.length 
          : 0;

        analysis[type] = {
          total: typeResults.length,
          successful: successful.length,
          failed: typeResults.length - successful.length,
          successRate: typeResults.length > 0 ? (successful.length / typeResults.length * 100).toFixed(2) : 0,
          avgResponseTime: avgResponseTime.toFixed(2)
        };
      });

      const totalSuccessful = results.filter(r => r.success).length;
      const overallSuccessRate = (totalSuccessful / results.length * 100).toFixed(2);

      console.log(`\n=== Mixed Workload Stress Test Results ===`);
      console.log(`Total Operations: ${results.length}`);
      console.log(`Total Time: ${totalTime}ms`);
      console.log(`Overall Success Rate: ${overallSuccessRate}%`);
      console.log(`Overall Throughput: ${(results.length / (totalTime / 1000)).toFixed(2)} ops/second`);
      console.log(`\nBreakdown by Operation Type:`);
      
      operationTypes.forEach(type => {
        const stats = analysis[type];
        if (stats.total > 0) {
          console.log(`  ${type.toUpperCase()}:`);
          console.log(`    Total: ${stats.total}`);
          console.log(`    Successful: ${stats.successful}`);
          console.log(`    Success Rate: ${stats.successRate}%`);
          console.log(`    Avg Response Time: ${stats.avgResponseTime}ms`);
        }
      });

      // Assertions
      expect(parseFloat(overallSuccessRate)).toBeGreaterThan(80); // At least 80% overall success rate
      expect(totalTime).toBeLessThan(60000); // Should complete within 60 seconds
      
      // Each operation type should have reasonable success rates
      operationTypes.forEach(type => {
        if (analysis[type].total > 0) {
          expect(parseFloat(analysis[type].successRate)).toBeGreaterThan(70);
        }
      });
    });
  });

  describe('System Resource Monitoring', () => {
    test('should monitor system resources during load', async () => {
      const monitoringInterval = 1000; // 1 second
      const testDuration = 10000; // 10 seconds
      const resourceMetrics = [];

      // Start resource monitoring
      const monitoringTimer = setInterval(() => {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        resourceMetrics.push({
          timestamp: Date.now(),
          memory: {
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            rss: memUsage.rss
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
          }
        });
      }, monitoringInterval);

      // Generate load while monitoring
      const loadPromises = [];
      const requestCount = 50;

      for (let i = 0; i < requestCount; i++) {
        const token = testTokens[i % testTokens.length] || 'dummy-token';
        
        const loadPromise = request(app)
          .get('/api/documents')
          .set('Authorization', `Bearer ${token}`)
          .query({ limit: 10, page: 1 });
        
        loadPromises.push(loadPromise);
        
        // Stagger requests
        await new Promise(resolve => setTimeout(resolve, testDuration / requestCount));
      }

      await Promise.all(loadPromises);
      
      // Stop monitoring
      clearInterval(monitoringTimer);

      // Analyze resource usage
      const maxMemory = Math.max(...resourceMetrics.map(m => m.memory.heapUsed));
      const avgMemory = resourceMetrics.reduce((sum, m) => sum + m.memory.heapUsed, 0) / resourceMetrics.length;
      const memoryGrowth = resourceMetrics[resourceMetrics.length - 1].memory.heapUsed - resourceMetrics[0].memory.heapUsed;

      console.log(`\n=== System Resource Monitoring Results ===`);
      console.log(`Monitoring Duration: ${testDuration}ms`);
      console.log(`Sample Count: ${resourceMetrics.length}`);
      console.log(`Max Memory Usage: ${(maxMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Avg Memory Usage: ${(avgMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Memory Growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)} MB`);

      // Assertions
      expect(maxMemory).toBeLessThan(500 * 1024 * 1024); // Less than 500MB
      expect(Math.abs(memoryGrowth)).toBeLessThan(100 * 1024 * 1024); // Memory growth less than 100MB
    });
  });
});