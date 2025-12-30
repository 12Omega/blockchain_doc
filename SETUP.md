# Blockchain Document Verification System - Setup Guide

## Prerequisites

### Required Software
1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **Git**
4. **MetaMask** browser extension
5. **MongoDB** (local or Atlas)

### Required Accounts
1. **Infura Account** - For Ethereum RPC access
2. **Pinata Account** - For IPFS storage
3. **Etherscan Account** - For contract verification (optional)

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install smart contract dependencies
cd contracts && npm install && cd ..
```

### 2. Environment Setup

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```bash
# Blockchain Configuration
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
PRIVATE_KEY=your_metamask_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/blockchain-documents

# IPFS Configuration
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend Configuration
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_NETWORK_ID=11155111
```

### 3. Get Test ETH

1. Go to [Sepolia Faucet](https://sepoliafaucet.com/)
2. Enter your MetaMask wallet address
3. Request test ETH (you'll need this for deploying contracts)

### 4. Deploy Smart Contracts

```bash
# Compile contracts
npm run compile

# Deploy to Sepolia testnet
npm run deploy:testnet
```

**Important**: Save the contract addresses from the deployment output!

### 5. Update Contract Addresses

After deployment, update your `.env` file with the contract addresses:
```bash
# Add these lines to your .env file
CONTRACT_ADDRESS=0x... # DocumentRegistry contract address
ACCESS_CONTROL_ADDRESS=0x... # AccessControl contract address
```

### 6. Start the Application

```bash
# Start both frontend and backend
npm run dev
```

This will start:
- Backend API server on `http://localhost:5000`
- Frontend React app on `http://localhost:3000`

## Detailed Setup Instructions

### Getting Infura Project ID

1. Go to [Infura.io](https://infura.io/)
2. Create a free account
3. Create a new project
4. Select "Ethereum" as the network
5. Copy your Project ID from the project settings

### Getting Pinata API Keys

1. Go to [Pinata.cloud](https://pinata.cloud/)
2. Create a free account
3. Go to API Keys section
4. Create a new API key with full permissions
5. Copy both API Key and Secret Key

### Setting up MongoDB

#### Option 1: Local MongoDB
```bash
# Install MongoDB locally
# On macOS with Homebrew:
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community

# Use default connection string:
MONGODB_URI=mongodb://localhost:27017/blockchain-documents
```

#### Option 2: MongoDB Atlas (Cloud)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account and cluster
3. Get your connection string
4. Update `.env` with your Atlas URI

### Getting Your Private Key

**⚠️ SECURITY WARNING**: Never share your private key or commit it to version control!

1. Open MetaMask
2. Click on your account name
3. Go to Account Details
4. Click "Export Private Key"
5. Enter your MetaMask password
6. Copy the private key (starts with 0x)

## Running the System

### Development Mode
```bash
# Start everything
npm run dev

# Or start services individually:
npm run server:dev  # Backend only
npm run client:dev  # Frontend only
```

### Production Mode
```bash
# Build frontend
npm run build

# Start with Docker
docker-compose up -d
```

## Adding Your First Document

### 1. Connect Your Wallet
1. Open `http://localhost:3000`
2. Click "Connect Wallet"
3. Approve the MetaMask connection
4. Sign the authentication message

### 2. Set Up Your Role
1. Go to the admin panel (if you're the contract deployer, you're automatically an admin)
2. Assign yourself the "ISSUER" role to upload documents
3. Or assign "VERIFIER" role to verify documents

### 3. Upload a Document
1. Click "Upload Document"
2. Select a PDF, DOC, or image file
3. Fill in the metadata:
   - Document title
   - Document type (diploma, certificate, etc.)
   - Student information
   - Issue and expiration dates
4. Click "Upload and Register"
5. Approve the MetaMask transaction
6. Wait for blockchain confirmation

### 4. Verify the Document
1. Go to "Verify Document"
2. Upload the same file you just registered
3. The system will show "✅ Verified" if the document is authentic
4. You can also scan the QR code generated during upload

## API Usage Example

### Upload Document via API
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('metadata', JSON.stringify({
  title: 'Bachelor of Science Degree',
  type: 'diploma',
  studentId: '12345',
  issueDate: '2024-05-15',
  expirationDate: '2034-05-15'
}));

const response = await fetch('http://localhost:5000/api/documents/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'X-Wallet-Address': walletAddress
  },
  body: formData
});

const result = await response.json();
console.log('Document uploaded:', result.data.documentId);
```

### Verify Document via API
```javascript
const formData = new FormData();
formData.append('file', fileToVerify);

const response = await fetch('http://localhost:5000/api/documents/verify', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Verification result:', result.data.isValid);
```

## Troubleshooting

### Common Issues

1. **"Network mismatch" error**
   - Switch MetaMask to Sepolia testnet
   - Check REACT_APP_NETWORK_ID in .env

2. **"Insufficient funds" error**
   - Get test ETH from Sepolia faucet
   - Ensure you have enough ETH for gas fees

3. **"Contract not deployed" error**
   - Run `npm run deploy:testnet`
   - Update CONTRACT_ADDRESS in .env

4. **MongoDB connection error**
   - Start MongoDB service
   - Check MONGODB_URI in .env

5. **IPFS upload fails**
   - Verify Pinata API keys
   - Check internet connection

### Getting Help
- Check the [Troubleshooting FAQ](docs/troubleshooting-faq.md)
- Review the [API Documentation](docs/api-documentation.md)
- Open an issue on GitHub

## Next Steps

1. **Customize the UI**: Modify the React components in `frontend/src/`
2. **Add Features**: Extend the smart contracts in `contracts/`
3. **Deploy to Production**: Use the production Docker setup
4. **Integrate with Your System**: Use the provided APIs and SDKs

## Security Notes

- Never commit private keys to version control
- Use environment variables for all sensitive data
- Regularly update dependencies
- Enable 2FA on all service accounts
- Use strong, unique passwords
- Consider using a hardware wallet for production