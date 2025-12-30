# 🎯 What You Need Right Now - Quick Guide

## TL;DR - Get These 5 Things:

1. **MongoDB Local** → Install locally (100% Free, No Credit Card)
2. **Infura API Key** → https://infura.io/register (Free)
3. **Web3.Storage API Key** → https://web3.storage/ (Free, Unlimited)
4. **MetaMask Wallet** → https://metamask.io/download/ (Free)
5. **Testnet ETH** → https://sepoliafaucet.com/ (Free)

**Total Cost: $0** | **Time Needed: 30 minutes** | **No Credit Card Required**

---

## 🚀 Step-by-Step (30 Minutes Total)

### Step 1: MongoDB Local (10 minutes)

**Windows:**
1. Download: https://www.mongodb.com/try/download/community
2. Choose "MSI" installer, click Download
3. Run installer → Choose "Complete" → Install as Service ✅
4. Open Command Prompt and test: `mongosh`
5. You should see: `Connecting to: mongodb://127.0.0.1:27017`

**Mac:**
```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
mongosh  # Test connection
```

**Linux:**
```bash
# See LOCAL_MONGODB_SETUP.md for detailed instructions
sudo apt-get install mongodb-org
sudo systemctl start mongod
mongosh  # Test connection
```

**Your connection string:**
```
mongodb://localhost:27017/blockchain-documents
```

**📖 Detailed Guide:** See `LOCAL_MONGODB_SETUP.md` for troubleshooting

**Alternative - Docker (if you have Docker):**
```bash
docker run -d --name mongodb -p 27017:27017 mongo:7.0
```

---

### Step 2: Infura (5 minutes)
1. Go to https://infura.io/register
2. Sign up with email
3. Create new project: "Document Verification"
4. Copy the Project ID
5. Find Sepolia endpoint

**You'll get:**
```
https://sepolia.infura.io/v3/abc123def456
```

---

### Step 3: Web3.Storage (3 minutes)
1. Go to https://web3.storage/
2. Sign up with email or GitHub
3. Go to Account → Create API Token
4. Name it "Document Storage"
5. Copy the token (starts with eyJ...)

**You'll get:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRo...
```

---

### Step 4: MetaMask Wallet (5 minutes)
1. Install MetaMask: https://metamask.io/download/
2. Create new wallet
3. **SAVE YOUR 12-WORD PHRASE** (write it down!)
4. Set a password
5. Click account → Account Details → Export Private Key
6. Copy your private key (64 characters)

**You'll get:**
```
0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

⚠️ **NEVER share this with anyone!**

---

### Step 5: Get Testnet ETH (5 minutes)
1. Copy your wallet address from MetaMask (starts with 0x)
2. Go to https://sepoliafaucet.com/
3. Paste your address
4. Click "Send Me ETH"
5. Wait 1-2 minutes

**You'll get:** 0.5 Sepolia ETH (free testnet money)

---

### Step 6: Generate JWT Secret (2 minutes)
Open terminal and run:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**You'll get:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

---

### Step 7: Configure Your Project (5 minutes)

Create `backend/.env` file:
```env
# Copy this and fill in YOUR values

PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Paste your MongoDB connection string here
# For local MongoDB (default):
MONGODB_URI=mongodb://localhost:27017/blockchain-documents

# For Docker MongoDB (if using Docker):
# MONGODB_URI=mongodb://localhost:27017/blockchain-documents

# Paste your Infura URL here
ETHEREUM_NETWORK=sepolia
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Paste your MetaMask private key here
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Leave these empty for now (will fill after deploying contracts)
CONTRACT_ADDRESS_DOCUMENT_REGISTRY=
CONTRACT_ADDRESS_ACCESS_CONTROL=

# Paste your Web3.Storage API key here
WEB3_STORAGE_API_KEY=YOUR_WEB3_STORAGE_TOKEN

# Optional: Add Pinata as backup
PINATA_API_KEY=
PINATA_SECRET_API_KEY=

IPFS_GATEWAY_URL=https://ipfs.io/ipfs/

# Paste your generated JWT secret here
JWT_SECRET=YOUR_GENERATED_JWT_SECRET

JWT_EXPIRE=7d
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,doc,docx,jpg,jpeg,png
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

Create `contracts/.env` file:
```env
# Paste your Infura URL here
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Paste your MetaMask private key here
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Optional: For contract verification
ETHERSCAN_API_KEY=

REPORT_GAS=false
```

---

## ✅ Quick Verification

After setting up, run these commands:

```bash
# 1. Install dependencies
cd backend && npm install
cd ../contracts && npm install

# 2. Test smart contracts
cd contracts
npx hardhat test
# Should see: 79 passing ✅

# 3. Deploy contracts
npx hardhat run scripts/deploy.js --network sepolia
# Copy the contract addresses!

# 4. Update backend/.env with contract addresses
# CONTRACT_ADDRESS_DOCUMENT_REGISTRY=0x...
# CONTRACT_ADDRESS_ACCESS_CONTROL=0x...

# 5. Start backend
cd ../backend
npm run dev

# 6. Check health
curl http://localhost:3001/health
# Should see: {"status":"OK"} ✅
```

---

## 🎉 You're Done When You See:

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

## 🆘 Common Issues

### "Cannot connect to MongoDB"
→ Make sure MongoDB is running:
```bash
# Windows: net start MongoDB
# Mac: brew services start mongodb-community@7.0
# Linux: sudo systemctl start mongod
# Docker: docker start mongodb
```
→ See `LOCAL_MONGODB_SETUP.md` for detailed troubleshooting

### "mongod: command not found"
→ MongoDB not in PATH. Add to PATH or use full path
→ See `LOCAL_MONGODB_SETUP.md` for instructions

### "insufficient funds for gas"
→ Get more testnet ETH from faucet: https://sepoliafaucet.com/

### "Invalid API key"
→ Double-check you copied the full key (no spaces)

### "Contract deployment failed"
→ Make sure you have testnet ETH in your wallet

---

## 📚 Full Documentation

- **MongoDB Setup:** See `LOCAL_MONGODB_SETUP.md` ⭐ NEW
- **Detailed Setup:** See `CREDENTIALS_SETUP_GUIDE.md`
- **Deployment Steps:** See `DEPLOYMENT_READY_CHECKLIST.md`
- **What Was Fixed:** See `FIXES_APPLIED.md`
- **Test Results:** See `TEST_SUMMARY_INDIVIDUAL.md`

---

## 💬 Need Help?

1. Check the error message carefully
2. Review the relevant guide above
3. Make sure all API keys are correct
4. Verify you have testnet ETH
5. Check MongoDB connection string format

---

## 🎯 Your Checklist

- [ ] MongoDB installed locally and running
- [ ] Can connect with `mongosh` command
- [ ] Infura API key obtained
- [ ] Web3.Storage API key obtained
- [ ] MetaMask wallet created
- [ ] Private key exported
- [ ] Testnet ETH received
- [ ] JWT secret generated
- [ ] backend/.env created and filled
- [ ] contracts/.env created and filled
- [ ] Dependencies installed
- [ ] Smart contracts deployed
- [ ] Contract addresses updated in backend/.env
- [ ] Backend server started
- [ ] Health check passing

**When all checked → You're ready to go! 🚀**
