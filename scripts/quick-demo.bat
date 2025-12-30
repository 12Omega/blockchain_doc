@echo off
echo 🎯 Quick Demo - Blockchain Document Verification
echo.

REM Check if setup is complete
if not exist .env (
    echo ❌ Environment not configured. Please run setup.bat first.
    pause
    exit /b 1
)

if not exist backend\node_modules (
    echo ❌ Backend dependencies not installed. Please run setup.bat first.
    pause
    exit /b 1
)

if not exist frontend\node_modules (
    echo ❌ Frontend dependencies not installed. Please run setup.bat first.
    pause
    exit /b 1
)

echo ✅ Starting demo environment...
echo.

REM Start MongoDB (if using local)
echo 🗄️ Starting MongoDB...
start "MongoDB" mongod --dbpath ./data/db

REM Wait a moment for MongoDB to start
timeout /t 3 /nobreak >nul

REM Start backend server
echo 🔧 Starting backend server...
start "Backend Server" cmd /k "cd backend && npm run dev"

REM Wait for backend to start
timeout /t 5 /nobreak >nul

REM Start frontend
echo 🎨 Starting frontend...
start "Frontend" cmd /k "cd frontend && npm start"

echo.
echo 🚀 Demo environment is starting...
echo.
echo Services:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:5000
echo - MongoDB: mongodb://localhost:27017
echo.
echo 📖 Demo Instructions:
echo 1. Open http://localhost:3000 in your browser
echo 2. Install MetaMask extension if not already installed
echo 3. Connect your MetaMask wallet
echo 4. Switch to Sepolia testnet
echo 5. Upload a test document
echo 6. Verify the document
echo.
echo Press any key to open the application...
pause >nul
start http://localhost:3000