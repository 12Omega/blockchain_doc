# Windows Setup Guide

## Quick Start (Windows)

### 1. Prerequisites
- **Node.js** (v16 or higher): Download from [nodejs.org](https://nodejs.org/)
- **Git**: Download from [git-scm.com](https://git-scm.com/)
- **MetaMask**: Browser extension from [metamask.io](https://metamask.io/)
- **MongoDB** (optional for local development): Download from [mongodb.com](https://www.mongodb.com/try/download/community)

### 2. Initial Setup
```cmd
# Clone or navigate to your project directory
cd "E:\Block chain"

# Run the Windows setup script
scripts\setup.bat
```

### 3. Configure Environment
Edit the `.env` file that was created:
```env
# Get a free Infura project ID from https://infura.io/
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID

# Your MetaMask private key (for deployment only)
PRIVATE_KEY=your_private_key_here

# MongoDB connection (use local or MongoDB Atlas)
MONGODB_URI=mongodb://localhost:27017/blockchain-documents

# IPFS/Pinata configuration (get free API keys from https://pinata.cloud/)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# JWT secret (generate a random string)
JWT_SECRET=your_random_jwt_secret_here
```

### 4. Deploy Smart Contracts
```cmd
# Compile contracts
npm run compile

# Deploy to Sepolia testnet
npm run deploy:testnet
```

### 5. Start Development Environment
```cmd
# Start all services
npm run dev

# OR use the quick demo script
scripts\quick-demo.bat
```

## Adding Documents to Blockchain

### Method 1: Using the Web Interface

1. **Start the application**:
   ```cmd
   scripts\quick-demo.bat
   ```

2. **Open your browser** to `http://localhost:3000`

3. **Connect MetaMask**:
   - Click "Connect Wallet"
   - Approve the connection
   - Switch to Sepolia testnet
   - Sign the authentication message

4. **Upload a document**:
   - Click "Upload Document"
   - Select a file (PDF, DOC, DOCX, JPG, PNG - max 10MB)
   - Fill in the metadata form:
     ```
     Title: Bachelor's Degree in Computer Science
     Type: diploma
     Student ID: STU123456
     Issue Date: 2024-05-15
     Expiration Date: 2034-05-15 (optional)
     ```
   - Click "Submit to Blockchain"
   - Approve the MetaMask transaction
   - Wait for blockchain confirmation

5. **Verify the document**:
   - Go to "Verify Document" page
   - Upload the same file
   - See "✅ Document Verified" result

### Method 2: Using the API

1. **Start the backend server**:
   ```cmd
   cd backend
   npm run dev
   ```

2. **Upload via API**:
   ```javascript
   // Example using curl (install curl for Windows or use Postman)
   curl -X POST http://localhost:5000/api/documents/upload \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -F "file=@path/to/your/document.pdf" \
     -F "metadata={\"title\":\"Test Document\",\"type\":\"certificate\"}"
   ```

3. **Verify via API**:
   ```javascript
   curl -X POST http://localhost:5000/api/documents/verify \
     -F "file=@path/to/your/document.pdf"
   ```

### Method 3: Using the SDK

1. **Install the SDK** (if available):
   ```cmd
   npm install @docverify/sdk
   ```

2. **Use in your application**:
   ```javascript
   const { DocVerifySDK } = require('@docverify/sdk');
   
   const sdk = new DocVerifySDK({
     apiUrl: 'http://localhost:5000/api',
     walletPrivateKey: 'your_private_key'
   });
   
   // Upload document
   const result = await sdk.uploadDocument('path/to/document.pdf', {
     title: 'Test Certificate',
     type: 'certificate',
     studentId: 'STU123'
   });
   
   console.log('Document uploaded:', result.transactionHash);
   
   // Verify document
   const verification = await sdk.verifyDocument('path/to/document.pdf');
   console.log('Verification result:', verification.isValid);
   ```

## Troubleshooting Windows Issues

### Common Windows-Specific Problems

1. **PowerShell Execution Policy**:
   ```powershell
   # If you get execution policy errors, run as Administrator:
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **Node.js Path Issues**:
   - Restart Command Prompt after installing Node.js
   - Check PATH environment variable includes Node.js

3. **MongoDB Connection Issues**:
   ```cmd
   # Start MongoDB manually
   mongod --dbpath "C:\data\db"
   
   # Or use MongoDB Atlas (cloud) instead of local installation
   ```

4. **Port Already in Use**:
   ```cmd
   # Find what's using port 3000 or 5000
   netstat -ano | findstr :3000
   netstat -ano | findstr :5000
   
   # Kill the process if needed
   taskkill /PID <process_id> /F
   ```

5. **MetaMask Connection Issues**:
   - Ensure you're on `http://localhost:3000` (not `127.0.0.1`)
   - Clear browser cache
   - Disable other wallet extensions
   - Make sure MetaMask is unlocked

### Getting Test ETH

1. **Sepolia Faucet**: Visit [sepoliafaucet.com](https://sepoliafaucet.com/)
2. **Alchemy Faucet**: [sepoliafaucet.net](https://sepoliafaucet.net/)
3. **Infura Faucet**: [infura.io/faucet/sepolia](https://infura.io/faucet/sepolia)

### File Paths on Windows

Use forward slashes or double backslashes in configuration:
```env
# Good
UPLOAD_PATH=./uploads
UPLOAD_PATH=.\\uploads

# Bad
UPLOAD_PATH=.\uploads
```

## Next Steps

1. **Run the demo**: `scripts\add-document-demo.bat`
2. **Read the user manual**: `docs\user-manual.md`
3. **Check API documentation**: `docs\api-integration-guide.md`
4. **Explore troubleshooting**: `docs\troubleshooting-faq.md`

## Production Deployment

For production deployment on Windows Server:
```cmd
# Build for production
npm run build

# Start production services
docker-compose -f docker-compose.production.yml up -d
```

## Support

- **Documentation**: Check the `docs/` folder
- **Issues**: Create GitHub issues for bugs
- **Community**: Join our Discord/Telegram for help