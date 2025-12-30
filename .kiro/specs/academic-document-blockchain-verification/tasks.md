# Implementation Plan

- [x] 1. Enhance Smart Contracts for Free Blockchain Deployment





  - Optimize AccessControl contract for gas efficiency
  - Add batch operations to DocumentRegistry contract
  - Add document expiration and verification counter features
  - Deploy contracts to Sepolia testnet using free faucet tokens
  - Verify contracts on Etherscan
  - _Requirements: 1.1, 1.3, 1.4, 4.1, 4.2, 4.3, 4.4, 6.1, 6.2, 6.4_

- [x] 1.1 Write property test for gas optimization


  - **Property 22: Gas Optimization**
  - **Validates: Requirements 6.4**

- [x] 1.2 Write property test for access control enforcement


  - **Property 7: Access Control Enforcement**
  - **Validates: Requirements 4.2, 4.5, 5.3, 5.5**

- [x] 1.3 Write property test for event emission completeness


  - **Property 8: Event Emission Completeness**
  - **Validates: Requirements 4.3**

- [x] 1.4 Write property test for transaction ID uniqueness


  - **Property 4: Transaction ID Uniqueness**
  - **Validates: Requirements 1.4**

- [x] 2. Implement Free IPFS Storage Integration with Multiple Providers





  - Create IPFS service with Web3.Storage as primary provider
  - Add Pinata as fallback provider
  - Add NFT.Storage as secondary fallback
  - Implement automatic provider switching on failure
  - Add retry logic with exponential backoff
  - Implement upload queueing for offline scenarios
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 12.1, 12.3, 12.4, 12.5_

- [x] 2.1 Write property test for IPFS provider fallback


  - **Property 20: IPFS Provider Fallback**
  - **Validates: Requirements 12.5**

- [x] 2.2 Write property test for IPFS retry logic


  - **Property 21: IPFS Retry Logic**
  - **Validates: Requirements 12.3**

- [x] 2.3 Write property test for blockchain storage completeness


  - **Property 3: Blockchain Storage Completeness**
  - **Validates: Requirements 1.3, 3.3**

- [x] 3. Implement Document Encryption and Hashing Services







  - Create encryption service with AES-256-CBC
  - Implement unique key generation per document
  - Create SHA-256 hashing service
  - Implement secure key storage in MongoDB (encrypted at rest)
  - Add key retrieval with access control
  - _Requirements: 1.1, 1.2, 3.1, 3.5, 7.1, 7.2, 7.3, 7.5_

- [x] 3.1 Write property test for hash determinism





  - **Property 1: Hash Determinism**
  - **Validates: Requirements 1.1, 2.1**

- [x] 3.2 Write property test for encryption round trip


  - **Property 6: Encryption Round Trip**
  - **Validates: Requirements 3.1, 3.4, 3.5**

- [x] 3.3 Write property test for encryption key uniqueness


  - **Property 11: Encryption Key Uniqueness**
  - **Validates: Requirements 7.2**

- [x] 3.4 Write property test for hash-only blockchain storage


  - **Property 12: Hash-Only Blockchain Storage**
  - **Validates: Requirements 7.5**

- [x] 4. Implement Document Registration Backend API







  - Create POST /api/documents/register endpoint
  - Implement file upload handling with multer
  - Integrate hashing, encryption, IPFS upload, and blockchain transaction
  - Add transaction status tracking
  - Implement error handling and rollback logic
  - Store document metadata in MongoDB
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3_

- [x] 4.1 Write property test for registration response completeness


  - **Property 17: Registration Response Completeness**
  - **Validates: Requirements 10.4**



- [x] 5. Implement QR Code Generation and Parsing Service




  - Create QR code generation service using qrcode library
  - Encode transaction ID and document hash in QR code
  - Create verification URL with embedded parameters
  - Implement QR code parsing service
  - Add QR code image generation (PNG, SVG formats)
  - _Requirements: 1.5, 2.2, 8.1, 8.2, 8.3_


- [x] 5.1 Write property test for QR code round trip


  - **Property 2: QR Code Round Trip**
  - **Validates: Requirements 1.5, 2.2, 8.3**

- [x] 6. Implement Document Verification Backend API





  - Create POST /api/documents/verify endpoint
  - Support verification by file upload, document hash, or QR code
  - Implement hash computation and blockchain query
  - Add verification result logic (authentic/tampered/not found)
  - Return complete document metadata for authentic documents
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 11.2, 11.3, 11.4, 11.5_

- [x] 6.1 Write property test for verification correctness



  - **Property 5: Verification Correctness**
  - **Validates: Requirements 2.3, 2.4**

- [x] 6.2 Write property test for verification state correctness


  - **Property 19: Verification State Correctness**
  - **Validates: Requirements 11.3**

- [x] 6.3 Write property test for public verification access


  - **Property 9: Public Verification Access**
  - **Validates: Requirements 5.4**

