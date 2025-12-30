require('dotenv').config();
const mongoose = require('mongoose');

const WALLET_ADDRESS = process.argv[2];

if (!WALLET_ADDRESS) {
  console.error('Usage: node grant-consents.js <wallet-address>');
  process.exit(1);
}

// Define Consent schema inline
const consentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  walletAddress: { type: String, required: true, lowercase: true },
  consentType: { type: String, required: true },
  granted: { type: Boolean, default: true },
  grantedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  ipAddress: String,
  userAgent: String,
});

async function grantConsents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/blockchain-documents');
    console.log('Connected to MongoDB');

    const User = require('../models/User');
    const Consent = mongoose.models.Consent || mongoose.model('Consent', consentSchema);

    const walletLower = WALLET_ADDRESS.toLowerCase();
    const user = await User.findOne({ walletAddress: walletLower });

    if (!user) {
      console.error('User not found');
      process.exit(1);
    }

    console.log(`Found user: ${user.walletAddress} (${user.role})`);

    // Grant required consents
    const consentTypes = ['document_storage', 'blockchain_storage', 'data_processing'];

    for (const consentType of consentTypes) {
      const existing = await Consent.findOne({
        userId: user._id,
        consentType,
        granted: true,
      });

      if (existing) {
        console.log(`✓ Consent already granted: ${consentType}`);
      } else {
        await Consent.create({
          userId: user._id,
          walletAddress: walletLower,
          consentType,
          granted: true,
          grantedAt: new Date(),
          ipAddress: '127.0.0.1',
          userAgent: 'Admin Script',
        });
        console.log(`✓ Granted consent: ${consentType}`);
      }
    }

    console.log('\n✅ All consents granted successfully!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

grantConsents();
