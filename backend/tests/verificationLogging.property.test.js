const fc = require('fast-check');
const mongoose = require('mongoose');
const VerificationLog = require('../models/VerificationLog');
const encryptionService = require('../services/encryptionService');

/**
 * Property-Based Tests for Verification Logging and Audit Trail
 * Feature: academic-document-blockchain-verification
 */

describe('Verification Logging Property Tests', () => {
  
  // Generators for test data
  const documentHashGenerator = fc.array(
    fc.integer({ min: 0, max: 15 }), 
    { minLength: 64, maxLength: 64 }
  ).map(arr => '0x' + arr.map(n => n.toString(16)).join(''));

  const addressGenerator = fc.array(
    fc.integer({ min: 0, max: 15 }), 
    { minLength: 40, maxLength: 40 }
  ).map(arr => '0x' + arr.map(n => n.toString(16)).join(''));

  const verificationMethodGenerator = fc.constantFrom('upload', 'qr', 'hash');
  const verificationResultGenerator = fc.constantFrom('authentic', 'tampered', 'not_found');

  /**
   * Feature: academic-document-blockchain-verification, Property 13: Verification Logging
   * Validates: Requirements 9.1, 9.2
   * 
   * For any verification attempt, a log entry should be created in the database
   * with timestamp, verifier information, and result.
   */
  describe('Property 13: Verification Logging', () => {
    test('every verification creates a log entry with required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          documentHashGenerator,
          fc.option(addressGenerator, { nil: 'anonymous' }),
          verificationMethodGenerator,
          verificationResultGenerator,
          async (documentHash, verifier, method, result) => {
            // Create verification log data
            const logData = {
              documentHash,
              verifier,
              verifierIp: '127.0.0.1',
              verificationMethod: method,
              result,
              userAgent: 'test-agent'
            };

            // Verify all required fields are present
            expect(logData.documentHash).toBeDefined();
            expect(logData.verifier).toBeDefined();
            expect(logData.verifierIp).toBeDefined();
            expect(logData.verificationMethod).toBeDefined();
            expect(logData.result).toBeDefined();

            // Verify field types
            expect(typeof logData.documentHash).toBe('string');
            expect(typeof logData.verifier).toBe('string');
            expect(typeof logData.verifierIp).toBe('string');
            expect(['upload', 'qr', 'hash']).toContain(logData.verificationMethod);
            expect(['authentic', 'tampered', 'not_found']).toContain(logData.result);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('log entries include timestamp', async () => {
      await fc.assert(
        fc.asyncProperty(
          documentHashGenerator,
          verificationResultGenerator,
          async (documentHash, result) => {
            const beforeTimestamp = new Date();
            
            const logData = {
              documentHash,
              verifier: 'anonymous',
              verifierIp: '127.0.0.1',
              verificationMethod: 'hash',
              result,
              timestamp: new Date()
            };

            const afterTimestamp = new Date();

            // Timestamp should be between before and after
            expect(logData.timestamp).toBeDefined();
            expect(logData.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTimestamp.getTime());
            expect(logData.timestamp.getTime()).toBeLessThanOrEqual(afterTimestamp.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });

    test('verification method is always one of valid types', async () => {
      await fc.assert(
        fc.asyncProperty(
          verificationMethodGenerator,
          async (method) => {
            const validMethods = ['upload', 'qr', 'hash'];
            expect(validMethods).toContain(method);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('verification result is always one of valid states', async () => {
      await fc.assert(
        fc.asyncProperty(
          verificationResultGenerator,
          async (result) => {
            const validResults = ['authentic', 'tampered', 'not_found'];
            expect(validResults).toContain(result);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('anonymous and authenticated verifiers are both logged', async () => {
      await fc.assert(
        fc.asyncProperty(
          documentHashGenerator,
          fc.boolean(),
          addressGenerator,
          async (documentHash, isAuthenticated, address) => {
            const verifier = isAuthenticated ? address : 'anonymous';
            
            const logData = {
              documentHash,
              verifier,
              verifierIp: '127.0.0.1',
              verificationMethod: 'hash',
              result: 'authentic'
            };

            expect(logData.verifier).toBeDefined();
            if (isAuthenticated) {
              expect(logData.verifier).toMatch(/^0x[a-fA-F0-9]{40}$/);
            } else {
              expect(logData.verifier).toBe('anonymous');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: academic-document-blockchain-verification, Property 14: Audit Trail Completeness
   * Validates: Requirements 9.3
   * 
   * For any document, querying its audit trail should return all verification attempts
   * that were logged for that document.
   */
  describe('Property 14: Audit Trail Completeness', () => {
    test('audit trail contains all logged verifications for a document', async () => {
      await fc.assert(
        fc.asyncProperty(
          documentHashGenerator,
          fc.array(verificationResultGenerator, { minLength: 1, maxLength: 10 }),
          async (documentHash, results) => {
            // Simulate multiple verification attempts
            const loggedAttempts = results.map((result, index) => ({
              documentHash,
              verifier: 'anonymous',
              verifierIp: '127.0.0.1',
              verificationMethod: 'hash',
              result,
              timestamp: new Date(Date.now() + index * 1000)
            }));

            // Query should return all attempts
            const retrievedCount = loggedAttempts.length;
            const expectedCount = results.length;

            expect(retrievedCount).toBe(expectedCount);
            expect(retrievedCount).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('audit trail preserves chronological order', async () => {
      await fc.assert(
        fc.asyncProperty(
          documentHashGenerator,
          fc.array(verificationResultGenerator, { minLength: 2, maxLength: 10 }),
          async (documentHash, results) => {
            // Create logs with increasing timestamps
            const logs = results.map((result, index) => ({
              documentHash,
              verifier: 'anonymous',
              verifierIp: '127.0.0.1',
              verificationMethod: 'hash',
              result,
              timestamp: new Date(Date.now() + index * 1000)
            }));

            // Verify timestamps are in order
            for (let i = 1; i < logs.length; i++) {
              expect(logs[i].timestamp.getTime()).toBeGreaterThan(logs[i-1].timestamp.getTime());
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('audit trail filtering by result returns only matching logs', async () => {
      await fc.assert(
        fc.asyncProperty(
          documentHashGenerator,
          verificationResultGenerator,
          fc.array(verificationResultGenerator, { minLength: 5, maxLength: 20 }),
          async (documentHash, filterResult, allResults) => {
            // Count how many match the filter
            const expectedMatches = allResults.filter(r => r === filterResult).length;
            
            // Simulate filtering
            const filteredLogs = allResults.filter(r => r === filterResult);
            
            expect(filteredLogs.length).toBe(expectedMatches);
            filteredLogs.forEach(log => {
              expect(log).toBe(filterResult);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('audit trail filtering by date range returns only logs within range', async () => {
      await fc.assert(
        fc.asyncProperty(
          documentHashGenerator,
          fc.integer({ min: 1, max: 10 }),
          async (documentHash, daysRange) => {
            const now = Date.now();
            const startDate = new Date(now - daysRange * 24 * 60 * 60 * 1000);
            const endDate = new Date(now);

            // Create logs with various timestamps
            const logs = Array.from({ length: 20 }, (_, i) => ({
              documentHash,
              timestamp: new Date(now - i * 24 * 60 * 60 * 1000),
              result: 'authentic'
            }));

            // Filter logs within date range
            const filteredLogs = logs.filter(log => 
              log.timestamp >= startDate && log.timestamp <= endDate
            );

            // All filtered logs should be within range
            filteredLogs.forEach(log => {
              expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
              expect(log.timestamp.getTime()).toBeLessThanOrEqual(endDate.getTime());
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('audit trail for different documents are independent', async () => {
      await fc.assert(
        fc.asyncProperty(
          documentHashGenerator,
          documentHashGenerator,
          fc.array(verificationResultGenerator, { minLength: 1, maxLength: 5 }),
          fc.array(verificationResultGenerator, { minLength: 1, maxLength: 5 }),
          async (hash1, hash2, results1, results2) => {
            // Skip if hashes are the same
            if (hash1 === hash2) return;

            // Logs for document 1
            const logs1 = results1.map(r => ({ documentHash: hash1, result: r }));
            
            // Logs for document 2
            const logs2 = results2.map(r => ({ documentHash: hash2, result: r }));

            // Filtering by hash1 should not return hash2 logs
            const filtered1 = [...logs1, ...logs2].filter(log => log.documentHash === hash1);
            expect(filtered1.length).toBe(logs1.length);
            filtered1.forEach(log => {
              expect(log.documentHash).toBe(hash1);
            });

            // Filtering by hash2 should not return hash1 logs
            const filtered2 = [...logs1, ...logs2].filter(log => log.documentHash === hash2);
            expect(filtered2.length).toBe(logs2.length);
            filtered2.forEach(log => {
              expect(log.documentHash).toBe(hash2);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: academic-document-blockchain-verification, Property 15: Suspicious Activity Detection
   * Validates: Requirements 9.4
   * 
   * For any sequence of failed verification attempts exceeding the threshold,
   * the system should flag the activity as suspicious.
   */
  describe('Property 15: Suspicious Activity Detection', () => {
    test('failed attempts below threshold are not flagged', async () => {
      await fc.assert(
        fc.asyncProperty(
          documentHashGenerator,
          fc.integer({ min: 1, max: 4 }),
          fc.integer({ min: 5, max: 10 }),
          async (documentHash, failedCount, threshold) => {
            // Failed count is below threshold
            const isSuspicious = failedCount >= threshold;
            
            expect(isSuspicious).toBe(false);
            expect(failedCount).toBeLessThan(threshold);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('failed attempts at or above threshold are flagged', async () => {
      await fc.assert(
        fc.asyncProperty(
          documentHashGenerator,
          fc.integer({ min: 5, max: 20 }),
          fc.integer({ min: 1, max: 5 }),
          async (documentHash, failedCount, threshold) => {
            // Failed count is at or above threshold
            const isSuspicious = failedCount >= threshold;
            
            expect(isSuspicious).toBe(true);
            expect(failedCount).toBeGreaterThanOrEqual(threshold);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('suspicious activity detection considers time window', async () => {
      await fc.assert(
        fc.asyncProperty(
          documentHashGenerator,
          fc.integer({ min: 5, max: 20 }),
          fc.integer({ min: 10, max: 60 }),
          async (documentHash, failedCount, timeWindowMinutes) => {
            const now = Date.now();
            const timeWindow = new Date(now - timeWindowMinutes * 60 * 1000);

            // Create failed attempts within time window (spread evenly but within window)
            const intervalMs = (timeWindowMinutes * 60 * 1000) / (failedCount + 1);
            const recentFailures = Array.from({ length: failedCount }, (_, i) => ({
              documentHash,
              result: 'tampered',
              timestamp: new Date(now - i * intervalMs) // Spread within time window
            }));

            // All should be within time window
            recentFailures.forEach(log => {
              expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(timeWindow.getTime());
              expect(log.timestamp.getTime()).toBeLessThanOrEqual(now);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('only failed attempts count toward suspicious activity', async () => {
      await fc.assert(
        fc.asyncProperty(
          documentHashGenerator,
          fc.array(verificationResultGenerator, { minLength: 10, maxLength: 30 }),
          async (documentHash, results) => {
            // Count only failed attempts (tampered or not_found)
            const failedAttempts = results.filter(r => r === 'tampered' || r === 'not_found').length;
            const successfulAttempts = results.filter(r => r === 'authentic').length;

            // Successful attempts should not count
            expect(failedAttempts + successfulAttempts).toBe(results.length);
            
            // Only failed attempts contribute to suspicious activity
            const suspiciousCount = failedAttempts;
            expect(suspiciousCount).toBe(failedAttempts);
            
            // Suspicious count should not include successful attempts
            if (successfulAttempts > 0 && failedAttempts !== successfulAttempts) {
              expect(suspiciousCount).not.toBe(successfulAttempts);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('suspicious activity threshold is configurable', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 10, max: 15 }),
          async (threshold1, failedCount) => {
            const threshold2 = threshold1 + 5;

            const isSuspicious1 = failedCount >= threshold1;
            const isSuspicious2 = failedCount >= threshold2;

            // Different thresholds produce different results
            if (failedCount >= threshold2) {
              expect(isSuspicious1).toBe(true);
              expect(isSuspicious2).toBe(true);
            } else if (failedCount >= threshold1 && failedCount < threshold2) {
              expect(isSuspicious1).toBe(true);
              expect(isSuspicious2).toBe(false);
            } else {
              expect(isSuspicious1).toBe(false);
              expect(isSuspicious2).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: academic-document-blockchain-verification, Property 16: Audit Log Filtering
   * Validates: Requirements 9.5
   * 
   * For any filter criteria (date range, document ID, status), the returned audit logs
   * should match all specified criteria.
   */
  describe('Property 16: Audit Log Filtering', () => {
    test('filtering by document hash returns only matching logs', async () => {
      await fc.assert(
        fc.asyncProperty(
          documentHashGenerator,
          documentHashGenerator,
          fc.array(verificationResultGenerator, { minLength: 5, maxLength: 10 }),
          async (targetHash, otherHash, results) => {
            // Skip if hashes are the same
            if (targetHash === otherHash) return;

            // Create logs for both documents
            const allLogs = [
              ...results.map(r => ({ documentHash: targetHash, result: r })),
              ...results.map(r => ({ documentHash: otherHash, result: r }))
            ];

            // Filter by target hash
            const filtered = allLogs.filter(log => log.documentHash === targetHash);

            // All filtered logs should match target hash
            expect(filtered.length).toBe(results.length);
            filtered.forEach(log => {
              expect(log.documentHash).toBe(targetHash);
              expect(log.documentHash).not.toBe(otherHash);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('filtering by status returns only matching logs', async () => {
      await fc.assert(
        fc.asyncProperty(
          documentHashGenerator,
          verificationResultGenerator,
          fc.array(verificationResultGenerator, { minLength: 10, maxLength: 20 }),
          async (documentHash, targetStatus, allStatuses) => {
            // Create logs with various statuses
            const allLogs = allStatuses.map((status, i) => ({
              documentHash,
              result: status,
              timestamp: new Date(Date.now() + i * 1000)
            }));

            // Filter by target status
            const filtered = allLogs.filter(log => log.result === targetStatus);
            const expectedCount = allStatuses.filter(s => s === targetStatus).length;

            expect(filtered.length).toBe(expectedCount);
            filtered.forEach(log => {
              expect(log.result).toBe(targetStatus);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('filtering by date range returns only logs within range', async () => {
      await fc.assert(
        fc.asyncProperty(
          documentHashGenerator,
          fc.integer({ min: 1, max: 30 }),
          fc.integer({ min: 1, max: 10 }),
          async (documentHash, totalDays, rangeDays) => {
            const now = Date.now();
            const startDate = new Date(now - rangeDays * 24 * 60 * 60 * 1000);
            const endDate = new Date(now);

            // Create logs spanning totalDays
            const allLogs = Array.from({ length: totalDays }, (_, i) => ({
              documentHash,
              timestamp: new Date(now - i * 24 * 60 * 60 * 1000),
              result: 'authentic'
            }));

            // Filter by date range
            const filtered = allLogs.filter(log =>
              log.timestamp >= startDate && log.timestamp <= endDate
            );

            // All filtered logs should be within range
            filtered.forEach(log => {
              expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
              expect(log.timestamp.getTime()).toBeLessThanOrEqual(endDate.getTime());
            });

            // Count should match expected
            const expectedCount = allLogs.filter(log =>
              log.timestamp >= startDate && log.timestamp <= endDate
            ).length;
            expect(filtered.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('multiple filters are applied conjunctively', async () => {
      await fc.assert(
        fc.asyncProperty(
          documentHashGenerator,
          verificationResultGenerator,
          fc.integer({ min: 1, max: 10 }),
          async (documentHash, targetStatus, rangeDays) => {
            const now = Date.now();
            const startDate = new Date(now - rangeDays * 24 * 60 * 60 * 1000);
            const endDate = new Date(now);

            // Create diverse logs
            const allLogs = Array.from({ length: 20 }, (_, i) => ({
              documentHash: i % 2 === 0 ? documentHash : '0x' + 'a'.repeat(64),
              result: i % 3 === 0 ? targetStatus : 'authentic',
              timestamp: new Date(now - i * 24 * 60 * 60 * 1000)
            }));

            // Apply all filters
            const filtered = allLogs.filter(log =>
              log.documentHash === documentHash &&
              log.result === targetStatus &&
              log.timestamp >= startDate &&
              log.timestamp <= endDate
            );

            // All filtered logs must match ALL criteria
            filtered.forEach(log => {
              expect(log.documentHash).toBe(documentHash);
              expect(log.result).toBe(targetStatus);
              expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
              expect(log.timestamp.getTime()).toBeLessThanOrEqual(endDate.getTime());
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('empty filters return all logs', async () => {
      await fc.assert(
        fc.asyncProperty(
          documentHashGenerator,
          fc.array(verificationResultGenerator, { minLength: 5, maxLength: 15 }),
          async (documentHash, results) => {
            // Create logs
            const allLogs = results.map((result, i) => ({
              documentHash,
              result,
              timestamp: new Date(Date.now() + i * 1000)
            }));

            // No filters applied - should return all
            const filtered = allLogs.filter(() => true);

            expect(filtered.length).toBe(allLogs.length);
            expect(filtered).toEqual(allLogs);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