- [x] 7. Implement Verification Logging and Audit Trail System



  - Create verification logs collection in MongoDB
  - Log all verification attempts with timestamp and result
  - Implement GET /api/documents/:documentHash/audit endpoint
  - Add filtering by date range, status, and verifier
  - Implement suspicious activity detection (repeated failures)
  - Add administrator alerts for suspicious patterns
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 7.1 Write property test for verification logging


  - **Property 13: Verification Logging**
  - **Validates: Requirements 9.1, 9.2**

- [x] 7.2 Write property test for audit trail completeness

  - **Property 14: Audit Trail Completeness**
  - **Validates: Requirements 9.3**

- [x] 7.3 Write property test for suspicious activity detection

  - **Property 15: Suspicious Activity Detection**
  - **Validates: Requirements 9.4**

- [x] 7.4 Write property test for audit log filtering

  - **Property 16: Audit Log Filtering**
  - **Validates: Requirements 9.5**

- [x] 8. Implement Access Control and Role Management APIs







  - Create POST /api/auth/register endpoint for user registration
  - Implement role assignment API (admin only)
  - Add middleware for role-based access control
  - Implement JWT authentication
  - Create endpoints for granting/revoking document access
  - Sync role assignments with blockchain AccessControl contract
  - _Requirements: 4.2, 5.1, 5.2, 5.3, 5.4, 5.5, 7.4_

- [x] 8.1 Write property test for role assignment persistence






  - **Property 10: Role Assignment Persistence**
  - **Validates: Requirements 5.2**

- [x] 9. Implement Document Management APIs





  - Create GET /api/documents/:documentHash endpoint
  - Create GET /api/documents/user/:address endpoint
  - Create POST /api/documents/:documentHash/access/grant endpoint
  - Create POST /api/documents/:documentHash/access/revoke endpoint
  - Create POST /api/documents/:documentHash/deactivate endpoint
  - Create GET /api/documents/:documentHash/download endpoint with decryption
  - Add search and filter functionality
  - _Requirements: 7.4, 10.5_

- [x] 9.1 Write property test for document search correctness


  - **Property 18: Document Search Correctness**
  - **Validates: Requirements 10.5**

- [x] 10. Checkpoint - Ensure all backend tests pass










  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement Issuer Dashboard Frontend








  - Create document upload form with drag-and-drop
  - Add student information input fields
  - Implement document type selection
  - Add real-time registration progress indicators
  - Display QR code after successful registration
  - Create document list view with search and filters
  - Add batch upload modal for multiple documents
  - Integrate with backend registration API
  - _Requirements: 1.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 12. Implement Verifier Portal Frontend





  - Create document upload interface for verification
  - Implement QR code scanner using device camera
  - Add verification result display component
  - Show blockchain proof viewer with transaction details
  - Display document metadata for authentic documents
  - Add verification history view
  - Integrate with backend verification API
  - _Requirements: 2.1, 2.2, 2.5, 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 13. Implement Student/Owner Portal Frontend





  - Create "My Documents" view
  - Implement document viewer with download capability
  - Add access management interface (grant/revoke)
  - Display access logs for each document
  - Add document transfer request functionality
  - Integrate with backend document management APIs
  - _Requirements: 7.4_

- [x] 14. Implement Wallet Integration and Blockchain Connection





  - Add MetaMask connection button
  - Implement network detection and switching (Sepolia/Mumbai)
  - Display connected account information
  - Handle transaction signing
  - Add network configuration for free testnets
  - Provide instructions for obtaining free testnet tokens
  - Show transaction status and confirmations
  - _Requirements: 6.1, 6.2, 6.5_

- [x] 15. Implement Error Handling and User Feedback





  - Add global error boundary in React
  - Implement toast notifications for success/error messages
  - Create error pages (404, 500, network error)
  - Add loading states for all async operations
  - Implement retry mechanisms for failed operations
  - Display clear error messages with actionable guidance
  - Add offline detection and queueing

- [x] 16. Implement Free Deployment Configuration





  - Create deployment scripts for Sepolia testnet
  - Configure environment variables for free services
  - Set up MongoDB Atlas free tier connection
  - Configure Web3.Storage, Pinata, and NFT.Storage API keys
  - Create deployment documentation
  - Set up CI/CD pipeline (GitHub Actions - free)
  - Configure free hosting (Vercel for frontend, Railway for backend)
  - _Requirements: 6.1, 6.2, 12.1_

- [x] 17. Implement Monitoring and Health Checks





  - Add health check endpoints for all services
  - Implement IPFS provider status monitoring
  - Add blockchain node connectivity checks
  - Create performance metrics collection
  - Implement logging with different levels
  - Add error tracking and alerting
  - Create admin dashboard for system status

- [x] 18. Final Checkpoint - End-to-End Testing






  - Test complete registration flow on testnet
  - Test complete verification flow
  - Test access control and role management
  - Test IPFS provider fallback
  - Test error hand
  ling and recovery
  - Test on different browsers and devices
  - Verify all free services are working
  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Documentation and User Guides





  - Create user guide for issuers
  - Create user guide for verifiers
  - Create user guide for students
  - Document API endpoints
  - Create deployment guide
  - Add troubleshooting section
  - Create video tutorials (optional)
  - Document how to obtain free testnet tokens
