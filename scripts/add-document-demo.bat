@echo off
echo 📄 Document Upload Demo
echo.

echo This script will guide you through adding a document to the blockchain.
echo.

echo Prerequisites:
echo ✅ MetaMask installed and configured
echo ✅ Connected to Sepolia testnet
echo ✅ Have some test ETH for gas fees
echo ✅ Backend and frontend servers running
echo.

echo Step-by-step process:
echo.
echo 1️⃣ CONNECT WALLET
echo    - Open http://localhost:3000
echo    - Click "Connect Wallet"
echo    - Approve MetaMask connection
echo    - Sign authentication message
echo.

echo 2️⃣ PREPARE DOCUMENT
echo    - Choose a PDF, DOC, or image file (max 10MB)
echo    - Ensure it's a document you want to verify later
echo    - Note: File will be encrypted before storage
echo.

echo 3️⃣ UPLOAD DOCUMENT
echo    - Click "Upload Document" button
echo    - Select your file
echo    - Fill in metadata:
echo      * Document Title: e.g., "Bachelor's Degree"
echo      * Document Type: diploma/certificate/transcript
echo      * Student ID: any identifier
echo      * Issue Date: when document was issued
echo      * Expiration Date: when it expires (optional)
echo.

echo 4️⃣ BLOCKCHAIN REGISTRATION
echo    - Review document details
echo    - Click "Submit to Blockchain"
echo    - Approve MetaMask transaction
echo    - Wait for confirmation (1-3 minutes)
echo.

echo 5️⃣ VERIFICATION TEST
echo    - Go to "Verify Document" page
echo    - Upload the SAME file you just registered
echo    - System will show "✅ Document Verified"
echo    - Try uploading a different file - it will show "❌ Invalid"
echo.

echo 🔍 What happens behind the scenes:
echo    - File is encrypted with AES-256
echo    - Encrypted file stored on IPFS
echo    - Document hash stored on Ethereum blockchain
echo    - Smart contract records ownership and metadata
echo    - Verification compares file hash with blockchain record
echo.

echo Ready to start? Press any key to open the application...
pause >nul
start http://localhost:3000

echo.
echo 💡 Troubleshooting tips:
echo - If MetaMask doesn't connect: refresh page and try again
echo - If transaction fails: check you have enough ETH for gas
echo - If upload fails: check file size and format
echo - If verification fails: ensure you're using the exact same file
echo.
echo For detailed help, check docs/troubleshooting-faq.md
pause