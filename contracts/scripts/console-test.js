/**
 * Console interaction test script
 * This script demonstrates how to interact with deployed contracts using Hardhat console
 */

async function consoleTest() {
  console.log("🔧 Hardhat Console Interaction Test");
  console.log("This demonstrates how to interact with deployed contracts");
  
  // Mock addresses for demonstration
  const mockAddresses = {
    deployer: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    issuer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    student: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
  };
  
  console.log("\nMock Accounts for Demo:");
  console.log("Deployer:", mockAddresses.deployer);
  console.log("Issuer:", mockAddresses.issuer);
  console.log("Student:", mockAddresses.student);
  
  // For demonstration, we'll use the compiled contracts
  console.log("\n📋 Contract Interaction Examples:");
  console.log("================================");
  
  console.log("\n1. Get Contract Factories:");
  console.log("const AccessControl = await ethers.getContractFactory('AccessControl');");
  console.log("const DocumentRegistry = await ethers.getContractFactory('DocumentRegistry');");
  
  console.log("\n2. Deploy Contracts (if not already deployed):");
  console.log("const accessControl = await AccessControl.deploy();");
  console.log("await accessControl.waitForDeployment();");
  console.log("const documentRegistry = await DocumentRegistry.deploy(await accessControl.getAddress());");
  console.log("await documentRegistry.waitForDeployment();");
  
  console.log("\n3. Or Attach to Existing Contracts:");
  console.log("const accessControl = AccessControl.attach('CONTRACT_ADDRESS');");
  console.log("const documentRegistry = DocumentRegistry.attach('CONTRACT_ADDRESS');");
  
  console.log("\n4. Interact with AccessControl:");
  console.log("// Check deployer role");
  console.log("await accessControl.getUserRole(deployer.address);");
  console.log("// Assign issuer role");
  console.log("await accessControl.assignRole(issuer.address, 2); // 2 = ISSUER");
  console.log("// Check if user has role");
  console.log("await accessControl.hasRole(issuer.address, 2);");
  
  console.log("\n5. Interact with DocumentRegistry:");
  console.log("// Register a document");
  console.log("const hash = ethers.keccak256(ethers.toUtf8Bytes('test document'));");
  console.log("await documentRegistry.connect(issuer).registerDocument(");
  console.log("  hash,");
  console.log("  student.address,");
  console.log("  'QmTestHash',");
  console.log("  'Certificate',");
  console.log("  '{\"name\": \"Test Certificate\"}'");
  console.log(");");
  console.log("// Verify document");
  console.log("const [isValid, document] = await documentRegistry.verifyDocument(hash);");
  
  console.log("\n6. View Contract State:");
  console.log("// Get total documents");
  console.log("await documentRegistry.getTotalDocuments();");
  console.log("// Get user documents");
  console.log("await documentRegistry.getUserDocuments(student.address);");
  
  console.log("\n🚀 To start interactive console:");
  console.log("npx hardhat console --network localhost");
  console.log("npx hardhat console --network sepolia");
  
  console.log("\n📝 Example Console Session:");
  console.log("================================");
  console.log("Welcome to Node.js v18.17.0.");
  console.log("Type \".help\" for more information.");
  console.log("> const [deployer] = await ethers.getSigners();");
  console.log("> console.log('Deployer:', deployer.address);");
  console.log("Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  console.log("> const AccessControl = await ethers.getContractFactory('AccessControl');");
  console.log("> const accessControl = await AccessControl.deploy();");
  console.log("> await accessControl.waitForDeployment();");
  console.log("> console.log('AccessControl deployed to:', await accessControl.getAddress());");
  console.log("AccessControl deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3");
  
  return {
    message: "Console test examples generated successfully",
    accounts: mockAddresses
  };
}

// Execute console test
if (require.main === module) {
  consoleTest()
    .then((result) => {
      console.log("\n✅", result.message);
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Console test failed:", error);
      process.exit(1);
    });
}

module.exports = consoleTest;