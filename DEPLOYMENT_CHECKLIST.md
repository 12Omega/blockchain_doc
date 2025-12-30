# Deployment Checklist

Use this checklist to ensure all steps are completed for a successful deployment.

## Pre-Deployment

### Free Service Accounts Setup

- [ ] **Infura/Alchemy Account**
  - [ ] Account created
  - [ ] Project created
  - [ ] Sepolia endpoint URL obtained
  - [ ] Added to `contracts/.env`

- [ ] **MongoDB Atlas**
  - [ ] Account created
  - [ ] Free M0 cluster created
  - [ ] Database user created
  - [ ] IP whitelist configured (0.0.0.0/0 for testing)
  - [ ] Connection string obtained
  - [ ] Added to `backend/.env`

- [ ] **Web3.Storage**
  - [ ] Account created
  - [ ] API token generated
  - [ ] Added to `backend/.env`

- [ ] **Pinata**
  - [ ] Account created
  - [ ] API key and secret obtained
  - [ ] Added to `backend/.env`

- [ ] **NFT.Storage**
  - [ ] Account created
  - [ ] API token generated
  - [ ] Added to `backend/.env`

- [ ] **Testnet Faucet**
  - [ ] MetaMask wallet created
  - [ ] Sepolia ETH obtained (0.1+ ETH)
  - [ ] Private key exported
  - [ ] Added to `contracts/.env` and `backend/.env`

- [ ] **Etherscan** (Optional)
  - [ ] Account created
  - [ ] API key obtained
  - [ ] Added to `contracts/.env`

### Environment Configuration

- [ ] **Contracts Configuration**
  - [ ] `contracts/.env` created from `.env.example`
  - [ ] `SEPOLIA_URL` set
  - [ ] `PRIVATE_KEY` set
  - [ ] `ETHERSCAN_API_KEY` set (optional)
  - [ ] Wallet has sufficient testnet ETH

- [ ] **Backend Configuration**
  - [ ] `backend/.env` created from `.env.example`
  - [ ] `MONGODB_URI` set
  - [ ] `ETHEREUM_RPC_URL` set
  - [ ] `PRIVATE_KEY` set
  - [ ] `WEB3_STORAGE_API_KEY` set
  - [ ] `PINATA_API_KEY` set
  - [ ] `PINATA_SECRET_API_KEY` set
  - [ ] `NFT_STORAGE_API_KEY` set
  - [ ] `JWT_SECRET` generated (32+ characters)
  - [ ] `FRONTEND_URL` set

- [ ] **Frontend Configuration**
  - [ ] `frontend/.env` created from `.env.example`
  - [ ] `REACT_APP_API_URL` set
  - [ ] `REACT_APP_CHAIN_ID` set (11155111 for Sepolia)
  - [ ] `REACT_APP_CHAIN_NAME` set

### Code Preparation

- [ ] All dependencies installed
  - [ ] Root: `npm install`
  - [ ] Contracts: `cd contracts && npm install`
  - [ ] Backend: `cd backend && npm install`
  - [ ] Frontend: `cd frontend && npm install`

- [ ] All tests passing
  - [ ] Contract tests: `cd contracts && npm test`
  - [ ] Backend tests: `cd backend && npm test`
  - [ ] Frontend tests: `cd frontend && npm test`

- [ ] Code committed to git
  - [ ] All changes committed
  - [ ] `.env` files in `.gitignore`
  - [ ] Pushed to GitHub

## Smart Contract Deployment

- [ ] **Compile Contracts**
  - [ ] Run: `cd contracts && npm run compile`
  - [ ] No compilation errors

- [ ] **Run Contract Tests**
  - [ ] Run: `cd contracts && npm test`
  - [ ] All tests passing

- [ ] **Deploy to Sepolia**
  - [ ] Run deployment script: `./scripts/deploy-sepolia.sh` (Linux/Mac) or `scripts\deploy-sepolia.bat` (Windows)
  - [ ] Deployment successful
  - [ ] Contract addresses saved

- [ ] **Record Contract Addresses**
  - [ ] DocumentRegistry address: `_________________`
  - [ ] AccessControl address: `_________________`
  - [ ] Deployment transaction hash: `_________________`

- [ ] **Verify Contracts on Etherscan**
  - [ ] AccessControl verified
  - [ ] DocumentRegistry verified
  - [ ] Verification links saved

- [ ] **Update Configuration Files**
  - [ ] `backend/.env` updated with contract addresses
  - [ ] `frontend/.env` updated with contract addresses

## Backend Deployment

### Option A: Railway

- [ ] **Railway Setup**
  - [ ] Account created at https://railway.app
  - [ ] GitHub repository connected
  - [ ] New project created

- [ ] **Configure Service**
  - [ ] Root directory set to `backend`
  - [ ] Build command: `npm install`
  - [ ] Start command: `npm start`

