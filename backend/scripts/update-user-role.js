require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const WALLET_ADDRESS = process.argv[2];
const ROLE = process.argv[3] || 'issuer';

if (!WALLET_ADDRESS) {
  console.error('Usage: node update-user-role.js <wallet-address> [role]');
  console.error('Example: node update-user-role.js 0xYourAddress issuer');
  console.error('Roles: admin, issuer, verifier, student');
  process.exit(1);
}

async function updateUserRole() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/blockchain-documents');
    console.log('Connected to MongoDB');

    const walletLower = WALLET_ADDRESS.toLowerCase();
    
    // Find user
    let user = await User.findOne({ walletAddress: walletLower });
    
    if (!user) {
      console.log(`User not found. Creating new user with role: ${ROLE}`);
      user = await User.createWithRole(walletLower, ROLE);
      console.log('✅ User created successfully!');
    } else {
      console.log(`User found. Updating role from ${user.role} to ${ROLE}`);
      user.role = ROLE;
      
      // Update permissions based on role
      const permissions = {
        admin: { canIssue: true, canVerify: true, canTransfer: true },
        issuer: { canIssue: true, canVerify: true, canTransfer: false },
        verifier: { canIssue: false, canVerify: true, canTransfer: false },
        student: { canIssue: false, canVerify: true, canTransfer: false }
      };
      
      user.permissions = permissions[ROLE] || permissions.student;
      await user.save();
      console.log('✅ User role updated successfully!');
    }
    
    console.log('\nUser Details:');
    console.log('Wallet Address:', user.walletAddress);
    console.log('Role:', user.role);
    console.log('Permissions:', user.permissions);
    
    await mongoose.connection.close();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateUserRole();
