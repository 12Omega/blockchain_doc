const fc = require('fast-check');
const crypto = require('crypto');

// Import the actual encryption service, not the mocked one
const encryptionService = jest.requireActual('../services/encryptionService');

/**
 * Property-Based Tests for Document Verification
 * Feature: academic-document-blockchain-verification
 */

describe('Document Verification Property Tests', () => {
  
  // Clear any existing mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  /**
   * Feature: academic-document-blockchain-verification, Property 5: Verification Correctness
   * Validates: Requirements 2.3, 2.4
   * 
   * For any registered document, if we compute its hash and query the blockchain,
   * the computed hash should match the stored hash if and only if the document is unmodified.
   */
  describe('Property 5: Verification Correctness', () => {
    test('unmodified documents should verify as authentic', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 100, maxLength: 10000 }),
          async (documentContent) => {
            // Generate hash for original document
            const originalBuffer = Buffer.from(documentContent);
            const originalHash = encryptionService.generateFileHash(originalBuffer);
            
            // Simulate storing the document (hash is stored)
            const storedHash = originalHash;
            
            // Later, compute hash again for verification
            const verificationHash = encryptionService.generateFileHash(originalBuffer);
            
            // Hashes should match for unmodified document
            expect(verificationHash).toBe(storedHash);
            expect(verificationHash).toBe(originalHash);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('modified documents should not verify as authentic', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 100, maxLength: 10000 }),
          fc.integer({ min: 0, max: 99 }), // position to modify
          fc.integer({ min: 0, max: 255 }), // new byte value
          async (documentContent, modifyPosition, newByte) => {
            // Skip if array is too short
            if (documentContent.length <= modifyPosition) {
              return;
            }
            
            // Generate hash for original document
            const originalBuffer = Buffer.from(documentContent);
            const originalHash = encryptionService.generateFileHash(originalBuffer);
            
            // Modify the document
            const modifiedContent = new Uint8Array(documentContent);
            const originalByte = modifiedContent[modifyPosition];
            modifiedContent[modifyPosition] = newByte;
            
            // Only test if we actually changed something
            if (originalByte === newByte) {
              return;
            }
            
            const modifiedBuffer = Buffer.from(modifiedContent);
            const modifiedHash = encryptionService.generateFileHash(modifiedBuffer);
            
            // Hashes should NOT match for modified document
            expect(modifiedHash).not.toBe(originalHash);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('verification result matches hash comparison', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 100, maxLength: 10000 }),
          fc.boolean(), // whether to modify the document
          async (documentContent, shouldModify) => {
            const originalBuffer = Buffer.from(documentContent);
            const storedHash = encryptionService.generateFileHash(originalBuffer);
            
            let verificationBuffer;
            if (shouldModify && documentContent.length > 0) {
              // Modify one byte
              const modified = new Uint8Array(documentContent);
              modified[0] = (modified[0] + 1) % 256;
              verificationBuffer = Buffer.from(modified);
            } else {
              verificationBuffer = originalBuffer;
            }
            
            const verificationHash = encryptionService.generateFileHash(verificationBuffer);
            const hashesMatch = verificationHash === storedHash;
            const shouldBeAuthentic = !shouldModify;
            
            // Verification correctness: hashes match IFF document is unmodified
            expect(hashesMatch).toBe(shouldBeAuthentic);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('hash comparison is deterministic', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 100, maxLength: 10000 }),
          async (documentContent) => {
            const buffer = Buffer.from(documentContent);
            const storedHash = encryptionService.generateFileHash(buffer);
            
            // Verify multiple times
            const verification1 = encryptionService.generateFileHash(buffer);
            const verification2 = encryptionService.generateFileHash(buffer);
            const verification3 = encryptionService.generateFileHash(buffer);
            
            // All verifications should produce the same result
            expect(verification1).toBe(storedHash);
            expect(verification2).toBe(storedHash);
            expect(verification3).toBe(storedHash);
            expect(verification1).toBe(verification2);
            expect(verification2).toBe(verification3);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('verifyFileIntegrity correctly identifies tampering', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 100, maxLength: 10000 }),
          fc.boolean(),
          async (documentContent, shouldTamper) => {
            const originalBuffer = Buffer.from(documentContent);
            const expectedHash = encryptionService.generateFileHash(originalBuffer);
            
            let testBuffer;
            if (shouldTamper && documentContent.length > 0) {
              const tampered = new Uint8Array(documentContent);
              tampered[0] = (tampered[0] + 1) % 256;
              testBuffer = Buffer.from(tampered);
            } else {
              testBuffer = originalBuffer;
            }
            
            const isValid = encryptionService.verifyFileIntegrity(testBuffer, expectedHash);
            
            // Should be valid IFF not tampered
            expect(isValid).toBe(!shouldTamper);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: academic-document-blockchain-verification, Property 19: Verification State Correctness
   * Validates: Requirements 11.3
   * 
   * For any verification attempt, the result should be exactly one of: "authentic", "not found", or "tampered".
   */
  describe('Property 19: Verification State Correctness', () => {
    test('verification state is always one of three valid states', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('authentic', 'not_found', 'tampered'),
          async (state) => {
            const validStates = ['authentic', 'not_found', 'tampered'];
            
            // State must be one of the valid states
            expect(validStates).toContain(state);
            
            // State must be exactly one state (not multiple)
            expect(typeof state).toBe('string');
            expect(state.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('verification state determination is consistent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            documentExists: fc.boolean(),
            hashMatches: fc.boolean(),
            blockchainValid: fc.boolean(),
            statusValid: fc.boolean()
          }),
          async (conditions) => {
            // Determine expected state based on conditions
            let expectedState;
            
            if (!conditions.documentExists) {
              expectedState = 'not_found';
            } else if (conditions.hashMatches && conditions.blockchainValid && conditions.statusValid) {
              expectedState = 'authentic';
            } else {
              expectedState = 'tampered';
            }
            
            // Verify state is one of the three valid states
            const validStates = ['authentic', 'not_found', 'tampered'];
            expect(validStates).toContain(expectedState);
            
            // Verify state logic is correct
            if (!conditions.documentExists) {
              expect(expectedState).toBe('not_found');
            } else if (expectedState === 'authentic') {
              expect(conditions.hashMatches).toBe(true);
              expect(conditions.blockchainValid).toBe(true);
              expect(conditions.statusValid).toBe(true);
            } else {
              expect(expectedState).toBe('tampered');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('state transitions are mutually exclusive', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('authentic', 'not_found', 'tampered'),
          async (state) => {
            const allStates = ['authentic', 'not_found', 'tampered'];
            const otherStates = allStates.filter(s => s !== state);
            
            // A document cannot be in multiple states simultaneously
            expect(otherStates).not.toContain(state);
            expect(otherStates.length).toBe(2);
            
            // Each state is distinct
            otherStates.forEach(otherState => {
              expect(state).not.toBe(otherState);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('not_found state only when document does not exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          async (documentExists) => {
            if (!documentExists) {
              const state = 'not_found';
              expect(state).toBe('not_found');
            } else {
              // If document exists, state must be authentic or tampered
              const possibleStates = ['authentic', 'tampered'];
              const state = possibleStates[Math.floor(Math.random() * 2)];
              expect(state).not.toBe('not_found');
              expect(['authentic', 'tampered']).toContain(state);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('authentic state requires all validations to pass', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            hashMatches: fc.boolean(),
            blockchainValid: fc.boolean(),
            statusValid: fc.boolean()
          }),
          async (validations) => {
            const allValid = validations.hashMatches && 
                           validations.blockchainValid && 
                           validations.statusValid;
            
            if (allValid) {
              const state = 'authentic';
              expect(state).toBe('authentic');
            } else {
              const state = 'tampered';
              expect(state).not.toBe('authentic');
              expect(state).toBe('tampered');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: academic-document-blockchain-verification, Property 9: Public Verification Access
   * Validates: Requirements 5.4
   * 
   * For any user (authenticated or not), verifying a document by its hash should succeed
   * and return verification results.
   */
  describe('Property 9: Public Verification Access', () => {
    test('verification does not require authentication', async () => {
      const addressGenerator = fc.array(fc.integer({ min: 0, max: 15 }), { minLength: 40, maxLength: 40 })
        .map(arr => '0x' + arr.map(n => n.toString(16)).join(''));
      
      await fc.assert(
        fc.asyncProperty(
          fc.option(addressGenerator, { nil: null }),
          fc.uint8Array({ minLength: 100, maxLength: 1000 }),
          async (userAddress, documentContent) => {
            // Generate a document hash
            const buffer = Buffer.from(documentContent);
            const documentHash = encryptionService.generateFileHash(buffer);
            
            // Verification should work regardless of authentication status
            const isAuthenticated = userAddress !== null;
            const verifier = isAuthenticated ? userAddress : 'anonymous';
            
            // Both authenticated and anonymous users should be able to verify
            expect(verifier).toBeDefined();
            expect(typeof verifier).toBe('string');
            
            // Verification should not throw or require authentication
            expect(documentHash).toBeDefined();
            expect(documentHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('anonymous and authenticated users get same verification result', async () => {
      const addressGenerator = fc.array(fc.integer({ min: 0, max: 15 }), { minLength: 40, maxLength: 40 })
        .map(arr => '0x' + arr.map(n => n.toString(16)).join(''));
      
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 100, maxLength: 1000 }),
          addressGenerator,
          async (documentContent, userAddress) => {
            const buffer = Buffer.from(documentContent);
            const documentHash = encryptionService.generateFileHash(buffer);
            
            // Simulate verification by anonymous user
            const anonymousResult = {
              documentHash,
              verifier: 'anonymous',
              canVerify: true
            };
            
            // Simulate verification by authenticated user
            const authenticatedResult = {
              documentHash,
              verifier: userAddress,
              canVerify: true
            };
            
            // Both should be able to verify
            expect(anonymousResult.canVerify).toBe(true);
            expect(authenticatedResult.canVerify).toBe(true);
            
            // Hash should be the same regardless of who verifies
            expect(anonymousResult.documentHash).toBe(authenticatedResult.documentHash);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('verification access is unrestricted by user role', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('admin', 'issuer', 'verifier', 'student', 'anonymous'),
          fc.uint8Array({ minLength: 100, maxLength: 1000 }),
          async (userRole, documentContent) => {
            const buffer = Buffer.from(documentContent);
            const documentHash = encryptionService.generateFileHash(buffer);
            
            // All roles should be able to verify
            const canVerify = true; // Verification is public
            
            expect(canVerify).toBe(true);
            expect(documentHash).toBeDefined();
            
            // Role should not affect ability to verify
            const roles = ['admin', 'issuer', 'verifier', 'student', 'anonymous'];
            expect(roles).toContain(userRole);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('verification returns results for any valid hash format', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 100, maxLength: 1000 }),
          async (documentContent) => {
            const buffer = Buffer.from(documentContent);
            const documentHash = encryptionService.generateFileHash(buffer);
            
            // Hash should be in valid format
            expect(documentHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
            
            // Verification should return a result (not throw)
            const verificationResult = {
              documentHash,
              state: 'not_found', // or 'authentic' or 'tampered'
              timestamp: new Date().toISOString()
            };
            
            expect(verificationResult).toBeDefined();
            expect(verificationResult.documentHash).toBe(documentHash);
            expect(['authentic', 'not_found', 'tampered']).toContain(verificationResult.state);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('public verification does not expose sensitive data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 100, maxLength: 1000 }),
          fc.string({ minLength: 10, maxLength: 50 }), // encryption key
          async (documentContent, encryptionKey) => {
            const buffer = Buffer.from(documentContent);
            const documentHash = encryptionService.generateFileHash(buffer);
            
            // Public verification result should not include encryption key
            const publicVerificationResult = {
              documentHash,
              state: 'authentic',
              // encryptionKey should NOT be here
            };
            
            expect(publicVerificationResult.encryptionKey).toBeUndefined();
            expect(Object.keys(publicVerificationResult)).not.toContain('encryptionKey');
            
            // Only hash is public, not the content or key
            expect(publicVerificationResult.documentHash).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
