#!/bin/bash

# Deployment script for Sepolia testnet
# This script deploys smart contracts to Sepolia and configures the backend

set -e

echo "=========================================="
echo "Deploying to Sepolia Testnet"
echo "=========================================="

# Check if .env file exists
if [ ! -f contracts/.env ]; then
    echo "Error: contracts/.env file not found!"
    echo "Please copy contracts/.env.example to contracts/.env and configure it"
    exit 1
fi

# Load environment variables
source contracts/.env

# Check required environment variables
if [ -z "$SEPOLIA_URL" ]; then
    echo "Error: SEPOLIA_URL not set in contracts/.env"
    exit 1
fi

if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY not set in contracts/.env"
    exit 1
fi

echo "Step 1: Compiling smart contracts..."
cd contracts
npm run compile

echo ""
echo "Step 2: Running contract tests..."
npm test

echo ""
echo "Step 3: Deploying contracts to Sepolia..."
npx hardhat run scripts/deploy.js --network sepolia > deployment-output.txt

# Extract contract addresses from deployment output
DOCUMENT_REGISTRY_ADDRESS=$(grep "DocumentRegistry deployed to:" deployment-output.txt | awk '{print $4}')
ACCESS_CONTROL_ADDRESS=$(grep "AccessControl deployed to:" deployment-output.txt | awk '{print $4}')

echo ""
echo "Deployment successful!"
echo "DocumentRegistry: $DOCUMENT_REGISTRY_ADDRESS"
echo "AccessControl: $ACCESS_CONTROL_ADDRESS"

# Save addresses to a file
cat > CONTRACT_ADDRESSES.txt << EOF
# Sepolia Testnet Contract Addresses
# Deployed on: $(date)

DOCUMENT_REGISTRY_ADDRESS=$DOCUMENT_REGISTRY_ADDRESS
ACCESS_CONTROL_ADDRESS=$ACCESS_CONTROL_ADDRESS

# Etherscan Links
DocumentRegistry: https://sepolia.etherscan.io/address/$DOCUMENT_REGISTRY_ADDRESS
AccessControl: https://sepolia.etherscan.io/address/$ACCESS_CONTROL_ADDRESS
EOF

echo ""
echo "Contract addresses saved to contracts/CONTRACT_ADDRESSES.txt"

# Verify contracts on Etherscan if API key is set
if [ ! -z "$ETHERSCAN_API_KEY" ]; then
    echo ""
    echo "Step 4: Verifying contracts on Etherscan..."
    
    echo "Verifying AccessControl..."
    npx hardhat verify --network sepolia $ACCESS_CONTROL_ADDRESS || echo "Verification failed or already verified"
    
    echo "Verifying DocumentRegistry..."
    npx hardhat verify --network sepolia $DOCUMENT_REGISTRY_ADDRESS $ACCESS_CONTROL_ADDRESS || echo "Verification failed or already verified"
else
    echo ""
    echo "Skipping Etherscan verification (ETHERSCAN_API_KEY not set)"
fi

cd ..

# Update backend .env file
echo ""
echo "Step 5: Updating backend configuration..."
if [ -f backend/.env ]; then
    # Update existing .env file
    sed -i.bak "s|CONTRACT_ADDRESS_DOCUMENT_REGISTRY=.*|CONTRACT_ADDRESS_DOCUMENT_REGISTRY=$DOCUMENT_REGISTRY_ADDRESS|" backend/.env
    sed -i.bak "s|CONTRACT_ADDRESS_ACCESS_CONTROL=.*|CONTRACT_ADDRESS_ACCESS_CONTROL=$ACCESS_CONTROL_ADDRESS|" backend/.env
    rm backend/.env.bak
    echo "Backend .env updated with contract addresses"
else
    echo "Warning: backend/.env not found. Please update manually."
fi

# Update frontend .env file
echo ""
echo "Step 6: Updating frontend configuration..."
if [ -f frontend/.env ]; then
    sed -i.bak "s|REACT_APP_DOCUMENT_REGISTRY_ADDRESS=.*|REACT_APP_DOCUMENT_REGISTRY_ADDRESS=$DOCUMENT_REGISTRY_ADDRESS|" frontend/.env
    sed -i.bak "s|REACT_APP_ACCESS_CONTROL_ADDRESS=.*|REACT_APP_ACCESS_CONTROL_ADDRESS=$ACCESS_CONTROL_ADDRESS|" frontend/.env
    rm frontend/.env.bak
    echo "Frontend .env updated with contract addresses"
else
    echo "Warning: frontend/.env not found. Please update manually."
fi

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Fund your deployer address with Sepolia ETH from a faucet"
echo "2. Update backend/.env with IPFS API keys"
echo "3. Update backend/.env with MongoDB Atlas connection string"
echo "4. Start the backend: cd backend && npm start"
echo "5. Start the frontend: cd frontend && npm start"
echo ""
echo "Useful faucets:"
echo "- https://sepoliafaucet.com"
echo "- https://www.alchemy.com/faucets/ethereum-sepolia"
echo "- https://faucet.quicknode.com/ethereum/sepolia"
echo ""
