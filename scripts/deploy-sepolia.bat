@echo off
REM Deployment script for Sepolia testnet (Windows)
REM This script deploys smart contracts to Sepolia and configures the backend

echo ==========================================
echo Deploying to Sepolia Testnet
echo ==========================================

REM Check if .env file exists
if not exist "contracts\.env" (
    echo Error: contracts\.env file not found!
    echo Please copy contracts\.env.example to contracts\.env and configure it
    exit /b 1
)

echo Step 1: Compiling smart contracts...
cd contracts
call npm run compile

echo.
echo Step 2: Running contract tests...
call npm test

echo.
echo Step 3: Deploying contracts to Sepolia...
call npx hardhat run scripts/deploy.js --network sepolia > deployment-output.txt

REM Extract contract addresses (simplified for Windows)
echo.
echo Deployment output saved to contracts/deployment-output.txt
echo Please check the file for contract addresses

echo.
echo Step 4: Verifying contracts on Etherscan...
echo Run the following commands manually if you have ETHERSCAN_API_KEY set:
echo npx hardhat verify --network sepolia [ACCESS_CONTROL_ADDRESS]
echo npx hardhat verify --network sepolia [DOCUMENT_REGISTRY_ADDRESS] [ACCESS_CONTROL_ADDRESS]

cd ..

echo.
echo ==========================================
echo Deployment Complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Check contracts/deployment-output.txt for contract addresses
echo 2. Update backend/.env with contract addresses
echo 3. Update frontend/.env with contract addresses
echo 4. Fund your deployer address with Sepolia ETH from a faucet
echo 5. Update backend/.env with IPFS API keys
echo 6. Update backend/.env with MongoDB Atlas connection string
echo 7. Start the backend: cd backend ^&^& npm start
echo 8. Start the frontend: cd frontend ^&^& npm start
echo.
echo Useful faucets:
echo - https://sepoliafaucet.com
echo - https://www.alchemy.com/faucets/ethereum-sepolia
echo - https://faucet.quicknode.com/ethereum/sepolia
echo.

pause
