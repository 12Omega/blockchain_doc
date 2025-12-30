# Smart Contract Deployment Guide

This guide covers the deployment and testing of the blockchain document verification smart contracts on Ethereum Sepolia testnet.

## Prerequisites

1. **Node.js and npm** installed
2. **Hardhat** development environment set up
3. **MetaMask** wallet with Sepolia testnet ETH
4. **Infura** or **Alchemy** API key for Sepolia access
5. **Etherscan API key** for contract verification

## Environment Setup

1. Copy the environment template:
```bash
cp ../.env.example .env
```

2. Fill in your environment variables in `.env`:
```bash
# Required for Sepolia deployment
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key
```

⚠️ **Security Warning**: Never commit your private key or API keys to version control.

## Getting Sepolia ETH

You need Sepolia testnet ETH to deploy contracts. Get it from these faucets:
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)

You'll need approximately 0.01-0.02 ETH for deployment.

## Deployment Process

### Step 1: Compile Contracts

```bash
npm run compile
```

This compiles the smart contracts and generates artifacts.

### Step 2: Run Tests (Optional but Recommended)

```bash
npm test
```

Ensure all tests pass before deployment.

### Step 3: Deploy to Sepolia Testnet

```bash
npm run deploy:sepolia
```

This script will:
- Deploy the `AccessControl` contract
- Deploy the `DocumentRegistry` contract
- Verify the deployments
- Save deployment information to `deployments/sepolia-deployment.json`
- Save contract ABIs to `abis/` directory

Expected output:
```
Starting deployment to sepolia
Deploying contracts with account: 0x...
Account balance: 0.05 ETH

1. Deploying AccessControl contract...
✅ AccessControl deployed to: 0x...

2. Deploying DocumentRegistry contract...
✅ DocumentRegistry deployed to: 0x...

3. Verifying deployments...
Deployer role in AccessControl: 3 (3 = ADMIN)
Total documents in registry: 0
AccessControl address in DocumentRegistry: 0x...

📄 Deployment info saved to: deployments/sepolia-deployment.json
📄 Contract ABIs saved to: abis/

🎉 Deployment Summary:
========================
Network: sepolia
Deployer: 0x...
AccessControl: 0x...
DocumentRegistry: 0x...
========================
```

### Step 4: Test Deployed Contracts

```bash
npm run test:sepolia
```

This comprehensive test script will:
- Load deployment information
- Test role assignments
- Register a test document
- Verify document functionality
- Test access control mechanisms
- Validate security restrictions

Expected output:
```
Testing deployed contracts on sepolia
📄 Loaded deployment info from: deployments/sepolia-deployment.json

🧪 Starting contract interaction tests...

1. Testing AccessControl - Initial Admin Role
✅ Deployer role: 3 (3 = ADMIN)

2. Testing AccessControl - Role Assignment
✅ Assigned ISSUER role to: 0x...
✅ Assigned STUDENT role to: 0x...
✅ Assigned VERIFIER role to: 0x...

3. Testing DocumentRegistry - Document Registration
✅ Document registered successfully

4. Testing DocumentRegistry - Document Verification
Document is valid: true
Document details:
  - Hash: 0x...
  - Issuer: 0x...
  - Owner: 0x...
  - Type: Bachelor Degree
  - IPFS Hash: QmTestHash123456789
  - Active: true
  - Timestamp: 2024-01-15T10:30:00.000Z

🎉 All tests completed successfully!
```

### Step 5: Verify Contracts on Etherscan (Optional)

```bash
npm run verify:sepolia
```

This will verify your contracts on Etherscan, making the source code publicly viewable.

## Deployment Files

After successful deployment, you'll find these files:

### `deployments/sepolia-deployment.json`
Contains deployment information:
```json
{
  "network": "sepolia",
  "chainId": 11155111,
  "deployer": "0x...",
  "deploymentTime": "2024-01-15T10:30:00.000Z",
  "contracts": {
    "AccessControl": {
      "address": "0x...",
      "deploymentHash": "0x..."
    },
    "DocumentRegistry": {
      "address": "0x...",
      "deploymentHash": "0x..."
    }
  }
}
```

