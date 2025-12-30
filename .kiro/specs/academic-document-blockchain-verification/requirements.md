# Requirements Document

## Introduction

This document outlines the requirements for a blockchain-based academic document preservation and verification system for Softwarica College. The system aims to prevent document forgery, enhance authenticity, and provide international credibility to academic credentials using blockchain technology, smart contracts, and decentralized storage (IPFS). The solution addresses the critical issue of document fraud in Nepal's education sector, which has caused financial losses and damaged institutional credibility both nationally and internationally.

## Glossary

- **Document Registry System**: The blockchain-based platform that stores, manages, and verifies academic documents
- **Smart Contract**: Self-executing code on the blockchain that enforces document verification rules without intermediaries
- **IPFS (InterPlanetary File System)**: A decentralized file storage system for storing document content off-chain
- **Document Hash**: A unique SHA-256 cryptographic fingerprint of a document that proves its authenticity
- **Verifier**: An individual or institution that checks the authenticity of an academic document
- **Document Owner**: The student or institution that possesses the original academic credential
- **Issuing Authority**: The college or authorized personnel who register documents on the blockchain
- **Blockchain Transaction**: A recorded operation on the blockchain that cannot be altered or deleted
- **QR Code**: A scannable code embedded in documents that links to blockchain verification data
- **Testnet**: A free blockchain network used for testing (e.g., Sepolia, Mumbai)
- **Gas Fee**: The cost to execute blockchain transactions (free on testnets)
- **NFT (Non-Fungible Token)**: A unique digital token representing ownership of a specific document
- **Consensus Mechanism**: The protocol used to validate blockchain transactions (e.g., Proof of Authority)
- **Access Control**: Role-based permissions that determine who can register, view, or verify documents

## Requirements

### Requirement 1: Document Registration

**User Story:** As an issuing authority at Softwarica College, I want to register academic documents on the blockchain, so that they have immutable proof of authenticity.

#### Acceptance Criteria

1. WHEN an issuing authority uploads a document file THEN the Document Registry System SHALL compute a SHA-256 hash of the document content
2. WHEN a document hash is computed THEN the Document Registry System SHALL store the document file on IPFS and obtain a content identifier (CID)
3. WHEN an IPFS CID is obtained THEN the Document Registry System SHALL create a blockchain transaction containing the document hash, IPFS CID, student information, and timestamp
4. WHEN a blockchain transaction is created THEN the Document Registry System SHALL record the transaction on the blockchain and return a unique transaction ID
5. WHEN a document is successfully registered THEN the Document Registry System SHALL generate a QR code containing the transaction ID and document hash

### Requirement 2: Document Verification

**User Story:** As a verifier (employer, university, or government agency), I want to verify the authenticity of academic documents, so that I can confirm they have not been forged or tampered with.

#### Acceptance Criteria

1. WHEN a verifier uploads a document file for verification THEN the Document Registry System SHALL compute the SHA-256 hash of the uploaded document
2. WHEN a verifier scans a QR code from a document THEN the Document Registry System SHALL extract the transaction ID and original document hash
3. WHEN a document hash is computed THEN the Document Registry System SHALL query the blockchain for matching records using the hash or transaction ID
4. WHEN blockchain records are found THEN the Document Registry System SHALL compare the computed hash with the stored hash and return a verification result
5. WHEN hashes match THEN the Document Registry System SHALL display the document as authentic with issuer details, timestamp, and blockchain transaction proof

### Requirement 3: Decentralized Storage Integration

**User Story:** As a system administrator, I want academic documents stored on IPFS, so that the system is decentralized, cost-effective, and resistant to single points of failure.

#### Acceptance Criteria

1. WHEN a document is uploaded for registration THEN the Document Registry System SHALL encrypt the document using AES-256 encryption before IPFS storage
2. WHEN an encrypted document is ready THEN the Document Registry System SHALL upload it to IPFS using a free service provider (Pinata, Web3.Storage, or NFT.Storage)
3. WHEN IPFS upload completes THEN the Document Registry System SHALL store the IPFS CID on the blockchain alongside the document hash
4. WHEN a verifier requests document retrieval THEN the Document Registry System SHALL fetch the document from IPFS using the stored CID
5. WHEN a document is retrieved from IPFS THEN the Document Registry System SHALL decrypt it using the stored encryption key and present it to authorized users only

### Requirement 4: Smart Contract Implementation

**User Story:** As a developer, I want smart contracts to enforce document registration and verification rules, so that the system operates transparently without centralized control.

#### Acceptance Criteria

1. WHEN the system is deployed THEN the Smart Contract SHALL define functions for registering documents, retrieving document data, and verifying document authenticity
2. WHEN a document registration function is called THEN the Smart Contract SHALL validate that the caller has issuing authority permissions
3. WHEN document data is stored THEN the Smart Contract SHALL emit an event containing the document hash, IPFS CID, issuer address, and timestamp
4. WHEN a verification function is called THEN the Smart Contract SHALL return the stored document metadata for the provided hash or transaction ID
5. WHEN unauthorized users attempt to register documents THEN the Smart Contract SHALL reject the transaction and revert with an error message

### Requirement 5: Access Control and Role Management

**User Story:** As a system administrator, I want role-based access control, so that only authorized personnel can register documents while anyone can verify them.

#### Acceptance Criteria

1. WHEN the system initializes THEN the Document Registry System SHALL define roles for administrators, issuing authorities, and public verifiers
2. WHEN an administrator assigns a role THEN the Document Registry System SHALL record the role assignment on the blockchain using the Smart Contract
3. WHEN an issuing authority attempts to register a document THEN the Document Registry System SHALL verify their role before allowing the transaction
4. WHEN a public verifier attempts to verify a document THEN the Document Registry System SHALL allow the verification without requiring authentication
5. WHEN an unauthorized user attempts to register a document THEN the Document Registry System SHALL reject the request and display an error message

