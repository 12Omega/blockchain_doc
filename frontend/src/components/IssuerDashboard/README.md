# Issuer Dashboard

This directory contains the Issuer Dashboard components for the Academic Document Blockchain Verification System.

## Components

### IssuerDashboard.js
Main dashboard component that integrates all issuer functionality:
- Tab-based navigation (Register Document, My Documents, Registration Result)
- Role-based access control (issuer and admin only)
- Integration with backend registration API
- Batch upload functionality
- Document management

### DocumentUploadForm.js
Document registration form with the following features:
- Drag-and-drop file upload
- Student information input fields
- Document type selection (degree, diploma, certificate, transcript, other)
- Date validation (issue date, expiry date)
- Form validation with error messages
- Support for PDF, DOC, DOCX, JPG, PNG files (max 10MB)

### RegistrationProgress.js
Real-time progress indicator showing registration steps:
1. Computing Document Hash (SHA-256)
2. Encrypting Document (AES-256)
3. Uploading to IPFS
4. Blockchain Registration
5. Generating QR Code

Each step shows status: pending, active, completed, or error.

### QRCodeDisplay.js
Displays registration results after successful document registration:
- Success confirmation message
- QR code image with download option
- Document information (student details, document type, institution)
- Blockchain details (transaction hash, block number, explorer link)
- IPFS storage details (CID, provider)
- Verification URL with copy functionality

### DocumentList.js
List view of registered documents with:
- Search functionality (by student name, ID, institution, course)
- Filters (status, document type)
- Pagination
- Document cards showing key information
- Actions: View Details, View QR Code
- Status indicators (verified, uploaded, failed)

### BatchUploadModal.js
Modal for uploading multiple documents at once:
- Drag-and-drop multiple files
- Filename parsing (StudentID_StudentName.ext format)
- Common metadata for all documents
- Individual upload progress tracking
- Success/failure indicators per file
- Automatic retry on transient failures

## Integration

The Issuer Dashboard is integrated into the main App.js:
- Accessible via "Issuer Dashboard" navigation button
- Only visible to users with 'issuer' or 'admin' role
- Uses AuthContext for authentication and authorization
- Communicates with backend via documentService

## API Integration

The dashboard integrates with the following backend endpoints:
- `POST /api/documents/register` - Register new document
- `GET /api/documents` - Get list of documents with filters
- `GET /api/documents/:documentHash` - Get document details

## Requirements Satisfied

This implementation satisfies the following requirements from tasks.md:

**Task 11: Implement Issuer Dashboard Frontend**
- ✅ Create document upload form with drag-and-drop
- ✅ Add student information input fields
- ✅ Implement document type selection
- ✅ Add real-time registration progress indicators
- ✅ Display QR code after successful registration
- ✅ Create document list view with search and filters
- ✅ Add batch upload modal for multiple documents
- ✅ Integrate with backend registration API

**Requirements Coverage:**
- ✅ 1.5: QR code generation and display
- ✅ 10.1: Dashboard with document registration options
- ✅ 10.2: Form with file upload and student details
- ✅ 10.3: Real-time progress indicators
- ✅ 10.4: Display transaction ID, QR code, and blockchain explorer link
- ✅ 10.5: Searchable document list with filters

## Usage

```javascript
import { IssuerDashboard } from './components/IssuerDashboard';

// In your App component
{currentView === 'issuer' && isAuthenticated && (
  <IssuerDashboard />
)}
```

## Dependencies

- @mui/material - Material-UI components
- @mui/icons-material - Material-UI icons
- react-dropzone - Drag-and-drop file upload
- AuthContext - Authentication and user context

## Future Enhancements

- Real-time QR code generation from backend data
- Document preview before registration
- Export document list to CSV
- Advanced search with date ranges
- Document analytics dashboard
- Bulk operations (delete, transfer)
