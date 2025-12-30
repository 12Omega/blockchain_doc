# 🎯 My Setup Progress

## ✅ Completed Steps

- [x] MongoDB installed (C:\Program Files\MongoDB\Server\8.2)
- [x] MongoDB service running
- [x] Created backend/.env file
- [x] Created contracts/.env file

---

## 📝 Next Steps - Get Your API Keys

### Step 1: Infura API Key (5 minutes)
**What:** Ethereum blockchain access
**Cost:** Free (100,000 requests/day)

1. Go to: https://infura.io/register
2. Sign up with your email
3. Verify your email
4. Click "Create New Project"
5. Name: "Document Verification"
6. Copy your **Project ID**

**Your Infura URL will be:**
```
https://sepolia.infura.io/v3/YOUR_PROJECT_ID
```

**Update these files:**
- `backend/.env` → Replace `ETHEREUM_RPC_URL=REPLACE_WITH_YOUR_INFURA_URL`
- `contracts/.env` → Replace `SEPOLIA_URL=REPLACE_WITH_YOUR_INFURA_URL`

---

### Step 2: Web3.Storage API Key (3 minutes)
**What:** IPFS file storage (unlimited free)
**Cost:** Free (unlimited storage)

1. Go to: https://web3.storage/
2. Sign up with email or GitHub
3. Go to "Account" → "Create API Token"
4. Name: "Document Storage"
5. Copy the token (starts with `eyJ...`)

**Update this file:**
- `backend/.env` → Replace `WEB3_STORAGE_API_KEY=REPLACE_WITH_YOUR_WEB3_STORAGE_KEY`

---

### Step 3: MetaMask Wallet (5 minutes)
**What:** Ethereum wallet for deploying contracts
**Cost:** Free

1. Install MetaMask: https://metamask.io/download/
2. Click "Create a Wallet"
3. Set a password
4. **IMPORTANT:** Write down your 12-word Secret Recovery Phrase on paper!
5. Confirm the phrase
6. Click on your account icon → "Account Details"
7. Click "Export Private Key"
8. Enter your password
9. Copy your private key (64 hex characters starting with 0x)

**⚠️ SECURITY WARNING:**
- NEVER share your private key with anyone
- NEVER commit it to git
- Keep your 12-word phrase safe (write it down, don't store digitally)

**Update these files:**
- `backend/.env` → Replace `PRIVATE_KEY=REPLACE_WITH_YOUR_PRIVATE_KEY`
- `contracts/.env` → Replace `PRIVATE_KEY=REPLACE_WITH_YOUR_PRIVATE_KEY`

---

### Step 4: Get Testnet ETH (5 minutes)
**What:** Free test Ethereum for deploying contracts
**Cost:** Free

1. Copy your wallet address from MetaMask (starts with 0x, at the top)
2. Go to: https://sepoliafaucet.com/
3. Paste your wallet address
4. Click "Send Me ETH"
5. Wait 1-2 minutes
6. Check MetaMask - you should see 0.5 SepoliaETH

**Alternative faucets if first one doesn't work:**
- https://www.infura.io/faucet/sepolia (requires Infura account)
- https://faucet.quicknode.com/ethereum/sepolia

---

### Step 5: Generate JWT Secret (1 minute)
**What:** Secret key for user authentication
**Cost:** Free

Run this command in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output (long string of letters and numbers)

**Update this file:**
- `backend/.env` → Replace `JWT_SECRET=REPLACE_WITH_GENERATED_SECRET`

---

## 🔍 Verification Checklist

Before proceeding, make sure you have:

- [ ] Infura Project ID obtained
- [ ] Web3.Storage API token obtained
- [ ] MetaMask wallet created
- [ ] 12-word phrase written down and stored safely
- [ ] Private key exported from MetaMask
- [ ] Testnet ETH received (check MetaMask)
- [ ] JWT secret generated
- [ ] All values updated in `backend/.env`
- [ ] All values updated in `contracts/.env`

---

## 📋 Your .env Files Should Look Like:

### backend/.env
```env
MONGODB_URI=mongodb://localhost:27017/blockchain-documents
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/abc123def456...
PRIVATE_KEY=0x1234567890abcdef...
WEB3_STORAGE_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...
```

### contracts/.env
```env
SEPOLIA_URL=https://sepolia.infura.io/v3/abc123def456...
PRIVATE_KEY=0x1234567890abcdef...
```

---

## ⏭️ After Getting All API Keys

Once you've completed all the steps above and updated your .env files, let me know and we'll proceed to:

1. Install dependencies
2. Test MongoDB connection
3. Deploy smart contracts
4. Start the backend server
5. Test the system

---

## 🆘 Need Help?

- **Infura issues:** Check your email for verification
- **Web3.Storage issues:** Try signing up with GitHub instead
- **MetaMask issues:** Make sure you're using Chrome/Firefox/Brave
- **Testnet ETH issues:** Try alternative faucets listed above
- **MongoDB issues:** Service is already running ✅

---

**Current Status:** Ready to get API keys! 🚀

**Estimated Time:** 15-20 minutes to get all keys
