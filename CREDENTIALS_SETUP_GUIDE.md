# 🔐 Credentials & API Keys Setup Guide

## Overview
This guide will help you obtain all necessary API keys and credentials to run your blockchain document verification system.

---

## 📋 Required Services Checklist

### ✅ Essential (Must Have)
- [ ] MongoDB Database
- [ ] Ethereum RPC Provider (Infura/Alchemy)
- [ ] IPFS Storage Provider (Web3.Storage/Pinata/NFT.Storage)
- [ ] JWT Secret Key
- [ ] Ethereum Wallet with Private Key

### 🔧 Optional (Recommended)
- [ ] Etherscan API Key (for contract verification)
- [ ] Coinmarketcap API Key (for gas cost reporting)

---

## 1️⃣ MongoDB Database

### Option A: MongoDB Atlas (Cloud - Recommended)
**Free Tier:** 512MB storage, shared cluster

1. **Sign up:** https://www.mongodb.com/cloud/atlas/register
2. **Create a cluster:**
   - Click "Build a Database"
   - Choose "FREE" tier (M0 Sandbox)
   - Select a cloud provider and region (closest to you)
   - Click "Create Cluster"

3. **Create database user:**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Username: `your_username`
   - Password: Generate a strong password
   - Database User Privileges: "Read and write to any database"
   - Click "Add User"

4. **Whitelist IP address:**
   - Go to "Network Access"
   - Click "Add IP Address"
   - For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
   - For production: Add your server's specific IP
   - Click "Confirm"

5. **Get connection string:**
   - Go to "Database" → "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with `blockchain-documents`

**Your MongoDB URI:**
```
mongodb+srv://your_username:your_password@cluster0.xxxxx.mongodb.net/blockchain-documents?retryWrites=true&w=majority
```

### Option B: Local MongoDB
```bash
# Install MongoDB locally
# Windows: Download from https://www.mongodb.com/try/download/community
# Mac: brew install mongodb-community
# Linux: sudo apt-get install mongodb

# Start MongoDB
mongod --dbpath /path/to/data/directory

# Your MongoDB URI:
mongodb://localhost:27017/blockchain-documents
```

---

## 2️⃣ Ethereum RPC Provider

### Option A: Infura (Recommended)
**Free Tier:** 100,000 requests/day

1. **Sign up:** https://infura.io/register
2. **Create a project:**
   - Click "Create New Project"
   - Name: "Blockchain Document Verification"
   - Click "Create"

3. **Get your API keys:**
   - Select your project
   - Copy the "Project ID"
   - Under "Endpoints", find Sepolia testnet URL

**Your Sepolia URL:**
```
https://sepolia.infura.io/v3/YOUR_PROJECT_ID
```

### Option B: Alchemy
**Free Tier:** 300M compute units/month

1. **Sign up:** https://www.alchemy.com/
2. **Create app:**
   - Click "Create App"
   - Name: "Document Verification"
   - Chain: Ethereum
   - Network: Sepolia
   - Click "Create App"

3. **Get API key:**
   - Click "View Key"
   - Copy the HTTPS URL

**Your Sepolia URL:**
```
https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

---

## 3️⃣ IPFS Storage Providers

### Option A: Web3.Storage (Recommended - Unlimited Free)
**Free Tier:** Unlimited storage

1. **Sign up:** https://web3.storage/
2. **Create API token:**
   - Go to "Account" → "Create an API Token"
   - Name: "Document Storage"
   - Click "Create"
   - Copy the token (starts with `eyJ...`)

**Your API Key:**
```
WEB3_STORAGE_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Option B: Pinata (1GB Free)
**Free Tier:** 1GB storage, 100 requests/month

1. **Sign up:** https://www.pinata.cloud/
2. **Create API key:**
   - Go to "API Keys" → "New Key"
   - Enable "pinFileToIPFS" and "pinJSONToIPFS"
   - Name: "Document Verification"
   - Click "Create Key"
   - Copy both API Key and API Secret

