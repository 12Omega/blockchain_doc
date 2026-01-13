Free Services Setup Guide

Hey there! This guide walks you through setting up all the free services needed for the Academic Document Blockchain Verification System.

Table of Contents

1. [Blockchain RPC Provider](#1-blockchain-rpc-provider)
2. [MongoDB Atlas](#2-mongodb-atlas)
3. [IPFS Storage Providers](#3-ipfs-storage-providers)
4. [Testnet Faucets](#4-testnet-faucets)
5. [Hosting Services](#5-hosting-services)
6. [Optional Services](#6-optional-services)

---

1. Blockchain RPC Provider

You need an RPC endpoint to interact with the blockchain. Choose one:

Option A: Infura (Recommended)

Free Tier: 100,000 requests/day

1. Visit https://infura.io
2. Sign up for free account
3. Create new project
4. Select "Web3 API"
5. Copy your Sepolia endpoint URL
   - Format: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`
6. Add to `contracts/.env`:
   ```env
   SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
   ```

Option B: Alchemy

Free Tier: 300M compute units/month

1. Visit https://www.alchemy.com
2. Sign up for free account
3. Create new app
4. Select "Ethereum" and "Sepolia"
5. Copy your HTTPS endpoint
   - Format: `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`
6. Add to `contracts/.env`:
   ```env
   SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
   ```

---

2. MongoDB Atlas

Free Tier: 512MB storage, 500 connections

Setup Steps

1. Create Account
   - Visit https://www.mongodb.com/cloud/atlas/register
   - Sign up with email or Google

2. Create Cluster
   - Click "Build a Database"
   - Select "M0 FREE" tier
   - Choose cloud provider (AWS recommended)
   - Select region closest to your users
   - Cluster name: `blockchain-docs` (or any name)
   - Click "Create"

3. Configure Security
   - Database Access:
     - Click "Database Access" in left menu
     - Click "Add New Database User"
     - Authentication Method: Password
     - Username: `admin` (or your choice)
     - Password: Generate secure password (save it!)
     - Database User Privileges: "Read and write to any database"
     - Click "Add User"
   
   - Network Access:
     - Click "Network Access" in left menu
     - Click "Add IP Address"
     - For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
     - For production: Add specific IP addresses
     - Click "Confirm"

4. Get Connection String
   - Click "Database" in left menu
   - Click "Connect" on your cluster
   - Select "Connect your application"
   - Driver: Node.js, Version: 4.1 or later
   - Copy connection string
   - Format: `mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority`
   - Replace `<username>` and `<password>` with your credentials
   - Add database name: `mongodb+srv://username:password@cluster.mongodb.net/blockchain-documents?retryWrites=true&w=majority`

5. Add to Setting Things Up
   ```env
   backend/.env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/blockchain-documents?retryWrites=true&w=majority
   ```

Tips
- Enable automatic backups (paid feature, but good for production)
- Monitor storage usage in Atlas dashboard
- Set up alerts at 80% storage capacity
- Consider upgrading to M10 ($0.08/hour) for production

---

3. IPFS Storage Providers

Set up all three for automatic fallback:

A. Web3.Storage (Primary - Unlimited Free)

Free Tier: Unlimited storage and bandwidth

1. Visit https://web3.storage
2. Sign up with email or GitHub
3. Click "Create an API Token"
4. Name: `blockchain-docs-production`
5. Copy the token (starts with `eyJ...`)
6. Add to `backend/.env`:
   ```env
   WEB3_STORAGE_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

Features:
- Unlimited storage
- Unlimited bandwidth
- Content addressing (CID)
- Automatic IPFS pinning
- No credit card required

B. Pinata (Fallback - 1GB Free)

Free Tier: 1GB storage, unlimited bandwidth

1. Visit https://www.pinata.cloud
2. Sign up for free account
3. Go to "API Keys" in dashboard
4. Click "New Key"
5. Permissions: Select "pinFileToIPFS" and "pinJSONToIPFS"
6. Key Name: `blockchain-docs`
7. Copy API Key and API Secret
8. Add to `backend/.env`:
   ```env
   PINATA_API_KEY=your_api_key_here
   PINATA_SECRET_API_KEY=your_secret_key_here
   ```

Features:
- 1GB free storage
- Unlimited bandwidth
- Pin management dashboard
- Dedicated gateways (paid)

C. NFT.Storage (Secondary Fallback - Unlimited Free)

Free Tier: Unlimited storage for NFT data

1. Visit https://nft.storage
2. Sign up with email or GitHub
3. Click "API Keys"
4. Click "New Key"
5. Name: `blockchain-docs`
6. Copy the token
7. Add to `backend/.env`:
   ```env
   NFT_STORAGE_API_KEY=your_token_here
   ```

Features:
- Unlimited storage
- Designed for NFT metadata
- Free forever
- Filecoin backing

IPFS Gateway

For retrieving files, use public gateways:

```env
backend/.env
IPFS_GATEWAY_URL=https://ipfs.io/ipfs/
```

Alternative gateways:
- `https://gateway.pinata.cloud/ipfs/`
- `https://cloudflare-ipfs.com/ipfs/`
- `https://dweb.link/ipfs/`

---

4. Testnet Faucets

Get free testnet ETH for deploying contracts:

Sepolia Testnet Faucets

You need ~0.1 ETH for deployment

1. Alchemy Sepolia Faucet (Recommended)
   - URL: https://www.alchemy.com/faucets/ethereum-sepolia
   - Amount: 0.5 ETH/day
   - What You Need: Alchemy account
   - Steps:
     1. Sign in to Alchemy
     2. Enter your wallet address
     3. Complete captcha
     4. Receive ETH in 1-2 minutes

2. Sepolia Faucet
   - URL: https://sepoliafaucet.com
   - Amount: 0.5 ETH/day
   - What You Need: Alchemy account
   - Similar process to above

3. QuickNode Faucet
   - URL: https://faucet.quicknode.com/ethereum/sepolia
   - Amount: 0.05 ETH/day
   - What You Need: Twitter account
   - Steps:
     1. Connect Twitter
     2. Tweet about QuickNode
     3. Enter wallet address
     4. Receive ETH

4. Infura Faucet
   - URL: https://www.infura.io/faucet/sepolia
   - Amount: 0.5 ETH/day
   - What You Need: Infura account

Mumbai Testnet Faucets (Polygon)

If using Mumbai instead of Sepolia:

1. Polygon Faucet
   - URL: https://faucet.polygon.technology
   - Amount: 0.5 MATIC
   - What You Need: None
   - Steps:
     1. Select "Mumbai"
     2. Enter wallet address
     3. Complete captcha
     4. Receive MATIC

2. Alchemy Mumbai Faucet
   - URL: https://www.alchemy.com/faucets/polygon-mumbai
   - Amount: 0.5 MATIC/day
   - What You Need: Alchemy account

Tips
- Request from multiple faucets if needed
- Save some ETH for future transactions
- Testnet ETH has no real value
- If faucets are dry, try again in 24 hours

---

5. Hosting Services

A. Vercel (Frontend Hosting)

Free Tier: Unlimited bandwidth, 100GB/month

1. Create Account
   - Visit https://vercel.com
   - Sign up with GitHub

2. Import Project
   - Click "Add New" > "Project"
   - Select your GitHub repository
   - Framework Preset: "Create React App"
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `build`

3. Configure Environment Variables
   - Go to project settings
   - Click "Environment Variables"
   - Add all variables from `frontend/.env`:
     ```
     REACT_APP_API_URL=https://your-backend.railway.app
     REACT_APP_CHAIN_ID=11155111
     REACT_APP_CHAIN_NAME=Sepolia
     REACT_APP_DOCUMENT_REGISTRY_ADDRESS=0x...
     REACT_APP_ACCESS_CONTROL_ADDRESS=0x...
     ```

4. Deploy
   - Click "Deploy"
   - Wait 2-5 minutes
   - Get your URL: `https://your-app.vercel.app`

Features:
- Automatic deployments on git push
- Preview deployments for PRs
- Custom domains (free)
- Edge network (fast globally)
- Analytics (paid)

B. Railway (Backend Hosting)

Free Tier: 500 hours/month, 512MB RAM, 1GB storage

1. Create Account
   - Visit https://railway.app
   - Sign up with GitHub

2. Create New Project
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. Configure Service
   - Click "Add Service" > "GitHub Repo"
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`

4. Add Environment Variables
   - Click on service
   - Go to "Variables" tab
   - Add all variables from `backend/.env`
   - Railway provides a MongoDB plugin if needed

5. Deploy
   - Railway auto-deploys
   - Get your URL from "Settings" > "Domains"
   - Format: `https://your-app.railway.app`

Features:
- Automatic deployments
- Built-in databases (paid)
- Logs and metrics
- Custom domains
- Sleeps after inactivity (free tier)

Alternative: Render

Free Tier: 750 hours/month, 512MB RAM

1. Visit https://render.com
2. Sign up with GitHub
3. Create "Web Service"
4. Connect repository
5. Configure:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Add environment variables
7. Deploy

Note: Render free tier sleeps after 15 minutes of inactivity

---

6. Optional Services

A. Etherscan API (Contract Verification)

Free Tier: 5 requests/second

1. Visit https://etherscan.io
2. Sign up for account
3. Go to "API Keys"
4. Create new API key
5. Add to `contracts/.env`:
   ```env
   ETHERSCAN_API_KEY=your_api_key_here
   ```

Benefits:
- Verify contracts on Etherscan
- Users can read contract code
- Increases trust and transparency

B. GitHub Actions (CI/CD)

Free Tier: 2,000 minutes/month for private repos, unlimited for public

1. Already configured in `.github/workflows/`
2. Add secrets to GitHub repository:
   - Go to Settings > Secrets and variables > Actions
   - Add secrets:
     - `SEPOLIA_URL`
     - `PRIVATE_KEY`
     - `ETHERSCAN_API_KEY`
     - `RAILWAY_TOKEN` (from Railway dashboard)
     - `VERCEL_TOKEN` (from Vercel settings)
     - All `REACT_APP_*` variables

C. Sentry (Error Tracking)

Free Tier: 5,000 events/month

1. Visit https://sentry.io
2. Sign up for free
3. Create new project
4. Get DSN
5. Add to backend and frontend

---

Setting Things Up Checklist

After setting up all services, verify your Setting Things Up:

Contracts Setting Things Up
- [ ] `contracts/.env` created
- [ ] `SEPOLIA_URL` set (Infura or Alchemy)
- [ ] `PRIVATE_KEY` set (from MetaMask)
- [ ] `ETHERSCAN_API_KEY` set (optional)
- [ ] Wallet funded with testnet ETH

Backend Setting Things Up
- [ ] `backend/.env` created
- [ ] `MONGODB_URI` set (Atlas connection string)
- [ ] `ETHEREUM_RPC_URL` set
- [ ] `WEB3_STORAGE_API_KEY` set
- [ ] `PINATA_API_KEY` and `PINATA_SECRET_API_KEY` set
- [ ] `NFT_STORAGE_API_KEY` set
- [ ] `JWT_SECRET` set (generate random string)
- [ ] Contract addresses set (after deployment)

Frontend Setting Things Up
- [ ] `frontend/.env` created
- [ ] `REACT_APP_API_URL` set (Railway backend URL)
- [ ] `REACT_APP_CHAIN_ID` set (11155111 for Sepolia)
- [ ] Contract addresses set (after deployment)

Hosting Setting Things Up
- [ ] Vercel project created and connected
- [ ] Railway project created and connected
- [ ] Environment variables added to both
- [ ] CORS configured in backend for frontend URL

---

Cost Summary

| Service | Free Tier | Upgrade Cost |
|---------|-----------|--------------|
| Infura/Alchemy | 100k-300M req/month | $49-199/month |
| MongoDB Atlas | 512MB | $9/month (2GB) |
| Web3.Storage | Unlimited | Free forever |
| Pinata | 1GB | $20/month (100GB) |
| NFT.Storage | Unlimited | Free forever |
| Vercel | Unlimited | $20/month (Pro) |
| Railway | 500 hours/month | $5/month (Hobby) |
| Sepolia Testnet | Free | N/A (testnet) |
| Total | $0/month | ~$50/month (if all upgraded) |

For production on Polygon mainnet:
- Transaction cost: ~$0.01 per document
- 100 documents/month: ~$1-2/month
- 1000 documents/month: ~$10-20/month

---

Troubleshooting

MongoDB Connection Issues
- Check IP whitelist (use 0.0.0.0/0 for testing)
- Verify username and password
- Ensure database name is in connection string
- Check if cluster is active

IPFS Upload Failures
- Verify API keys are correct
- Check API key permissions
- Try different provider
- Check network connectivity

Blockchain Transaction Failures
- Ensure wallet has enough testnet ETH
- Verify RPC URL is correct
- Check network (Sepolia vs Mumbai)
- Increase gas limit if needed

Deployment Failures
- Check build logs in Vercel/Railway
- Verify all environment variables are set
- Check Node.js version compatibility
- Review error messages in logs

---

Next Steps

After setting up all services:

1. Deploy smart contracts: `./scripts/deploy-sepolia.sh`
2. Update contract addresses in backend and frontend
3. Deploy backend to Railway
4. Deploy frontend to Vercel
5. Test end-to-end flow
6. Monitor logs and metrics

For detailed deployment instructions, see [DEPLOYMENT.md](../DEPLOYMENT.md)

