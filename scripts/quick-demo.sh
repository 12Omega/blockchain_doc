#!/bin/bash

set -e

echo "🎯 Quick Demo: Adding a Document to the Blockchain"
echo "================================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}[STEP $1]${NC} $2"
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if system is running
check_system() {
    print_step "1" "Checking if system is running..."
    
    # Check backend
    if curl -s http://localhost:5000/health >/dev/null 2>&1; then
        print_success "Backend is running ✅"
    else
        echo "❌ Backend is not running. Please start with: npm run dev"
        exit 1
    fi
    
    # Check frontend
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        print_success "Frontend is running ✅"
    else
        echo "❌ Frontend is not running. Please start with: npm run dev"
        exit 1
    fi
}

# Create sample document
create_sample_document() {
    print_step "2" "Creating sample document..."
    
    mkdir -p demo
    
    cat > demo/sample-diploma.txt << 'EOF'
UNIVERSITY OF BLOCKCHAIN TECHNOLOGY
===================================

BACHELOR OF SCIENCE DEGREE
in Computer Science

This certifies that

JOHN DOE
Student ID: 12345

has successfully completed all requirements for the degree of
Bachelor of Science in Computer Science

Awarded on: May 15, 2024
Valid until: May 15, 2034

Dean of Computer Science
Dr. Jane Smith

This document is secured by blockchain technology.
Document Hash will be registered on Ethereum blockchain.
EOF

    print_success "Sample diploma created: demo/sample-diploma.txt"
}

# Show wallet setup instructions
show_wallet_setup() {
    print_step "3" "Wallet Setup Instructions"
    
    echo ""
    print_info "To add documents to the blockchain, you need:"
    echo "1. 🦊 MetaMask browser extension installed"
    echo "2. 🔗 Connected to Sepolia testnet"
    echo "3. 💰 Test ETH in your wallet (get from https://sepoliafaucet.com/)"
    echo "4. 🎭 Proper role assigned (ISSUER to upload documents)"
    echo ""
    
    print_info "MetaMask Network Configuration:"
    echo "- Network Name: Sepolia"
    echo "- RPC URL: https://sepolia.infura.io/v3/YOUR_PROJECT_ID"
    echo "- Chain ID: 11155111"
    echo "- Currency Symbol: ETH"
    echo "- Block Explorer: https://sepolia.etherscan.io"
    echo ""
}

# Show upload process
show_upload_process() {
    print_step "4" "Document Upload Process"
    
    echo ""
    print_info "To upload the sample document:"
    echo ""
    echo "1. 🌐 Open http://localhost:3000 in your browser"
    echo "2. 🔗 Click 'Connect Wallet' and approve MetaMask connection"
    echo "3. ✍️  Sign the authentication message"
    echo "4. 👤 Set up your profile and role (ISSUER)"
    echo "5. 📄 Click 'Upload Document'"
    echo "6. 📁 Select the file: demo/sample-diploma.txt"
    echo "7. 📝 Fill in metadata:"
    echo "   - Title: Bachelor of Science Degree"
    echo "   - Type: diploma"
    echo "   - Student ID: 12345"
    echo "   - Issue Date: 2024-05-15"
    echo "   - Expiration: 2034-05-15"
    echo "8. 🚀 Click 'Upload and Register'"
    echo "9. ✅ Approve the MetaMask transaction"
    echo "10. ⏳ Wait for blockchain confirmation"
    echo ""
}

# Show verification process
show_verification_process() {
    print_step "5" "Document Verification Process"
    
    echo ""
    print_info "To verify the document:"
    echo ""
    echo "1. 🔍 Go to 'Verify Document' page"
    echo "2. 📁 Upload the same file (demo/sample-diploma.txt)"
    echo "3. ✅ System will show 'Verified' if authentic"
    echo "4. 📊 View verification details and history"
    echo ""
    
    print_info "Alternative verification methods:"
    echo "- 📱 Scan QR code (generated during upload)"
    echo "- 🔗 Use verification API endpoint"
    echo "- 📋 Check document hash on blockchain explorer"
    echo ""
}

# Show API examples
show_api_examples() {
    print_step "6" "API Usage Examples"
    
    echo ""
    print_info "Upload document via API:"
    echo ""
    cat << 'EOF'
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "X-Wallet-Address: YOUR_WALLET_ADDRESS" \
  -F "file=@demo/sample-diploma.txt" \
  -F 'metadata={"title":"Bachelor Degree","type":"diploma","studentId":"12345"}'
EOF
    echo ""
    
    print_info "Verify document via API:"
    echo ""
    cat << 'EOF'
curl -X POST http://localhost:5000/api/documents/verify \
  -F "file=@demo/sample-diploma.txt"
EOF
    echo ""
}

# Show blockchain explorer
show_blockchain_info() {
    print_step "7" "Blockchain Explorer"
    
    echo ""
    print_info "After uploading, you can:"
    echo "1. 🔍 View transaction on Sepolia Etherscan"
    echo "2. 📋 Check contract interactions"
    echo "3. 🔗 Verify document hash on blockchain"
    echo "4. 📊 Monitor gas usage and costs"
    echo ""
    
    print_info "Useful links:"
    echo "- Sepolia Explorer: https://sepolia.etherscan.io"
    echo "- IPFS Gateway: https://ipfs.io/ipfs/"
    echo "- Gas Tracker: https://sepolia.etherscan.io/gastracker"
    echo ""
}

# Main demo function
main() {
    echo ""
    check_system
    create_sample_document
    show_wallet_setup
    show_upload_process
    show_verification_process
    show_api_examples
    show_blockchain_info
    
    echo "================================================="
    print_success "Demo setup complete! 🎉"
    echo "================================================="
    echo ""
    print_info "Ready to test:"
    echo "✅ Sample document created"
    echo "✅ System is running"
    echo "✅ Instructions provided"
    echo ""
    print_info "Next: Open http://localhost:3000 and follow the upload process!"
    echo ""
    
    # Ask if user wants to open browser
    echo "Would you like to open the application in your browser? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        if command -v xdg-open >/dev/null 2>&1; then
            xdg-open http://localhost:3000
        elif command -v open >/dev/null 2>&1; then
            open http://localhost:3000
        else
            print_info "Please open http://localhost:3000 in your browser"
        fi
    fi
}

# Run main function
main