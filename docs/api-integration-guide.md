# API Integration Guide

## Overview

This guide provides comprehensive information for integrating with the Blockchain Document Verification System API.

## Authentication

### Wallet-Based Authentication

All API requests require wallet signature authentication:

```javascript
// Generate authentication signature
const message = `Authenticate with timestamp: ${Date.now()}`;
const signature = await web3.eth.personal.sign(message, walletAddress);

// Include in request headers
headers: {
  'Authorization': `Bearer ${signature}`,
  'X-Wallet-Address': walletAddress,
  'X-Message': message
}
```

### API Key Authentication (Enterprise)

For server-to-server integration:

```javascript
headers: {
  'X-API-Key': 'your-api-key',
  'Content-Type': 'application/json'
}
```

## Base URL

- **Production**: `https://api.docverify.blockchain`
- **Staging**: `https://staging-api.docverify.blockchain`
- **Development**: `http://localhost:3001`

## Core Endpoints

### Document Management

#### Upload Document

```http
POST /api/documents/upload
Content-Type: multipart/form-data

{
  "file": [binary],
  "metadata": {
    "title": "Bachelor's Degree",
    "type": "diploma",
    "studentId": "12345",
    "issueDate": "2024-05-15",
    "expirationDate": "2034-05-15"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "documentId": "doc_123456789",
    "hash": "0x1234567890abcdef...",
    "ipfsHash": "QmXxXxXxXxXxXxXxXx",
    "transactionHash": "0xabcdef1234567890...",
    "blockNumber": 12345678
  }
}
```

#### Verify Document

```http
POST /api/documents/verify
Content-Type: multipart/form-data

{
  "file": [binary]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "isValid": true,
    "documentHash": "0x1234567890abcdef...",
    "registrationDate": "2024-05-15T10:30:00Z",
    "issuer": "0xIssuerAddress...",
    "metadata": {
      "title": "Bachelor's Degree",
      "type": "diploma",
      "studentId": "12345"
    }
  }
}
```

#### Get Document Details

```http
GET /api/documents/{documentId}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "doc_123456789",
    "hash": "0x1234567890abcdef...",
    "title": "Bachelor's Degree",
    "type": "diploma",
    "status": "active",
    "issuer": "0xIssuerAddress...",
    "student": "0xStudentAddress...",
    "createdAt": "2024-05-15T10:30:00Z",
    "verificationCount": 5
  }
}
```

### User Management

#### Get User Profile

```http
GET /api/users/profile
```

#### Update User Profile

```http
PUT /api/users/profile
Content-Type: application/json

{
  "name": "John Doe",
  "email": "[email]",
  "institution": "University of Example",
  "role": "student"
}
```

#### List User Documents

```http
GET /api/users/documents?page=1&limit=10&type=diploma
```

### Verification History

#### Get Verification History

```http
GET /api/verifications?documentId=doc_123456789&page=1&limit=10
```

**Response:**

```json
{
  "success": true,
  "data": {
    "verifications": [
      {
        "id": "ver_123456789",
        "documentId": "doc_123456789",
        "verifier": "0xVerifierAddress...",
        "result": "valid",
        "timestamp": "2024-05-20T14:30:00Z",
        "ipAddress": "192.168.1.1"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

## Webhooks

### Setting Up Webhooks

Configure webhook endpoints to receive real-time notifications:

```http
POST /api/webhooks
Content-Type: application/json

{
  "url": "https://your-server.com/webhook",
  "events": ["document.uploaded", "document.verified", "document.expired"],
  "secret": "your-webhook-secret"
}
```

### Webhook Events

#### Document Uploaded

```json
{
  "event": "document.uploaded",
  "timestamp": "2024-05-15T10:30:00Z",
  "data": {
    "documentId": "doc_123456789",
    "hash": "0x1234567890abcdef...",
    "issuer": "0xIssuerAddress...",
    "student": "0xStudentAddress..."
  }
}
```

#### Document Verified

```json
{
  "event": "document.verified",
  "timestamp": "2024-05-20T14:30:00Z",
  "data": {
    "documentId": "doc_123456789",
    "verifier": "0xVerifierAddress...",
    "result": "valid"
  }
}
```

## SDKs and Libraries

### JavaScript/Node.js SDK

```bash
npm install @docverify/sdk
```

```javascript
import { DocVerifySDK } from "@docverify/sdk";

const sdk = new DocVerifySDK({
  apiKey: "your-api-key",
  baseUrl: "https://api.docverify.blockchain",
});

// Upload document
const result = await sdk.documents.upload(file, metadata);

// Verify document
const verification = await sdk.documents.verify(file);
```

### Python SDK

```bash
pip install docverify-sdk
```

```python
from docverify import DocVerifyClient

client = DocVerifyClient(
    api_key='your-api-key',
    base_url='https://api.docverify.blockchain'
)

# Upload document
result = client.documents.upload(file_path, metadata)

# Verify document
verification = client.documents.verify(file_path)
```

## Rate Limits

- **Free Tier**: 100 requests per hour
- **Pro Tier**: 1,000 requests per hour
- **Enterprise**: Custom limits

Rate limit headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_DOCUMENT",
    "message": "The uploaded file is not a valid document",
    "details": {
      "field": "file",
      "reason": "unsupported_format"
    }
  }
}
```

### Common Error Codes

- `AUTHENTICATION_FAILED`: Invalid or missing authentication
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `INVALID_DOCUMENT`: Document format or content is invalid
- `DOCUMENT_NOT_FOUND`: Requested document doesn't exist
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `BLOCKCHAIN_ERROR`: Blockchain transaction failed

## Testing

### Sandbox Environment

Use the sandbox environment for testing:

- **Base URL**: `https://sandbox-api.docverify.blockchain`
- **Test Network**: Ethereum Sepolia testnet
- **Test Tokens**: Available from faucet

### Test Data

Sample test documents and metadata are available in the SDK:

```javascript
import { testData } from "@docverify/sdk/testing";

// Use test document
const testDoc = testData.sampleDiploma;
const result = await sdk.documents.upload(testDoc.file, testDoc.metadata);
```

## Best Practices

### Security

- Always validate webhook signatures
- Use HTTPS for all API calls
- Store API keys securely
- Implement proper error handling
- Log all API interactions for audit

### Performance

- Implement caching for frequently accessed data
- Use pagination for large result sets
- Batch operations when possible
- Monitor rate limits

### Integration

- Handle network timeouts gracefully
- Implement retry logic with exponential backoff
- Validate all input data before API calls
- Use appropriate HTTP status codes

## Support

- **Documentation**: https://docs.docverify.blockchain
- **API Status**: https://status.docverify.blockchain
- **Support Email**: [email]
- **Developer Forum**: https://forum.docverify.blockchain