- [ ] **Environment Variables**
  - [ ] All variables from `backend/.env` added
  - [ ] `NODE_ENV` set to `production`
  - [ ] `FRONTEND_URL` set to Vercel URL (will update later)

- [ ] **Deploy**
  - [ ] Deployment triggered
  - [ ] Deployment successful
  - [ ] Backend URL obtained: `_________________`
  - [ ] Health check passed: `curl https://your-backend.railway.app/health`

### Option B: Render

- [ ] **Render Setup**
  - [ ] Account created at https://render.com
  - [ ] New Web Service created
  - [ ] GitHub repository connected

- [ ] **Configure Service**
  - [ ] Root directory: `backend`
  - [ ] Build command: `npm install`
  - [ ] Start command: `npm start`
  - [ ] Environment variables added

- [ ] **Deploy**
  - [ ] Deployment successful
  - [ ] Backend URL obtained: `_________________`

## Frontend Deployment

### Option A: Vercel

- [ ] **Vercel Setup**
  - [ ] Account created at https://vercel.com
  - [ ] GitHub repository connected
  - [ ] New project created

- [ ] **Configure Project**
  - [ ] Framework preset: Create React App
  - [ ] Root directory: `frontend`
  - [ ] Build command: `npm run build`
  - [ ] Output directory: `build`

- [ ] **Environment Variables**
  - [ ] `REACT_APP_API_URL` set to Railway backend URL
  - [ ] `REACT_APP_CHAIN_ID` set to `11155111`
  - [ ] `REACT_APP_CHAIN_NAME` set to `Sepolia`
  - [ ] `REACT_APP_DOCUMENT_REGISTRY_ADDRESS` set
  - [ ] `REACT_APP_ACCESS_CONTROL_ADDRESS` set

- [ ] **Deploy**
  - [ ] Deployment triggered
  - [ ] Build successful
  - [ ] Frontend URL obtained: `_________________`

### Option B: Netlify

- [ ] **Netlify Setup**
  - [ ] Account created
  - [ ] Site created from GitHub
  - [ ] Build settings configured

- [ ] **Deploy**
  - [ ] Deployment successful
  - [ ] Frontend URL obtained: `_________________`

## Post-Deployment Configuration

- [ ] **Update Backend CORS**
  - [ ] Add Vercel URL to `FRONTEND_URL` in Railway
  - [ ] Redeploy backend
  - [ ] CORS working correctly

- [ ] **Update Frontend API URL**
  - [ ] Verify `REACT_APP_API_URL` points to Railway backend
  - [ ] Redeploy frontend if needed

## Testing

### Smart Contract Testing

- [ ] **Etherscan Verification**
  - [ ] DocumentRegistry visible on Etherscan
  - [ ] AccessControl visible on Etherscan
  - [ ] Contract code verified (green checkmark)
  - [ ] Can read contract functions

### Backend Testing

- [ ] **Health Check**
  - [ ] `GET /health` returns 200 OK
  - [ ] Response: `{"status": "ok"}`

- [ ] **Database Connection**
  - [ ] Backend connects to MongoDB
  - [ ] No connection errors in logs

- [ ] **IPFS Connection**
  - [ ] Web3.Storage accessible
  - [ ] Pinata accessible
  - [ ] NFT.Storage accessible

- [ ] **Blockchain Connection**
  - [ ] Backend connects to Sepolia
  - [ ] Can read contract data
  - [ ] No RPC errors

### Frontend Testing

- [ ] **Page Load**
  - [ ] Frontend loads without errors
  - [ ] No console errors
  - [ ] All assets loading

- [ ] **MetaMask Connection**
  - [ ] Can connect MetaMask
  - [ ] Correct network detected (Sepolia)
  - [ ] Account address displayed

- [ ] **API Connection**
  - [ ] Frontend can reach backend
  - [ ] No CORS errors
  - [ ] API calls working

### End-to-End Testing

- [ ] **Document Registration**
  - [ ] Can upload document
  - [ ] Document hashed correctly
  - [ ] IPFS upload successful
  - [ ] Blockchain transaction successful
  - [ ] QR code generated
  - [ ] Document appears in list

- [ ] **Document Verification**
  - [ ] Can upload document for verification
  - [ ] Hash computed correctly
  - [ ] Blockchain query successful
  - [ ] Verification result correct
  - [ ] Can scan QR code
  - [ ] QR verification works

- [ ] **Access Control**
  - [ ] Role assignment works
  - [ ] Permissions enforced
  - [ ] Unauthorized access blocked

## CI/CD Setup (Optional)

- [ ] **GitHub Secrets**
  - [ ] `SEPOLIA_URL` added
  - [ ] `PRIVATE_KEY` added
  - [ ] `ETHERSCAN_API_KEY` added
  - [ ] `RAILWAY_TOKEN` added
  - [ ] `VERCEL_TOKEN` added
  - [ ] All `REACT_APP_*` variables added

