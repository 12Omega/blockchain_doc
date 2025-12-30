# ⚡ Quick Start - 100% Local (No Cloud, No Credit Card)

## 🎯 Goal: Get Your System Running in 30 Minutes

---

## Step 1: Install MongoDB Locally (10 min)

### Windows (Easiest)
```cmd
1. Download: https://www.mongodb.com/try/download/community
2. Choose "MSI" installer
3. Run installer → "Complete" → Check "Install as Service"
4. Done! MongoDB auto-starts
```

Test it:
```cmd
mongosh
# Should connect to: mongodb://127.0.0.1:27017
```

### Mac
```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
mongosh  # Test
```

### Linux
```bash
# Ubuntu/Debian
sudo apt-get install mongodb-org
sudo systemctl start mongod
mongosh  # Test
```

### Docker (Any OS)
```bash
docker run -d --name mongodb -p 27017:27017 mongo:7.0
docker exec -it mongodb mongosh  # Test
```

**✅ Success:** You see `test>` prompt in mongosh

---

## Step 2: Get Free API Keys (15 min)

### A. Infura (Ethereum Access)
1. Go to: https://infura.io/register
2. Sign up with email
3. Create project: "Document Verification"
4. Copy Project ID
5. Your URL: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`

### B. Web3.Storage (File Storage)
1. Go to: https://web3.storage/
2. Sign up with email
3. Account → Create API Token
4. Copy token (starts with `eyJ...`)

### C. MetaMask Wallet
1. Install: https://metamask.io/download/
2. Create wallet → Save 12-word phrase!
3. Account Details → Export Private Key
4. Copy private key (starts with `0x`)

### D. Get Testnet ETH
1. Copy wallet address from MetaMask
2. Go to: https://sepoliafaucet.com/
3. Paste address → Request ETH
4. Wait 1-2 minutes

### E. Generate JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Step 3: Configure Project (5 min)

Create `backend/.env`:
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Local MongoDB (no username/password needed)
MONGODB_URI=mongodb://localhost:27017/blockchain-documents

# Your Infura URL
ETHEREUM_NETWORK=sepolia
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Your MetaMask private key
PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# Leave empty for now
CONTRACT_ADDRESS_DOCUMENT_REGISTRY=
CONTRACT_ADDRESS_ACCESS_CONTROL=

# Your Web3.Storage token
WEB3_STORAGE_API_KEY=YOUR_TOKEN

IPFS_GATEWAY_URL=https://ipfs.io/ipfs/

# Your generated JWT secret
JWT_SECRET=YOUR_GENERATED_SECRET

JWT_EXPIRE=7d
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,doc,docx,jpg,jpeg,png
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

Create `contracts/.env`:
```env
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=0xYOUR_PRIVATE_KEY
ETHERSCAN_API_KEY=
REPORT_GAS=false
```

---

## Step 4: Deploy & Run (10 min)

```bash
# Install dependencies
cd backend && npm install
cd ../contracts && npm install

# Test contracts
cd contracts
npx hardhat test
# Should see: ✓ 79 passing

# Deploy contracts
npx hardhat run scripts/deploy.js --network sepolia
# COPY THE CONTRACT ADDRESSES!

# Update backend/.env with addresses:
# CONTRACT_ADDRESS_DOCUMENT_REGISTRY=0x...
# CONTRACT_ADDRESS_ACCESS_CONTROL=0x...

# Start backend
cd ../backend
npm run dev

# Test health check
curl http://localhost:3001/health
```

---

## ✅ Success Checklist

- [ ] MongoDB running locally (`mongosh` works)
- [ ] Infura API key obtained
- [ ] Web3.Storage API key obtained
- [ ] MetaMask wallet created
- [ ] Testnet ETH received
- [ ] JWT secret generated
- [ ] `.env` files created
- [ ] Dependencies installed
- [ ] Contracts deployed
- [ ] Backend started
- [ ] Health check returns `{"status":"OK"}`

---

## 🆘 Quick Fixes

### MongoDB won't start
```bash
# Windows
net start MongoDB

# Mac
brew services start mongodb-community@7.0

# Linux
sudo systemctl start mongod

# Docker
docker start mongodb
```

### Can't connect to MongoDB
```bash
# Check if running
# Windows: tasklist | findstr mongod
# Mac/Linux: ps aux | grep mongod

# Try connecting
mongosh mongodb://localhost:27017
```

### Contract deployment fails
```bash
# Check testnet ETH balance
# Go to: https://sepolia.etherscan.io/
# Enter your wallet address
# Should show > 0.1 ETH

# Get more ETH
# https://sepoliafaucet.com/
```

### Backend won't start
```bash
# Check MongoDB is running
mongosh

# Check .env file exists
ls backend/.env

# Check contract addresses are set
cat backend/.env | grep CONTRACT_ADDRESS
```

---

## 📊 What You Get

### 100% Free Services
- ✅ MongoDB: Unlimited local storage
- ✅ Infura: 100,000 requests/day
- ✅ Web3.Storage: Unlimited IPFS storage
- ✅ Testnet ETH: Free from faucets
- ✅ All tools: Open source

### No Credit Card Required
- ✅ No payment info needed
- ✅ No trial periods
- ✅ No automatic charges
- ✅ No hidden costs

---

## 🚀 Next Steps

Once everything is running:

1. **Test Authentication:**
   - Open MetaMask
   - Connect to your app
   - Sign a message

2. **Upload a Document:**
   - Use Postman or frontend
   - Upload a PDF
   - Get document hash

3. **Verify on Blockchain:**
   - Check Sepolia Etherscan
   - See your transaction
   - Verify document hash

---

## 📚 Need More Help?

- **MongoDB Issues:** See `LOCAL_MONGODB_SETUP.md`
- **Full Setup Guide:** See `WHAT_YOU_NEED_NOW.md`
- **API Keys Details:** See `CREDENTIALS_SETUP_GUIDE.md`
- **Deployment:** See `DEPLOYMENT_READY_CHECKLIST.md`

---

## 💡 Pro Tips

1. **Keep MongoDB running:** It's a service, starts automatically
2. **Save your private key:** Store it securely, never share
3. **Backup your 12-word phrase:** Write it down, keep it safe
4. **Use testnet first:** Don't deploy to mainnet until tested
5. **Monitor gas costs:** Check Etherscan for transaction fees

---

**Total Time:** 30-40 minutes
**Total Cost:** $0.00
**Credit Card:** Not needed
**Cloud Services:** Optional

**You're ready to build! 🎉**
