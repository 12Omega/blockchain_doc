# 🗄️ Local MongoDB Setup Guide (100% Free)

## No Credit Card Required - Completely Free Local Setup

---

## Option 1: MongoDB Community Edition (Recommended)

### Windows Installation

#### Method A: MongoDB Installer (Easiest)

1. **Download MongoDB:**
   - Go to: https://www.mongodb.com/try/download/community
   - Version: Select latest (7.0+)
   - Platform: Windows
   - Package: MSI
   - Click "Download"

2. **Install MongoDB:**
   - Run the downloaded `.msi` file
   - Choose "Complete" installation
   - Install as a Service: ✅ Check this
   - Service Name: MongoDB
   - Data Directory: `C:\Program Files\MongoDB\Server\7.0\data`
   - Log Directory: `C:\Program Files\MongoDB\Server\7.0\log`
   - Click "Install"

3. **Verify Installation:**
   ```cmd
   # Open Command Prompt
   mongod --version
   
   # Should show: db version v7.0.x
   ```

4. **Start MongoDB:**
   ```cmd
   # MongoDB should auto-start as a service
   # To manually start:
   net start MongoDB
   
   # To stop:
   net stop MongoDB
   ```

5. **Test Connection:**
   ```cmd
   # Open MongoDB Shell
   mongosh
   
   # You should see:
   # Current Mongosh Log ID: ...
   # Connecting to: mongodb://127.0.0.1:27017
   # test>
   
   # Type 'exit' to quit
   ```

#### Method B: Chocolatey (For Developers)

```powershell
# Install Chocolatey first (if not installed)
# Run PowerShell as Administrator
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install MongoDB
choco install mongodb

# Start MongoDB
net start MongoDB
```

---

### Mac Installation

```bash
# Using Homebrew (install Homebrew first if needed)
# Install Homebrew: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community@7.0

# Start MongoDB
brew services start mongodb-community@7.0

# Verify
mongosh

# Stop MongoDB (when needed)
brew services stop mongodb-community@7.0
```

---

### Linux (Ubuntu/Debian) Installation

```bash
# Import MongoDB public GPG key
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor

# Create list file
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package database
sudo apt-get update

# Install MongoDB
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
mongosh

# Stop MongoDB (when needed)
sudo systemctl stop mongod
```

---

## Option 2: MongoDB in Docker (Cross-Platform)

### Prerequisites
- Install Docker Desktop: https://www.docker.com/products/docker-desktop/

### Setup

```bash
# Pull MongoDB image
docker pull mongo:7.0

# Run MongoDB container
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password123 \
  mongo:7.0

# Verify it's running
docker ps

# Connect to MongoDB
docker exec -it mongodb mongosh -u admin -p password123

# Stop MongoDB
docker stop mongodb

# Start MongoDB
docker start mongodb

# Remove MongoDB (if needed)
docker rm -f mongodb
docker volume rm mongodb_data
```

**Your MongoDB URI for Docker:**
```
mongodb://admin:password123@localhost:27017/blockchain-documents?authSource=admin
```

---

## Option 3: Portable MongoDB (No Installation)

### Windows Portable

1. **Download:**
   - Go to: https://www.mongodb.com/try/download/community
   - Choose "ZIP" package
   - Extract to: `C:\mongodb`

2. **Create Data Directory:**
   ```cmd
   mkdir C:\mongodb\data
   mkdir C:\mongodb\log
   ```

3. **Start MongoDB:**
   ```cmd
   cd C:\mongodb\bin
   mongod --dbpath C:\mongodb\data --logpath C:\mongodb\log\mongo.log
   ```

4. **Connect (in new terminal):**
   ```cmd
   cd C:\mongodb\bin
   mongosh
   ```

---

## Configuration for Your Project

### Update `backend/.env`

**For Local MongoDB (Default):**
```env
MONGODB_URI=mongodb://localhost:27017/blockchain-documents
```

**For Docker MongoDB (with auth):**
```env
MONGODB_URI=mongodb://admin:password123@localhost:27017/blockchain-documents?authSource=admin
```

**For Portable MongoDB:**
```env
MONGODB_URI=mongodb://localhost:27017/blockchain-documents
```

---

## Verify MongoDB is Working

### Test Connection with Node.js

Create a test file `test-mongo.js`:

```javascript
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/blockchain-documents';

async function testConnection() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully!');
    
    // Create a test document
    const TestSchema = new mongoose.Schema({ name: String });
    const Test = mongoose.model('Test', TestSchema);
    
    await Test.create({ name: 'Test Document' });
    console.log('✅ Test document created!');
    
    const docs = await Test.find();
    console.log('✅ Found documents:', docs.length);
    
    await mongoose.connection.close();
    console.log('✅ Connection closed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testConnection();
```

Run it:
```bash
cd backend
node test-mongo.js
```

---

## MongoDB GUI Tools (Optional)

### MongoDB Compass (Official, Free)

1. **Download:** https://www.mongodb.com/try/download/compass
2. **Install** and open
3. **Connect:** `mongodb://localhost:27017`
4. **Browse** your databases visually

### Studio 3T (Free for Non-Commercial)

1. **Download:** https://studio3t.com/download/
2. **Install** and open
3. **Connect:** Create new connection to `localhost:27017`
4. **Features:** Query builder, import/export, aggregation

---

## Common Issues & Solutions

### Issue: "mongod: command not found"

**Windows:**
```cmd
# Add MongoDB to PATH
setx PATH "%PATH%;C:\Program Files\MongoDB\Server\7.0\bin"
# Restart terminal
```

**Mac/Linux:**
```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH="/usr/local/opt/mongodb-community@7.0/bin:$PATH"
source ~/.bashrc  # or source ~/.zshrc
```

