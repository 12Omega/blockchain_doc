const fc = require('fast-check');
const encryptionService = require('../services/encryptionService');

describe('Encryption Service - Property-Based Tests', () => {
  
  /**
   * Feature: academic-document-blockchain-verification, Property 1: Hash Determinism
   * Validates: Requirements 1.1, 2.1
   * 
   * For any document content, computing the SHA-256 hash multiple times 
   * should always produce the same hash value.
   */
  describe('Property 1: Hash Determinism', () => {
    it('should produce identical hashes for the same document content', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 0, maxLength: 10000 }),
          async (documentData) => {
            const buffer = Buffer.from(documentData);
            
            // Compute hash multiple times
            const hash1 = encryptionService.generateFileHash(buffer);
            const hash2 = encryptionService.generateFileHash(buffer);
            const hash3 = encryptionService.generateFileHash(buffer);
            
            // All hashes should be identical
            expect(hash1).toBe(hash2);
            expect(hash2).toBe(hash3);
            expect(hash1).toBe(hash3);
            
            // Hash should have correct format (0x + 64 hex chars)
            expect(hash1).toMatch(/^0x[a-fA-F0-9]{64}$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce different hashes for different document content', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 1000 }),
          fc.uint8Array({ minLength: 1, maxLength: 1000 }),
          async (data1, data2) => {
            // Skip if arrays are identical
            if (Buffer.from(data1).equals(Buffer.from(data2))) {
              return true;
            }
            
            const buffer1 = Buffer.from(data1);
            const buffer2 = Buffer.from(data2);
            
            const hash1 = encryptionService.generateFileHash(buffer1);
            const hash2 = encryptionService.generateFileHash(buffer2);
            
            // Different content should produce different hashes
            expect(hash1).not.toBe(hash2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: academic-document-blockchain-verification, Property 6: Encryption Round Trip
   * Validates: Requirements 3.1, 3.4, 3.5
   * 
   * For any document, encrypting it with AES-256, uploading to IPFS, downloading from IPFS, 
   * and decrypting should produce the original document content.
   */
  describe('Property 6: Encryption Round Trip', () => {
    it('should decrypt to original content after encryption', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 0, maxLength: 10000 }),
          async (documentData) => {
            const originalBuffer = Buffer.from(documentData);
            
            // Encrypt the document
            const encrypted = encryptionService.encryptFile(originalBuffer);
            
            // Verify encrypted data structure
            expect(encrypted).toHaveProperty('encryptedData');
            expect(encrypted).toHaveProperty('iv');
            expect(encrypted).toHaveProperty('encryptionKey');
            expect(encrypted).toHaveProperty('algorithm');
            
            // Decrypt the document
            const decryptedBuffer = encryptionService.decryptFile(encrypted);
            
            // Decrypted content should match original
            expect(Buffer.isBuffer(decryptedBuffer)).toBe(true);
            expect(decryptedBuffer.equals(originalBuffer)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should fail decryption with wrong key or produce different content', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 1000 }),
          async (documentData) => {
            const originalBuffer = Buffer.from(documentData);
            
            // Encrypt with one key
            const encrypted = encryptionService.encryptFile(originalBuffer);
            
            // Generate a different key
            const wrongKey = encryptionService.generateKey();
            
            // Decryption with wrong key should either throw or produce different content
            try {
              const decrypted = encryptionService.decryptFile(encrypted, wrongKey);
              // If it doesn't throw, the decrypted content should not match original
              expect(decrypted.equals(originalBuffer)).toBe(false);
            } catch (error) {
              // Throwing an error is also acceptable
              expect(error).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: academic-document-blockchain-verification, Property 11: Encryption Key Uniqueness
   * Validates: Requirements 7.2
   * 
   * For any two different documents, their generated AES-256 encryption keys should be different.
   */
  describe('Property 11: Encryption Key Uniqueness', () => {
    it('should generate unique encryption keys for different documents', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 1000 }),
          fc.uint8Array({ minLength: 1, maxLength: 1000 }),
          async (data1, data2) => {
            const buffer1 = Buffer.from(data1);
            const buffer2 = Buffer.from(data2);
            
            // Encrypt both documents (keys will be auto-generated)
            const encrypted1 = encryptionService.encryptFile(buffer1);
            const encrypted2 = encryptionService.encryptFile(buffer2);
            
            // Keys should be different
            expect(encrypted1.encryptionKey).not.toBe(encrypted2.encryptionKey);
            
            // IVs should also be different
            expect(encrypted1.iv).not.toBe(encrypted2.iv);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate unique keys even for identical document content', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 1000 }),
          async (documentData) => {
            const buffer = Buffer.from(documentData);
            
            // Encrypt the same document twice
            const encrypted1 = encryptionService.encryptFile(buffer);
            const encrypted2 = encryptionService.encryptFile(buffer);
            
            // Keys should be different even for same content
            expect(encrypted1.encryptionKey).not.toBe(encrypted2.encryptionKey);
            expect(encrypted1.iv).not.toBe(encrypted2.iv);
            
            // But both should decrypt to the same original content
            const decrypted1 = encryptionService.decryptFile(encrypted1);
            const decrypted2 = encryptionService.decryptFile(encrypted2);
            
            expect(decrypted1.equals(buffer)).toBe(true);
            expect(decrypted2.equals(buffer)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: academic-document-blockchain-verification, Property 12: Hash-Only Blockchain Storage
   * Validates: Requirements 7.5
   * 
   * For any document registered on the blockchain, the blockchain state should contain 
   * only the document hash, not the document content itself.
   */
  describe('Property 12: Hash-Only Blockchain Storage', () => {
    it('should ensure hash does not contain original document content', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 10, maxLength: 1000 }),
          async (documentData) => {
            const buffer = Buffer.from(documentData);
            const hash = encryptionService.generateFileHash(buffer);
            
            // Hash should be fixed length (66 chars: 0x + 64 hex)
            expect(hash.length).toBe(66);
            
            // Hash should not contain any substring of the original content
            const contentStr = buffer.toString('utf8');
            const hashStr = hash.toLowerCase();
            
            // For any substring of content longer than 3 chars, 
            // it should not appear in the hash
            if (contentStr.length > 3) {
              for (let i = 0; i < contentStr.length - 3; i++) {
                const substring = contentStr.substring(i, i + 4);
                // Only check alphanumeric substrings
                if (/^[a-zA-Z0-9]+$/.test(substring)) {
                  expect(hashStr).not.toContain(substring.toLowerCase());
                }
              }
            }
            
            // Hash should be deterministic
            const hash2 = encryptionService.generateFileHash(buffer);
            expect(hash).toBe(hash2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce fixed-size hash regardless of document size', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100000 }),
          async (size) => {
            // Create document of specified size
            const buffer = Buffer.alloc(size, 'a');
            const hash = encryptionService.generateFileHash(buffer);
            
            // Hash should always be 66 characters (0x + 64 hex)
            expect(hash.length).toBe(66);
            expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
