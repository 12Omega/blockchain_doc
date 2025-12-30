# API Documentation - Blockchain Document Verification System

## Table of Contents
1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Base URLs and Endpoints](#base-urls-and-endpoints)
4. [Authentication Endpoints](#authentication-endpoints)
5. [Document Management Endpoints](#document-management-endpoints)
6. [Verification Endpoints](#verification-endpoints)
7. [User Management Endpoints](#user-management-endpoints)
8. [Privacy and Compliance Endpoints](#privacy-and-compliance-endpoints)
9. [Performance and Monitoring Endpoints](#performance-and-monitoring-endpoints)
10. [Error Handling](#error-handling)
11. [Rate Limiting](#rate-limiting)
12. [SDKs and Code Examples](#sdks-and-code-examples)

## Introduction

The Blockchain Document Verification API provides programmatic access to document upload, verification, and management functionality. This RESTful API uses JSON for data exchange and supports standard HTTP methods.

### API Version
Current Version: `v1`
Base URL: `https://your-domain.com/api`

### Supported Operations
- Document upload and registration
- Document verification by hash or file
- User authentication and management
- Batch operations for high-volume processing
- Real-time verification status updates
- Audit trail and compliance reporting

## Authentication

### API Key Authentication
All API requests require authentication using an API key in the Authorization header.

```http
Authorization: Bearer YOUR_API_KEY
```

### Obtaining API Keys
1. Register for an account at the developer portal
2. Complete identity verification process
3. Generate API keys in your dashboard
4. Configure rate limits and permissions

### JWT Token Authentication
For user-specific operations, use JWT tokens obtained through wallet authentication.

```http
Authorization: Bearer JWT_TOKEN
```

## Base URLs and Endpoints

### Production Environment
```
Base URL: https://api.your-domain.com
WebSocket: wss://ws.your-domain.com
```

### Staging Environment
```
Base URL: https://staging-api.your-domain.com
WebSocket: wss://staging-ws.your-domain.com
```

### Rate Limits
- Standard: 100 requests/minute
- Premium: 1000 requests/minute
- Enterprise: Custom limits available

## Authentication Endpoints

### Generate Nonce
Generate a nonce for wallet signature authentication.

```http
POST /api/auth/nonce
```

**Request Body:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b8D4C9db96590c4"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nonce": "abc123def456",
    "message": "Sign this message to authenticate: abc123def456",
    "walletAddress": "0x742d35cc6634c0532925a3b8d4c9db96590c4",
    "expiresAt": "2024-01-15T11:00:00Z"
  }
}
```

### Verify Signature
Verify wallet signature and obtain JWT token.

```http
POST /api/auth/verify
```

**Request Body:**
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b8D4C9db96590c4",
  "signature": "0x1234567890abcdef...",
  "message": "Sign this message to authenticate: abc123def456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "walletAddress": "0x742d35cc6634c0532925a3b8d4c9db96590c4",
      "role": "student",
      "profile": {
        "name": "John Doe",
        "email": "john@example.com"
      }
    },
    "expiresAt": "2024-01-16T10:30:00Z"
  }
}
```

## Document Management Endpoints

### Upload Document
Upload and register a new document on the blockchain.

```http
POST /api/documents/upload
Content-Type: multipart/form-data
Authorization: Bearer JWT_TOKEN
```

**Form Data:**
```
document: [PDF file]
studentName: "John Doe"
studentId: "STU123456"
institutionName: "University of Technology"
documentType: "degree"
issueDate: "2023-06-15"
course: "Computer Science"
grade: "A"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documentId": "doc_123456789",
    "documentHash": "0x7f9a8b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a",
    "ipfsHash": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    "status": "uploaded",
    "metadata": {
      "studentName": "John Doe",
      "studentId": "STU123456",
      "institutionName": "University of Technology",
      "documentType": "degree",
      "issueDate": "2023-06-15"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```#
## Get Document Details
Retrieve detailed information about a specific document.

```http
GET /api/documents/{documentHash}
Authorization: Bearer JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documentHash": "0x7f9a8b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a",
    "ipfsHash": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    "metadata": {
      "studentName": "John Doe",
      "studentId": "STU123456",
      "institutionName": "University of Technology",
      "documentType": "degree",
      "issueDate": "2023-06-15",
      "course": "Computer Science",
      "grade": "A"
    },
    "access": {
      "owner": "0x742d35cc6634c0532925a3b8d4c9db96590c4",
      "issuer": "0x123abc456def789ghi012jkl345mno678pqr901",
      "authorizedViewers": []
    },
    "audit": {
      "verificationCount": 5,
      "lastVerified": "2024-01-14T15:22:00Z",
      "createdAt": "2024-01-10T09:15:00Z"
    },
    "blockchain": {
      "transactionHash": "0xabc123def456ghi789jkl012mno345pqr678stu901",
      "blockNumber": 18500000,
      "network": "ethereum-mainnet"
    }
  }
}
```

### List Documents
Get a paginated list of documents accessible to the authenticated user.

```http
GET /api/documents?page=1&limit=10&type=degree&status=verified
Authorization: Bearer JWT_TOKEN
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `type` (optional): Document type filter
- `status` (optional): Document status filter
- `search` (optional): Search term for metadata

**Response:**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "documentHash": "0x7f9a8b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a",
        "metadata": {
          "studentName": "John Doe",
          "documentType": "degree",
          "institutionName": "University of Technology"
        },
        "status": "verified",
        "createdAt": "2024-01-10T09:15:00Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 5,
      "total": 47,
      "limit": 10
    }
  }
}
```

## Verification Endpoints

### Verify Document by Hash
Verify a document using its blockchain hash.

```http
POST /api/verify/hash
Authorization: Bearer API_KEY
```

**Request Body:**
```json
{
  "documentHash": "0x7f9a8b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "documentHash": "0x7f9a8b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a",
    "metadata": {
      "studentName": "John Doe",
      "studentId": "STU123456",
      "institutionName": "University of Technology",
      "documentType": "degree",
      "issueDate": "2023-06-15",
      "course": "Computer Science"
    },
    "issuer": {
      "name": "University of Technology",
      "address": "0x123abc456def789ghi012jkl345mno678pqr901",
      "verified": true
    },
    "verification": {
      "timestamp": "2024-01-15T10:30:00Z",
      "verificationId": "ver_123456789",
      "method": "hash"
    },
    "blockchain": {
      "network": "ethereum-mainnet",
      "blockNumber": 18500000,
      "confirmations": 1250
    }
  }
}
```

### Verify Document by File Upload
Verify a document by uploading the PDF file.

```http
POST /api/verify/file
Content-Type: multipart/form-data
Authorization: Bearer API_KEY
```

**Form Data:**
```
document: [PDF file]
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "calculatedHash": "0x7f9a8b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a",
    "fileIntegrity": "intact",
    "metadata": {
      "studentName": "John Doe",
      "institutionName": "University of Technology",
      "documentType": "degree"
    },
    "verification": {
      "timestamp": "2024-01-15T10:30:00Z",
      "verificationId": "ver_123456790",
      "method": "file"
    }
  }
}
```

### Batch Verification
Verify multiple documents in a single request.

```http
POST /api/verify/batch
Authorization: Bearer API_KEY
```

**Request Body:**
```json
{
  "documents": [
    {
      "id": "doc1",
      "hash": "0x7f9a8b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a"
    },
    {
      "id": "doc2", 
      "hash": "0x8a1b2c3d4e5f6789abcdef0123456789abcdef01"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "batchId": "batch_123456789",
    "results": [
      {
        "id": "doc1",
        "verified": true,
        "documentHash": "0x7f9a8b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a",
        "metadata": {
          "studentName": "John Doe",
          "documentType": "degree"
        }
      },
      {
        "id": "doc2",
        "verified": false,
        "error": "Document not found",
        "documentHash": "0x8a1b2c3d4e5f6789abcdef0123456789abcdef01"
      }
    ],
    "summary": {
      "total": 2,
      "verified": 1,
      "failed": 1
    },
    "processedAt": "2024-01-15T10:30:00Z"
  }
}
```

## User Management Endpoints

### Get User Profile
Retrieve the authenticated user's profile information.

```http
GET /api/users/profile
Authorization: Bearer JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "walletAddress": "0x742d35cc6634c0532925a3b8d4c9db96590c4",
    "role": "student",
    "profile": {
      "name": "John Doe",
      "email": "john@example.com",
      "institution": "University of Technology",
      "department": "Computer Science"
    },
    "permissions": {
      "canIssue": false,
      "canVerify": true,
      "canTransfer": false
    },
    "statistics": {
      "documentsOwned": 3,
      "documentsIssued": 0,
      "verificationsPerformed": 12
    },
    "createdAt": "2023-09-15T08:20:00Z",
    "lastLogin": "2024-01-15T09:45:00Z"
  }
}
```

### Update User Profile
Update the authenticated user's profile information.

```http
PUT /api/users/profile
Authorization: Bearer JWT_TOKEN
```

**Request Body:**
```json
{
  "name": "John Smith",
  "email": "john.smith@example.com",
  "institution": "Tech University",
  "department": "Software Engineering"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Profile updated successfully",
    "updatedFields": ["name", "email", "department"],
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

## Privacy and Compliance Endpoints

### Record User Consent
Record user consent for data processing activities.

```http
POST /api/privacy/consent
Authorization: Bearer JWT_TOKEN
```

**Request Body:**
```json
{
  "consentType": "data_processing",
  "consentGiven": true,
  "purpose": "Document verification and storage services",
  "dataCategories": ["personal_data", "academic_data"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "consentId": "consent_123456789",
    "consentType": "data_processing",
    "consentGiven": true,
    "consentDate": "2024-01-15T10:30:00Z",
    "expiryDate": "2025-01-15T10:30:00Z"
  }
}
```

### Request Data Export
Request export of all user data for GDPR compliance.

```http
POST /api/privacy/export-request
Authorization: Bearer JWT_TOKEN
```

**Request Body:**
```json
{
  "exportFormat": "json",
  "dataCategories": ["profile_data", "document_metadata", "consent_history"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "requestId": "export_123456789",
    "status": "pending",
    "estimatedCompletion": "2024-01-15T11:00:00Z",
    "downloadUrl": null,
    "expiryDate": "2024-01-22T10:30:00Z"
  }
}
```

## Performance and Monitoring Endpoints

### System Health Check
Check the overall system health and status.

```http
GET /api/health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 86400,
  "version": "1.0.0",
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": "5ms"
    },
    "blockchain": {
      "status": "healthy", 
      "network": "ethereum-mainnet",
      "blockHeight": 18500000
    },
    "ipfs": {
      "status": "healthy",
      "gateway": "operational"
    }
  }
}
```

### Performance Metrics (Admin Only)
Get system performance metrics and statistics.

```http
GET /api/performance/stats
Authorization: Bearer JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "systemHealth": {
      "status": "healthy",
      "uptime": "99.9%"
    },
    "apiMetrics": {
      "requestsPerMinute": 45,
      "averageResponseTime": "120ms",
      "errorRate": "0.1%"
    },
    "blockchainMetrics": {
      "transactionsProcessed": 1250,
      "averageGasUsed": 85000,
      "successRate": "99.8%"
    },
    "storageMetrics": {
      "documentsStored": 5420,
      "totalStorageUsed": "2.3GB",
      "ipfsNodes": 12
    }
  }
}
```

## Error Handling

### Standard Error Response Format
All API errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid document hash format",
    "details": {
      "field": "documentHash",
      "expected": "64-character hexadecimal string starting with 0x",
      "received": "invalid-hash"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123456789"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key is missing or invalid |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `DOCUMENT_NOT_FOUND` | 404 | Document hash not found in system |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | API rate limit exceeded |
| `BLOCKCHAIN_ERROR` | 500 | Blockchain network error |
| `IPFS_ERROR` | 500 | IPFS storage error |
| `INTERNAL_ERROR` | 500 | Internal server error |

### Error Handling Best Practices

```javascript
// Example error handling in JavaScript
async function verifyDocument(hash) {
  try {
    const response = await fetch('/api/verify/hash', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ documentHash: hash })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`API Error: ${data.error.code} - ${data.error.message}`);
    }
    
    return data.data;
  } catch (error) {
    console.error('Verification failed:', error);
    throw error;
  }
}
```

## Rate Limiting

### Rate Limit Headers
All API responses include rate limiting information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
X-RateLimit-Window: 60
```

