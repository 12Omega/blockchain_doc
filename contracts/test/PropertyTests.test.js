const { expect } = require("chai");
const { ethers } = require("hardhat");
const fc = require("fast-check");

describe("Property-Based Tests", function () {
  let accessControl;
  let documentRegistry;
  let owner, issuer, verifier, student;
  
  const Role = {
    STUDENT: 0,
    VERIFIER: 1,
    ISSUER: 2,
    ADMIN: 3
  };

  beforeEach(async function () {
    [owner, issuer, verifier, student] = await ethers.getSigners();
    
    // Deploy AccessControl
    const AccessControl = await ethers.getContractFactory("AccessControl");
    accessControl = await AccessControl.deploy();
    await accessControl.waitForDeployment();
    
    // Deploy DocumentRegistry
    const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
    documentRegistry = await DocumentRegistry.deploy(await accessControl.getAddress());
    await documentRegistry.waitForDeployment();
    
    // Set up roles
    await accessControl.assignRole(issuer.address, Role.ISSUER);
    await accessControl.assignRole(verifier.address, Role.VERIFIER);
    await accessControl.assignRole(student.address, Role.STUDENT);
  });

  describe("Property 22: Gas Optimization", function () {
    /**
     * Feature: academic-document-blockchain-verification, Property 22: Gas Optimization
     * Validates: Requirements 6.4
     * 
     * For any blockchain transaction, the gas used should not exceed 150% of the estimated gas limit
     */
    it("should not exceed 150% of estimated gas for document registration", async function () {
      this.timeout(60000); // Increase timeout for property tests
      
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 32, maxLength: 32 }), // document hash bytes
          fc.string({ minLength: 10, maxLength: 100 }), // ipfs hash
          fc.constantFrom("degree", "transcript", "certificate", "diploma"), // document type
          fc.string({ minLength: 10, maxLength: 500 }), // metadata
          async (hashBytes, ipfsHash, docType, metadata) => {
            // Convert bytes to hex string
            const documentHash = ethers.hexlify(hashBytes);
            
            // Estimate gas
            const estimatedGas = await documentRegistry.connect(issuer).registerDocument.estimateGas(
              documentHash,
              student.address,
              ipfsHash,
              docType,
              metadata
            );
            
            // Execute transaction
            const tx = await documentRegistry.connect(issuer).registerDocument(
              documentHash,
              student.address,
              ipfsHash,
              docType,
              metadata
            );
            const receipt = await tx.wait();
            
            // Gas used should not exceed 150% of estimate
            const gasUsed = receipt.gasUsed;
            const maxAllowedGas = (estimatedGas * 150n) / 100n;
            
            expect(gasUsed).to.be.lte(maxAllowedGas);
          }
        ),
        { numRuns: 10 } // Run 10 times (reduced from 100 for blockchain tests)
      );
    });

    it("should not exceed 150% of estimated gas for batch role assignment", async function () {
      this.timeout(60000);
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 4, max: 13 }), { minLength: 1, maxLength: 5 }), // user indices (skip first 4 already used)
          fc.array(fc.constantFrom(0, 1, 2), { minLength: 1, maxLength: 5 }), // roles
          async (userIndices, roles) => {
            // Ensure arrays have same length
            const length = Math.min(userIndices.length, roles.length);
            const trimmedIndices = userIndices.slice(0, length);
            const trimmedRoles = roles.slice(0, length);
            
            // Get signers (skip first 4 which are already used)
            const signers = await ethers.getSigners();
            const users = trimmedIndices.map(i => signers[i].address);
            
            // Estimate gas
            const estimatedGas = await accessControl.batchAssignRoles.estimateGas(users, trimmedRoles);
            
            // Execute transaction
            const tx = await accessControl.batchAssignRoles(users, trimmedRoles);
            const receipt = await tx.wait();
            
            // Gas used should not exceed 150% of estimate
            const gasUsed = receipt.gasUsed;
            const maxAllowedGas = (estimatedGas * 150n) / 100n;
            
            expect(gasUsed).to.be.lte(maxAllowedGas);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe("Property 7: Access Control Enforcement", function () {
    /**
     * Feature: academic-document-blockchain-verification, Property 7: Access Control Enforcement
     * Validates: Requirements 4.2, 4.5, 5.3, 5.5
     * 
     * For any user without ISSUER or ADMIN role, attempting to register a document should fail
     */
    it("should reject document registration from users without ISSUER or ADMIN role", async function () {
      this.timeout(60000);
      
      const ac = accessControl;
      const dr = documentRegistry;
      const studentAddr = student.address;
      
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 32, maxLength: 32 }), // document hash
          fc.string({ minLength: 10, maxLength: 100 }), // ipfs hash
          fc.constantFrom("degree", "transcript", "certificate"), // document type
          fc.string({ minLength: 10, maxLength: 200 }), // metadata
          fc.constantFrom(0, 1), // non-issuer roles (STUDENT, VERIFIER)
          async (hashBytes, ipfsHash, docType, metadata, role) => {
            const documentHash = ethers.hexlify(hashBytes);
            
            // Get a fresh signer for this test
            const signers = await ethers.getSigners();
            const testUser = signers[10]; // Use signer 10 to avoid conflicts
            
            // Assign non-issuer role
            await ac.assignRole(testUser.address, role);
            
            // Attempt to register document should fail
            await expect(
              dr.connect(testUser).registerDocument(
                documentHash,
                studentAddr,
                ipfsHash,
                docType,
                metadata
              )
            ).to.be.revertedWith("Only issuer or admin allowed");
          }
        ),
        { numRuns: 20 }
      );
    });

    it("should allow document registration from users with ISSUER or ADMIN role", async function () {
      this.timeout(60000);
      
      const ac = accessControl;
      const dr = documentRegistry;
      const studentAddr = student.address;
      
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 32, maxLength: 32 }), // document hash
          fc.string({ minLength: 10, maxLength: 100 }), // ipfs hash
          fc.constantFrom("degree", "transcript", "certificate"), // document type
          fc.string({ minLength: 10, maxLength: 200 }), // metadata
          fc.constantFrom(2, 3), // issuer roles (ISSUER, ADMIN)
          async (hashBytes, ipfsHash, docType, metadata, role) => {
            const documentHash = ethers.hexlify(hashBytes);
            
            // Get a fresh signer for this test
            const signers = await ethers.getSigners();
            const testUser = signers[11]; // Use signer 11 to avoid conflicts
            
            // Assign issuer or admin role
            await ac.assignRole(testUser.address, role);
            
            // Registration should succeed
            await expect(
              dr.connect(testUser).registerDocument(
                documentHash,
                studentAddr,
                ipfsHash,
                docType,
                metadata
              )
            ).to.emit(dr, "DocumentRegistered");
          }
        ),
        { numRuns: 20 }
      );
    });

    it("should reject role assignment from non-admin users", async function () {
      this.timeout(60000);
      
      const ac = accessControl;
      
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(0, 1, 2), // non-admin roles (STUDENT, VERIFIER, ISSUER)
          fc.constantFrom(0, 1, 2, 3), // target role (any role)
          async (userRole, targetRole) => {
            // Get fresh signers
            const signers = await ethers.getSigners();
            const testUser = signers[12];
            const targetUser = signers[13];
            
            // Assign non-admin role to test user
            await ac.assignRole(testUser.address, userRole);
            
            // Attempt to assign role should fail
            await expect(
              ac.connect(testUser).assignRole(targetUser.address, targetRole)
            ).to.be.revertedWith("Insufficient role permissions");
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe("Property 8: Event Emission Completeness", function () {
    /**
     * Feature: academic-document-blockchain-verification, Property 8: Event Emission Completeness
     * Validates: Requirements 4.3
     * 
     * For any successful document registration, the smart contract should emit an event containing
     * document hash, IPFS CID, issuer address, and timestamp
     */
    it("should emit DocumentRegistered event with all required fields", async function () {
      this.timeout(60000);
      
      const dr = documentRegistry;
      const issuerSigner = issuer;
      const studentAddr = student.address;
      
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 32, maxLength: 32 }), // document hash
          fc.string({ minLength: 10, maxLength: 100 }), // ipfs hash
          fc.constantFrom("degree", "transcript", "certificate"), // document type
          fc.string({ minLength: 10, maxLength: 200 }), // metadata
          async (hashBytes, ipfsHash, docType, metadata) => {
            const documentHash = ethers.hexlify(hashBytes);
            
            // Register document and check event
            const tx = await dr.connect(issuerSigner).registerDocument(
              documentHash,
              studentAddr,
              ipfsHash,
              docType,
              metadata
            );
            const receipt = await tx.wait();
            
            // Find the DocumentRegistered event
            const event = receipt.logs.find(log => {
              try {
                const parsed = dr.interface.parseLog(log);
                return parsed && parsed.name === "DocumentRegistered";
              } catch {
                return false;
              }
            });
            
            expect(event).to.not.be.undefined;
            
            // Parse the event
            const parsedEvent = dr.interface.parseLog(event);
            
            // Verify all required fields are present
            expect(parsedEvent.args.documentHash).to.equal(documentHash);
            expect(parsedEvent.args.issuer).to.equal(issuerSigner.address);
            expect(parsedEvent.args.owner).to.equal(studentAddr);
            expect(parsedEvent.args.ipfsHash).to.equal(ipfsHash);
            expect(parsedEvent.args.documentType).to.equal(docType);
          }
        ),
        { numRuns: 20 }
      );
    });

    it("should emit RoleAssigned event with all required fields for role assignments", async function () {
      this.timeout(60000);
      
      const ac = accessControl;
      
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 14, max: 19 }), // user index
          fc.constantFrom(0, 1, 2, 3), // role
          async (userIndex, role) => {
            const signers = await ethers.getSigners();
            const targetUser = signers[userIndex];
            
            // Assign role and check event
            const tx = await ac.assignRole(targetUser.address, role);
            const receipt = await tx.wait();
            
            // Find the RoleAssigned event
            const event = receipt.logs.find(log => {
              try {
                const parsed = ac.interface.parseLog(log);
                return parsed && parsed.name === "RoleAssigned";
              } catch {
                return false;
              }
            });
            
            expect(event).to.not.be.undefined;
            
            // Parse the event
            const parsedEvent = ac.interface.parseLog(event);
            
            // Verify all required fields are present
            expect(parsedEvent.args.user).to.equal(targetUser.address);
            expect(parsedEvent.args.role).to.equal(role);
            expect(parsedEvent.args.assignedBy).to.not.be.undefined;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe("Property 4: Transaction ID Uniqueness", function () {
    /**
     * Feature: academic-document-blockchain-verification, Property 4: Transaction ID Uniqueness
     * Validates: Requirements 1.4
     * 
     * For any two different document registrations, the blockchain transaction IDs should be unique
     */
    it("should generate unique transaction hashes for different document registrations", async function () {
      this.timeout(60000);
      
      const dr = documentRegistry;
      const issuerSigner = issuer;
      const studentAddr = student.address;
      
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.tuple(
              fc.uint8Array({ minLength: 32, maxLength: 32 }), // document hash
              fc.string({ minLength: 10, maxLength: 100 }), // ipfs hash
              fc.constantFrom("degree", "transcript", "certificate"), // document type
              fc.string({ minLength: 10, maxLength: 200 }) // metadata
            ),
            { minLength: 2, maxLength: 5 } // Register 2-5 documents
          ),
          async (documents) => {
            const transactionHashes = new Set();
            
            for (const [hashBytes, ipfsHash, docType, metadata] of documents) {
              const documentHash = ethers.hexlify(hashBytes);
              
              // Register document
              const tx = await dr.connect(issuerSigner).registerDocument(
                documentHash,
                studentAddr,
                ipfsHash,
                docType,
                metadata
              );
              const receipt = await tx.wait();
              
              // Transaction hash should be unique
              expect(transactionHashes.has(receipt.hash)).to.be.false;
              transactionHashes.add(receipt.hash);
            }
            
            // All transaction hashes should be unique
            expect(transactionHashes.size).to.equal(documents.length);
          }
        ),
        { numRuns: 10 } // Reduced runs since this creates multiple transactions
      );
    });

    it("should generate unique transaction hashes for sequential operations", async function () {
      this.timeout(60000);
      
      const ac = accessControl;
      const dr = documentRegistry;
      const issuerSigner = issuer;
      const studentAddr = student.address;
      
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 4 }), // number of operations
          async (numOps) => {
            const transactionHashes = new Set();
            
            // Perform multiple different operations
            for (let i = 0; i < numOps; i++) {
              let tx, receipt;
              
              if (i % 2 === 0) {
                // Register a document
                const docHash = ethers.hexlify(ethers.randomBytes(32));
                tx = await dr.connect(issuerSigner).registerDocument(
                  docHash,
                  studentAddr,
                  `ipfs-hash-${i}`,
                  "degree",
                  `metadata-${i}`
                );
              } else {
                // Assign a role (use fresh signers)
                const signers = await ethers.getSigners();
                const targetUser = signers[5 + i]; // Use signers starting from index 5
                tx = await ac.assignRole(targetUser.address, i % 3);
              }
              
              receipt = await tx.wait();
              
              // Transaction hash should be unique
              expect(transactionHashes.has(receipt.hash)).to.be.false;
              transactionHashes.add(receipt.hash);
            }
            
            // All transaction hashes should be unique
            expect(transactionHashes.size).to.equal(numOps);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