- [ ] **Workflows**
  - [ ] Test workflow runs on PR
  - [ ] Contract deployment workflow works
  - [ ] Backend deployment workflow works
  - [ ] Frontend deployment workflow works

## Monitoring Setup

- [ ] **Railway Monitoring**
  - [ ] Logs accessible
  - [ ] Metrics visible
  - [ ] Alerts configured (optional)

- [ ] **Vercel Monitoring**
  - [ ] Deployment logs accessible
  - [ ] Analytics enabled (optional)

- [ ] **MongoDB Atlas Monitoring**
  - [ ] Storage usage visible
  - [ ] Connection metrics visible
  - [ ] Alerts configured at 80% storage

- [ ] **Etherscan Monitoring**
  - [ ] Can view contract transactions
  - [ ] Transaction history accessible

## Documentation

- [ ] **Contract Addresses Documented**
  - [ ] Addresses saved in `contracts/CONTRACT_ADDRESSES.txt`
  - [ ] Etherscan links documented

- [ ] **Deployment URLs Documented**
  - [ ] Backend URL: `_________________`
  - [ ] Frontend URL: `_________________`

- [ ] **Credentials Secured**
  - [ ] Private keys in password manager
  - [ ] API keys documented securely
  - [ ] MongoDB credentials saved

- [ ] **Team Notified**
  - [ ] Deployment announcement sent
  - [ ] URLs shared with team
  - [ ] Access instructions provided

## Security Checklist

- [ ] **Environment Variables**
  - [ ] No secrets in git repository
  - [ ] `.env` files in `.gitignore`
  - [ ] All secrets in hosting platform env vars

- [ ] **Access Control**
  - [ ] MongoDB IP whitelist configured
  - [ ] Railway/Vercel access restricted
  - [ ] GitHub repository access controlled

- [ ] **HTTPS**
  - [ ] Backend uses HTTPS (automatic on Railway)
  - [ ] Frontend uses HTTPS (automatic on Vercel)
  - [ ] No mixed content warnings

- [ ] **Rate Limiting**
  - [ ] Backend rate limiting enabled
  - [ ] File upload limits configured
  - [ ] API request limits set

## Launch Checklist

- [ ] **Final Testing**
  - [ ] All features tested
  - [ ] No critical bugs
  - [ ] Performance acceptable

- [ ] **User Documentation**
  - [ ] User manual updated
  - [ ] API documentation current
  - [ ] Troubleshooting guide available

- [ ] **Backup Plan**
  - [ ] Database backup configured
  - [ ] Contract addresses backed up
  - [ ] Rollback plan documented

- [ ] **Go Live**
  - [ ] Announcement prepared
  - [ ] Support channels ready
  - [ ] Monitoring active

## Post-Launch

- [ ] **Monitor First 24 Hours**
  - [ ] Check error logs
  - [ ] Monitor transaction success rate
  - [ ] Watch IPFS upload success
  - [ ] Track user registrations

- [ ] **Gather Feedback**
  - [ ] User feedback collected
  - [ ] Issues documented
  - [ ] Improvements planned

- [ ] **Plan Next Steps**
  - [ ] Feature roadmap updated
  - [ ] Production migration planned
  - [ ] Scaling strategy defined

---

## Deployment Summary

**Deployment Date:** `_________________`

**Deployed By:** `_________________`

**Network:** Sepolia Testnet

**Contract Addresses:**
- DocumentRegistry: `_________________`
- AccessControl: `_________________`

**Deployment URLs:**
- Backend: `_________________`
- Frontend: `_________________`

**Status:** ☐ Development ☐ Staging ☐ Production

**Notes:**
```
_________________
_________________
_________________
```

---

## Troubleshooting Reference

If issues arise, check:

1. **Logs**
   - Railway: Project > Deployments > Logs
   - Vercel: Project > Deployments > Build Logs
   - Browser: Developer Console (F12)

2. **Environment Variables**
   - Verify all required variables are set
   - Check for typos in variable names
   - Ensure values are correct

3. **Network Connectivity**
   - Test RPC endpoint: `curl -X POST <RPC_URL> -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'`
   - Test MongoDB: `mongosh "<MONGODB_URI>"`
   - Test backend: `curl <BACKEND_URL>/health`

4. **Documentation**
   - [DEPLOYMENT.md](DEPLOYMENT.md)
   - [docs/FREE_SERVICES_SETUP.md](docs/FREE_SERVICES_SETUP.md)
   - [docs/ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md)

---

**Deployment Complete!** 🎉

Remember to:
- Monitor system health regularly
- Keep dependencies updated
- Backup important data
- Plan for production migration