### Rate Limit Tiers

| Tier | Requests/Minute | Burst Limit | Price |
|------|-----------------|-------------|-------|
| Free | 10 | 20 | Free |
| Standard | 100 | 200 | $29/month |
| Premium | 1000 | 2000 | $99/month |
| Enterprise | Custom | Custom | Contact Sales |

### Handling Rate Limits

```javascript
// Exponential backoff for rate limiting
async function apiCallWithRetry(apiCall, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

## SDKs and Code Examples

### JavaScript/Node.js SDK

```javascript
const { BlockchainDocsAPI } = require('@blockchain-docs/sdk');

const client = new BlockchainDocsAPI({
  apiKey: 'your-api-key',
  baseURL: 'https://api.your-domain.com'
});

// Verify document
const result = await client.verify.byHash('0x7f9a8b6c...');
console.log(result.verified); // true/false

// Upload document
const upload = await client.documents.upload({
  file: fs.createReadStream('certificate.pdf'),
  metadata: {
    studentName: 'John Doe',
    studentId: 'STU123456',
    institutionName: 'University of Technology',
    documentType: 'degree'
  }
});
```

### Python SDK

```python
from blockchain_docs import BlockchainDocsClient

client = BlockchainDocsClient(
    api_key='your-api-key',
    base_url='https://api.your-domain.com'
)