### Issue: "Address already in use"

```bash
# Check what's using port 27017
# Windows:
netstat -ano | findstr :27017

# Mac/Linux:
lsof -i :27017

# Kill the process or use different port
mongod --port 27018
# Update MONGODB_URI to: mongodb://localhost:27018/blockchain-documents
```

### Issue: "Data directory not found"

```bash
# Create the directory
# Windows:
mkdir C:\data\db

# Mac/Linux:
sudo mkdir -p /data/db
sudo chown -R $USER /data/db
```

### Issue: "Permission denied"

```bash
# Run with sudo (Linux/Mac)
sudo mongod

# Or change data directory ownership
sudo chown -R $USER /data/db
```

---

## MongoDB Basics

### Start/Stop Commands

**Windows (Service):**
```cmd
net start MongoDB
net stop MongoDB
```

**Mac (Homebrew):**
```bash
brew services start mongodb-community@7.0
brew services stop mongodb-community@7.0
```

**Linux (systemd):**
```bash
sudo systemctl start mongod
sudo systemctl stop mongod
sudo systemctl status mongod
```

**Docker:**
```bash
docker start mongodb
docker stop mongodb
```

### Connect to MongoDB Shell

```bash
# Default connection
mongosh

# With authentication
mongosh -u admin -p password123 --authenticationDatabase admin

# Specific database
mongosh mongodb://localhost:27017/blockchain-documents
```

### Basic MongoDB Commands

```javascript
// Show databases
show dbs

// Use database
use blockchain-documents

// Show collections
show collections

// Find documents
db.users.find()

// Count documents
db.users.countDocuments()

// Drop database (careful!)
db.dropDatabase()

// Exit
exit
```

---

## Backup & Restore (Optional)

### Backup

```bash
# Backup entire database
mongodump --db blockchain-documents --out ./backup

# Backup specific collection
mongodump --db blockchain-documents --collection users --out ./backup
```

### Restore

```bash
# Restore database
mongorestore --db blockchain-documents ./backup/blockchain-documents

# Restore specific collection
mongorestore --db blockchain-documents --collection users ./backup/blockchain-documents/users.bson
```

---

## Performance Tips

### Create Indexes (in MongoDB Shell)

```javascript
use blockchain-documents

// Index on wallet address
db.users.createIndex({ walletAddress: 1 })

// Index on document hash
db.documents.createIndex({ documentHash: 1 })

// Compound index
db.documents.createIndex({ issuer: 1, createdAt: -1 })

// View indexes
db.users.getIndexes()
```

---

## Security (Production)

### Enable Authentication

1. **Create admin user:**
```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "strongPassword123",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})
```

2. **Create app user:**
```javascript
use blockchain-documents
db.createUser({
  user: "appuser",
  pwd: "appPassword123",
  roles: [ { role: "readWrite", db: "blockchain-documents" } ]
})
```

3. **Restart MongoDB with auth:**
```bash
mongod --auth --dbpath /data/db
```

4. **Update connection string:**
```env
MONGODB_URI=mongodb://appuser:appPassword123@localhost:27017/blockchain-documents
```

---

## Comparison: Local vs Cloud

| Feature | Local MongoDB | MongoDB Atlas |
|---------|--------------|---------------|
| Cost | Free | Free tier available |
| Setup Time | 10 minutes | 5 minutes |
| Storage | Limited by disk | 512MB free |
| Backups | Manual | Automatic |
| Scaling | Manual | Automatic |
| Internet Required | No | Yes |
| Best For | Development | Production |

---

## Recommended Setup for Your Project

### Development (Local)
```env
MONGODB_URI=mongodb://localhost:27017/blockchain-documents
```

### Testing (Docker)
```env
MONGODB_URI=mongodb://admin:password123@localhost:27017/blockchain-documents-test?authSource=admin
```

### Production (Atlas or VPS)
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/blockchain-documents
```

---

## Quick Start Script

Save as `start-mongo.bat` (Windows) or `start-mongo.sh` (Mac/Linux):

**Windows (start-mongo.bat):**
```batch
@echo off
echo Starting MongoDB...
net start MongoDB
if %errorlevel% equ 0 (
    echo MongoDB started successfully!
    echo Connection: mongodb://localhost:27017
) else (
    echo Failed to start MongoDB
    echo Try running as Administrator
)
pause
```

**Mac/Linux (start-mongo.sh):**
```bash
#!/bin/bash
echo "Starting MongoDB..."
brew services start mongodb-community@7.0
echo "MongoDB started!"
echo "Connection: mongodb://localhost:27017"
```

---

## ✅ Verification Checklist

- [ ] MongoDB installed
- [ ] MongoDB service running
- [ ] Can connect with `mongosh`
- [ ] Can create database
- [ ] Can insert document
- [ ] Backend connects successfully
- [ ] Health check passes

---

## 🆘 Still Having Issues?

1. **Check MongoDB is running:**
   ```bash
   # Windows
   tasklist | findstr mongod
   
   # Mac/Linux
   ps aux | grep mongod
   ```

2. **Check logs:**
   ```bash
   # Windows
   type "C:\Program Files\MongoDB\Server\7.0\log\mongod.log"
   
   # Mac
   tail -f /usr/local/var/log/mongodb/mongo.log
   
   # Linux
   sudo tail -f /var/log/mongodb/mongod.log
   ```

3. **Restart MongoDB:**
   ```bash
   # Windows
   net stop MongoDB
   net start MongoDB
   
   # Mac
   brew services restart mongodb-community@7.0
   
   # Linux
   sudo systemctl restart mongod
   ```

---

**Need help?** Check the official docs: https://www.mongodb.com/docs/manual/installation/