### `abis/AccessControl.json` and `abis/DocumentRegistry.json`
Contract ABIs for frontend integration:
```json
{
  "contractName": "AccessControl",
  "abi": [...],
  "address": "0x...",
  "network": "sepolia"
}
```

## Frontend Integration

Use the generated ABI files and contract addresses for frontend integration:

```javascript
// Example frontend integration
import AccessControlABI from './contracts/abis/AccessControl.json';
import DocumentRegistryABI from './contracts/abis/DocumentRegistry.json';

const accessControlContract = new ethers.Contract(
  AccessControlABI.address,
  AccessControlABI.abi,
  signer
);

const documentRegistryContract = new ethers.Contract(
  DocumentRegistryABI.address,
  DocumentRegistryABI.abi,
  signer
);
```

## Contract Addresses

After deployment, your contract addresses will be:
- **AccessControl**: Found in `deployments/sepolia-deployment.json`
- **DocumentRegistry**: Found in `deployments/sepolia-deployment.json`

## Troubleshooting

### Common Issues

1. **Insufficient funds**: Ensure you have enough Sepolia ETH
2. **Network connection**: Check your Infura/Alchemy URL
3. **Private key issues**: Ensure your private key is correct and has the 0x prefix
4. **Gas estimation failed**: Network might be congested, try again later

### Error Messages

- `Error: insufficient funds`: Get more Sepolia ETH from faucets
- `Error: network connection`: Check your SEPOLIA_URL in .env
- `Error: invalid private key`: Verify your PRIVATE_KEY in .env
- `Error: contract verification failed`: Check your ETHERSCAN_API_KEY

### Getting Help

If you encounter issues:
1. Check the Hardhat console output for detailed error messages
2. Verify your environment variables are set correctly
3. Ensure you have sufficient Sepolia ETH
4. Check network status on [Sepolia Etherscan](https://sepolia.etherscan.io/)

## Security Considerations

1. **Never commit private keys** to version control
2. **Use environment variables** for sensitive data
3. **Test thoroughly** on testnet before mainnet deployment
4. **Verify contracts** on Etherscan for transparency
5. **Keep deployment records** secure and backed up

## Next Steps

After successful deployment:
1. Update frontend configuration with contract addresses
2. Test the complete application flow
3. Prepare for mainnet deployment (if applicable)
4. Set up monitoring and alerting
5. Create user documentation

## Contract Interaction Examples

### Using Hardhat Console

```bash
npx hardhat console --network sepolia
```

```javascript
// Get contract instances
const AccessControl = await ethers.getContractFactory("AccessControl");
const accessControl = AccessControl.attach("YOUR_ACCESS_CONTROL_ADDRESS");

const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
const documentRegistry = DocumentRegistry.attach("YOUR_DOCUMENT_REGISTRY_ADDRESS");

// Assign a role
await accessControl.assignRole("0x...", 2); // Assign ISSUER role

// Register a document
const hash = ethers.keccak256(ethers.toUtf8Bytes("test document"));
await documentRegistry.registerDocument(
  hash,
  "0x...", // owner address
  "QmTestHash",
  "Certificate",
  '{"name": "Test Certificate"}'
);

// Verify a document
const [isValid, document] = await documentRegistry.verifyDocument(hash);
console.log("Valid:", isValid);
console.log("Document:", document);
```

## Mainnet Deployment

⚠️ **Warning**: Mainnet deployment requires real ETH and careful consideration.

For mainnet deployment:
1. Update `hardhat.config.js` with mainnet configuration
2. Set `MAINNET_URL` and ensure sufficient ETH
3. Test extensively on testnet first
4. Consider using a multisig wallet for admin functions
5. Have a deployment checklist and rollback plan

---

This completes the smart contract deployment guide. The contracts are now ready for integration with the backend API and frontend application.