# Verify document
result = client.verify.by_hash('0x7f9a8b6c...')
print(result.verified)  # True/False

# Upload document
with open('certificate.pdf', 'rb') as f:
    upload = client.documents.upload(
        file=f,
        metadata={
            'student_name': 'John Doe',
            'student_id': 'STU123456',
            'institution_name': 'University of Technology',
            'document_type': 'degree'
        }
    )
```

### cURL Examples

```bash
# Verify document by hash
curl -X POST https://api.your-domain.com/api/verify/hash \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "documentHash": "0x7f9a8b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a"
  }'

# Upload document
curl -X POST https://api.your-domain.com/api/documents/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "document=@certificate.pdf" \
  -F "studentName=John Doe" \
  -F "studentId=STU123456" \
  -F "institutionName=University of Technology" \
  -F "documentType=degree"

# Get user profile
curl -X GET https://api.your-domain.com/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- Document upload and verification endpoints
- User authentication and management
- Privacy and compliance features
- Performance monitoring endpoints

### Upcoming Features
- WebSocket real-time notifications
- Advanced search and filtering
- Bulk operations optimization
- Enhanced analytics and reporting
- Multi-language support

---

**API Documentation Version:** 1.0  
**Last Updated:** [Current Date]  
**Support:** api-support@your-domain.com