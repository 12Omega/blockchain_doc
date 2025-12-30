# Deployment Guide - Academic Document Blockchain Verification System

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Smart Contract Deployment](#smart-contract-deployment)
5. [Backend Deployment](#backend-deployment)
6. [Frontend Deployment](#frontend-deployment)
7. [Post-Deployment Configuration](#post-deployment-configuration)
8. [Testing Deployment](#testing-deployment)
9. [Production Deployment](#production-deployment)
10. [Monitoring and Maintenance](#monitoring-and-maintenance)
11. [Troubleshooting](#troubleshooting)

## Overview

This guide provides step-by-step instructions for deploying the Academic Document Blockchain Verification System to production or testing environments.

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Users (Web Browsers)                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Frontend (Vercel/Netlify)                       │
│              - React Application                             │
│              - Static Assets                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API (Railway/Render)                    │
│              - Node.js/Express                               │
│              - REST API Endpoints                            │
└─────┬──────────────────┬──────────────────┬────────────────┘
      │                  │                  │
      ▼                  ▼                  ▼
┌──────────┐    ┌─────────────┐    ┌──────────────┐
│ MongoDB  │    │   IPFS      │    │  Blockchain  │
│ Atlas    │    │ Web3.Storage│    │   Sepolia/   │
│          │    │   Pinata    │    │   Polygon    │
└──────────┘    └─────────────┘    └──────────────┘
```

### Deployment Options

**Testing/Development:**
- Blockchain: Sepolia Testnet (free)
- Backend: Railway Free Tier
- Frontend: Vercel Free Tier
- Database: MongoDB Atlas Free Tier
- Storage: Web3.Storage (free)

**Production:**
- Blockchain: Polygon Mainnet (low cost)
- Backend: Railway Hobby Plan ($5/month)
- Frontend: Vercel Pro ($20/month)
- Database: MongoDB Atlas M10 ($0.08/hour)
- Storage: Web3.Storage + Pinata

## Prerequisites

### Required Accounts

1. **GitHub Account**
   - For code repository
   - For CI/CD integration
   - Sign up: https://github.com

2. **Blockchain RPC Provider**
   - Infura (recommended): https://infura.io
   - OR Alchemy: https://alchemy.com
   - Free tier sufficient for testing

3. **MongoDB Atlas**
   - Database hosting
   - Sign up: https://mongodb.com/cloud/atlas
   - Free tier: 512MB storage

4. **IPFS Storage Providers**
   - Web3.Storage: https://web3.storage (unlimited free)
   - Pinata: https://pinata.cloud (1GB free)
   - NFT.Storage: https://nft.storage (unlimited free)

5. **Hosting Platforms**
   - Vercel: https://vercel.com (frontend)
   - Railway: https://railway.app (backend)
   - OR Render: https://render.com (alternative)

6. **MetaMask Wallet**
   - For contract deployment
   - Install: https://metamask.io
   - Fund with testnet ETH

### Required Software

**Local Development:**
```bash
Node.js: v16.x or higher
npm: v8.x or higher
Git: v2.x or higher
```

**Verification:**
```bash
node --version  # Should show v16.x or higher
npm --version   # Should show v8.x or higher
git --version   # Should show v2.x or higher
```

### Required Files

Ensure you have these files in your repository:
- `contracts/` - Smart contracts
- `backend/` - Backend API
- `frontend/` - React frontend
- `.github/workflows/` - CI/CD configuration
- `package.json` - Dependencies
- `README.md` - Documentation

## Environment Setup

### 1. Clone Repository

```bash
# Clone your repository
git clone https://github.com/your-org/blockchain-document-verification.git
cd blockchain-document-verification

# Install dependencies
npm install
cd contracts && npm install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Configure Environment Variables

#### Contracts Environment (.env)

Create `contracts/.env`:

```env
# Blockchain Network
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
POLYGON_MUMBAI_URL=https://polygon-mumbai.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# Deployment Wallet
PRIVATE_KEY=your_wallet_private_key_here

# Contract Verification
ETHERSCAN_API_KEY=your_etherscan_api_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here

# Gas Configuration
GAS_PRICE=20
GAS_LIMIT=3000000
```

**How to get values:**

1. **SEPOLIA_URL:**
   - Sign up at https://infura.io
   - Create new project
   - Copy Sepolia endpoint URL

2. **PRIVATE_KEY:**
   - Open MetaMask
   - Click account menu → Account Details → Export Private Key
   - Enter password
   - Copy private key (NEVER share this!)

3. **ETHERSCAN_API_KEY:**
   - Sign up at https://etherscan.io
   - Go to API Keys section
   - Create new API key

#### Backend Environment (.env)

Create `backend/.env`:

```env
# Server Configuration
NODE_ENV=production
PORT=5000
API_URL=https://your-backend.railway.app

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/blockchain-documents?retryWrites=true&w=majority

# Blockchain
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
ETHEREUM_NETWORK=sepolia
DOCUMENT_REGISTRY_ADDRESS=0x... # Set after deployment
ACCESS_CONTROL_ADDRESS=0x... # Set after deployment

# IPFS Storage
WEB3_STORAGE_API_KEY=your_web3_storage_key
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret
NFT_STORAGE_API_KEY=your_nft_storage_key
IPFS_GATEWAY_URL=https://ipfs.io/ipfs/

# Security
JWT_SECRET=your_random_jwt_secret_here_min_32_chars
ENCRYPTION_KEY=your_random_encryption_key_32_bytes
SESSION_SECRET=your_random_session_secret

# CORS
CORS_ORIGIN=https://your-frontend.vercel.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

**How to get values:**

1. **MONGODB_URI:**
   - Sign up at MongoDB Atlas
   - Create cluster (M0 Free tier)
   - Click "Connect" → "Connect your application"
   - Copy connection string
   - Replace `<username>` and `<password>`

2. **WEB3_STORAGE_API_KEY:**
   - Sign up at https://web3.storage
   - Create API token
   - Copy token

3. **PINATA_API_KEY:**
   - Sign up at https://pinata.cloud
   - Go to API Keys
   - Create new key
   - Copy API Key and Secret

4. **JWT_SECRET:**
   ```bash
   # Generate random secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

#### Frontend Environment (.env)

Create `frontend/.env`:

```env
# API Configuration
REACT_APP_API_URL=https://your-backend.railway.app

# Blockchain Configuration
REACT_APP_CHAIN_ID=11155111
REACT_APP_CHAIN_NAME=Sepolia
REACT_APP_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
REACT_APP_EXPLORER_URL=https://sepolia.etherscan.io

# Smart Contracts
REACT_APP_DOCUMENT_REGISTRY_ADDRESS=0x... # Set after deployment
REACT_APP_ACCESS_CONTROL_ADDRESS=0x... # Set after deployment

# Features
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_ERROR_TRACKING=false

# Environment
REACT_APP_ENV=production
```

### 3. Fund Deployment Wallet

For testnet deployment:

```bash
# 1. Copy your wallet address from MetaMask
# 2. Visit faucets:
#    - https://sepoliafaucet.com
#    - https://www.alchemy.com/faucets/ethereum-sepolia
# 3. Request 0.5 ETH (enough for deployment)
# 4. Wait 1-2 minutes for ETH to arrive
# 5. Verify balance in MetaMask
```

For mainnet deployment:
- Purchase ETH or MATIC from exchange
- Transfer to deployment wallet
- Ensure sufficient balance for gas fees

## Smart Contract Deployment

### 1. Compile Contracts

```bash
cd contracts

# Compile contracts
npx hardhat compile

# Expected output:
# Compiled 5 Solidity files successfully
```

### 2. Run Tests

```bash
# Run all tests
npm test

# Run specific test
npx hardhat test test/DocumentRegistry.test.js

# Run with gas reporting
REPORT_GAS=true npm test
```

### 3. Deploy to Testnet (Sepolia)

```bash
# Deploy contracts
npx hardhat run scripts/deploy.js --network sepolia

# Expected output:
# Deploying contracts to Sepolia...
# AccessControl deployed to: 0x123abc...
# DocumentRegistry deployed to: 0x456def...
# Deployment complete!
```

**Save the contract addresses!** You'll need them for backend and frontend configuration.

### 4. Verify Contracts on Etherscan

```bash
# Verify AccessControl
npx hardhat verify --network sepolia 0x123abc... # AccessControl address

# Verify DocumentRegistry
npx hardhat verify --network sepolia 0x456def... 0x123abc... # DocumentRegistry address, AccessControl address

# Expected output:
# Successfully verified contract on Etherscan
```

### 5. Update Configuration

Update contract addresses in:

1. **Backend `.env`:**
   ```env
   DOCUMENT_REGISTRY_ADDRESS=0x456def...
   ACCESS_CONTROL_ADDRESS=0x123abc...
   ```

2. **Frontend `.env`:**
   ```env
   REACT_APP_DOCUMENT_REGISTRY_ADDRESS=0x456def...
   REACT_APP_ACCESS_CONTROL_ADDRESS=0x123abc...
   ```

3. **Copy ABIs:**
   ```bash
   # Copy contract ABIs to backend
   cp contracts/artifacts/contracts/DocumentRegistry.sol/DocumentRegistry.json backend/contracts/
   cp contracts/artifacts/contracts/AccessControl.sol/AccessControl.json backend/contracts/
   ```

## Backend Deployment

### Option A: Deploy to Railway

#### 1. Create Railway Account

1. Visit https://railway.app
2. Sign up with GitHub
3. Authorize Railway to access your repository

#### 2. Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository
4. Railway detects Node.js project automatically

#### 3. Configure Service

1. **Root Directory:**
   - Click service settings
   - Set Root Directory: `backend`

2. **Build Command:**
   ```
   npm install
   ```

3. **Start Command:**
   ```
   npm start
   ```

4. **Environment Variables:**
   - Click "Variables" tab
   - Click "Raw Editor"
   - Paste all variables from `backend/.env`
   - Click "Save"

#### 4. Deploy

1. Railway automatically deploys
2. Wait 2-5 minutes for deployment
3. Check logs for errors
4. Get deployment URL from "Settings" → "Domains"

#### 5. Add Custom Domain (Optional)

1. Click "Settings" → "Domains"
2. Click "Add Domain"
3. Enter your domain: `api.yourdomain.com`
4. Add CNAME record to your DNS:
   ```
   CNAME api.yourdomain.com → your-app.railway.app
   ```

### Option B: Deploy to Render

#### 1. Create Render Account

1. Visit https://render.com
2. Sign up with GitHub

#### 2. Create Web Service

1. Click "New" → "Web Service"
2. Connect GitHub repository
3. Configure:
   ```
   Name: blockchain-docs-api
   Environment: Node
   Region: Choose closest to users
   Branch: main
   Root Directory: backend
   Build Command: npm install
   Start Command: npm start
   ```

#### 3. Add Environment Variables

1. Click "Environment"
2. Add all variables from `backend/.env`
3. Click "Save"

#### 4. Deploy

1. Click "Create Web Service"
2. Render builds and deploys
3. Wait 5-10 minutes
4. Get URL from dashboard

### Verify Backend Deployment

```bash
# Test health endpoint
curl https://your-backend.railway.app/api/health

# Expected response:
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "healthy",
    "blockchain": "healthy",
    "ipfs": "healthy"
  }
}
```

## Frontend Deployment

### Option A: Deploy to Vercel

#### 1. Create Vercel Account

1. Visit https://vercel.com
2. Sign up with GitHub
3. Authorize Vercel

#### 2. Import Project

1. Click "Add New" → "Project"
2. Import your GitHub repository
3. Vercel detects React app automatically

#### 3. Configure Build Settings

1. **Framework Preset:** Create React App
2. **Root Directory:** `frontend`
3. **Build Command:** `npm run build`
4. **Output Directory:** `build`
5. **Install Command:** `npm install`

#### 4. Add Environment Variables

1. Click "Environment Variables"
2. Add all variables from `frontend/.env`
3. Important variables:
   ```
   REACT_APP_API_URL=https://your-backend.railway.app
   REACT_APP_DOCUMENT_REGISTRY_ADDRESS=0x456def...
   REACT_APP_ACCESS_CONTROL_ADDRESS=0x123abc...
   REACT_APP_CHAIN_ID=11155111
   ```

#### 5. Deploy

1. Click "Deploy"
2. Wait 2-5 minutes
3. Vercel provides URL: `https://your-app.vercel.app`

#### 6. Add Custom Domain (Optional)

1. Go to project settings
2. Click "Domains"
3. Add your domain: `www.yourdomain.com`
4. Follow DNS configuration instructions
5. Vercel automatically provisions SSL certificate

### Option B: Deploy to Netlify

#### 1. Create Netlify Account

1. Visit https://netlify.com
2. Sign up with GitHub

#### 2. Create New Site

1. Click "Add new site" → "Import an existing project"
2. Choose GitHub
3. Select repository

#### 3. Configure Build

1. **Base directory:** `frontend`
2. **Build command:** `npm run build`
3. **Publish directory:** `frontend/build`

#### 4. Add Environment Variables

1. Go to "Site settings" → "Environment variables"
2. Add all variables from `frontend/.env`

#### 5. Deploy

1. Click "Deploy site"
2. Wait for build to complete
3. Get URL from dashboard

### Verify Frontend Deployment

1. Visit your frontend URL
2. Check console for errors (F12)
3. Try connecting MetaMask
4. Verify API calls work
5. Test document upload (if you have issuer role)

## Post-Deployment Configuration

### 1. Update CORS Settings

In `backend/server.js`, update CORS origin:

```javascript
const corsOptions = {
  origin: [
    'https://your-frontend.vercel.app',
    'https://www.yourdomain.com'
  ],
  credentials: true
};

app.use(cors(corsOptions));
```

Redeploy backend after changes.

### 2. Configure MongoDB Indexes

```bash
# Connect to MongoDB
mongosh "mongodb+srv://cluster.mongodb.net/blockchain-documents" --username admin

# Create indexes
db.documents.createIndex({ documentHash: 1 }, { unique: true })
db.documents.createIndex({ owner: 1 })
db.documents.createIndex({ issuer: 1 })
db.documents.createIndex({ createdAt: -1 })
db.verificationLogs.createIndex({ documentHash: 1 })
db.verificationLogs.createIndex({ timestamp: -1 })
db.users.createIndex({ walletAddress: 1 }, { unique: true })
db.users.createIndex({ email: 1 }, { unique: true })
```

### 3. Set Up Admin Account

```bash
# Use the admin script
cd backend
node scripts/create-admin.js

# Or manually in MongoDB
db.users.insertOne({
  walletAddress: "0xYourAdminWalletAddress",
  email: "admin@yourinstitution.edu",
  name: "System Administrator",
  role: "admin",
  isVerified: true,
  createdAt: new Date()
})
```

### 4. Assign Issuer Roles

On blockchain:

```bash
cd contracts
npx hardhat run scripts/assign-roles.js --network sepolia
```

Or use the admin dashboard after deployment.

### 5. Test End-to-End Flow

1. **Connect Wallet:**
   - Visit frontend
   - Click "Connect Wallet"
   - Sign authentication message

2. **Upload Document (as Issuer):**
   - Navigate to "Upload Document"
   - Select test PDF
   - Fill in metadata
   - Submit and confirm transaction

3. **Verify Document:**
   - Go to verification portal
   - Upload same document
   - Verify it shows as authentic

4. **Check Logs:**
   - Backend logs should show all operations
   - MongoDB should have document record
   - Blockchain should have transaction

## Production Deployment

### Differences from Testing

**Blockchain:**
- Use Polygon Mainnet instead of Sepolia
- Real ETH/MATIC required for gas fees
- Higher security requirements

**Configuration:**
```env
# Backend .env for production
ETHEREUM_NETWORK=polygon
ETHEREUM_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
DOCUMENT_REGISTRY_ADDRESS=0x... # Mainnet address
ACCESS_CONTROL_ADDRESS=0x... # Mainnet address

# Frontend .env for production
REACT_APP_CHAIN_ID=137
REACT_APP_CHAIN_NAME=Polygon
REACT_APP_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
```

### Production Checklist

- [ ] Smart contracts audited
- [ ] Security testing completed
- [ ] Load testing performed
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Error tracking enabled (Sentry)
- [ ] Rate limiting configured
- [ ] SSL certificates active
- [ ] Custom domains configured
- [ ] Admin accounts created
- [ ] User documentation published
- [ ] Support channels established

### Deploy to Production

```bash
# 1. Deploy contracts to mainnet
cd contracts
npx hardhat run scripts/deploy.js --network polygon

# 2. Verify contracts
npx hardhat verify --network polygon 0xContractAddress...

# 3. Update environment variables
# Update all .env files with mainnet addresses

# 4. Deploy backend
# Push to main branch (triggers Railway deployment)
git push origin main

# 5. Deploy frontend
# Push to main branch (triggers Vercel deployment)
git push origin main

# 6. Verify deployment
# Test all functionality on production URLs
```

## Monitoring and Maintenance

### Set Up Monitoring

#### 1. Application Monitoring

**Railway/Render:**
- Built-in metrics dashboard
- CPU, memory, network usage
- Request logs
- Error logs

**Custom Monitoring:**
```javascript
// backend/utils/monitoring.js
const monitoring = {
  logRequest: (req, res, next) => {
    console.log(`${req.method} ${req.path} - ${res.statusCode}`);
    next();
  },
  
  logError: (error) => {
    console.error('Error:', error.message);
    // Send to error tracking service
  }
};
```

#### 2. Blockchain Monitoring

Monitor contract events:

```javascript
// backend/services/blockchainMonitoring.js
const contract = new ethers.Contract(address, abi, provider);

contract.on('DocumentRegistered', (hash, issuer, owner) => {
  console.log('New document registered:', hash);
  // Send notification, update dashboard, etc.
});
```

#### 3. Database Monitoring

MongoDB Atlas provides:
- Performance metrics
- Query analysis
- Storage usage
- Connection monitoring

Set up alerts for:
- High CPU usage (>80%)
- Storage approaching limit (>80%)
- Slow queries (>1000ms)
- Connection errors

#### 4. IPFS Monitoring

```javascript
// backend/services/ipfsMonitoring.js
async function checkIPFSHealth() {
  const providers = ['web3.storage', 'pinata', 'nft.storage'];
  
  for (const provider of providers) {
    try {
      const response = await testUpload(provider);
      console.log(`${provider}: OK`);
    } catch (error) {
      console.error(`${provider}: FAILED`);
      // Send alert
    }
  }
}

// Run every 5 minutes
setInterval(checkIPFSHealth, 5 * 60 * 1000);
```

### Backup Strategy

#### 1. Database Backups

MongoDB Atlas automatic backups:
- Continuous backups (point-in-time recovery)
- Daily snapshots
- Retention: 7 days (free tier)

Manual backup:
```bash
# Export database
mongodump --uri="mongodb+srv://..." --out=./backup

# Import database
mongorestore --uri="mongodb+srv://..." ./backup
```

#### 2. Smart Contract Backups

Contracts are immutable, but backup:
- Contract source code
- Deployment addresses
- ABI files
- Deployment scripts

```bash
# Create backup
mkdir -p backups/contracts
cp -r contracts/contracts backups/contracts/
cp -r contracts/artifacts backups/contracts/
echo "DOCUMENT_REGISTRY=0x..." > backups/contracts/addresses.txt
```

#### 3. IPFS Backups

IPFS is distributed, but for critical documents:
- Pin to multiple providers
- Keep local copies
- Use Filecoin for long-term storage

### Maintenance Tasks

#### Daily
- [ ] Check error logs
- [ ] Monitor system health
- [ ] Review verification statistics
- [ ] Check for failed transactions

#### Weekly
- [ ] Review performance metrics
- [ ] Check storage usage
- [ ] Update dependencies (if needed)
- [ ] Review user feedback

#### Monthly
- [ ] Security audit
- [ ] Performance optimization
- [ ] Database cleanup
- [ ] Cost analysis
- [ ] Backup verification

## Troubleshooting

### Deployment Fails

**Problem:** Build fails during deployment

**Solutions:**

1. **Check Logs:**
   ```bash
   # Railway
   railway logs
   
   # Render
   # View logs in dashboard
   
   # Vercel
   vercel logs
   ```

2. **Common Issues:**
   - Missing environment variables
   - Incorrect Node.js version
   - Dependency conflicts
   - Build timeout

3. **Fix:**
   ```bash
   # Verify Node version
   node --version
   
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   
   # Test build locally
   npm run build
   ```

### Contract Deployment Fails

**Problem:** Smart contract deployment fails

**Solutions:**

1. **Insufficient Gas:**
   ```bash
   # Check wallet balance
   # Get more ETH from faucet
   # Increase gas limit in hardhat.config.js
   ```

2. **Network Issues:**
   ```bash
   # Verify RPC URL is correct
   # Try different RPC provider
   # Check network status
   ```

3. **Contract Errors:**
   ```bash
   # Run tests first
   npm test
   
   # Check for compilation errors
   npx hardhat compile
   ```

### Backend Not Connecting to Database

**Problem:** MongoDB connection fails

**Solutions:**

1. **Check Connection String:**
   ```env
   # Verify format
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
   ```

2. **IP Whitelist:**
   - Go to MongoDB Atlas
   - Network Access
   - Add IP: 0.0.0.0/0 (allow all)

3. **Credentials:**
   - Verify username and password
   - Check special characters are URL-encoded

### Frontend Can't Connect to Backend

**Problem:** API calls fail with CORS errors

**Solutions:**

1. **Update CORS:**
   ```javascript
   // backend/server.js
   const corsOptions = {
     origin: 'https://your-frontend.vercel.app',
     credentials: true
   };
   ```

2. **Check API URL:**
   ```env
   # frontend/.env
   REACT_APP_API_URL=https://your-backend.railway.app
   ```

3. **Verify Backend is Running:**
   ```bash
   curl https://your-backend.railway.app/api/health
   ```

### MetaMask Connection Issues

**Problem:** Users can't connect MetaMask

**Solutions:**

1. **Network Configuration:**
   - Verify chain ID matches
   - Check RPC URL is accessible
   - Ensure network is added to MetaMask

2. **Frontend Configuration:**
   ```env
   REACT_APP_CHAIN_ID=11155111
   REACT_APP_RPC_URL=https://sepolia.infura.io/v3/...
   ```

3. **User Instructions:**
   - Provide clear network switching instructions
   - Add network automatically via code
   - Show helpful error messages

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Accounts created (MongoDB, IPFS, hosting)
- [ ] Wallet funded with gas fees
- [ ] Documentation updated

### Smart Contracts
- [ ] Contracts compiled successfully
- [ ] Tests passing
- [ ] Deployed to testnet
- [ ] Verified on Etherscan
- [ ] Addresses saved

### Backend
- [ ] Environment variables set
- [ ] Database connected
- [ ] IPFS providers configured
- [ ] Deployed to hosting platform
- [ ] Health check passing
- [ ] Logs accessible

### Frontend
- [ ] Environment variables set
- [ ] Contract addresses configured
- [ ] API URL set
- [ ] Deployed to hosting platform
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active

### Post-Deployment
- [ ] End-to-end testing completed
- [ ] Admin account created
- [ ] Monitoring configured
- [ ] Backups configured
- [ ] Documentation published
- [ ] Support channels ready

---

**Document Version:** 1.0  
**Last Updated:** November 27, 2024  
**Next Review:** May 27, 2025

For support with deployment, contact: devops@blockchain-docs.com
