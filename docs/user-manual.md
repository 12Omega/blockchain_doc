Blockchain Document Verification System - User Manual

Table of Contents
1. [Getting Started](#getting-started)
2. [Administrator Guide](#administrator-guide)
3. [Document Upload Process](#document-upload-process)
4. [Document Verification](#document-verification)
5. [User Management](#user-management)
6. [Troubleshooting](#troubleshooting)

Getting Started

System What You Need
- Modern web browser (Chrome, Firefox, Safari, Edge)
- MetaMask wallet extension installed
- Ethereum testnet (Sepolia) access for testing

Initial Setup
1. Install MetaMask: Download and install the MetaMask browser extension
2. Connect Wallet: Click "Connect Wallet" on the homepage
3. Sign Authentication: Sign the authentication message to verify your identity
4. Complete Profile: Fill in your profile information and role

Administrator Guide

Setting Up Your Institution
1. Access Admin Panel: Navigate to the admin dashboard after connecting your wallet
2. Configure Institution: 
   - Enter institution name and details
   - Upload institution logo
   - Set verification policies
3. Manage Users: Add and assign roles to users (ISSUER, VERIFIER, STUDENT)

Role Management
- ADMIN: Full system access, user management, system Setting Things Up
- ISSUER: Can upload and issue documents for students
- VERIFIER: Can verify document authenticity
- STUDENT: Can view their own documents and share access

Bulk Operations
- Bulk User Import: Upload CSV file with user details
- Batch Document Processing: Process multiple documents simultaneously
- Report Generation: Generate usage and verification reports

Document Upload Process

For Issuers
1. Navigate to Upload: Click "Upload Document" in the dashboard
2. Select File: Choose the document file (PDF, DOC, DOCX supported)
3. Add Metadata:
   - Document type (Diploma, Certificate, Transcript)
   - Student information
   - Issue date and expiration
   - Additional notes
4. Review and Submit: Verify all information before submitting
5. Blockchain Registration: Wait for blockchain confirmation
6. Share with Student: Send access link to the student

Document Types Supported
- Academic Diplomas
- Certificates of Completion
- Academic Transcripts
- Professional Certifications
- Training Certificates

File What You Need
- Maximum file size: 10MB
- Supported formats: PDF, DOC, DOCX, JPG, PNG
- Files are encrypted before storage

Document Verification

For Verifiers
1. Access Verification: Click "Verify Document" on the homepage
2. Upload Document: Select the document file to verify
3. Scan QR Code: Alternatively, scan the QR code on the document
4. View Results: 
   - ✅ Verified: Document is authentic and unmodified
   - ❌ Invalid: Document has been tampered with or is not registered
   - ⚠️ Expired: Document has passed its expiration date

Verification Details
- Hash Comparison: System compares document hash with blockchain record
- Timestamp: Shows when document was originally registered
- Issuer Information: Displays who issued the document
- Verification History: Shows previous verification attempts

QR Code Verification
- Each document includes a unique QR code
- Scan with any QR code reader or the built-in scanner
- Provides instant verification results
- Works offline for basic hash verification

User Management

Profile Management
1. Update Profile: Click on your profile picture/name
2. Edit Information: Update contact details and preferences
3. Wallet Management: View connected wallet address
4. Security Settings: Manage authentication preferences

Document Access Control
- Share Documents: Generate secure sharing links
- Set Permissions: Control who can view your documents
- Revoke Access: Remove access for specific users
- Audit Trail: View who has accessed your documents

Notifications
- Email Alerts: Receive notifications for document activities
- Browser Notifications: Real-time updates for important events
- Verification Reports: Weekly summaries of verification activities

Troubleshooting

Common Issues

Wallet Connection Problems
Problem: MetaMask not connecting
Solution: 
1. Refresh the page
2. Check if MetaMask is unlocked
3. Switch to the correct network (Sepolia testnet)
4. Clear browser cache and cookies

Document Upload Failures
Problem: Upload fails or times out
Solution:
1. Check file size (must be under 10MB)
2. Verify file format is supported
3. Ensure stable internet connection
4. Try uploading during off-peak hours

Verification Issues
Problem: Document shows as invalid when it should be valid
Solution:
1. Ensure you're uploading the exact same file
2. Check if document has been modified since issuance
3. Verify the document was properly registered
4. Contact the issuing institution

Performance Issues
Problem: System is slow or unresponsive
Solution:
1. Clear browser cache
2. Disable unnecessary browser extensions
3. Check internet connection speed
4. Try using a different browser

Getting Help
- Support Email: [email]
- Documentation: Check the FAQ section
- Community Forum: Join our user community
- Live Chat: Available during business hours

System Status
- Service Status: Check system status page
- Maintenance Windows: Scheduled maintenance notifications
- Known Issues: Current system limitations and workarounds

Best Practices

Security
- Never share your private keys or seed phrases
- Always verify URLs before entering sensitive information
- Log out when using shared computers
- Keep your MetaMask extension updated

Document Management
- Keep original files in a secure location
- Regularly backup important documents
- Use descriptive names and metadata
- Monitor document access logs

Verification
- Always verify documents from official sources
- Check expiration dates
- Verify issuer credentials
- Keep verification records for audit purposes
