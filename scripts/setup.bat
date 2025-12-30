@echo off
echo 🚀 Setting up Blockchain Document Verification System...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm.
    pause
    exit /b 1
)

echo ✅ Node.js and npm are installed

REM Install root dependencies
echo.
echo 📦 Installing root dependencies...
npm install

REM Setup backend
echo.
echo 🔧 Setting up backend...
cd backend
if not exist package.json (
    echo Creating backend package.json...
    npm init -y
    npm install express mongoose cors helmet morgan bcryptjs jsonwebtoken multer ipfs-http-client crypto dotenv express-rate-limit express-validator winston
    npm install --save-dev nodemon jest supertest
)
cd ..

REM Setup frontend
echo.
echo 🎨 Setting up frontend...
cd frontend
if not exist package.json (
    echo Creating React frontend...
    npx create-react-app . --template typescript
    npm install web3 @metamask/detect-provider axios react-router-dom @types/react-router-dom
)
cd ..

REM Setup smart contracts
echo.
echo ⛓️ Setting up smart contracts...
cd contracts
if not exist package.json (
    echo Creating contracts package.json...
    npm init -y
    npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts
    npx hardhat init --yes
)
cd ..

REM Create environment file
echo.
echo 📝 Creating environment configuration...
if not exist .env (
    copy .env.example .env
    echo ⚠️ Please edit .env file with your configuration
)

echo.
echo ✅ Setup completed successfully!
echo.
echo Next steps:
echo 1. Edit .env file with your configuration
echo 2. Run: npm run compile (to compile smart contracts)
echo 3. Run: npm run deploy:testnet (to deploy contracts)
echo 4. Run: npm run dev (to start development servers)
echo.
pause