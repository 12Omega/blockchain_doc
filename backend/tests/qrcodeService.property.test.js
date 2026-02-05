const fc = require('fast-check');

// Import the actual QR code service, not the mocked one
const qrcodeService = jest.requireActual('../services/qrcodeService');

describe('QR Code Service - Property-Based Tests', () => {
  
  // Clear any existing mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  /**
   * Feature: academic-document-blockchain-verification, Property 2: QR Code Round Trip
   * Validates: Requirements 1.5, 2.2, 8.3
   * 
   * For any document registration that produces a QR code, decoding that QR code 
   * should extract the exact transaction ID and document hash that were encoded.
   */
  describe('Property 2: QR Code Round Trip', () => {
    // Generator for valid Ethereum-style hashes (0x + 64 hex characters)
    const hashGenerator = fc.array(fc.integer({ min: 0, max: 15 }), { minLength: 64, maxLength: 64 })
      .map(arr => '0x' + arr.map(n => n.toString(16)).join(''));

    it('should decode the exact transaction ID and document hash from generated QR code', async () => {
      await fc.assert(
        fc.asyncProperty(
          hashGenerator,
          hashGenerator,
          async (documentHash, transactionHash) => {
            // Generate QR code with the hashes
            const generated = await qrcodeService.generateQRCode(documentHash, transactionHash);
            
            // Verify the generated object has required properties
            expect(generated).toHaveProperty('qrCodeDataUrl');
            expect(generated).toHaveProperty('verificationUrl');
            expect(generated).toHaveProperty('documentHash');
            expect(generated).toHaveProperty('transactionHash');
            
            // Parse the verification URL from the QR code
            const parsed = qrcodeService.parseQRCode(generated.verificationUrl);
            
            // Parsed values should match original values exactly
            expect(parsed.documentHash).toBe(documentHash);
            expect(parsed.transactionHash).toBe(transactionHash);
          }
        ),
        { numRuns: 10 }
      );
    }, 60000);

    it('should maintain hash integrity through QR code generation and parsing', async () => {
      await fc.assert(
        fc.asyncProperty(
          hashGenerator,
          hashGenerator,
          async (documentHash, transactionHash) => {
            // Generate QR code
            const generated = await qrcodeService.generateQRCode(documentHash, transactionHash);
            
            // Parse it back
            const parsed = qrcodeService.parseQRCode(generated.verificationUrl);
            
            // Verify hash format is preserved (0x + 64 hex chars)
            expect(parsed.documentHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
            expect(parsed.transactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
            
            // Verify exact match
            expect(parsed.documentHash.toLowerCase()).toBe(documentHash.toLowerCase());
            expect(parsed.transactionHash.toLowerCase()).toBe(transactionHash.toLowerCase());
          }
        ),
        { numRuns: 10 }
      );
    }, 60000);

    it('should work with SVG format QR codes', async () => {
      await fc.assert(
        fc.asyncProperty(
          hashGenerator,
          hashGenerator,
          async (documentHash, transactionHash) => {
            // Generate SVG QR code
            const generated = await qrcodeService.generateQRCodeSVG(documentHash, transactionHash);
            
            // Verify the generated object has required properties
            expect(generated).toHaveProperty('qrCodeSVG');
            expect(generated).toHaveProperty('verificationUrl');
            expect(generated).toHaveProperty('documentHash');
            expect(generated).toHaveProperty('transactionHash');
            
            // Verify SVG format
            expect(generated.qrCodeSVG).toContain('<svg');
            expect(generated.qrCodeSVG).toContain('</svg>');
            
            // Parse the verification URL
            const parsed = qrcodeService.parseQRCode(generated.verificationUrl);
            
            // Parsed values should match original values exactly
            expect(parsed.documentHash).toBe(documentHash);
            expect(parsed.transactionHash).toBe(transactionHash);
          }
        ),
        { numRuns: 20 }
      );
    }, 30000);

    it('should work with PNG buffer format QR codes', async () => {
      await fc.assert(
        fc.asyncProperty(
          hashGenerator,
          hashGenerator,
          async (documentHash, transactionHash) => {
            // Generate PNG buffer
            const buffer = await qrcodeService.generateQRCodeBuffer(documentHash, transactionHash, 'png');
            
            // Verify it's a buffer
            expect(Buffer.isBuffer(buffer)).toBe(true);
            expect(buffer.length).toBeGreaterThan(0);
            
            // We can't easily decode the QR from buffer in this test,
            // but we can verify the URL construction is consistent
            const generated = await qrcodeService.generateQRCode(documentHash, transactionHash);
            const parsed = qrcodeService.parseQRCode(generated.verificationUrl);
            
            expect(parsed.documentHash).toBe(documentHash);
            expect(parsed.transactionHash).toBe(transactionHash);
          }
        ),
        { numRuns: 10 }
      );
    }, 60000);

    it('should validate QR code URL format correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          hashGenerator,
          hashGenerator,
          async (documentHash, transactionHash) => {
            // Generate QR code
            const generated = await qrcodeService.generateQRCode(documentHash, transactionHash);
            
            // The generated URL should be valid
            expect(qrcodeService.isValidQRCodeUrl(generated.verificationUrl)).toBe(true);
            
            // Parse and verify
            const parsed = qrcodeService.parseQRCode(generated.verificationUrl);
            expect(parsed.documentHash).toBe(documentHash);
            expect(parsed.transactionHash).toBe(transactionHash);
          }
        ),
        { numRuns: 10 }
      );
    }, 60000);

    it('should reject invalid QR code URLs', async () => {
      await fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (invalidUrl) => {
            // Most random strings should not be valid QR code URLs
            // unless they happen to match the exact format
            const isValid = qrcodeService.isValidQRCodeUrl(invalidUrl);
            
            // If it's valid, it must have the correct format
            if (isValid) {
              try {
                const parsed = qrcodeService.parseQRCode(invalidUrl);
                expect(parsed.documentHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
                expect(parsed.transactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
              } catch (error) {
                // If parsing fails, it shouldn't have been marked as valid
                expect(isValid).toBe(false);
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle case-insensitive hash matching', async () => {
      await fc.assert(
        fc.asyncProperty(
          hashGenerator,
          hashGenerator,
          async (documentHash, transactionHash) => {
            // Generate with lowercase
            const lowerHash = documentHash.toLowerCase();
            const lowerTx = transactionHash.toLowerCase();
            const generated1 = await qrcodeService.generateQRCode(lowerHash, lowerTx);
            
            // Generate with uppercase (after 0x)
            const upperHash = '0x' + documentHash.substring(2).toUpperCase();
            const upperTx = '0x' + transactionHash.substring(2).toUpperCase();
            const generated2 = await qrcodeService.generateQRCode(upperHash, upperTx);
            
            // Parse both
            const parsed1 = qrcodeService.parseQRCode(generated1.verificationUrl);
            const parsed2 = qrcodeService.parseQRCode(generated2.verificationUrl);
            
            // Both should parse successfully
            expect(parsed1.documentHash.toLowerCase()).toBe(lowerHash.toLowerCase());
            expect(parsed2.documentHash.toLowerCase()).toBe(upperHash.toLowerCase());
            
            // And they should be equivalent when compared case-insensitively
            expect(parsed1.documentHash.toLowerCase()).toBe(parsed2.documentHash.toLowerCase());
            expect(parsed1.transactionHash.toLowerCase()).toBe(parsed2.transactionHash.toLowerCase());
          }
        ),
        { numRuns: 10 }
      );
    }, 60000);
  });

  describe('QR Code Error Handling', () => {
    it('should reject missing parameters', async () => {
      await expect(qrcodeService.generateQRCode(null, '0x123')).rejects.toThrow();
      await expect(qrcodeService.generateQRCode('0x123', null)).rejects.toThrow();
      await expect(qrcodeService.generateQRCode(null, null)).rejects.toThrow();
    });

    it('should reject invalid URL formats in parsing', () => {
      expect(() => qrcodeService.parseQRCode('not-a-url')).toThrow();
      expect(() => qrcodeService.parseQRCode('http://example.com')).toThrow();
      expect(() => qrcodeService.parseQRCode('http://example.com?hash=only')).toThrow();
    });
  });
});