**Your API Keys:**
```
PINATA_API_KEY=your_api_key_here
PINATA_SECRET_API_KEY=your_secret_key_here
```

### Option C: NFT.Storage (Unlimited Free)
**Free Tier:** Unlimited storage

1. **Sign up:** https://nft.storage/
2. **Create API key:**
   - Go to "API Keys" → "New Key"
   - Name: "Document Storage"
   - Click "Create"
   - Copy the key

**Your API Key:**
```
NFT_STORAGE_API_KEY=your_api_key_here
```

---

## 4️⃣ Ethereum Wallet & Private Key

### Create a New Wallet (Recommended for Development)

1. **Install MetaMask:** https://metamask.io/download/
2. **Create new wallet:**
   - Click "Create a Wallet"
   - Set a password
   - Save your Secret Recovery Phrase (12 words) - KEEP THIS SAFE!
   - Confirm the phrase

3. **Export Private Key:**
   - Click on account icon → "Account Details"
   - Click "Export Private Key"
   - Enter your password
   - Copy the private key (64 hex characters)

**⚠️ SECURITY WARNING:**
- NEVER share your private key
- NEVER commit it to git
- Use a separate wallet for development/testing
- For production, use a hardware wallet or secure key management service

**Your Private Key:**
```
PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

### Get Testnet ETH (Sepolia)

You need testnet ETH to deploy contracts and pay gas fees:

1. **Sepolia Faucet Options:**
   - https://sepoliafaucet.com/ (0.5 ETH/day, requires Alchemy account)
   - https://www.infura.io/faucet/sepolia (0.5 ETH/day, requires Infura account)
   - https://faucet.quicknode.com/ethereum/sepolia (0.1 ETH/day)

2. **Copy your wallet address** from MetaMask
3. **Paste it into the faucet** and request testnet ETH
4. **Wait 1-2 minutes** for the transaction to complete

---

## 5️⃣ JWT Secret Key

Generate a strong random secret for JWT token signing:

### Option A: Online Generator
Visit: https://randomkeygen.com/
Copy a "CodeIgniter Encryption Key" (256-bit)

### Option B: Command Line
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# OpenSSL
openssl rand -hex 64

# Python
python -c "import secrets; print(secrets.token_hex(64))"
```

**Your JWT Secret:**
```
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

---

## 6️⃣ Etherscan API Key (Optional)

For verifying your smart contracts on Etherscan:

1. **Sign up:** https://etherscan.io/register
2. **Create API key:**
   - Go to "API-KEYs" → "Add"
   - App Name: "Document Verification"
   - Click "Create New API Key"
   - Copy the API key

**Your API Key:**
```
ETHERSCAN_API_KEY=ABC123DEF456GHI789JKL012MNO345PQR678
```

---

## 7️⃣ Coinmarketcap API Key (Optional)

For USD gas cost reporting in tests:

1. **Sign up:** https://coinmarketcap.com/api/
2. **Get free API key:**
   - Choose "Basic" plan (free)
   - Fill in the form
   - Verify your email
   - Copy your API key from dashboard

**Your API Key:**
```
COINMARKETCAP_API_KEY=12345678-1234-1234-1234-123456789012
```

---

## 📝 Configuration Files Setup

### Step 1: Create Backend .env File

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your credentials:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database Configuration
MONGODB_URI=mongodb+srv://your_username:your_password@cluster0.xxxxx.mongodb.net/blockchain-documents

# Blockchain Configuration
ETHEREUM_NETWORK=sepolia
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
CONTRACT_ADDRESS_DOCUMENT_REGISTRY=
CONTRACT_ADDRESS_ACCESS_CONTROL=

# IPFS Configuration
WEB3_STORAGE_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key
NFT_STORAGE_API_KEY=your_nft_storage_api_key
IPFS_GATEWAY_URL=https://ipfs.io/ipfs/

# JWT Configuration
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
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

### Step 2: Create Contracts .env File

```bash
cd contracts
cp .env.example .env
```

Edit `contracts/.env` with your credentials:

```env
# Sepolia Testnet RPC URL
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID

