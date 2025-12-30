# Student/Owner Portal

## Overview

The Student/Owner Portal is a comprehensive interface for document owners to manage their academic documents, control access permissions, and monitor verification activities.

## Components

### 1. StudentPortal (Main Component)
- **Location**: `StudentPortal.js`
- **Purpose**: Main container with tabbed navigation
- **Features**:
  - Three-tab interface (My Documents, Access Management, Access Logs)
  - Authentication check
  - Responsive layout

### 2. MyDocuments
- **Location**: `MyDocuments.js`
- **Purpose**: View and manage owned documents
- **Features**:
  - Document grid view with search and filters
  - Document type filtering
  - View document details
  - Download documents (for blockchain-stored documents)
  - Share documents and manage access
  - Pagination support
  - Real-time status indicators

### 3. DocumentViewer
- **Location**: `DocumentViewer.js`
- **Purpose**: Display detailed document information
- **Features**:
  - Complete document metadata display
  - Technical details (hash, IPFS CID, file info)
  - Blockchain verification details
  - QR code generation for verification
  - Copy verification link
  - Download capability
  - Blockchain explorer integration

### 4. AccessManagement
- **Location**: `AccessManagement.js`
- **Purpose**: Manage document access permissions
- **Features**:
  - Grant access to specific wallet addresses
  - Revoke access from viewers
  - View current access list (owner, issuer, viewers)
  - Transfer document ownership
  - Document selection dropdown
  - Real-time access updates

### 5. AccessLogs
- **Location**: `AccessLogs.js`
- **Purpose**: Monitor document verification activities
- **Features**:
  - Verification history table
  - Filter by status, date range
  - Pagination
  - Summary statistics
  - Verifier information
  - Verification method tracking
  - Location data (when available)

## Requirements Validation

This implementation satisfies **Requirement 7.4** from the design document:

> "As a student, I want my academic documents to be private and encrypted, so that only authorized parties can access the content while verification remains public."

### Implemented Features:

1. ✅ **"My Documents" view** - Complete document listing with search and filters
2. ✅ **Document viewer with download capability** - Full document details with secure download
3. ✅ **Access management interface (grant/revoke)** - Comprehensive access control
4. ✅ **Display access logs for each document** - Detailed verification history
5. ✅ **Document transfer request functionality** - Ownership transfer capability
6. ✅ **Integration with backend document management APIs** - Full API integration

## API Integration

### Endpoints Used:

1. **GET /api/documents** - Fetch user's documents
2. **GET /api/documents/:documentHash** - Get document details
3. **GET /api/documents/:documentHash/download** - Download document
4. **POST /api/documents/:documentHash/access/grant** - Grant access
5. **POST /api/documents/:documentHash/access/revoke** - Revoke access
6. **POST /api/documents/:documentHash/transfer** - Transfer ownership
7. **GET /api/documents/:documentHash/audit** - Get access logs

## Usage

```javascript
import StudentPortal from './components/StudentPortal';

// In your routing configuration
<Route path="/student-portal" element={<StudentPortal />} />
```

## Authentication

The portal requires user authentication via wallet connection. If the user is not authenticated, a warning message is displayed prompting them to connect their wallet.

## Permissions

- **Document Owners**: Full access to all features
- **Authorized Viewers**: Can view documents they have been granted access to
- **Public**: Can verify documents but cannot access the portal

## Styling

The portal uses Material-UI components with a consistent theme:
- Responsive grid layout
- Card-based document display
- Color-coded status indicators
- Icon-based actions
- Mobile-friendly design

## Testing

A test suite is included in `StudentPortal.test.js` that covers:
- Authentication checks
- Tab navigation
- Component rendering
- User interactions

## Future Enhancements

Potential improvements:
- Bulk access management
- Export access logs to CSV
- Document analytics dashboard
- Notification system for verification attempts
- Advanced filtering options
- Document expiration alerts
