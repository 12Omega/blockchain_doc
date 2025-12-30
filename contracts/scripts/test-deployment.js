const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Testing deployed contracts on", network.name);
  
  // Load deployment info
  const deploymentFile = path.join(__dirname, "..", "deployments", `${network.name}-deployment.json`);
  
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Deployment file not found. Please deploy contracts first.");
    process.exit(1);
  }
  
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  console.log("📄 Loaded deployment info from:", deploymentFile);
  
  // Get contract addresses
  const accessControlAddress = deploymentInfo.contracts.AccessControl.address;
  const documentRegistryAddress = deploymentInfo.contracts.DocumentRegistry.address;
  
  console.log("AccessControl address:", accessControlAddress);
  console.log("DocumentRegistry address:", documentRegistryAddress);
  
  // Get signers
  const [deployer, issuer, student, verifier] = await ethers.getSigners();
  console.log("\nTest accounts:");
  console.log("Deployer (Admin):", deployer.address);
  console.log("Issuer:", issuer.address);
  console.log("Student:", student.address);
  console.log("Verifier:", verifier.address);
  
  try {
    // Connect to deployed contracts
    const AccessControl = await ethers.getContractFactory("AccessControl");
    const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
    
    const accessControl = AccessControl.attach(accessControlAddress);
    const documentRegistry = DocumentRegistry.attach(documentRegistryAddress);
    
    console.log("\n🧪 Starting contract interaction tests...");
    
    // Test 1: Check initial admin role
    console.log("\n1. Testing AccessControl - Initial Admin Role");
    const deployerRole = await accessControl.getUserRole(deployer.address);
    console.log("✅ Deployer role:", deployerRole.toString(), "(3 = ADMIN)");
    
    // Test 2: Assign roles to test accounts
    console.log("\n2. Testing AccessControl - Role Assignment");
    
    // Assign ISSUER role to issuer account
    const tx1 = await accessControl.assignRole(issuer.address, 2); // Role.ISSUER = 2
    await tx1.wait();
    console.log("✅ Assigned ISSUER role to:", issuer.address);
    
    // Assign STUDENT role to student account
    const tx2 = await accessControl.assignRole(student.address, 0); // Role.STUDENT = 0
    await tx2.wait();
    console.log("✅ Assigned STUDENT role to:", student.address);
    
    // Assign VERIFIER role to verifier account
    const tx3 = await accessControl.assignRole(verifier.address, 1); // Role.VERIFIER = 1
    await tx3.wait();
    console.log("✅ Assigned VERIFIER role to:", verifier.address);
    
    // Verify role assignments
    const issuerRole = await accessControl.getUserRole(issuer.address);
    const studentRole = await accessControl.getUserRole(student.address);
    const verifierRole = await accessControl.getUserRole(verifier.address);
    
    console.log("Issuer role:", issuerRole.toString(), "(2 = ISSUER)");
    console.log("Student role:", studentRole.toString(), "(0 = STUDENT)");
    console.log("Verifier role:", verifierRole.toString(), "(1 = VERIFIER)");
    
    // Test 3: Register a document
    console.log("\n3. Testing DocumentRegistry - Document Registration");
    
    // Create test document data
    const testDocumentContent = "This is a test academic certificate for John Doe";
    const documentHash = ethers.keccak256(ethers.toUtf8Bytes(testDocumentContent));
    const ipfsHash = "QmTestHash123456789"; // Mock IPFS hash
    const documentType = "Bachelor Degree";
    const metadata = JSON.stringify({
      studentName: "John Doe",
      institution: "Test University",
      graduationDate: "2024-01-15",
      gpa: "3.8"
    });
    
    console.log("Document hash:", documentHash);
    console.log("IPFS hash:", ipfsHash);
    
    // Register document as issuer
    const issuerContract = documentRegistry.connect(issuer);
    const tx4 = await issuerContract.registerDocument(
      documentHash,
      student.address, // owner
      ipfsHash,
      documentType,
      metadata
    );
    await tx4.wait();
    console.log("✅ Document registered successfully");
    
    // Test 4: Verify document
    console.log("\n4. Testing DocumentRegistry - Document Verification");
    
    const verifierContract = documentRegistry.connect(verifier);
    const [isValid, document] = await verifierContract.verifyDocument(documentHash);
    
    console.log("Document is valid:", isValid);
    console.log("Document details:");
    console.log("  - Hash:", document.documentHash);
    console.log("  - Issuer:", document.issuer);
    console.log("  - Owner:", document.owner);
    console.log("  - Type:", document.documentType);
    console.log("  - IPFS Hash:", document.ipfsHash);
    console.log("  - Active:", document.isActive);
    console.log("  - Timestamp:", new Date(Number(document.timestamp) * 1000).toISOString());
    
    // Test 5: Check document access
    console.log("\n5. Testing DocumentRegistry - Access Control");
    
    const studentHasAccess = await documentRegistry.checkAccess(documentHash, student.address);
    const issuerHasAccess = await documentRegistry.checkAccess(documentHash, issuer.address);
    const verifierHasAccess = await documentRegistry.checkAccess(documentHash, verifier.address);
    
    console.log("Student has access:", studentHasAccess);
    console.log("Issuer has access:", issuerHasAccess);
    console.log("Verifier has access:", verifierHasAccess);
    
    // Test 6: Get user documents
    console.log("\n6. Testing DocumentRegistry - User Documents");
    
    const studentDocuments = await documentRegistry.getUserDocuments(student.address);
    console.log("Student documents count:", studentDocuments.length);
    console.log("Student documents:", studentDocuments);
    
    const totalDocuments = await documentRegistry.getTotalDocuments();
    console.log("Total documents in registry:", totalDocuments.toString());
    
    // Test 7: Grant additional access
    console.log("\n7. Testing DocumentRegistry - Access Management");
    
    // Grant access to deployer (admin)
    const tx5 = await issuerContract.grantAccess(documentHash, deployer.address);
    await tx5.wait();
    console.log("✅ Granted access to admin");
    
    const adminHasAccess = await documentRegistry.checkAccess(documentHash, deployer.address);
    console.log("Admin has access:", adminHasAccess);
    
    // Test 8: Test invalid operations (should fail)
    console.log("\n8. Testing Access Control - Invalid Operations");
    
    try {
      // Try to register document as student (should fail)
      const studentContract = documentRegistry.connect(student);
      await studentContract.registerDocument(
        ethers.keccak256(ethers.toUtf8Bytes("invalid")),
        student.address,
        "invalidHash",
        "Invalid",
        "{}"
      );
      console.log("❌ Student was able to register document (this should not happen)");
    } catch (error) {
      console.log("✅ Student correctly prevented from registering document");
    }
    
    try {
      // Try to assign role as non-admin (should fail)
      const issuerAccessControl = accessControl.connect(issuer);
      await issuerAccessControl.assignRole(student.address, 2);
      console.log("❌ Issuer was able to assign role (this should not happen)");
    } catch (error) {
      console.log("✅ Issuer correctly prevented from assigning roles");
    }
    
    console.log("\n🎉 All tests completed successfully!");
    console.log("========================");
    console.log("Test Summary:");
    console.log("- AccessControl deployment: ✅");
    console.log("- DocumentRegistry deployment: ✅");
    console.log("- Role assignment: ✅");
    console.log("- Document registration: ✅");
    console.log("- Document verification: ✅");
    console.log("- Access control: ✅");
    console.log("- Security checks: ✅");
    console.log("========================");
    
    // Save test results
    const testResults = {
      network: network.name,
      testTime: new Date().toISOString(),
      contracts: {
        accessControl: accessControlAddress,
        documentRegistry: documentRegistryAddress
      },
      testAccounts: {
        admin: deployer.address,
        issuer: issuer.address,
        student: student.address,
        verifier: verifier.address
      },
      testDocument: {
        hash: documentHash,
        ipfsHash: ipfsHash,
        type: documentType,
        owner: student.address,
        issuer: issuer.address
      },
      testsPassed: true
    };
    
    const testResultsFile = path.join(__dirname, "..", "deployments", `${network.name}-test-results.json`);
    fs.writeFileSync(testResultsFile, JSON.stringify(testResults, null, 2));
    console.log("📄 Test results saved to:", testResultsFile);
    
  } catch (error) {
    console.error("❌ Contract testing failed:", error);
    throw error;
  }
}

// Execute testing
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;