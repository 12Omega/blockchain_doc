const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment to", network.name);
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.01")) {
    console.warn("Warning: Low balance. Make sure you have enough ETH for deployment.");
  }
  
  try {
    // Deploy AccessControl contract
    console.log("\n1. Deploying AccessControl contract...");
    const AccessControl = await ethers.getContractFactory("AccessControl");
    const accessControl = await AccessControl.deploy();
    await accessControl.waitForDeployment();
    
    const accessControlAddress = await accessControl.getAddress();
    console.log("✅ AccessControl deployed to:", accessControlAddress);
    
    // Deploy DocumentRegistry contract
    console.log("\n2. Deploying DocumentRegistry contract...");
    const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
    const documentRegistry = await DocumentRegistry.deploy(accessControlAddress);
    await documentRegistry.waitForDeployment();
    
    const documentRegistryAddress = await documentRegistry.getAddress();
    console.log("✅ DocumentRegistry deployed to:", documentRegistryAddress);
    
    // Verify deployment by calling a view function
    console.log("\n3. Verifying deployments...");
    
    // Check AccessControl
    const deployerRole = await accessControl.getUserRole(deployer.address);
    console.log("Deployer role in AccessControl:", deployerRole.toString(), "(3 = ADMIN)");
    
    // Check DocumentRegistry
    const totalDocs = await documentRegistry.getTotalDocuments();
    console.log("Total documents in registry:", totalDocs.toString());
    
    // Check if DocumentRegistry can access AccessControl
    const accessControlInRegistry = await documentRegistry.accessControl();
    console.log("AccessControl address in DocumentRegistry:", accessControlInRegistry);
    
    // Save deployment information
    const deploymentInfo = {
      network: network.name,
      chainId: network.config.chainId,
      deployer: deployer.address,
      deploymentTime: new Date().toISOString(),
      contracts: {
        AccessControl: {
          address: accessControlAddress,
          deploymentHash: accessControl.deploymentTransaction()?.hash
        },
        DocumentRegistry: {
          address: documentRegistryAddress,
          deploymentHash: documentRegistry.deploymentTransaction()?.hash
        }
      },
      gasUsed: {
        AccessControl: (await accessControl.deploymentTransaction()?.wait())?.gasUsed?.toString(),
        DocumentRegistry: (await documentRegistry.deploymentTransaction()?.wait())?.gasUsed?.toString()
      }
    };
    
    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    // Save deployment info to file
    const deploymentFile = path.join(deploymentsDir, `${network.name}-deployment.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("\n📄 Deployment info saved to:", deploymentFile);
    
    // Save ABIs for frontend integration
    const accessControlArtifact = await ethers.getContractFactory("AccessControl");
    const documentRegistryArtifact = await ethers.getContractFactory("DocumentRegistry");
    
    const abisDir = path.join(__dirname, "..", "abis");
    if (!fs.existsSync(abisDir)) {
      fs.mkdirSync(abisDir, { recursive: true });
    }
    
    // Save AccessControl ABI
    fs.writeFileSync(
      path.join(abisDir, "AccessControl.json"),
      JSON.stringify({
        contractName: "AccessControl",
        abi: accessControlArtifact.interface.formatJson(),
        address: accessControlAddress,
        network: network.name
      }, null, 2)
    );
    
    // Save DocumentRegistry ABI
    fs.writeFileSync(
      path.join(abisDir, "DocumentRegistry.json"),
      JSON.stringify({
        contractName: "DocumentRegistry",
        abi: documentRegistryArtifact.interface.formatJson(),
        address: documentRegistryAddress,
        network: network.name
      }, null, 2)
    );
    
    console.log("📄 Contract ABIs saved to:", abisDir);
    
    // Display summary
    console.log("\n🎉 Deployment Summary:");
    console.log("========================");
    console.log("Network:", network.name);
    console.log("Deployer:", deployer.address);
    console.log("AccessControl:", accessControlAddress);
    console.log("DocumentRegistry:", documentRegistryAddress);
    console.log("========================");
    
    if (network.name === "sepolia") {
      console.log("\n🔍 Verify contracts on Etherscan:");
      console.log(`npx hardhat verify --network sepolia ${accessControlAddress}`);
      console.log(`npx hardhat verify --network sepolia ${documentRegistryAddress} ${accessControlAddress}`);
    }
    
    return {
      accessControl: accessControlAddress,
      documentRegistry: documentRegistryAddress
    };
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;