# Deployer Wallet Private Key
PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Etherscan API Key (Optional)
ETHERSCAN_API_KEY=ABC123DEF456GHI789JKL012MNO345PQR678

# Gas Reporter (Optional)
REPORT_GAS=false
COINMARKETCAP_API_KEY=12345678-1234-1234-1234-123456789012
```

### Step 3: Create Root .env File (Optional)

```bash
cp .env.example .env
```

---

## 🚀 Quick Start After Setup

### 1. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install contract dependencies
cd ../contracts && npm install

# Install frontend dependencies (if applicable)
cd ../frontend && npm install
```

### 2. Deploy Smart Contracts
```bash
cd contracts
npx hardhat compile
npx hardhat test  # Verify all tests pass
npx hardhat run scripts/deploy.js --network sepolia
```

**Copy the deployed contract addresses** and update your `backend/.env`:
```env
CONTRACT_ADDRESS_DOCUMENT_REGISTRY=0x1234...
CONTRACT_ADDRESS_ACCESS_CONTROL=0x5678...
```

### 3. Start Backend Server
```bash
cd backend
npm run dev
```

### 4. Verify Setup
Visit: http://localhost:3001/health

You should see:
```json
{
  "status": "OK",
  "timestamp": "2025-11-28T...",
  "services": {
    "database": { "status": "healthy" },
    "cache": { "status": "healthy" },
    "blockchain": { "status": "healthy" }
  }
}
```

---

## 🔒 Security Best Practices

### Development
- ✅ Use separate wallets for dev/test/prod
- ✅ Use testnet for development
- ✅ Keep .env files in .gitignore
- ✅ Use environment-specific .env files

### Production
- ✅ Use hardware wallet or AWS KMS for private keys
- ✅ Enable MongoDB authentication
- ✅ Use strong JWT secrets (64+ characters)
- ✅ Enable rate limiting
- ✅ Use HTTPS only
- ✅ Whitelist specific IPs in MongoDB
- ✅ Rotate API keys regularly
- ✅ Monitor API usage and set alerts

---

## 🆘 Troubleshooting

### MongoDB Connection Issues
```
Error: MongoServerError: bad auth
```
**Solution:** Check username/password in connection string, ensure user has correct permissions

### Infura/Alchemy Rate Limits
```
Error: Too Many Requests
```
**Solution:** Upgrade to paid tier or use multiple providers with fallback

### IPFS Upload Failures
```
Error: Failed to pin file
```
**Solution:** Check API key, verify account limits, try fallback provider

### Contract Deployment Fails
```
Error: insufficient funds for gas
```
**Solution:** Get more testnet ETH from faucets

### JWT Token Issues
```
Error: invalid signature
```
**Solution:** Ensure JWT_SECRET is the same across all instances

---

## 📞 Support Resources

- **MongoDB:** https://www.mongodb.com/docs/
- **Infura:** https://docs.infura.io/
- **Alchemy:** https://docs.alchemy.com/
- **Web3.Storage:** https://web3.storage/docs/
- **Pinata:** https://docs.pinata.cloud/
- **Etherscan:** https://docs.etherscan.io/
- **Hardhat:** https://hardhat.org/docs

---

## ✅ Checklist Before Going Live

- [ ] All API keys obtained and configured
- [ ] MongoDB database created and accessible
- [ ] Testnet ETH obtained for deployment
- [ ] Smart contracts deployed to testnet
- [ ] Contract addresses updated in backend .env
- [ ] Backend health check returns OK
- [ ] All tests passing (npm test)
- [ ] IPFS upload/download working
- [ ] Authentication flow working
- [ ] Document upload/verification working
- [ ] Security measures enabled (rate limiting, validation)
- [ ] Monitoring and logging configured
- [ ] Backup strategy in place

---

**Need help?** Check the main README.md or create an issue in the repository.
