const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid Ethereum wallet address format'
    }
  },
  role: {
    type: String,
    enum: ['admin', 'issuer', 'verifier', 'student'],
    default: 'student',
    required: true
  },
  profile: {
    name: {
      type: String,
      trim: true,
      maxlength: 100
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Invalid email format'
      }
    },
    organization: {
      type: String,
      trim: true,
      maxlength: 200
    },
    department: {
      type: String,
      trim: true,
      maxlength: 100
    }
  },
  permissions: {
    canIssue: {
      type: Boolean,
      default: false
    },
    canVerify: {
      type: Boolean,
      default: true
    },
    canTransfer: {
      type: Boolean,
      default: false
    }
  },
  session: {
    lastLogin: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    },
    nonce: {
      type: String,
      default: () => Math.random().toString(36).substring(2, 15)
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries (walletAddress already indexed via unique: true)
userSchema.index({ role: 1 });
userSchema.index({ 'profile.email': 1 });

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to generate new nonce for signature verification
userSchema.methods.generateNonce = function() {
  // Generate a 32-character nonce using crypto for better security
  const crypto = require('crypto');
  this.session.nonce = crypto.randomBytes(16).toString('hex');
  return this.session.nonce;
};

// Method to check if user has specific permission
userSchema.methods.hasPermission = function(permission) {
  if (this.role === 'admin') return true;
  return this.permissions[permission] || false;
};

// Method to update last login
userSchema.methods.updateLastLogin = function() {
  this.session.lastLogin = new Date();
  this.session.isActive = true;
  return this.save();
};

// Static method to find user by wallet address
userSchema.statics.findByWallet = function(walletAddress) {
  return this.findOne({ walletAddress: walletAddress.toLowerCase() });
};

// Static method to create user with default permissions based on role
userSchema.statics.createWithRole = function(walletAddress, role = 'student') {
  const permissions = {
    admin: { canIssue: true, canVerify: true, canTransfer: true },
    issuer: { canIssue: true, canVerify: true, canTransfer: false },
    verifier: { canIssue: false, canVerify: true, canTransfer: false },
    student: { canIssue: false, canVerify: true, canTransfer: false }
  };

  return this.create({
    walletAddress: walletAddress.toLowerCase(),
    role,
    permissions: permissions[role] || permissions.student
  });
};

module.exports = mongoose.model('User', userSchema);