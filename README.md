# Blockchain Document Verification System

A secure, blockchain-based document storage and verification system designed for individuals in Nepal. This system uses Ethereum smart contracts and IPFS to provide tamper-proof personal document management.

## Features

- **Secure Document Storage**: Documents encrypted with AES-256 and stored on IPFS
- **Blockchain Verification**: Document hashes stored immutably on Ethereum blockchain
- **Role-Based Access Control**: Different permissions for administrators, issuers, verifiers, and students
- **MetaMask Integration**: Secure wallet-based authentication
- **QR Code Verification**: Quick verification through QR code scanning
- **Audit Trail**: Complete audit logs for all document operations

## Architecture

- **Frontend**: React.js with Material-UI
- **Backend**: Node.js with Express.js
- **Blockchain**: Ethereum smart contracts (Solidity)
- **Storage**: IPFS for documents, MongoDB for metadata
- **Authentication**: MetaMask wallet integration

## Prerequisites

- Node.js (v18 or higher)
- MongoDB
- MetaMask browser extension
- Ethereum testnet account with test ETH

## Quick Start

Get started in under 30 minutes! See [QUICKSTART.md](QUICKSTART.md) for a step-by-step guide.

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd blockchain-document-verification
```

2. Install dependencies:
```bash
npm install
cd contracts && npm install
cd ../backend && npm install
cd ../frontend && npm install
cd ..
```

3. Set up environment variables:
```bash
# Smart contracts
cd contracts
cp .env.example .env
# Edit contracts/.env with your Infura/Alchemy URL and private key

# Backend
cd ../backend
cp .env.example .env
# Edit backend/.env with MongoDB, IPFS, and blockchain config

# Frontend
cd ../frontend
cp .env.example .env
# Edit frontend/.env with API URL and contract addresses
```

4. Deploy smart contracts to Sepolia testnet:
```bash
# Linux/Mac
./scripts/deploy-sepolia.sh

# Windows
scripts\deploy-sepolia.bat
```

5. Start the development servers:
```bash
# Terminal 1 - Backend
cd backend && npm start

# Terminal 2 - Frontend
cd frontend && npm start
```

Visit http://localhost:3000 to use the application!

## Usage

1. **Connect Wallet**: Connect your MetaMask wallet to the application
2. **Upload Documents**: Individuals can upload and register their personal documents
3. **Verify Documents**: Anyone can verify document authenticity by uploading the file
4. **Manage Access**: Control who can access specific documents

## Testing

Run all tests:
```bash
npm test
```

Run specific test suites:
```bash
npm run test:contracts  # Smart contract tests
npm run test:backend    # Backend API tests
npm run test:frontend   # Frontend component tests
```

## Deployment

### Free Deployment (Recommended for Testing)

Deploy the entire system using free services:

- **Smart Contracts**: Sepolia testnet (free)
- **Backend**: Railway (500 hours/month free)
- **Frontend**: Vercel (unlimited free)
- **Database**: MongoDB Atlas (512MB free)
- **Storage**: Web3.Storage (unlimited free)

**Total Cost: $0/month**

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment instructions.

### Quick Deploy

1. **Set up free services** (10 minutes)
   - See [docs/FREE_SERVICES_SETUP.md](docs/FREE_SERVICES_SETUP.md)

2. **Deploy contracts** (5 minutes)
   ```bash
   ./scripts/deploy-sepolia.sh
   ```

3. **Deploy backend to Railway** (5 minutes)
   - Connect GitHub repo
   - Add environment variables
   - Auto-deploy on push

4. **Deploy frontend to Vercel** (5 minutes)
   - Connect GitHub repo
   - Add environment variables
   - Auto-deploy on push

### CI/CD

GitHub Actions workflows are configured for:
- Automated testing on pull requests
- Contract deployment to testnet
- Backend deployment to Railway
- Frontend deployment to Vercel

See `.github/workflows/` for configuration.

### Production Deployment

For production on Polygon mainnet:
- Transaction cost: ~$0.01 per document
- Estimated cost: $2-5/month for 100 documents/month

See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment guide.

## Security Considerations

- Documents are encrypted before IPFS storage
- Only document hashes are stored on blockchain
- Role-based access control for all operations
- Comprehensive audit logging
- Input validation and sanitization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Documentation

- [Quick Start Guide](QUICKSTART.md) - Get running in 30 minutes
- [Deployment Guide](DEPLOYMENT.md) - Complete deployment instructions
- [Free Services Setup](docs/FREE_SERVICES_SETUP.md) - Set up all free services
- [Environment Variables](docs/ENVIRONMENT_VARIABLES.md) - Complete env var reference
- [API Documentation](docs/api-documentation.md) - API endpoints and usage
- [User Manual](docs/user-manual.md) - End-user documentation

## Support

For support and questions:
- Check the [Troubleshooting](DEPLOYMENT.md#troubleshooting) section
- Review [Environment Variables](docs/ENVIRONMENT_VARIABLES.md) reference
- Open an issue in the repository