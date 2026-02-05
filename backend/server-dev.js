const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Start in-memory MongoDB and then start the server
async function startServer() {
  try {
    console.log('🚀 Starting development server with in-memory MongoDB...');
    
    // Start in-memory MongoDB
    const mongod = await MongoMemoryServer.create({
      instance: {
        port: 27017, // Use the same port as configured
        dbName: 'blockchain-documents'
      }
    });
    
    const uri = mongod.getUri();
    console.log('📦 In-memory MongoDB started at:', uri);
    
    // Update environment variable
    process.env.MONGODB_URI = uri;
    
    // Now start the main server
    require('./server.js');
    
  } catch (error) {
    console.error('❌ Failed to start development server:', error);
    process.exit(1);
  }
}

startServer();