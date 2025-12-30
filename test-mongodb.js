// Quick MongoDB Connection Test
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/blockchain-documents';

console.log('🔍 Testing MongoDB connection...\n');

async function testConnection() {
  try {
    console.log('📡 Connecting to:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully!\n');
    
    // Test database operations
    console.log('📝 Testing database operations...');
    const TestSchema = new mongoose.Schema({ 
      name: String,
      timestamp: Date 
    });
    const Test = mongoose.model('Test', TestSchema);
    
    // Create a test document
    const doc = await Test.create({ 
      name: 'Setup Test', 
      timestamp: new Date() 
    });
    console.log('✅ Test document created:', doc._id);
    
    // Read the document
    const found = await Test.findById(doc._id);
    console.log('✅ Test document retrieved:', found.name);
    
    // Count documents
    const count = await Test.countDocuments();
    console.log('✅ Total test documents:', count);
    
    // Clean up
    await Test.deleteMany({});
    console.log('✅ Test documents cleaned up\n');
    
    await mongoose.connection.close();
    console.log('✅ Connection closed successfully!\n');
    
    console.log('🎉 MongoDB is working perfectly!');
    console.log('📍 Database: blockchain-documents');
    console.log('📍 Connection: localhost:27017\n');
    
    console.log('✅ You can proceed to the next step!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Check if MongoDB service is running:');
    console.error('   Windows: net start MongoDB');
    console.error('2. Check if port 27017 is available');
    console.error('3. See LOCAL_MONGODB_SETUP.md for help\n');
    process.exit(1);
  }
}

testConnection();
