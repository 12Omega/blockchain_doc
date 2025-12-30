const mongoose = require('mongoose');
const crypto = require('crypto');

const documentSchema = new mongoose.Schema({
  documentHash: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{64}$/.test(v);
      },
      message: 'Invalid document hash format'
    }
  },
  ipfsHash: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(v) || /^bafy[a-z0-9]{55}$/.test(v);
      },
      message: 'Invalid IPFS hash format'
    }
  },
  encryptionKey: {
    type: String,
    required: true
  },
  metadata: {
    studentName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    studentId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    institutionName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    documentType: {
      type: String,
      required: true,
      enum: ['degree', 'certificate', 'transcript', 'diploma', 'other'],
      default: 'certificate'
    },
    issueDate: {
      type: Date,
      required: true
    },
    expiryDate: {
      type: Date,
      validate: {
        validator: function(v) {
          return !v || v > this.metadata.issueDate;
        },
        message: 'Expiry date must be after issue date'
      }
    },
    grade: {
      type: String,
      trim: true,
      maxlength: 20
    },
    course: {
      type: String,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  blockchain: {
    transactionHash: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^0x[a-fA-F0-9]{64}$/.test(v);
        },
        message: 'Invalid transaction hash format'
      }
    },
    blockNumber: {
      type: Number,
      min: 0
    },
    gasUsed: {
      type: Number,
      min: 0
    },
    contractAddress: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^0x[a-fA-F0-9]{40}$/.test(v);
        },
        message: 'Invalid contract address format'
      }
    }
  },
  access: {
    owner: {
      type: String,
      required: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          return /^0x[a-fA-F0-9]{40}$/.test(v);
        },
        message: 'Invalid owner address format'
      }
    },
    issuer: {
      type: String,
      required: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          return /^0x[a-fA-F0-9]{40}$/.test(v);
        },
        message: 'Invalid issuer address format'
      }
    },
    authorizedViewers: [{
      type: String,
      lowercase: true,
      validate: {
        validator: function(v) {
          return /^0x[a-fA-F0-9]{40}$/.test(v);
        },
        message: 'Invalid viewer address format'
      }
    }]
  },
  audit: {
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    verificationCount: {
      type: Number,
      default: 0,
      min: 0
    },
    lastVerified: {
      type: Date
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  fileInfo: {
    originalName: {
      type: String,
      required: true,
      trim: true
    },
    mimeType: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
            'image/jpg'
          ];
          return allowedTypes.includes(v);
        },
        message: 'Unsupported file type'
      }
    },
    size: {
      type: Number,
      required: true,
      min: 1,
      max: 10485760 // 10MB limit
    }
  },
  status: {
    type: String,
    enum: ['pending', 'uploaded', 'blockchain_stored', 'verified', 'failed'],
    default: 'pending'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  deactivationReason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  deactivatedAt: {
    type: Date
  },
  deactivatedBy: {
    type: String,
    lowercase: true,
    validate: {
      validator: function(v) {
        return !v || /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid deactivator address format'
    }
  }
}, {
  timestamps: true
});

// Indexes for faster queries (documentHash already indexed via unique: true)
documentSchema.index({ ipfsHash: 1 });
documentSchema.index({ 'access.owner': 1 });
documentSchema.index({ 'access.issuer': 1 });
documentSchema.index({ 'metadata.studentId': 1 });
documentSchema.index({ 'metadata.institutionName': 1 });
documentSchema.index({ 'metadata.documentType': 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ createdAt: -1 });

// Update the updatedAt field before saving
documentSchema.pre('save', function(next) {
  this.audit.updatedAt = Date.now();
  next();
});

// Static method to generate document hash
documentSchema.statics.generateDocumentHash = function(fileBuffer) {
  return '0x' + crypto.createHash('sha256').update(fileBuffer).digest('hex');
};

// Static method to find documents by owner
documentSchema.statics.findByOwner = function(ownerAddress) {
  return this.find({ 
    'access.owner': ownerAddress.toLowerCase(),
    isActive: true 
  }).sort({ createdAt: -1 });
};

// Static method to find documents by issuer
documentSchema.statics.findByIssuer = function(issuerAddress) {
  return this.find({ 
    'access.issuer': issuerAddress.toLowerCase(),
    isActive: true 
  }).sort({ createdAt: -1 });
};

// Method to check if user has access to document
documentSchema.methods.hasAccess = function(userAddress) {
  const address = userAddress.toLowerCase();
  return (
    this.access.owner === address ||
    this.access.issuer === address ||
    this.access.authorizedViewers.includes(address)
  );
};

// Method to add authorized viewer
documentSchema.methods.addAuthorizedViewer = function(viewerAddress) {
  const address = viewerAddress.toLowerCase();
  if (!this.access.authorizedViewers.includes(address)) {
    this.access.authorizedViewers.push(address);
  }
  return this.save();
};

// Method to remove authorized viewer
documentSchema.methods.removeAuthorizedViewer = function(viewerAddress) {
  const address = viewerAddress.toLowerCase();
  this.access.authorizedViewers = this.access.authorizedViewers.filter(
    viewer => viewer !== address
  );
  return this.save();
};

// Method to increment verification count
documentSchema.methods.incrementVerificationCount = function() {
  this.audit.verificationCount += 1;
  this.audit.lastVerified = new Date();
  return this.save();
};

// Method to update blockchain info
documentSchema.methods.updateBlockchainInfo = function(transactionHash, blockNumber, gasUsed, contractAddress) {
  this.blockchain.transactionHash = transactionHash;
  this.blockchain.blockNumber = blockNumber;
  this.blockchain.gasUsed = gasUsed;
  this.blockchain.contractAddress = contractAddress;
  this.status = 'blockchain_stored';
  return this.save();
};

// Virtual for document age
documentSchema.virtual('age').get(function() {
  return Math.floor((Date.now() - this.audit.createdAt) / (1000 * 60 * 60 * 24)); // days
});

// Virtual for formatted file size
documentSchema.virtual('formattedSize').get(function() {
  const bytes = this.fileInfo.size;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Ensure virtual fields are serialized
documentSchema.set('toJSON', { virtuals: true });
documentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Document', documentSchema);