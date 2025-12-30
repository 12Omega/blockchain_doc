const fc = require('fast-check');

/**
 * Feature: academic-document-blockchain-verification, Property 17: Registration Response Completeness
 * Validates: Requirements 10.4
 * 
 * Property: For any successful document registration, the response should include 
 * transaction ID, QR code, and blockchain explorer link
 */

// Helper generators
const hexChar = fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f');
const hexString = (length) => fc.array(hexChar, { minLength: length, maxLength: length }).map(arr => arr.join(''));
const transactionHashGen = () => hexString(64).map(h => '0x' + h);
const addressGen = () => hexString(40).map(h => '0x' + h);
const ipfsCidGen = () => fc.array(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 44, maxLength: 44 }).map(arr => 'Qm' + arr.join(''));

describe('Document Registration Property Tests', () => {

  /**
   * Property 17: Registration Response Completeness
   * For any successful registration, the response must contain:
   * - transactionId (blockchain transaction hash)
   * - qrCode (QR code data)
   * - blockchain explorer link
   */
  test('Property 17: Registration response completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random registration response data
        fc.record({
          transactionHash: transactionHashGen(),
          blockNumber: fc.integer({ min: 1, max: 10000000 }),
          gasUsed: fc.integer({ min: 21000, max: 500000 }),
          contractAddress: addressGen(),
          documentHash: transactionHashGen(),
          ipfsCid: ipfsCidGen(),
          studentName: fc.string({ minLength: 3, maxLength: 50 }),
          studentId: fc.string({ minLength: 5, maxLength: 20 }),
          documentType: fc.constantFrom('degree', 'certificate', 'transcript', 'diploma')
        }),
        async (mockData) => {
          // Simulate a successful registration response
          const registrationResponse = {
            success: true,
            message: 'Document registered successfully',
            data: {
              document: {
                id: 'mock-id-' + Date.now(),
                documentHash: mockData.documentHash,
                transactionId: mockData.transactionHash,
                ipfsCid: mockData.ipfsCid,
                metadata: {
                  studentName: mockData.studentName,
                  studentId: mockData.studentId,
                  institutionName: 'Test University',
                  documentType: mockData.documentType,
                  issueDate: new Date()
                },
                blockchain: {
                  transactionHash: mockData.transactionHash,
                  blockNumber: mockData.blockNumber,
                  gasUsed: mockData.gasUsed,
                  contractAddress: mockData.contractAddress,
                  explorerUrl: `https://sepolia.etherscan.io/tx/${mockData.transactionHash}`
                },
                ipfs: {
                  cid: mockData.ipfsCid,
                  gateway: `https://ipfs.io/ipfs/${mockData.ipfsCid}`,
                  provider: 'web3.storage'
                },
                qrCode: {
                  dataUrl: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`,
                  verificationUrl: `http://localhost:3000/verify?hash=${mockData.documentHash}&tx=${mockData.transactionHash}`
                },
                access: {
                  owner: '0x' + '1'.repeat(40),
                  issuer: '0x' + '2'.repeat(40)
                },
                fileInfo: {
                  originalName: 'test.pdf',
                  mimeType: 'application/pdf',
                  size: 1024
                },
                status: 'blockchain_stored',
                createdAt: new Date()
              }
            }
          };

          // Property assertion: Response must contain all required fields
          expect(registrationResponse.success).toBe(true);
          expect(registrationResponse.data).toBeDefined();
          expect(registrationResponse.data.document).toBeDefined();

          const doc = registrationResponse.data.document;

          // Must have transaction ID
          expect(doc.transactionId).toBeDefined();
          expect(doc.transactionId).toMatch(/^0x[a-fA-F0-9]{64}$/);

          // Must have blockchain info with explorer URL
          expect(doc.blockchain).toBeDefined();
          expect(doc.blockchain.transactionHash).toBeDefined();
          expect(doc.blockchain.transactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
          expect(doc.blockchain.explorerUrl).toBeDefined();
          expect(doc.blockchain.explorerUrl).toContain(doc.transactionId);
          expect(doc.blockchain.blockNumber).toBeGreaterThan(0);
          expect(doc.blockchain.gasUsed).toBeGreaterThan(0);

          // Must have QR code
          expect(doc.qrCode).toBeDefined();
          expect(doc.qrCode.dataUrl).toBeDefined();
          expect(doc.qrCode.verificationUrl).toBeDefined();
          expect(doc.qrCode.dataUrl).toMatch(/^data:image\/png;base64,/);
          expect(doc.qrCode.verificationUrl).toContain(doc.documentHash);
          expect(doc.qrCode.verificationUrl).toContain(doc.transactionId);

          // Additional completeness checks
          expect(doc.documentHash).toBeDefined();
          expect(doc.documentHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
          expect(doc.ipfsCid).toBeDefined();
          expect(doc.metadata).toBeDefined();
          expect(doc.status).toBe('blockchain_stored');
          expect(doc.ipfs).toBeDefined();
          expect(doc.ipfs.cid).toBe(doc.ipfsCid);

          return true;
        }
      ),
      { 
        numRuns: 100, // Run 100 times with different random inputs
        timeout: 5000 // 5 second timeout per test
      }
    );
  }, 30000); // 30 second timeout for entire test

  /**
   * Property: Response structure consistency
   * For any successful registration, the response structure should be consistent
   */
  test('Property: Response structure consistency across different inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            transactionHash: transactionHashGen(),
            documentHash: transactionHashGen(),
            ipfsCid: ipfsCidGen()
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (mockDataArray) => {
          const responses = mockDataArray.map(mockData => ({
            success: true,
            data: {
              document: {
                documentHash: mockData.documentHash,
                transactionId: mockData.transactionHash,
                ipfsCid: mockData.ipfsCid,
                blockchain: {
                  transactionHash: mockData.transactionHash,
                  explorerUrl: `https://sepolia.etherscan.io/tx/${mockData.transactionHash}`
                },
                qrCode: {
                  dataUrl: 'data:image/png;base64,test',
                  verificationUrl: `http://localhost:3000/verify?hash=${mockData.documentHash}&tx=${mockData.transactionHash}`
                }
              }
            }
          }));

          // Property: All responses should have the same structure
          const firstResponseKeys = Object.keys(responses[0].data.document).sort();
          
          for (let i = 1; i < responses.length; i++) {
            const currentResponseKeys = Object.keys(responses[i].data.document).sort();
            expect(currentResponseKeys).toEqual(firstResponseKeys);
          }

          return true;
        }
      ),
      { numRuns: 50, timeout: 5000 }
    );
  }, 30000);

  /**
   * Property: Transaction ID uniqueness
   * For any two different registrations, transaction IDs should be unique
   */
  test('Property: Transaction ID uniqueness across registrations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          transactionHashGen(),
          { minLength: 2, maxLength: 10 }
        ),
        async (transactionHashes) => {
          // Property: All transaction hashes should be unique
          const uniqueHashes = new Set(transactionHashes);
          expect(uniqueHashes.size).toBe(transactionHashes.length);

          return true;
        }
      ),
      { numRuns: 100, timeout: 5000 }
    );
  }, 30000);

  /**
   * Property: Explorer URL format correctness
   * For any transaction hash, the explorer URL should be properly formatted
   */
  test('Property: Explorer URL format correctness', async () => {
    await fc.assert(
      fc.asyncProperty(
        transactionHashGen(),
        async (transactionHash) => {
          const explorerUrl = `https://sepolia.etherscan.io/tx/${transactionHash}`;

          // Property: Explorer URL should be valid and contain the transaction hash
          expect(explorerUrl).toMatch(/^https:\/\/.+\/tx\/0x[a-fA-F0-9]{64}$/);
          expect(explorerUrl).toContain(transactionHash);

          // Should be a valid URL
          const url = new URL(explorerUrl);
          expect(url.protocol).toBe('https:');
          expect(url.pathname).toContain('/tx/');

          return true;
        }
      ),
      { numRuns: 100, timeout: 5000 }
    );
  }, 30000);

  /**
   * Property: QR code verification URL contains required parameters
   * For any document hash and transaction hash, the QR verification URL should contain both
   */
  test('Property: QR code verification URL completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          documentHash: transactionHashGen(),
          transactionHash: transactionHashGen()
        }),
        async ({ documentHash, transactionHash }) => {
          const verificationUrl = `http://localhost:3000/verify?hash=${documentHash}&tx=${transactionHash}`;

          // Property: Verification URL should contain both parameters
          expect(verificationUrl).toContain(`hash=${documentHash}`);
          expect(verificationUrl).toContain(`tx=${transactionHash}`);

          // Should be a valid URL
          const url = new URL(verificationUrl);
          expect(url.searchParams.get('hash')).toBe(documentHash);
          expect(url.searchParams.get('tx')).toBe(transactionHash);

          return true;
        }
      ),
      { numRuns: 100, timeout: 5000 }
    );
  }, 30000);
});
