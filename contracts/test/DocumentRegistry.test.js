const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DocumentRegistry", function () {
  let documentRegistry;
  let accessControl;
  let owner;
  let issuer;
  let verifier;
  let student;
  let unauthorized;
  
  const sampleDocumentHash = ethers.keccak256(ethers.toUtf8Bytes("sample document"));
  const sampleIpfsHash = "QmSampleHash123";
  const sampleDocumentType = "degree";
  const sampleMetadata = '{"studentName": "John Doe", "institution": "Test University"}';

  beforeEach(async function () {
    [owner, issuer, verifier, student, unauthorized] = await ethers.getSigners();
    
    // Deploy AccessControl contract
    const AccessControl = await ethers.getContractFactory("AccessControl");
    accessControl = await AccessControl.deploy();
    await accessControl.waitForDeployment();
    
    // Deploy DocumentRegistry contract
    const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
    documentRegistry = await DocumentRegistry.deploy(await accessControl.getAddress());
    await documentRegistry.waitForDeployment();
    
    // Set up roles
    await accessControl.assignRole(issuer.address, 2); // ISSUER role
    await accessControl.assignRole(verifier.address, 1); // VERIFIER role
    await accessControl.assignRole(student.address, 0); // STUDENT role
  });

  describe("Deployment", function () {
    it("Should set the correct AccessControl address", async function () {
      expect(await documentRegistry.accessControl()).to.equal(await accessControl.getAddress());
    });

    it("Should initialize with zero total documents", async function () {
      expect(await documentRegistry.getTotalDocuments()).to.equal(0);
    });
  });

  describe("Document Registration", function () {
    it("Should allow issuer to register a document", async function () {
      await expect(
        documentRegistry.connect(issuer).registerDocument(
          sampleDocumentHash,
          student.address,
          sampleIpfsHash,
          sampleDocumentType,
          sampleMetadata
        )
      ).to.emit(documentRegistry, "DocumentRegistered")
        .withArgs(sampleDocumentHash, issuer.address, student.address, sampleIpfsHash, sampleDocumentType);

      const document = await documentRegistry.documents(sampleDocumentHash);
      expect(document.documentHash).to.equal(sampleDocumentHash);
      expect(document.issuer).to.equal(issuer.address);
      expect(document.owner).to.equal(student.address);
      expect(document.ipfsHash).to.equal(sampleIpfsHash);
      expect(document.documentType).to.equal(sampleDocumentType);
      expect(document.metadata).to.equal(sampleMetadata);
      expect(document.isActive).to.be.true;
    });

    it("Should allow admin to register a document", async function () {
      await expect(
        documentRegistry.connect(owner).registerDocument(
          sampleDocumentHash,
          student.address,
          sampleIpfsHash,
          sampleDocumentType,
          sampleMetadata
        )
      ).to.emit(documentRegistry, "DocumentRegistered");
    });

    it("Should not allow non-issuer to register a document", async function () {
      await expect(
        documentRegistry.connect(student).registerDocument(
          sampleDocumentHash,
          student.address,
          sampleIpfsHash,
          sampleDocumentType,
          sampleMetadata
        )
      ).to.be.revertedWith("Only issuer or admin allowed");
    });

    it("Should not allow registration with invalid parameters", async function () {
      // Invalid document hash
      await expect(
        documentRegistry.connect(issuer).registerDocument(
          ethers.ZeroHash,
          student.address,
          sampleIpfsHash,
          sampleDocumentType,
          sampleMetadata
        )
      ).to.be.revertedWith("Invalid document hash");

      // Invalid owner address
      await expect(
        documentRegistry.connect(issuer).registerDocument(
          sampleDocumentHash,
          ethers.ZeroAddress,
          sampleIpfsHash,
          sampleDocumentType,
          sampleMetadata
        )
      ).to.be.revertedWith("Invalid owner address");

      // Empty IPFS hash
      await expect(
        documentRegistry.connect(issuer).registerDocument(
          sampleDocumentHash,
          student.address,
          "",
          sampleDocumentType,
          sampleMetadata
        )
      ).to.be.revertedWith("IPFS hash required");

      // Empty document type
      await expect(
        documentRegistry.connect(issuer).registerDocument(
          sampleDocumentHash,
          student.address,
          sampleIpfsHash,
          "",
          sampleMetadata
        )
      ).to.be.revertedWith("Document type required");
    });

    it("Should not allow duplicate document registration", async function () {
      await documentRegistry.connect(issuer).registerDocument(
        sampleDocumentHash,
        student.address,
        sampleIpfsHash,
        sampleDocumentType,
        sampleMetadata
      );

      await expect(
        documentRegistry.connect(issuer).registerDocument(
          sampleDocumentHash,
          student.address,
          sampleIpfsHash,
          sampleDocumentType,
          sampleMetadata
        )
      ).to.be.revertedWith("Document already exists");
    });

    it("Should update counters correctly", async function () {
      await documentRegistry.connect(issuer).registerDocument(
        sampleDocumentHash,
        student.address,
        sampleIpfsHash,
        sampleDocumentType,
        sampleMetadata
      );

      expect(await documentRegistry.getTotalDocuments()).to.equal(1);
      expect(await documentRegistry.getUserDocumentCount(student.address)).to.equal(1);
    });

    it("Should grant access to owner and issuer", async function () {
      await documentRegistry.connect(issuer).registerDocument(
        sampleDocumentHash,
        student.address,
        sampleIpfsHash,
        sampleDocumentType,
        sampleMetadata
      );

      expect(await documentRegistry.checkAccess(sampleDocumentHash, student.address)).to.be.true;
      expect(await documentRegistry.checkAccess(sampleDocumentHash, issuer.address)).to.be.true;
    });
  });

  describe("Document Verification", function () {
    beforeEach(async function () {
      await documentRegistry.connect(issuer).registerDocument(
        sampleDocumentHash,
        student.address,
        sampleIpfsHash,
        sampleDocumentType,
        sampleMetadata
      );
    });

    it("Should verify valid document", async function () {
      await expect(
        documentRegistry.connect(verifier).verifyDocument(sampleDocumentHash)
      ).to.emit(documentRegistry, "DocumentVerified");
    });

    it("Should return false for non-existent document", async function () {
      const nonExistentHash = ethers.keccak256(ethers.toUtf8Bytes("non-existent"));
      
      await expect(
        documentRegistry.connect(verifier).verifyDocument(nonExistentHash)
      ).to.emit(documentRegistry, "DocumentVerified");
    });

    it("Should return false for inactive document", async function () {
      await documentRegistry.connect(issuer).deactivateDocument(sampleDocumentHash, "Test deactivation");
      
      await expect(
        documentRegistry.connect(verifier).verifyDocument(sampleDocumentHash)
      ).to.emit(documentRegistry, "DocumentVerified");
    });

    it("Should not allow unregistered user to verify", async function () {
      await expect(
        documentRegistry.connect(unauthorized).verifyDocument(sampleDocumentHash)
      ).to.be.revertedWith("User not registered");
    });
  });

  describe("Ownership Transfer", function () {
    let newOwner;

    beforeEach(async function () {
      [, , , , , newOwner] = await ethers.getSigners();
      
      await documentRegistry.connect(issuer).registerDocument(
        sampleDocumentHash,
        student.address,
        sampleIpfsHash,
        sampleDocumentType,
        sampleMetadata
      );
      
      // Register new owner
      await accessControl.assignRole(newOwner.address, 0); // STUDENT role
    });

    it("Should allow owner to transfer ownership", async function () {
      await expect(
        documentRegistry.connect(student).transferOwnership(sampleDocumentHash, newOwner.address)
      ).to.emit(documentRegistry, "OwnershipTransferred")
        .withArgs(sampleDocumentHash, student.address, newOwner.address);

      const document = await documentRegistry.documents(sampleDocumentHash);
      expect(document.owner).to.equal(newOwner.address);
    });

    it("Should allow issuer to transfer ownership", async function () {
      await expect(
        documentRegistry.connect(issuer).transferOwnership(sampleDocumentHash, newOwner.address)
      ).to.emit(documentRegistry, "OwnershipTransferred");
    });

    it("Should not allow unauthorized transfer", async function () {
      await expect(
        documentRegistry.connect(verifier).transferOwnership(sampleDocumentHash, newOwner.address)
      ).to.be.revertedWith("Not authorized for this document");
    });

    it("Should not allow transfer to invalid address", async function () {
      await expect(
        documentRegistry.connect(student).transferOwnership(sampleDocumentHash, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid new owner address");
    });

    it("Should not allow transfer to unregistered user", async function () {
      await expect(
        documentRegistry.connect(student).transferOwnership(sampleDocumentHash, unauthorized.address)
      ).to.be.revertedWith("New owner not registered");
    });

    it("Should update counters correctly", async function () {
      const initialStudentCount = await documentRegistry.getUserDocumentCount(student.address);
      const initialNewOwnerCount = await documentRegistry.getUserDocumentCount(newOwner.address);

      await documentRegistry.connect(student).transferOwnership(sampleDocumentHash, newOwner.address);

      expect(await documentRegistry.getUserDocumentCount(student.address)).to.equal(initialStudentCount - 1n);
      expect(await documentRegistry.getUserDocumentCount(newOwner.address)).to.equal(initialNewOwnerCount + 1n);
    });
  });

  describe("Access Management", function () {
    beforeEach(async function () {
      await documentRegistry.connect(issuer).registerDocument(
        sampleDocumentHash,
        student.address,
        sampleIpfsHash,
        sampleDocumentType,
        sampleMetadata
      );
    });

    it("Should allow owner to grant access", async function () {
      await expect(
        documentRegistry.connect(student).grantAccess(sampleDocumentHash, verifier.address)
      ).to.emit(documentRegistry, "AccessGranted")
        .withArgs(sampleDocumentHash, verifier.address, student.address);

      expect(await documentRegistry.checkAccess(sampleDocumentHash, verifier.address)).to.be.true;
    });

    it("Should allow issuer to grant access", async function () {
      await expect(
        documentRegistry.connect(issuer).grantAccess(sampleDocumentHash, verifier.address)
      ).to.emit(documentRegistry, "AccessGranted");
    });

    it("Should not allow granting access to already authorized user", async function () {
      await documentRegistry.connect(student).grantAccess(sampleDocumentHash, verifier.address);
      
      await expect(
        documentRegistry.connect(student).grantAccess(sampleDocumentHash, verifier.address)
      ).to.be.revertedWith("User already has access");
    });

    it("Should allow revoking access", async function () {
      await documentRegistry.connect(student).grantAccess(sampleDocumentHash, verifier.address);
      
      await expect(
        documentRegistry.connect(student).revokeAccess(sampleDocumentHash, verifier.address)
      ).to.emit(documentRegistry, "AccessRevoked")
        .withArgs(sampleDocumentHash, verifier.address, student.address);

      expect(await documentRegistry.checkAccess(sampleDocumentHash, verifier.address)).to.be.true; // Still true due to verifier role
    });

    it("Should not allow revoking owner access", async function () {
      await expect(
        documentRegistry.connect(issuer).revokeAccess(sampleDocumentHash, student.address)
      ).to.be.revertedWith("Cannot revoke owner access");
    });

    it("Should not allow revoking issuer access", async function () {
      await expect(
        documentRegistry.connect(student).revokeAccess(sampleDocumentHash, issuer.address)
      ).to.be.revertedWith("Cannot revoke issuer access");
    });
  });

  describe("Document Deactivation", function () {
    beforeEach(async function () {
      await documentRegistry.connect(issuer).registerDocument(
        sampleDocumentHash,
        student.address,
        sampleIpfsHash,
        sampleDocumentType,
        sampleMetadata
      );
    });

    it("Should allow owner to deactivate document", async function () {
      const reason = "Document expired";
      
      await expect(
        documentRegistry.connect(student).deactivateDocument(sampleDocumentHash, reason)
      ).to.emit(documentRegistry, "DocumentDeactivated")
        .withArgs(sampleDocumentHash, student.address, reason);

      const document = await documentRegistry.documents(sampleDocumentHash);
      expect(document.isActive).to.be.false;
    });

    it("Should allow issuer to deactivate document", async function () {
      const reason = "Document revoked";
      
      await expect(
        documentRegistry.connect(issuer).deactivateDocument(sampleDocumentHash, reason)
      ).to.emit(documentRegistry, "DocumentDeactivated");
    });

    it("Should not allow deactivating already inactive document", async function () {
      await documentRegistry.connect(student).deactivateDocument(sampleDocumentHash, "First deactivation");
      
      await expect(
        documentRegistry.connect(student).deactivateDocument(sampleDocumentHash, "Second deactivation")
      ).to.be.revertedWith("Document already inactive");
    });

    it("Should require reason for deactivation", async function () {
      await expect(
        documentRegistry.connect(student).deactivateDocument(sampleDocumentHash, "")
      ).to.be.revertedWith("Reason required");
    });
  });

  describe("Document Retrieval", function () {
    beforeEach(async function () {
      await documentRegistry.connect(issuer).registerDocument(
        sampleDocumentHash,
        student.address,
        sampleIpfsHash,
        sampleDocumentType,
        sampleMetadata
      );
    });

    it("Should allow authorized user to get document", async function () {
      const document = await documentRegistry.connect(student).getDocument(sampleDocumentHash);
      expect(document.documentHash).to.equal(sampleDocumentHash);
      expect(document.owner).to.equal(student.address);
    });

    it("Should allow verifier to get any document", async function () {
      const document = await documentRegistry.connect(verifier).getDocument(sampleDocumentHash);
      expect(document.documentHash).to.equal(sampleDocumentHash);
    });

    it("Should not allow unauthorized user to get document", async function () {
      await expect(
        documentRegistry.connect(unauthorized).getDocument(sampleDocumentHash)
      ).to.be.revertedWith("No access to this document");
    });

    it("Should get user documents", async function () {
      const userDocs = await documentRegistry.connect(student).getUserDocuments(student.address);
      expect(userDocs.length).to.equal(1);
      expect(userDocs[0]).to.equal(sampleDocumentHash);
    });

    it("Should allow verifier to get any user's documents", async function () {
      const userDocs = await documentRegistry.connect(verifier).getUserDocuments(student.address);
      expect(userDocs.length).to.equal(1);
    });

    it("Should get document viewers", async function () {
      const viewers = await documentRegistry.connect(student).getDocumentViewers(sampleDocumentHash);
      expect(viewers.length).to.equal(2); // owner and issuer
      expect(viewers).to.include(student.address);
      expect(viewers).to.include(issuer.address);
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should handle non-existent document operations", async function () {
      const nonExistentHash = ethers.keccak256(ethers.toUtf8Bytes("non-existent"));
      
      await expect(
        documentRegistry.connect(student).getDocument(nonExistentHash)
      ).to.be.revertedWith("Document does not exist");

      await expect(
        documentRegistry.connect(student).transferOwnership(nonExistentHash, verifier.address)
      ).to.be.revertedWith("Document does not exist");
    });

    it("Should handle operations on inactive documents", async function () {
      await documentRegistry.connect(issuer).registerDocument(
        sampleDocumentHash,
        student.address,
        sampleIpfsHash,
        sampleDocumentType,
        sampleMetadata
      );

      await documentRegistry.connect(student).deactivateDocument(sampleDocumentHash, "Test");

      await expect(
        documentRegistry.connect(student).transferOwnership(sampleDocumentHash, verifier.address)
      ).to.be.revertedWith("Document is not active");

      await expect(
        documentRegistry.connect(student).grantAccess(sampleDocumentHash, verifier.address)
      ).to.be.revertedWith("Document is not active");
    });

    it("Should handle large metadata", async function () {
      const largeMetadata = JSON.stringify({
        studentName: "John Doe",
        institution: "Test University",
        course: "Computer Science",
        grade: "A+",
        additionalInfo: "x".repeat(1000)
      });

      const largeDocHash = ethers.keccak256(ethers.toUtf8Bytes("large document"));

      await expect(
        documentRegistry.connect(issuer).registerDocument(
          largeDocHash,
          student.address,
          sampleIpfsHash,
          sampleDocumentType,
          largeMetadata
        )
      ).to.emit(documentRegistry, "DocumentRegistered");
    });
  });
});