# Quick Start Guide

Get the Academic Document Blockchain Verification System running in under 30 minutes!

## Prerequisites

- Node.js v16+ installed
- MetaMask browser extension
- Git installed
- GitHub account (for hosting)

## Step 1: Clone and Install (5 minutes)

```bash
# Clone the repository
git clone <your-repo-url>
cd blockchain-document-verification

# Install all dependencies
npm install
cd contracts && npm install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

## Step 2: Get Free Service Accounts (10 minutes)

### Required Accounts:

1. **Infura** (Blockchain RPC)
   - Sign up: https://infura.io
   - Create project, get Sepolia URL
   - Takes 2 minutes

2. **MongoDB Atlas** (Database)
   - Sign up: https://www.mongodb.com/cloud/atlas/register
   - Create free M0 cluster
   - Get connection string
   - Takes 3 minutes

3. **Web3.Storage** (IPFS)
   - Sign up: https://web3.storage
   - Create API token
   - Takes 1 minute

4. **Get Testnet ETH**
   - Visit: https://www.alchemy.com/faucets/ethereum-sepolia
   - Enter your MetaMask address
   - Get 0.5 ETH (free)
   - Takes 2 minutes

See [docs/FREE_SERVICES_SETUP.md](docs/FREE_SERVICES_SETUP.md) for detailed instructions.

## Step 3: Configure Environment (5 minutes)

### Smart Contracts

```bash
cd contracts
cp .env.example .env
```

Edit `contracts/.env`:
```env
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=your_metamask_private_key
ETHERSCAN_API_KEY=your_etherscan_key  # Optional
```

### Backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/blockchain-documents
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=your_metamask_private_key
WEB3_STORAGE_API_KEY=your_web3storage_token
JWT_SECRET=your_random_secret_key_min_32_chars
```

### Frontend

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_CHAIN_ID=11155111
REACT_APP_CHAIN_NAME=Sepolia
```

## Step 4: Deploy Smart Contracts (5 minutes)

```bash
# Linux/Mac
chmod +x scripts/deploy-sepolia.sh
./scripts/deploy-sepolia.sh

# Windows
scripts\deploy-sepolia.bat
```

This will:
- Compile contracts
- Run tests
- Deploy to Sepolia
- Verify on Etherscan
- Update backend and frontend configs

**Save the contract addresses!**

## Step 5: Start Development Servers (2 minutes)

### Terminal 1 - Backend
```bash
cd backend
npm start
```

Backend runs on http://localhost:3001

### Terminal 2 - Frontend
```bash
cd frontend
npm start
```

Frontend opens at http://localhost:3000

## Step 6: Test the System (3 minutes)

1. **Open Frontend**
   - Visit http://localhost:3000
   - Connect MetaMask
   - Switch to Sepolia network

2. **Register a Document**
   - Go to Issuer Dashboard
   - Upload a test PDF
   - Fill in student details
   - Click "Register"
   - Approve MetaMask transaction
   - Wait for confirmation (~30 seconds)
   - Download QR code

3. **Verify the Document**
   - Go to Verifier Portal
   - Upload the same PDF OR scan QR code
   - See verification result
   - Check blockchain proof

## Troubleshooting

### Contract Deployment Fails
```bash
# Check you have testnet ETH
# Visit: https://sepoliafaucet.com
# Enter your address, get free ETH
```

### Backend Won't Start
```bash
# Check MongoDB connection
# Verify connection string in backend/.env
# Ensure IP is whitelisted in MongoDB Atlas
```

### Frontend Can't Connect
```bash
# Check backend is running on port 3001
# Verify REACT_APP_API_URL in frontend/.env
# Check browser console for errors
```

### MetaMask Issues
```bash
# Switch to Sepolia network in MetaMask
# Ensure you have testnet ETH
# Try resetting MetaMask account (Settings > Advanced > Reset Account)
```

## Next Steps

### Deploy to Production

1. **Deploy Backend to Railway**
   - Visit https://railway.app
   - Connect GitHub repo
   - Add environment variables
   - Deploy automatically

2. **Deploy Frontend to Vercel**
   - Visit https://vercel.com
   - Connect GitHub repo
   - Add environment variables
   - Deploy automatically

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

### Add More Features

- Set up additional IPFS providers (Pinata, NFT.Storage)
- Configure CI/CD with GitHub Actions
- Add monitoring and alerts
- Set up custom domain
- Enable contract verification

## Common Commands

```bash
# Run all tests
npm test

# Run contract tests only
cd contracts && npm test

# Run backend tests only
cd backend && npm test

# Run frontend tests only
cd frontend && npm test

# Compile contracts
cd contracts && npm run compile

# Deploy to Sepolia
./scripts/deploy-sepolia.sh

# Start development servers
npm run dev
```

## Project Structure

```
blockchain-document-verification/
├── contracts/          # Smart contracts (Solidity)
├── backend/           # Node.js API server
├── frontend/          # React web application
├── scripts/           # Deployment scripts
├── docs/             # Documentation
└── .github/          # CI/CD workflows
```

## Getting Help

- Check [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment guide
- See [docs/FREE_SERVICES_SETUP.md](docs/FREE_SERVICES_SETUP.md) for service setup
- Review logs in terminal for error messages
- Check browser console for frontend errors
- Verify contract on Etherscan: https://sepolia.etherscan.io

## Success Checklist

- [ ] All dependencies installed
- [ ] Free service accounts created
- [ ] Environment files configured
- [ ] Smart contracts deployed to Sepolia
- [ ] Backend running on localhost:3001
- [ ] Frontend running on localhost:3000
- [ ] MetaMask connected to Sepolia
- [ ] Test document registered successfully
- [ ] Test document verified successfully

**Congratulations! Your blockchain document verification system is running!** 🎉

## What's Next?

1. Invite team members to test
2. Register real academic documents
3. Deploy to production (Railway + Vercel)
4. Set up monitoring
5. Configure custom domain
6. Plan for mainnet migration

For production deployment, see [DEPLOYMENT.md](DEPLOYMENT.md)
