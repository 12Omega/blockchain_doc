# Deployment Guide

This guide covers deploying the Academic Document Blockchain Verification System using free services.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Smart Contract Deployment](#smart-contract-deployment)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Post-Deployment Testing](#post-deployment-testing)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)

## Prerequisites

### Required Accounts (All Free)

1. **Ethereum Wallet**
   - Install MetaMask: https://metamask.io
   - Create a new wallet or import existing
   - Save your private key securely (never commit to git!)

2. **MongoDB Atlas** (Free 512MB)
   - Sign up: https://www.mongodb.com/cloud/atlas/register
   - Create a free M0 cluster
   - Whitelist your IP addresses (0.0.0.0/0 for development)
   - Create database user with read/write permissions

3. **IPFS Storage Providers**
   
   **Web3.Storage** (Primary - Unlimited Free)
   - Sign up: https://web3.storage
   - Create API token
   - No storage limits!
   
   **Pinata** (Fallback - 1GB Free)
   - Sign up: https://www.pinata.cloud
   - Get API Key and Secret from dashboard
   
   **NFT.Storage** (Secondary Fallback - Unlimited Free)
   - Sign up: https://nft.storage
   - Create API token

4. **Infura or Alchemy** (Free RPC Access)
   - Infura: https://infura.io (100k requests/day free)
   - Alchemy: https://www.alchemy.com (300M compute units/month free)
   - Create project and get Sepolia endpoint URL

5. **Etherscan** (Optional - for contract verification)
   - Sign up: https://etherscan.io
   - Get API key from account settings

6. **Hosting Services**
   
   **Vercel** (Frontend - Free)
   - Sign up: https://vercel.com
   - Connect GitHub repository
   
   **Railway** (Backend - Free 500 hours/month)
   - Sign up: https://railway.app
   - Connect GitHub repository
   
   Alternative: **Render** (Free 750 hours/month)
   - Sign up: https://render.com

### Required Software

- Node.js v16+ and npm
- Git
- MetaMask browser extension

## Environment Setup

### 1. Clone and Install Dependencies

```bash
# Clone repository
git clone <your-repo-url>
cd blockchain-document-verification

# Install root dependencies
npm install

# Install contract dependencies
cd contracts
npm install
cd ..

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Configure Smart Contracts

Create `contracts/.env` from the example:

```bash
cd contracts
cp .env.example .env
```

Edit `contracts/.env`:

```env
# Get Sepolia URL from Infura or Alchemy
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Your wallet private key (NEVER commit this!)
# Export from MetaMask: Account Details > Export Private Key
PRIVATE_KEY=your_private_key_here

# Optional: For contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 3. Configure Backend

Create `backend/.env`:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
# Server Configuration
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url.vercel.app

# MongoDB Atlas Connection String
# Format: mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/blockchain-documents?retryWrites=true&w=majority

# Blockchain Configuration
ETHEREUM_NETWORK=sepolia
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=your_private_key_here

# Contract addresses (will be filled after deployment)
CONTRACT_ADDRESS_DOCUMENT_REGISTRY=
CONTRACT_ADDRESS_ACCESS_CONTROL=

# IPFS Configuration
WEB3_STORAGE_API_KEY=your_web3_storage_api_key
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key
NFT_STORAGE_API_KEY=your_nft_storage_api_key
IPFS_GATEWAY_URL=https://ipfs.io/ipfs/

# JWT Configuration (generate a strong random string)
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
JWT_EXPIRE=7d

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,doc,docx,jpg,jpeg,png

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging Configuration
LOG_LEVEL=info
```

### 4. Configure Frontend

Create `frontend/.env`:

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
# API Configuration (will be your Railway/Render backend URL)
REACT_APP_API_URL=https://your-backend-url.railway.app

# Blockchain Configuration
REACT_APP_CHAIN_ID=11155111
REACT_APP_CHAIN_NAME=Sepolia

# Contract Addresses (will be filled after deployment)
REACT_APP_DOCUMENT_REGISTRY_ADDRESS=
REACT_APP_ACCESS_CONTROL_ADDRESS=
```

## Smart Contract Deployment

### 1. Get Testnet ETH

You need Sepolia ETH to deploy contracts. Get free testnet ETH from faucets:

**Recommended Faucets:**
- Alchemy Faucet: https://www.alchemy.com/faucets/ethereum-sepolia (0.5 ETH/day)
- Sepolia Faucet: https://sepoliafaucet.com (0.5 ETH/day)
- QuickNode Faucet: https://faucet.quicknode.com/ethereum/sepolia

**Steps:**
1. Copy your wallet address from MetaMask
2. Visit a faucet website
3. Paste your address and request ETH
4. Wait for transaction confirmation (1-2 minutes)
5. Check balance in MetaMask (switch to Sepolia network)

### 2. Deploy Contracts

**Linux/Mac:**
```bash
chmod +x scripts/deploy-sepolia.sh
./scripts/deploy-sepolia.sh
```

**Windows:**
```bash
scripts\deploy-sepolia.bat
```

**Manual Deployment:**
```bash
cd contracts

# Compile contracts
npm run compile

# Run tests
npm test

# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Note the contract addresses from output
# Example output:
# AccessControl deployed to: 0x1234...
# DocumentRegistry deployed to: 0x5678...
```

### 3. Verify Contracts (Optional but Recommended)

```bash
cd contracts

# Verify AccessControl
npx hardhat verify --network sepolia <ACCESS_CONTROL_ADDRESS>

# Verify DocumentRegistry
npx hardhat verify --network sepolia <DOCUMENT_REGISTRY_ADDRESS> <ACCESS_CONTROL_ADDRESS>
```

### 4. Update Configuration Files

After deployment, update the contract addresses:

**backend/.env:**
```env
CONTRACT_ADDRESS_DOCUMENT_REGISTRY=0x5678...
CONTRACT_ADDRESS_ACCESS_CONTROL=0x1234...
```

**frontend/.env:**
```env
REACT_APP_DOCUMENT_REGISTRY_ADDRESS=0x5678...
REACT_APP_ACCESS_CONTROL_ADDRESS=0x1234...
```

## Backend Deployment

### Option 1: Railway (Recommended)

1. **Create Railway Account**
   - Visit https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Select `backend` as root directory

3. **Configure Environment Variables**
   - Go to project settings
   - Add all variables from `backend/.env`
   - Railway provides a PostgreSQL/MongoDB addon if needed

4. **Configure Build Settings**
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`

5. **Deploy**
   - Railway auto-deploys on git push
   - Get your backend URL: `https://your-app.railway.app`

### Option 2: Render

1. **Create Render Account**
   - Visit https://render.com
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New +" > "Web Service"
   - Connect your repository
   - Configure:
     - Name: `blockchain-backend`
     - Root Directory: `backend`
     - Environment: `Node`
     - Build Command: `npm install`
     - Start Command: `npm start`

3. **Add Environment Variables**
   - Go to "Environment" tab
   - Add all variables from `backend/.env`

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Get your backend URL

### Manual Deployment (VPS)

If deploying to your own server:

```bash
# On your server
cd backend

# Install dependencies
npm install --production

# Start with PM2 (process manager)
npm install -g pm2
pm2 start server.js --name blockchain-backend
pm2 save
pm2 startup
```

## Frontend Deployment

### Option 1: Vercel (Recommended)

1. **Create Vercel Account**
   - Visit https://vercel.com
   - Sign up with GitHub

2. **Import Project**
   - Click "Add New" > "Project"
   - Import your GitHub repository
   - Configure:
     - Framework Preset: `Create React App`
     - Root Directory: `frontend`
     - Build Command: `npm run build`
     - Output Directory: `build`

3. **Configure Environment Variables**
   - Add all variables from `frontend/.env`
   - Make sure `REACT_APP_API_URL` points to your Railway backend

4. **Deploy**
   - Click "Deploy"
   - Wait for build (2-5 minutes)
   - Get your frontend URL: `https://your-app.vercel.app`

### Option 2: Netlify

1. **Create Netlify Account**
   - Visit https://netlify.com
   - Sign up with GitHub

2. **Create New Site**
   - Click "Add new site" > "Import an existing project"
   - Choose your repository
   - Configure:
     - Base directory: `frontend`
     - Build command: `npm run build`
     - Publish directory: `frontend/build`

3. **Add Environment Variables**
   - Go to Site settings > Environment variables
   - Add all variables from `frontend/.env`

4. **Deploy**
   - Click "Deploy site"
   - Get your URL

### Update CORS Settings

After deploying frontend, update backend CORS settings:

**backend/server.js** (or wherever CORS is configured):
```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-app.vercel.app',  // Add your Vercel URL
    'https://your-custom-domain.com'  // Add custom domain if any
  ],
  credentials: true
}));
```

Redeploy backend after updating CORS.

## Post-Deployment Testing

### 1. Test Smart Contracts

```bash
# Check contract on Etherscan
https://sepolia.etherscan.io/address/<CONTRACT_ADDRESS>

# Verify contract is verified (green checkmark)
# Check recent transactions
```

### 2. Test Backend API

```bash
# Health check
curl https://your-backend-url.railway.app/health

# Test document registration endpoint
curl -X POST https://your-backend-url.railway.app/api/documents/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"test": "data"}'
```

### 3. Test Frontend

1. Visit your frontend URL
2. Connect MetaMask wallet
3. Switch to Sepolia network
4. Try registering a test document
5. Try verifying a document
6. Check browser console for errors

### 4. End-to-End Test

Complete flow test:
1. Register as issuer
2. Upload a document
3. Wait for blockchain confirmation
4. Download QR code
5. Go to verification portal
6. Scan QR code or upload document
7. Verify authenticity

## Monitoring and Maintenance

### Monitor Application Health

**Backend Monitoring:**
- Railway/Render provides built-in logs and metrics
- Check error logs regularly
- Monitor API response times

**Frontend Monitoring:**
- Vercel provides analytics
- Check build logs for errors
- Monitor user traffic

**Blockchain Monitoring:**
- Check Etherscan for transaction status
- Monitor gas usage
- Track contract interactions

### Database Maintenance

**MongoDB Atlas:**
- Monitor storage usage (512MB limit on free tier)
- Set up alerts for 80% storage usage
- Regularly backup data
- Clean old verification logs

### IPFS Monitoring

**Check Provider Status:**
```bash
# Test Web3.Storage
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.web3.storage/user/uploads

# Test Pinata
curl -H "pinata_api_key: YOUR_KEY" https://api.pinata.cloud/data/testAuthentication
```

### Cost Monitoring

**Free Tier Limits:**
- Railway: 500 hours/month (sleeps after inactivity)
- Vercel: Unlimited bandwidth
- MongoDB Atlas: 512MB storage
- IPFS: Unlimited (Web3.Storage, NFT.Storage)
- Sepolia: Free testnet

**When to Upgrade:**
- Backend needs 24/7 uptime: Upgrade Railway ($5/month)
- Storage > 512MB: Upgrade MongoDB ($9/month)
- Production ready: Deploy to Polygon mainnet (~$0.01/transaction)

### Security Checklist

- [ ] Private keys stored securely (not in code)
- [ ] Environment variables set correctly
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Input validation working
- [ ] HTTPS enabled (automatic on Vercel/Railway)
- [ ] MongoDB IP whitelist configured
- [ ] JWT secret is strong and unique
- [ ] File upload limits enforced
- [ ] Error messages don't leak sensitive info

### Backup Strategy

**Smart Contracts:**
- Contracts are immutable on blockchain
- Keep deployment scripts and addresses documented
- Backup contract ABIs

**Database:**
```bash
# MongoDB Atlas automatic backups (paid feature)
# Manual backup:
mongodump --uri="mongodb+srv://..." --out=backup-$(date +%Y%m%d)
```

**IPFS:**
- Files are permanent on IPFS
- Keep CIDs documented
- Consider pinning important files on multiple providers

### Troubleshooting

**Common Issues:**

1. **Contract deployment fails**
   - Check you have enough Sepolia ETH
   - Verify RPC URL is correct
   - Check private key is valid

2. **Backend can't connect to MongoDB**
   - Verify connection string
   - Check IP whitelist (use 0.0.0.0/0 for testing)
   - Verify database user permissions

3. **IPFS upload fails**
   - Check API keys are valid
   - Verify network connectivity
   - Try fallback provider

4. **Frontend can't connect to backend**
   - Check CORS settings
   - Verify API URL in frontend .env
   - Check backend is running

5. **MetaMask transaction fails**
   - Ensure on Sepolia network
   - Check you have enough ETH for gas
   - Verify contract addresses are correct

## CI/CD Pipeline

See `.github/workflows/` directory for automated deployment pipelines.

## Support

For issues and questions:
- Check logs in Railway/Render dashboard
- Review Etherscan for transaction details
- Check browser console for frontend errors
- Review backend logs for API errors

## Next Steps

After successful deployment:
1. Test all features thoroughly
2. Invite beta users
3. Monitor system performance
4. Gather feedback
5. Plan for production migration (Polygon mainnet)
6. Consider custom domain setup
7. Implement additional monitoring
8. Set up automated backups

## Production Deployment

When ready for production:
1. Deploy contracts to Polygon mainnet
2. Update RPC URLs to mainnet
3. Fund deployer wallet with MATIC
4. Update all environment variables
5. Enable MongoDB backups
6. Set up monitoring and alerts
7. Configure custom domain
8. Implement rate limiting
9. Enable DDoS protection
10. Conduct security audit

Estimated production cost: ~$2-5/month for 100 documents/month
