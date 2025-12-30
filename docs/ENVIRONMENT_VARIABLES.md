# Environment Variables Reference

Complete reference for all environment variables used in the project.

## Table of Contents

1. [Smart Contracts](#smart-contracts)
2. [Backend](#backend)
3. [Frontend](#frontend)
4. [GitHub Actions Secrets](#github-actions-secrets)

---

## Smart Contracts

File: `contracts/.env`

### Blockchain Configuration

| Variable | Required | Description | Example | Where to Get |
|----------|----------|-------------|---------|--------------|
| `SEPOLIA_URL` | Yes | Sepolia testnet RPC endpoint | `https://sepolia.infura.io/v3/abc123` | [Infura](https://infura.io) or [Alchemy](https://alchemy.com) |
| `MUMBAI_URL` | No | Mumbai testnet RPC endpoint | `https://polygon-mumbai.g.alchemy.com/v2/abc123` | [Alchemy](https://alchemy.com) |
| `PRIVATE_KEY` | Yes | Deployer wallet private key | `0x1234...` | MetaMask: Account Details > Export Private Key |
| `ETHERSCAN_API_KEY` | No | Etherscan API key for verification | `ABC123XYZ` | [Etherscan](https://etherscan.io/myapikey) |
| `POLYGONSCAN_API_KEY` | No | Polygonscan API key | `ABC123XYZ` | [Polygonscan](https://polygonscan.com/myapikey) |
| `REPORT_GAS` | No | Enable gas reporting in tests | `true` or `false` | N/A |
| `COINMARKETCAP_API_KEY` | No | For USD gas cost estimates | `abc-123-xyz` | [CoinMarketCap](https://coinmarketcap.com/api/) |

### Security Notes

- **NEVER** commit `PRIVATE_KEY` to git
- Add `.env` to `.gitignore`
- Use different wallets for testnet and mainnet
- Keep private keys in secure password manager

---

## Backend

File: `backend/.env`

### Server Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Server port number |
| `NODE_ENV` | Yes | `development` | Environment: `development`, `production`, `test` |
| `FRONTEND_URL` | Yes | `http://localhost:3000` | Frontend URL for CORS |

### Database Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `MONGODB_URI` | Yes | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |

**MongoDB Atlas Connection String Format:**
```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

### Blockchain Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `ETHEREUM_NETWORK` | Yes | Network name | `sepolia` or `mumbai` |
| `ETHEREUM_RPC_URL` | Yes | Blockchain RPC endpoint | `https://sepolia.infura.io/v3/abc123` |
| `PRIVATE_KEY` | Yes | Backend wallet private key | `0x1234...` |
| `CONTRACT_ADDRESS_DOCUMENT_REGISTRY` | Yes* | DocumentRegistry contract address | `0x5678...` |
| `CONTRACT_ADDRESS_ACCESS_CONTROL` | Yes* | AccessControl contract address | `0x1234...` |

*Set after deploying contracts

### IPFS Configuration

| Variable | Required | Description | Example | Where to Get |
|----------|----------|-------------|---------|--------------|
| `WEB3_STORAGE_API_KEY` | Yes | Web3.Storage API token | `eyJhbGc...` | [Web3.Storage](https://web3.storage) |
| `PINATA_API_KEY` | Yes | Pinata API key | `abc123xyz` | [Pinata](https://pinata.cloud) |
| `PINATA_SECRET_API_KEY` | Yes | Pinata secret key | `xyz789abc` | [Pinata](https://pinata.cloud) |
| `NFT_STORAGE_API_KEY` | Yes | NFT.Storage API token | `eyJhbGc...` | [NFT.Storage](https://nft.storage) |
| `IPFS_GATEWAY_URL` | No | IPFS gateway for retrieval | `https://ipfs.io/ipfs/` | N/A |

### JWT Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `JWT_SECRET` | Yes | Secret key for JWT signing (min 32 chars) | `your-super-secret-key-min-32-characters` |
| `JWT_EXPIRE` | No | JWT expiration time | `7d` (7 days) |

**Generate secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### File Upload Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MAX_FILE_SIZE` | No | `10485760` | Max file size in bytes (10MB) |
| `ALLOWED_FILE_TYPES` | No | `pdf,doc,docx,jpg,jpeg,png` | Allowed file extensions |

### Security Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BCRYPT_ROUNDS` | No | `12` | Bcrypt hashing rounds |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window |

### Logging Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOG_LEVEL` | No | `info` | Logging level: `error`, `warn`, `info`, `debug` |

### Complete Backend .env Example

```env
# Server Configuration
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app

# Database Configuration
MONGODB_URI=mongodb+srv://admin:password@cluster.mongodb.net/blockchain-documents?retryWrites=true&w=majority

# Blockchain Configuration
ETHEREUM_NETWORK=sepolia
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
CONTRACT_ADDRESS_DOCUMENT_REGISTRY=0x5678901234567890123456789012345678901234
CONTRACT_ADDRESS_ACCESS_CONTROL=0x1234567890123456789012345678901234567890

# IPFS Configuration
WEB3_STORAGE_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDEyMzQifQ.signature
PINATA_API_KEY=abc123xyz789
PINATA_SECRET_API_KEY=xyz789abc123def456
NFT_STORAGE_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6a2V5OnoxMjM0In0.signature
IPFS_GATEWAY_URL=https://ipfs.io/ipfs/

# JWT Configuration
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
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

---

## Frontend

File: `frontend/.env`

### API Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `REACT_APP_API_URL` | Yes | Backend API URL | `http://localhost:3001` or `https://your-backend.railway.app` |

### Blockchain Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `REACT_APP_CHAIN_ID` | Yes | Blockchain network ID | `11155111` (Sepolia) or `80001` (Mumbai) |
| `REACT_APP_CHAIN_NAME` | Yes | Network display name | `Sepolia` or `Mumbai` |

**Common Chain IDs:**
- Sepolia Testnet: `11155111`
- Mumbai Testnet: `80001`
- Ethereum Mainnet: `1`
- Polygon Mainnet: `137`

### Contract Addresses

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `REACT_APP_DOCUMENT_REGISTRY_ADDRESS` | Yes* | DocumentRegistry contract address | `0x5678...` |
| `REACT_APP_ACCESS_CONTROL_ADDRESS` | Yes* | AccessControl contract address | `0x1234...` |

*Set after deploying contracts

### Complete Frontend .env Example

```env
# API Configuration
REACT_APP_API_URL=https://your-backend.railway.app

# Blockchain Configuration
REACT_APP_CHAIN_ID=11155111
REACT_APP_CHAIN_NAME=Sepolia

# Contract Addresses (update after deployment)
REACT_APP_DOCUMENT_REGISTRY_ADDRESS=0x5678901234567890123456789012345678901234
REACT_APP_ACCESS_CONTROL_ADDRESS=0x1234567890123456789012345678901234567890
```

---

## GitHub Actions Secrets

Configure these in: Repository Settings > Secrets and variables > Actions

### For Contract Deployment

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `SEPOLIA_URL` | Sepolia RPC endpoint | `https://sepolia.infura.io/v3/abc123` |
| `MUMBAI_URL` | Mumbai RPC endpoint | `https://polygon-mumbai.g.alchemy.com/v2/abc123` |
| `PRIVATE_KEY` | Deployer private key | `0x1234...` |
| `ETHERSCAN_API_KEY` | Etherscan API key | `ABC123XYZ` |
| `POLYGONSCAN_API_KEY` | Polygonscan API key | `ABC123XYZ` |

### For Backend Deployment

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `RAILWAY_TOKEN` | Railway API token | Get from Railway dashboard |
| All backend env vars | Copy from backend/.env | See backend section above |

### For Frontend Deployment

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `VERCEL_TOKEN` | Vercel API token | Get from Vercel settings |
| `VERCEL_ORG_ID` | Vercel organization ID | Get from Vercel project settings |
| `VERCEL_PROJECT_ID` | Vercel project ID | Get from Vercel project settings |
| `REACT_APP_API_URL` | Backend URL | `https://your-backend.railway.app` |
| `REACT_APP_CHAIN_ID` | Chain ID | `11155111` |
| `REACT_APP_CHAIN_NAME` | Chain name | `Sepolia` |
| `REACT_APP_DOCUMENT_REGISTRY_ADDRESS` | Contract address | `0x5678...` |
| `REACT_APP_ACCESS_CONTROL_ADDRESS` | Contract address | `0x1234...` |

---

## Environment-Specific Configurations

### Development

```env
# Backend
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/blockchain-documents
LOG_LEVEL=debug

# Frontend
REACT_APP_API_URL=http://localhost:3001
```

### Production

```env
# Backend
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/blockchain-documents
LOG_LEVEL=info

# Frontend
REACT_APP_API_URL=https://your-backend.railway.app
```

### Testing

```env
# Backend
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/test
JWT_SECRET=test-secret-key
LOG_LEVEL=error
```

---

## Validation Checklist

Before deploying, verify:

### Contracts
- [ ] `SEPOLIA_URL` is valid and accessible
- [ ] `PRIVATE_KEY` is correct (40 hex characters after 0x)
- [ ] Wallet has testnet ETH
- [ ] `ETHERSCAN_API_KEY` is valid (optional)

### Backend
- [ ] `MONGODB_URI` connects successfully
- [ ] `ETHEREUM_RPC_URL` is accessible
- [ ] All IPFS API keys are valid
- [ ] `JWT_SECRET` is at least 32 characters
- [ ] Contract addresses are set (after deployment)
- [ ] `FRONTEND_URL` matches actual frontend URL

### Frontend
- [ ] `REACT_APP_API_URL` points to running backend
- [ ] `REACT_APP_CHAIN_ID` matches deployed network
- [ ] Contract addresses match deployed contracts

---

## Security Best Practices

1. **Never commit .env files**
   - Add to `.gitignore`
   - Use `.env.example` as template

2. **Use different keys for different environments**
   - Separate wallets for testnet/mainnet
   - Different JWT secrets per environment

3. **Rotate secrets regularly**
   - Change JWT secret periodically
   - Rotate API keys every 6 months

4. **Use environment-specific values**
   - Don't use production keys in development
   - Use test databases for testing

5. **Secure secret storage**
   - Use password manager for private keys
   - Use GitHub Secrets for CI/CD
   - Use Railway/Vercel environment variables

---

## Troubleshooting

### "Invalid API Key" Errors
- Verify key is copied correctly (no extra spaces)
- Check key hasn't expired
- Verify key has correct permissions

### "Connection Refused" Errors
- Check URLs are correct and accessible
- Verify firewall/network settings
- Test URLs with curl or browser

### "Contract Not Found" Errors
- Verify contract addresses are correct
- Check you're on the right network
- Ensure contracts are deployed

### "CORS" Errors
- Verify `FRONTEND_URL` in backend matches actual frontend
- Check CORS middleware configuration
- Ensure both HTTP and HTTPS are handled

---

## Quick Reference

### Generate Secure Random String
```bash
# For JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Test MongoDB Connection
```bash
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/test"
```

### Test RPC Endpoint
```bash
curl -X POST https://sepolia.infura.io/v3/YOUR_ID \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Verify Environment Variables Loaded
```javascript
// In Node.js
console.log(process.env.MONGODB_URI);

// In React
console.log(process.env.REACT_APP_API_URL);
```
