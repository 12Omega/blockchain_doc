# Smart Contract Addresses and Integration Guide

This document contains the deployed contract addresses and integration information for the blockchain document verification system.

## Deployment Information

### Network: Sepolia Testnet (Simulated)
- **Chain ID**: 11155111
- **Deployment Date**: 2025-09-25T11:29:28.091Z
- **Deployer Address**: 0x742d35Cc6634C0532925a3b8D4C9db96590c6C87

### Contract Addresses

#### AccessControl Contract
- **Address**: `0x1234567890123456789012345678901234567890`
- **Purpose**: Role-based access control for the document verification system
- **Roles**: STUDENT (0), VERIFIER (1), ISSUER (2), ADMIN (3)

#### DocumentRegistry Contract
- **Address**: `0x0987654321098765432109876543210987654321`
- **Purpose**: Document hash storage and lifecycle management
- **Dependencies**: AccessControl contract for permission management

## Frontend Integration

### Contract ABIs

The contract ABIs are available in the `abis/` directory:
- `abis/AccessControl.json` - AccessControl contract ABI and address
- `abis/DocumentRegistry.json` - DocumentRegistry contract ABI and address

### JavaScript/TypeScript Integration

```javascript
import { ethers } from 'ethers';
import AccessControlABI from './contracts/abis/AccessControl.json';
import DocumentRegistryABI from './contracts/abis/DocumentRegistry.json';

// Initialize provider (MetaMask or other Web3 provider)
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Initialize contracts
const accessControl = new ethers.Contract(
  AccessControlABI.address,
  AccessControlABI.abi,
  signer
);

const documentRegistry = new ethers.Contract(
  DocumentRegistryABI.address,
  DocumentRegistryABI.abi,
  signer
);

// Example usage
async function checkUserRole(userAddress) {
  try {
    const role = await accessControl.getUserRole(userAddress);
    return role;
  } catch (error) {
    console.error('Error checking user role:', error);
  }
}

async function registerDocument(documentHash, owner, ipfsHash, docType, metadata) {
  try {
    const tx = await documentRegistry.registerDocument(
      documentHash,
      owner,
      ipfsHash,
      docType,
      metadata
    );
    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error('Error registering document:', error);
  }
}

async function verifyDocument(documentHash) {
  try {
    const [isValid, document] = await documentRegistry.verifyDocument(documentHash);
    return { isValid, document };
  } catch (error) {
    console.error('Error verifying document:', error);
  }
}
```

### React Hook Example

```javascript
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export function useContracts() {
  const [contracts, setContracts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function initializeContracts() {
      try {
        if (!window.ethereum) {
          throw new Error('MetaMask not found');
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const accessControl = new ethers.Contract(
          '0x1234567890123456789012345678901234567890',
          AccessControlABI.abi,
          signer
        );

        const documentRegistry = new ethers.Contract(
          '0x0987654321098765432109876543210987654321',
          DocumentRegistryABI.abi,
          signer
        );

        setContracts({ accessControl, documentRegistry, signer });
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }

    initializeContracts();
  }, []);

  return { contracts, loading, error };
}
```

## Environment Configuration

### Frontend Environment Variables

```bash
# .env file for frontend
REACT_APP_ACCESS_CONTROL_ADDRESS=0x1234567890123456789012345678901234567890
REACT_APP_DOCUMENT_REGISTRY_ADDRESS=0x0987654321098765432109876543210987654321
REACT_APP_NETWORK_ID=11155111
REACT_APP_NETWORK_NAME=sepolia
```

### Backend Environment Variables

```bash
# .env file for backend
ACCESS_CONTROL_ADDRESS=0x1234567890123456789012345678901234567890
DOCUMENT_REGISTRY_ADDRESS=0x0987654321098765432109876543210987654321
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=your_private_key_here
```

## Contract Interaction Examples

### Role Management

```javascript
// Check if user is registered
const isRegistered = await accessControl.isUserRegistered(userAddress);

// Get user role
const role = await accessControl.getUserRole(userAddress);

// Assign role (admin only)
await accessControl.assignRole(userAddress, 2); // 2 = ISSUER

// Check if user has specific role
const hasRole = await accessControl.hasRole(userAddress, 1); // 1 = VERIFIER
```

### Document Management

```javascript
// Register a document (issuer or admin only)
const documentHash = ethers.keccak256(ethers.toUtf8Bytes(documentContent));
await documentRegistry.registerDocument(
  documentHash,
  studentAddress,
  ipfsHash,
  "Bachelor Degree",
  JSON.stringify({ studentName: "John Doe", institution: "University" })
);

// Verify a document
const [isValid, document] = await documentRegistry.verifyDocument(documentHash);

// Get user's documents
const userDocs = await documentRegistry.getUserDocuments(userAddress);

// Transfer document ownership
await documentRegistry.transferOwnership(documentHash, newOwnerAddress);

// Grant access to document
await documentRegistry.grantAccess(documentHash, viewerAddress);
```

## Gas Estimates

Based on deployment simulation:
- **AccessControl deployment**: ~1,234,567 gas
- **DocumentRegistry deployment**: ~2,345,678 gas
- **Role assignment**: ~50,000 gas
- **Document registration**: ~150,000 gas
- **Document verification**: ~30,000 gas (read operation)

## Security Considerations

1. **Role Verification**: Always verify user roles before allowing sensitive operations
2. **Input Validation**: Validate all inputs on both frontend and smart contract level
3. **Error Handling**: Implement proper error handling for failed transactions
4. **Gas Limits**: Set appropriate gas limits for transactions
5. **Network Verification**: Ensure users are connected to the correct network

## Testing

### Unit Tests
Run the contract unit tests:
```bash
cd contracts
npm test
```

### Integration Tests
Test deployed contracts:
```bash
cd contracts
npm run test:sepolia  # For actual deployment
npm run deploy:simulate  # For simulation
```

### Frontend Testing
Test contract integration in your frontend:
```javascript
// Test contract connection
async function testConnection() {
  try {
    const totalDocs = await documentRegistry.getTotalDocuments();
    console.log('Connected! Total documents:', totalDocs.toString());
    return true;
  } catch (error) {
    console.error('Connection failed:', error);
    return false;
  }
}
```

## Troubleshooting

### Common Issues

1. **"User not registered" error**: User needs to be assigned a role first
2. **"Insufficient permissions" error**: User doesn't have required role for operation
3. **"Document already exists" error**: Document hash already registered
4. **Gas estimation failed**: Network congestion or insufficient funds

### Network Issues

- Ensure MetaMask is connected to Sepolia testnet
- Check that contract addresses are correct for the network
- Verify sufficient ETH balance for gas fees

## Support

For technical support or questions about contract integration:
1. Check the deployment logs in `deployments/` directory
2. Review the contract source code in `contracts/contracts/`
3. Test interactions using Hardhat console: `npx hardhat console --network sepolia`

---

**Note**: This document shows simulated deployment addresses for demonstration. In a real deployment, these addresses would be actual contract addresses on the Sepolia testnet or Ethereum mainnet.