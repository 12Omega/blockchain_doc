const mongoose = require('mongoose');

const verificationLogSchema = new mongoose.Schema({
  documentHash: {
    type: String,
    required: true,
    index: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{64}$/.test(v);
      },
      message: 'Invalid document hash format'
    }
  },
  verifier: {
    type: String,
    default: 'anonymous',
    validate: {
      validator: function(v) {
        return v === 'anonymous' || /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid verifier address format'
    }
  },
  verifierIp: {
    type: String,
    required: true
  },
  verificationMethod: {
    type: String,
    required: true,
    enum: ['upload', 'qr', 'hash'],
    default: 'hash'
  },
  result: {
    type: String,
    required: true,
    enum: ['authentic', 'tampered', 'not_found'],
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  userAgent: {
    type: String
  },
  location: {
    country: String,
    city: String
  },
  additionalInfo: {
    blockchainVerified: Boolean,
    fileIntegrityChecked: Boolean,
    transactionHash: String
  }
}, {
  timestamps: true
});

// Indexes for faster queries
verificationLogSchema.index({ documentHash: 1, timestamp: -1 });
verificationLogSchema.index({ result: 1, timestamp: -1 });
verificationLogSchema.index({ verifier: 1, timestamp: -1 });
verificationLogSchema.index({ timestamp: -1 });

// Static method to log verification attempt
verificationLogSchema.statics.logVerification = async function(data) {
  try {
    const log = new this(data);
    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to log verification:', error);
    // Don't throw - logging failure shouldn't break verification
    return null;
  }
};

// Static method to get verification history for a document
verificationLogSchema.statics.getDocumentHistory = function(documentHash, options = {}) {
  const {
    limit = 50,
    skip = 0,
    startDate,
    endDate,
    result
  } = options;

  const query = { documentHash };

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  if (result) {
    query.result = result;
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to detect suspicious activity
verificationLogSchema.statics.detectSuspiciousActivity = async function(documentHash, timeWindowMinutes = 10, threshold = 5) {
  const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
  
  const failedAttempts = await this.countDocuments({
    documentHash,
    result: { $in: ['tampered', 'not_found'] },
    timestamp: { $gte: timeWindow }
  });

  return {
    isSuspicious: failedAttempts >= threshold,
    failedAttempts,
    timeWindowMinutes,
    threshold
  };
};

// Static method to get verification statistics
verificationLogSchema.statics.getStatistics = async function(documentHash) {
  const stats = await this.aggregate([
    { $match: { documentHash } },
    {
      $group: {
        _id: '$result',
        count: { $sum: 1 }
      }
    }
  ]);

  const total = await this.countDocuments({ documentHash });
  const lastVerification = await this.findOne({ documentHash })
    .sort({ timestamp: -1 })
    .select('timestamp result');

  return {
    total,
    byResult: stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {}),
    lastVerification: lastVerification ? {
      timestamp: lastVerification.timestamp,
      result: lastVerification.result
    } : null
  };
};

module.exports = mongoose.model('VerificationLog', verificationLogSchema);
