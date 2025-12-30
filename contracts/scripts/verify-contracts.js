const { run } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting contract verification on", network.name);
  
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
  
  if (network.name !== "sepolia" && network.name !== "mainnet") {
    console.log("⚠️  Contract verification is only supported on Sepolia and Mainnet");
    console.log("Current network:", network.name);
    return;
  }
  
  try {
    // Verify AccessControl contract
    console.log("\n1. Verifying AccessControl contract...");
    try {
      await run("verify:verify", {
        address: accessControlAddress,
        constructorArguments: [], // AccessControl has no constructor arguments
      });
      console.log("✅ AccessControl contract verified successfully");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ AccessControl contract already verified");
      } else {
        console.error("❌ AccessControl verification failed:", error.message);
      }
    }
    
    // Wait a bit before verifying the next contract
    console.log("Waiting 5 seconds before verifying DocumentRegistry...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify DocumentRegistry contract
    console.log("\n2. Verifying DocumentRegistry contract...");
    try {
      await run("verify:verify", {
        address: documentRegistryAddress,
        constructorArguments: [accessControlAddress], // DocumentRegistry constructor takes AccessControl address
      });
      console.log("✅ DocumentRegistry contract verified successfully");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ DocumentRegistry contract already verified");
      } else {
        console.error("❌ DocumentRegistry verification failed:", error.message);
      }
    }
    
    console.log("\n🎉 Contract verification completed!");
    console.log("========================");
    console.log("Network:", network.name);
    console.log("AccessControl:", accessControlAddress);
    console.log("DocumentRegistry:", documentRegistryAddress);
    console.log("========================");
    
    if (network.name === "sepolia") {
      console.log("\n🔍 View contracts on Etherscan:");
      console.log(`AccessControl: https://sepolia.etherscan.io/address/${accessControlAddress}`);
      console.log(`DocumentRegistry: https://sepolia.etherscan.io/address/${documentRegistryAddress}`);
    } else if (network.name === "mainnet") {
      console.log("\n🔍 View contracts on Etherscan:");
      console.log(`AccessControl: https://etherscan.io/address/${accessControlAddress}`);
      console.log(`DocumentRegistry: https://etherscan.io/address/${documentRegistryAddress}`);
    }
    
    // Update deployment info with verification status
    deploymentInfo.verification = {
      verified: true,
      verificationTime: new Date().toISOString(),
      network: network.name
    };
    
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("📄 Updated deployment info with verification status");
    
  } catch (error) {
    console.error("❌ Contract verification failed:", error);
    throw error;
  }
}

// Execute verification
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;