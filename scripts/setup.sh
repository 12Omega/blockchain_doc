#!/bin/bash

set -e

echo "🚀 Setting up Blockchain Document Verification System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_nodejs() {
    print_status "Checking Node.js installation..."
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        print_success "Node.js found: $NODE_VERSION"
        
        # Check if version is 18 or higher
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$MAJOR_VERSION" -lt 18 ]; then
            print_error "Node.js version 18 or higher is required. Current version: $NODE_VERSION"
            exit 1
        fi
    else
        print_error "Node.js is not installed. Please install Node.js 18 or higher."
        exit 1
    fi
}

# Check if npm is installed
check_npm() {
    print_status "Checking npm installation..."
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        print_success "npm found: $NPM_VERSION"
    else
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing project dependencies..."
    
    # Root dependencies
    print_status "Installing root dependencies..."
    npm install
    
    # Backend dependencies
    print_status "Installing backend dependencies..."
    cd backend && npm install && cd ..
    
    # Frontend dependencies
    print_status "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
    
    # Smart contract dependencies
    print_status "Installing smart contract dependencies..."
    cd contracts && npm install && cd ..
    
    print_success "All dependencies installed successfully!"
}

# Setup environment file
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        cp .env.example .env
        print_success "Created .env file from template"
        print_warning "Please edit .env file with your configuration before proceeding"
        print_warning "You'll need:"
        echo "  - Infura Project ID for Sepolia network"
        echo "  - MetaMask private key (for contract deployment)"
        echo "  - Pinata API keys for IPFS storage"
        echo "  - MongoDB connection string"
        echo ""
        print_warning "Run 'nano .env' or use your preferred editor to configure"
    else
        print_warning ".env file already exists. Please verify your configuration."
    fi
}

# Check MongoDB connection
check_mongodb() {
    print_status "Checking MongoDB connection..."
    
    # Try to connect to MongoDB
    if command -v mongosh >/dev/null 2>&1; then
        # Use mongosh if available
        if mongosh --eval "db.runCommand('ping')" --quiet >/dev/null 2>&1; then
            print_success "MongoDB connection successful"
        else
            print_warning "Cannot connect to MongoDB. Make sure MongoDB is running or configure Atlas URI in .env"
        fi
    elif command -v mongo >/dev/null 2>&1; then
        # Use legacy mongo client
        if mongo --eval "db.runCommand('ping')" --quiet >/dev/null 2>&1; then
            print_success "MongoDB connection successful"
        else
            print_warning "Cannot connect to MongoDB. Make sure MongoDB is running or configure Atlas URI in .env"
        fi
    else
        print_warning "MongoDB client not found. Install MongoDB or use Atlas cloud database"
    fi
}

# Compile smart contracts
compile_contracts() {
    print_status "Compiling smart contracts..."
    
    cd contracts
    if npx hardhat compile; then
        print_success "Smart contracts compiled successfully!"
    else
        print_error "Failed to compile smart contracts"
        exit 1
    fi
    cd ..
}

# Deploy contracts (optional)
deploy_contracts() {
    print_status "Do you want to deploy contracts to Sepolia testnet now? (y/n)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        print_status "Deploying contracts to Sepolia testnet..."
        print_warning "Make sure you have:"
        echo "  - Configured SEPOLIA_URL in .env"
        echo "  - Added your PRIVATE_KEY in .env"
        echo "  - Have test ETH in your wallet (get from https://sepoliafaucet.com/)"
        echo ""
        print_status "Press Enter to continue or Ctrl+C to cancel..."
        read -r
        
        cd contracts
        if npx hardhat run scripts/deploy.js --network sepolia; then
            print_success "Contracts deployed successfully!"
            print_warning "Don't forget to update CONTRACT_ADDRESS in .env with the deployed addresses"
        else
            print_error "Contract deployment failed. Check your configuration and try again."
        fi
        cd ..
    else
        print_warning "Skipping contract deployment. You can deploy later with: npm run deploy:testnet"
    fi
}

# Create startup script
create_startup_script() {
    print_status "Creating startup script..."
    
    cat > start.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting Blockchain Document Verification System..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run setup.sh first."
    exit 1
fi

# Start the application
echo "📱 Starting frontend and backend..."
npm run dev
EOF

    chmod +x start.sh
    print_success "Created start.sh script"
}

# Main setup process
main() {
    echo "=================================================="
    echo "  Blockchain Document Verification Setup"
    echo "=================================================="
    echo ""
    
    check_nodejs
    check_npm
    install_dependencies
    setup_environment
    
    # Wait for user to configure .env
    if [ ! -f .env ] || ! grep -q "your_" .env; then
        print_warning "Please configure your .env file now and then run this script again."
        print_status "Edit .env file with your API keys and configuration"
        exit 0
    fi
    
    check_mongodb
    compile_contracts
    deploy_contracts
    create_startup_script
    
    echo ""
    echo "=================================================="
    print_success "Setup completed successfully! 🎉"
    echo "=================================================="
    echo ""
    print_status "Next steps:"
    echo "1. Make sure your .env file is properly configured"
    echo "2. Get test ETH from https://sepoliafaucet.com/"
    echo "3. Deploy contracts with: npm run deploy:testnet"
    echo "4. Start the application with: ./start.sh or npm run dev"
    echo ""
    print_status "The application will be available at:"
    echo "- Frontend: http://localhost:3000"
    echo "- Backend API: http://localhost:5000"
    echo ""
    print_status "For help, check:"
    echo "- SETUP.md for detailed instructions"
    echo "- docs/troubleshooting-faq.md for common issues"
    echo "- docs/user-manual.md for usage guide"
}

# Run main function
main