IPFS Service Documentation

Overview

The IPFS service provides decentralized file storage with automatic provider fallback, retry logic, and upload queueing for offline scenarios.

Features

1. Multiple Provider Support

The service supports three free IPFS providers with automatic fallback:

1. Web3.Storage (Primary) - Unlimited free storage
2. Pinata (Fallback) - 1GB free tier
3. NFT.Storage (Secondary Fallback) - Unlimited free storage

2. Automatic Provider Fallback

If the primary provider fails, the service automatically tries the next provider in priority order. This ensures high availability even if one provider is down.

3. Retry Logic with Exponential Backoff

For transient errors (network timeouts, 5xx errors), the service automatically retries uploads with exponential backoff:

- Initial delay: 1 second
- Maximum delay: 10 seconds
- Maximum retries: 3 attempts per provider
- Backoff multiplier: 2x

4. Upload Queueing

When all providers are unavailable, uploads are automatically queued and will be processed when providers become available again.

5. Health Monitoring

The service provides health check functionality to monitor the status of all configured providers.

Setting Things Up

Set the following environment variables in your `.env` file:

```bash
Primary Provider
WEB3_STORAGE_API_KEY=your_web3_storage_api_key

Fallback Provider
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key

Secondary Fallback
NFT_STORAGE_API_KEY=your_nft_storage_api_key

Gateway for retrieving files
IPFS_GATEWAY_URL=https://ipfs.io/ipfs/
```

Usage

Upload a File

```javascript
const ipfsService = require('./services/ipfsService');

const fileBuffer = Buffer.from(fileData);
const result = await ipfsService.uploadFile(fileBuffer, 'document.pdf', {
  studentId: '12345',
  documentType: 'degree'
});

console.log(result);
// {
//   cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
//   size: 1024,
//   provider: 'web3.storage',
//   gateway: 'https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
//   pinned: true,
//   timestamp: '2025-11-20T10:30:00.000Z'
// }
```

Retrieve a File

```javascript
const fileBuffer = await ipfsService.retrieveFile(cid);
```

Check Provider Health

```javascript
const health = await ipfsService.checkIPFSHealth();
console.log(health);
// {
//   'web3.storage': { available: true, responseTime: 150, priority: 1 },
//   'pinata': { available: true, responseTime: 200, priority: 2 },
//   'nft.storage': { available: false, reason: 'Not configured' }
// }
```

Get Queue Status

```javascript
const queueStatus = ipfsService.getQueueStatus();
console.log(queueStatus);
// {
//   queueLength: 2,
//   isProcessing: false,
//   items: [
//     { filename: 'doc1.pdf', timestamp: '2025-11-20T10:30:00.000Z', attempts: 1 },
//     { filename: 'doc2.pdf', timestamp: '2025-11-20T10:31:00.000Z', attempts: 0 }
//   ]
// }
```

Error Handling

The service handles various error scenarios:

- Retriable Errors: Network timeouts, connection refused, 5xx server errors
  - Action: Automatic retry with exponential backoff
  
- Non-Retriable Errors: 4xx client errors, invalid API keys
  - Action: Immediate failure, no retry

- All Providers Failed: When all providers are unavailable
  - Action: Queue upload for later processing

Testing

The service includes comprehensive property-based tests:

```bash
npm test -- ipfsService.property.test.js
```

Test Coverage

- Property 20: IPFS Provider Fallback - Validates automatic fallback to next provider
- Property 21: IPFS Retry Logic - Validates retry behavior for transient errors
- Property 3: Blockchain Storage Completeness - Validates all required fields in upload result

Getting API Keys

Web3.Storage
1. Visit https://web3.storage
2. Sign up for a free account
3. Generate an API token
4. Add to `.env` as `WEB3_STORAGE_API_KEY`

Pinata
1. Visit https://pinata.cloud
2. Sign up for a free account (1GB storage)
3. Generate API key and secret
4. Add to `.env` as `PINATA_API_KEY` and `PINATA_SECRET_API_KEY`

NFT.Storage
1. Visit https://nft.storage
2. Sign up for a free account
3. Generate an API token
4. Add to `.env` as `NFT_STORAGE_API_KEY`

Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      IPFS Service                            │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Upload Request                                        │ │
│  └────────────────┬───────────────────────────────────────┘ │
│                   │                                          │
│  ┌────────────────▼───────────────────────────────────────┐ │
│  │  Try Provider 1 (Web3.Storage)                         │ │
│  │  - Retry up to 3 times on transient errors            │ │
│  └────────────────┬───────────────────────────────────────┘ │
│                   │ Fails                                    │
│  ┌────────────────▼───────────────────────────────────────┐ │
│  │  Try Provider 2 (Pinata)                               │ │
│  │  - Retry up to 3 times on transient errors            │ │
│  └────────────────┬───────────────────────────────────────┘ │
│                   │ Fails                                    │
│  ┌────────────────▼───────────────────────────────────────┐ │
│  │  Try Provider 3 (NFT.Storage)                          │ │
│  │  - Retry up to 3 times on transient errors            │ │
│  └────────────────┬───────────────────────────────────────┘ │
│                   │ Fails                                    │
│  ┌────────────────▼───────────────────────────────────────┐ │
│  │  Queue Upload for Later Processing                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

Performance

- Upload time: < 5 seconds for 1MB file (typical)
- Retry delay: 1-10 seconds (exponential backoff)
- Queue processing: Every 30 seconds when items are queued
- Health check: < 5 seconds per provider

Limitations

- Web3.Storage: Unlimited storage (free)
- Pinata: 1GB total storage (free tier)
- NFT.Storage: Unlimited storage (free)

Monitor usage and upgrade plans as needed for production deployments.