### Requirement 6: Free Blockchain Network Deployment

**User Story:** As a project stakeholder, I want the system deployed on free blockchain networks, so that we can demonstrate and test the solution without incurring costs.

#### Acceptance Criteria

1. WHEN the system is deployed for testing THEN the Document Registry System SHALL use Ethereum Sepolia testnet or Polygon Mumbai testnet
2. WHEN smart contracts are deployed THEN the Document Registry System SHALL use free testnet tokens (faucet ETH or MATIC) for gas fees
3. WHEN the system transitions to production THEN the Document Registry System SHALL support deployment on cost-effective networks like Polygon mainnet
4. WHEN blockchain transactions are executed THEN the Document Registry System SHALL optimize gas usage to minimize costs
5. WHEN users interact with the blockchain THEN the Document Registry System SHALL provide clear instructions for obtaining free testnet tokens

### Requirement 7: Document Privacy and Encryption

**User Story:** As a student, I want my academic documents to be private and encrypted, so that only authorized parties can access the content while verification remains public.

#### Acceptance Criteria

1. WHEN a document is uploaded THEN the Document Registry System SHALL encrypt the document content using AES-256 encryption before IPFS storage
2. WHEN encryption is performed THEN the Document Registry System SHALL generate a unique encryption key for each document
3. WHEN encryption keys are generated THEN the Document Registry System SHALL store keys securely in the backend database with access controls
4. WHEN a verifier requests document content THEN the Document Registry System SHALL require authentication and authorization before providing decryption keys
5. WHEN document hashes are stored on blockchain THEN the Document Registry System SHALL ensure only hashes are public, not the document content

### Requirement 8: QR Code Generation and Scanning

**User Story:** As an issuing authority, I want to embed QR codes in academic documents, so that verifiers can quickly scan and verify authenticity without manual data entry.

#### Acceptance Criteria

1. WHEN a document is successfully registered THEN the Document Registry System SHALL generate a QR code containing the blockchain transaction ID and document hash
2. WHEN a QR code is generated THEN the Document Registry System SHALL encode the verification URL with embedded parameters
3. WHEN a verifier scans a QR code THEN the Document Registry System SHALL decode the QR code and extract the transaction ID and hash
4. WHEN QR code data is extracted THEN the Document Registry System SHALL automatically initiate the verification process
5. WHEN verification completes THEN the Document Registry System SHALL display the verification result with document details and blockchain proof

### Requirement 9: Verification History and Audit Trail

**User Story:** As an administrator, I want to track all verification attempts, so that we can monitor system usage and detect suspicious activities.

#### Acceptance Criteria

1. WHEN a verification is performed THEN the Document Registry System SHALL log the verification attempt with timestamp, verifier information, and result
2. WHEN verification logs are created THEN the Document Registry System SHALL store them in the backend database
3. WHEN an administrator requests audit trails THEN the Document Registry System SHALL display all verification attempts for a specific document
4. WHEN suspicious patterns are detected THEN the Document Registry System SHALL flag repeated failed verification attempts
5. WHEN audit logs are queried THEN the Document Registry System SHALL provide filtering by date range, document ID, and verification status

### Requirement 10: User Interface for Document Management

**User Story:** As an issuing authority, I want an intuitive web interface to register and manage documents, so that I can efficiently process academic credentials.

#### Acceptance Criteria

1. WHEN an issuing authority logs in THEN the Document Registry System SHALL display a dashboard with options to register new documents and view registered documents
2. WHEN registering a document THEN the Document Registry System SHALL provide a form to upload the file, enter student details, and specify document type
3. WHEN a document is being processed THEN the Document Registry System SHALL display real-time progress indicators for hashing, IPFS upload, and blockchain transaction
4. WHEN a document registration completes THEN the Document Registry System SHALL display the transaction ID, QR code, and blockchain explorer link
5. WHEN viewing registered documents THEN the Document Registry System SHALL provide a searchable list with filters by student name, document type, and registration date

### Requirement 11: Public Verification Portal

**User Story:** As a verifier, I want a public web portal to verify documents, so that I can check authenticity without requiring an account or special permissions.

#### Acceptance Criteria

1. WHEN a verifier visits the verification portal THEN the Document Registry System SHALL display options to upload a document file or scan a QR code
2. WHEN a document is uploaded for verification THEN the Document Registry System SHALL compute the hash and query the blockchain
3. WHEN verification results are ready THEN the Document Registry System SHALL display whether the document is authentic, forged, or not found
4. WHEN a document is authentic THEN the Document Registry System SHALL show issuer details, issuance date, student information, and blockchain transaction link
5. WHEN a document is not found THEN the Document Registry System SHALL display a clear message indicating the document is not registered on the blockchain

### Requirement 12: Free IPFS Storage Integration

**User Story:** As a system administrator, I want to use free IPFS storage services, so that we can store documents without incurring storage costs during testing and initial deployment.

#### Acceptance Criteria

1. WHEN the system is configured THEN the Document Registry System SHALL support integration with Pinata free tier (1GB), Web3.Storage (unlimited), or NFT.Storage (free)
2. WHEN IPFS service limits are approached THEN the Document Registry System SHALL notify administrators and suggest upgrading or switching providers
3. WHEN documents are uploaded to IPFS THEN the Document Registry System SHALL implement retry logic for failed uploads
4. WHEN IPFS services are unavailable THEN the Document Registry System SHALL queue uploads and retry automatically
5. WHEN multiple IPFS providers are configured THEN the Document Registry System SHALL support fallback to alternative providers if the primary fails
