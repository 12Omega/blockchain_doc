// MongoDB initialization script for production deployment

// Switch to the application database
db = db.getSiblingDB(process.env.MONGO_DATABASE || 'blockchain_documents');

// Create application user
db.createUser({
  user: process.env.MONGO_APP_USERNAME || 'app_user',
  pwd: process.env.MONGO_APP_PASSWORD || 'change_this_password',
  roles: [
    {
      role: 'readWrite',
      db: process.env.MONGO_DATABASE || 'blockchain_documents'
    }
  ]
});

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['walletAddress', 'role'],
      properties: {
        walletAddress: {
          bsonType: 'string',
          pattern: '^0x[a-fA-F0-9]{40}$',
          description: 'Must be a valid Ethereum address'
        },
        role: {
          bsonType: 'string',
          enum: ['admin', 'issuer', 'verifier', 'student'],
          description: 'Must be a valid user role'
        },
        profile: {
          bsonType: 'object',
          properties: {
            name: { bsonType: 'string', maxLength: 100 },
            email: { bsonType: 'string', maxLength: 255 },
            institution: { bsonType: 'string', maxLength: 200 },
            department: { bsonType: 'string', maxLength: 100 }
          }
        },
        permissions: {
          bsonType: 'object',
          properties: {
            canIssue: { bsonType: 'bool' },
            canVerify: { bsonType: 'bool' },
            canTransfer: { bsonType: 'bool' }
          }
        }
      }
    }
  }
});

db.createCollection('documents', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['documentHash', 'ipfsHash', 'metadata', 'access', 'audit'],
      properties: {
        documentHash: {
          bsonType: 'string',
          pattern: '^0x[a-fA-F0-9]{64}$',
          description: 'Must be a valid document hash'
        },
        ipfsHash: {
          bsonType: 'string',
          pattern: '^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]{55})$',
          description: 'Must be a valid IPFS hash'
        },
        metadata: {
          bsonType: 'object',
          required: ['studentName', 'studentId', 'institutionName', 'documentType', 'issueDate'],
          properties: {
            studentName: { bsonType: 'string', maxLength: 100 },
            studentId: { bsonType: 'string', maxLength: 50 },
            institutionName: { bsonType: 'string', maxLength: 200 },
            documentType: {
              bsonType: 'string',
              enum: ['degree', 'certificate', 'transcript', 'diploma', 'other']
            },
            issueDate: { bsonType: 'date' }
          }
        },
        access: {
          bsonType: 'object',
          required: ['owner', 'issuer'],
          properties: {
            owner: {
              bsonType: 'string',
              pattern: '^0x[a-fA-F0-9]{40}$'
            },
            issuer: {
              bsonType: 'string',
              pattern: '^0x[a-fA-F0-9]{40}$'
            }
          }
        }
      }
    }
  }
});

// Create indexes for performance
db.users.createIndex({ walletAddress: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ 'profile.email': 1 }, { sparse: true });
db.users.createIndex({ createdAt: 1 });

db.documents.createIndex({ documentHash: 1 }, { unique: true });
db.documents.createIndex({ ipfsHash: 1 });
db.documents.createIndex({ 'access.owner': 1 });
db.documents.createIndex({ 'access.issuer': 1 });
db.documents.createIndex({ 'metadata.studentId': 1 });
db.documents.createIndex({ 'metadata.institutionName': 1 });
db.documents.createIndex({ 'metadata.documentType': 1 });
db.documents.createIndex({ status: 1 });
db.documents.createIndex({ createdAt: -1 });
db.documents.createIndex({ 'audit.verificationCount': 1 });

// Create compound indexes for common queries
db.documents.createIndex({ 'access.owner': 1, status: 1, createdAt: -1 });
db.documents.createIndex({ 'access.issuer': 1, status: 1, createdAt: -1 });
db.documents.createIndex({ 'metadata.institutionName': 1, 'metadata.documentType': 1 });

// Create audit log collection
db.createCollection('audit_logs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['eventId', 'eventType', 'timestamp', 'action', 'result'],
      properties: {
        eventId: { bsonType: 'string' },
        eventType: { bsonType: 'string' },
        timestamp: { bsonType: 'date' },
        action: { bsonType: 'string' },
        result: {
          bsonType: 'string',
          enum: ['success', 'failure', 'error', 'blocked']
        }
      }
    }
  }
});

// Create indexes for audit logs
db.audit_logs.createIndex({ timestamp: -1 });
db.audit_logs.createIndex({ eventType: 1, timestamp: -1 });
db.audit_logs.createIndex({ walletAddress: 1, timestamp: -1 });
db.audit_logs.createIndex({ result: 1, timestamp: -1 });
db.audit_logs.createIndex({ 'securityContext.riskLevel': 1, timestamp: -1 });

// Create TTL index for audit log retention (7 years)
db.audit_logs.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 220752000 } // 7 years in seconds
);

// Create performance metrics collection
db.createCollection('performance_metrics');
db.performance_metrics.createIndex({ timestamp: -1 });
db.performance_metrics.createIndex({ metricType: 1, timestamp: -1 });
// TTL index for performance metrics (30 days)
db.performance_metrics.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 2592000 } // 30 days in seconds
);

// Create security alerts collection
db.createCollection('security_alerts');
db.security_alerts.createIndex({ alertType: 1, timestamp: -1 });
db.security_alerts.createIndex({ severity: 1, timestamp: -1 });
db.security_alerts.createIndex({ status: 1, timestamp: -1 });

// Create user consents collection for privacy compliance
db.createCollection('user_consents');
db.user_consents.createIndex({ userId: 1, consentType: 1 });
db.user_consents.createIndex({ walletAddress: 1, consentType: 1 });
db.user_consents.createIndex({ consentDate: -1 });

// Create data deletion requests collection
db.createCollection('data_deletion_requests');
db.data_deletion_requests.createIndex({ userId: 1, status: 1 });
db.data_deletion_requests.createIndex({ walletAddress: 1, status: 1 });
db.data_deletion_requests.createIndex({ requestDate: -1 });

// Create data export requests collection
db.createCollection('data_export_requests');
db.data_export_requests.createIndex({ userId: 1, status: 1 });
db.data_export_requests.createIndex({ walletAddress: 1, status: 1 });
db.data_export_requests.createIndex({ requestDate: -1 });
db.data_export_requests.createIndex({ expiryDate: 1 });

print('Database initialization completed successfully');
print('Collections created with validation rules and indexes');
print('Application user created with readWrite permissions');