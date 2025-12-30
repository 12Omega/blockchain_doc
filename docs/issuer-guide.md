# Issuer Guide - Academic Document Blockchain Verification System

## Table of Contents
1. [Introduction](#introduction)
2. [Gettid](#getting-started)
3. [Registering Documents](#registering-documents)
4. [Managing Documents](#managing-documents)
5. [Batch Operations](#batch-operations)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Introduction

Welcome to the Issuer Guide for the Academic Document Blockchain Verification System. This guide is designed for authorized personnel at educational institutions who are responsible for issuing and registering academic credentials on the blockchain.

### What is an Issuer?

An **Issuer** is an authorized representative of an educational institution who has the permission to:
- Register academic documents on the blockchain
- Generate verification QR codes
- Manage document lifecycle (activation/deactivation)
- Grant document access to students and third parties
- View institutional document statistics

### Why Use Blockchain for Document Issuance?

**Benefits:**
- **Immutable Records**: Once registered, documents cannot be tampered with
- **Instant Verification**: Employers and institutions can verify credentials in seconds
- **Cost Reduction**: Eliminates manual verification processes
- **Global Accessibility**: Documents can be verified from anywhere, 24/7
- **Enhanced Security**: Cryptographic proof prevents forgery
- **Audit Trail**: Complete history of all document activities

### System Requirements

**Hardware:**
- Computer with internet connection
- Minimum 4GB RAM
- Modern processor (Intel i3 or equivalent)

**Software:**
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- MetaMask browser extension (latest version)
- PDF reader for document preparation

**Network:**
- Stable internet connection (minimum 5 Mbps)
- Access to Ethereum Sepolia testnet (for testing)
- Access to Polygon mainnet (for production)

## Getting Started

### Step 1: Install MetaMask

MetaMask is a cryptocurrency wallet that allows you to interact with the blockchain.

1. **Download MetaMask:**
   - Visit https://metamask.io
   - Click "Download" and select your browser
   - Install the extension

2. **Create Wallet:**
   - Click "Create a Wallet"
   - Set a strong password
   - **IMPORTANT**: Write down your Secret Recovery Phrase (12 words)
   - Store it in a secure location (never share it!)
   - Confirm your recovery phrase

3. **Add Sepolia Testnet** (for testing):
   - Click the network dropdown (top of MetaMask)
   - Click "Add Network"
   - Enter network details:
     ```
     Network Name: Sepolia
     RPC URL: https://sepolia.infura.io/v3/YOUR_PROJECT_ID
     Chain ID: 11155111
     Currency Symbol: ETH
     Block Explorer: https://sepolia.etherscan.io
     ```
   - Click "Save"

### Step 2: Get Testnet ETH

For testing purposes, you need free testnet ETH to pay for blockchain transactions.

1. **Copy Your Wallet Address:**
   - Open MetaMask
   - Click on your account name to copy address
   - Format: `0x742d35Cc6634C0532925a3b844D9db96590c4`

2. **Visit Faucets:**
   - Alchemy Faucet: https://www.alchemy.com/faucets/ethereum-sepolia
   - Sepolia Faucet: https://sepoliafaucet.com
   - Paste your wallet address
   - Complete captcha
   - Wait 1-2 minutes for ETH to arrive

3. **Verify Balance:**
   - Check MetaMask shows ~0.5 ETH
   - This is enough for hundreds of document registrations

### Step 3: Register as an Issuer

1. **Visit the Platform:**
   - Navigate to the application URL
   - Example: `https://your-institution.blockchain-docs.com`

2. **Connect Wallet:**
   - Click "Connect Wallet" button
   - MetaMask popup will appear
   - Click "Next" then "Connect"
   - Sign the authentication message

3. **Complete Profile:**
   - Fill in your information:
     - Full Name
     - Email Address
     - Institution Name
     - Department
     - Position/Title
   - Upload profile picture (optional)
   - Click "Save Profile"

4. **Request Issuer Role:**
   - Your account starts as "Student" role
   - Contact your system administrator
   - Provide your wallet address
   - Administrator will assign "Issuer" role
   - You'll receive email confirmation

5. **Verify Issuer Access:**
   - Refresh the page
   - You should now see "Issuer Dashboard"
   - "Upload Document" button should be visible

## Registering Documents

### Document Preparation

Before uploading, ensure your documents meet these requirements:

**File Requirements:**
- **Format**: PDF (recommended), DOC, DOCX, JPG, PNG
- **Size**: Maximum 10MB per file
- **Quality**: High resolution, clearly readable
- **Content**: Complete and finalized (no drafts)

**Document Checklist:**
- [ ] Official institution letterhead
- [ ] All required signatures
- [ ] Official seal/stamp
- [ ] Student information accurate
- [ ] Dates correct and formatted consistently
- [ ] No spelling or grammatical errors
- [ ] Document is final version (not draft)

**Best Practices:**
- Use PDF/A format for long-term preservation
- Ensure consistent formatting across all documents
- Include institution logo and branding
- Use high-quality scans (300 DPI minimum)
- Remove any sensitive information not needed for verification

### Single Document Registration

#### Step 1: Access Upload Form

1. Log in to the Issuer Dashboard
2. Click "Upload Document" or "Register New Document"
3. The document registration form will appear

#### Step 2: Upload Document File

1. **Drag and Drop:**
   - Drag your PDF file into the upload area
   - OR click "Browse Files" to select

2. **File Validation:**
   - System checks file size and format
   - Green checkmark indicates valid file
   - Red error shows if file is invalid

3. **Preview:**
   - Document preview appears
   - Verify it's the correct file
   - Check all pages are visible

#### Step 3: Enter Document Metadata

Fill in all required fields accurately:

**Student Information:**
```
Student Name: John Michael Doe
Student ID: STU2023001234
Email: john.doe@student.university.edu
Date of Birth: 1998-05-15 (optional)
```

**Document Details:**
```
Document Type: [Select from dropdown]
  - Bachelor's Degree
  - Master's Degree
  - Doctoral Degree
  - Diploma
  - Certificate
  - Transcript
  - Other

Program/Course: Computer Science
Specialization: Artificial Intelligence (optional)
```

**Academic Information:**
```
Issue Date: 2023-06-15
Graduation Date: 2023-05-20
Academic Year: 2019-2023
GPA: 3.85 (optional)
Class Rank: 15/200 (optional)
Honors: Magna Cum Laude (optional)
```

**Institution Information:**
```
Institution Name: University of Technology
Department: School of Computer Science
Campus: Main Campus (if multiple)
Country: Nepal
```

**Additional Information:**
```
Document Number: DEG-2023-CS-001234 (optional)
Expiration Date: None (or specific date)
Notes: Additional context or special remarks
```

#### Step 4: Review and Confirm

1. **Review Summary:**
   - Check all entered information
   - Verify student name spelling
   - Confirm dates are correct
   - Review document type selection

2. **Preview QR Code Location:**
   - System shows where QR code will be placed
   - Adjust position if needed (optional feature)

3. **Terms and Conditions:**
   - Read the terms of service
   - Check "I confirm this information is accurate"
   - Check "I have authority to issue this document"

#### Step 5: Submit for Registration

1. **Click "Register Document"**
   - System begins processing
   - Progress indicators show each step

2. **Processing Steps:**
   ```
   ✓ Computing document hash...
   ✓ Encrypting document...
   ✓ Uploading to IPFS...
   ✓ Preparing blockchain transaction...
   ⏳ Waiting for blockchain confirmation...
   ```

3. **MetaMask Confirmation:**
   - MetaMask popup appears
   - Review transaction details:
     - Gas fee (usually $0.01-0.10)
     - Contract interaction
   - Click "Confirm"
   - Wait 30-60 seconds for confirmation

4. **Registration Complete:**
   - Success message appears
   - Document hash displayed
   - Transaction ID shown
   - QR code generated

#### Step 6: Download and Share

1. **Download QR Code:**
   - Click "Download QR Code"
   - Save as PNG or SVG
   - Print quality: 300 DPI minimum

2. **Download Certificate:**
   - Click "Download Certificate with QR"
   - Original document with embedded QR code
   - Ready to send to student

3. **Copy Verification Link:**
   - Click "Copy Verification URL"
   - Share with student via email
   - Format: `https://verify.blockchain-docs.com/doc/0x7f9a8b...`

4. **Send to Student:**
   - Email the document with QR code
   - Include verification instructions
   - Provide verification URL
   - Explain how to verify authenticity

### Registration Confirmation Email

After successful registration, the system sends confirmation emails:

**To Issuer:**
```
Subject: Document Successfully Registered - John Doe

Dear [Issuer Name],

The following document has been successfully registered on the blockchain:

Student: John Doe (STU2023001234)
Document Type: Bachelor's Degree
Program: Computer Science
Issue Date: June 15, 2023

Document Hash: 0x7f9a8b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a
Transaction ID: 0xabc123def456...
Block Number: 18,500,000

Verification URL: https://verify.blockchain-docs.com/doc/0x7f9a8b...

The document is now permanently recorded and can be verified by anyone.

Best regards,
Blockchain Document Verification System
```

**To Student:**
```
Subject: Your Academic Document is Now Blockchain-Verified

Dear John Doe,

Congratulations! Your academic document has been registered on the blockchain by University of Technology.

Document Details:
- Type: Bachelor's Degree
- Program: Computer Science
- Issue Date: June 15, 2023

Your document is now tamper-proof and can be instantly verified by employers, universities, and other institutions worldwide.

Verification Options:
1. Share the QR code on your document
2. Share this verification link: [URL]
3. Upload your document to any verifier portal

Download your verified document: [Download Link]

Questions? Contact your institution or visit our help center.

Best regards,
University of Technology
```

## Managing Documents

### Viewing Registered Documents

1. **Access Document List:**
   - Navigate to "My Documents" or "Issued Documents"
   - View all documents you've registered

2. **Document List View:**
   ```
   ┌─────────────────────────────────────────────────────────┐
   │ Student Name    │ Document Type │ Issue Date │ Status   │
   ├─────────────────────────────────────────────────────────┤
   │ John Doe        │ Degree        │ 2023-06-15 │ Active   │
   │ Jane Smith      │ Certificate   │ 2023-06-10 │ Active   │
   │ Bob Johnson     │ Transcript    │ 2023-05-28 │ Revoked  │
   └─────────────────────────────────────────────────────────┘
   ```

3. **Search and Filter:**
   - Search by student name or ID
   - Filter by document type
   - Filter by date range
   - Filter by status (Active/Revoked/Expired)
   - Sort by any column

### Viewing Document Details

1. **Click on Document:**
   - Opens detailed view
   - Shows all metadata
   - Displays verification history

2. **Document Details Page:**
   ```
   Document Information
   ├── Document Hash: 0x7f9a8b6c...
   ├── IPFS CID: QmYwAPJzv5CZsnA...
   ├── Status: Active
   └── Blockchain: Ethereum Sepolia

   Student Information
   ├── Name: John Doe
   ├── Student ID: STU2023001234
   └── Email: john.doe@student.edu

   Academic Details
   ├── Document Type: Bachelor's Degree
   ├── Program: Computer Science
   ├── Issue Date: June 15, 2023
   └── GPA: 3.85/4.00

   Verification Statistics
   ├── Times Verified: 12
   ├── Last Verified: January 10, 2024
   ├── Unique Verifiers: 8
   └── Countries: USA, UK, Canada, Australia

   Blockchain Information
   ├── Transaction Hash: 0xabc123...
   ├── Block Number: 18,500,000
   ├── Network: Ethereum Sepolia
   └── Confirmations: 1,250
   ```

3. **Available Actions:**
   - View on Blockchain Explorer
   - Download Original Document
   - Regenerate QR Code
   - Grant Access to Third Party
   - Revoke Document (if needed)
   - View Audit Trail

### Granting Document Access

Sometimes you need to grant specific access to third parties:

1. **Click "Grant Access"**
2. **Enter Recipient Information:**
   ```
   Recipient Name: ABC Corporation HR Department
   Email: hr@abccorp.com
   Wallet Address: 0x123abc... (optional)
   Access Duration: 30 days (or permanent)
   Purpose: Employment Verification
   ```

3. **Set Permissions:**
   - View document metadata
   - Download encrypted document
   - View verification history
   - Receive verification notifications

4. **Send Access Grant:**
   - System sends email with access link
   - Recipient can view document details
   - Access is logged in audit trail

### Revoking Documents

If a document needs to be revoked (e.g., issued in error, student expelled):

1. **Navigate to Document**
2. **Click "Revoke Document"**
3. **Provide Reason:**
   ```
   Reason for Revocation:
   [ ] Issued in error
   [ ] Student expelled
   [ ] Document superseded
   [ ] Fraudulent application
   [ ] Other: [Specify reason]
   
   Additional Notes: [Detailed explanation]
   ```

4. **Confirm Revocation:**
   - Warning: This action is permanent
   - Document will show as "Revoked" in verifications
   - Blockchain record remains (for audit trail)
   - Student and relevant parties are notified

5. **Revocation Effects:**
   - Document marked as revoked on blockchain
   - Verification attempts show "Revoked" status
   - Original document remains accessible (for records)
   - Audit trail updated with revocation details

## Batch Operations

For institutions processing multiple documents, batch operations save significant time.

### Preparing Batch Upload

1. **Download Template:**
   - Click "Batch Upload" in dashboard
   - Download CSV template
   - Template includes all required fields

2. **CSV Template Format:**
   ```csv
   student_name,student_id,email,document_type,program,issue_date,graduation_date,gpa,honors,file_path
   John Doe,STU001,john@email.com,degree,Computer Science,2023-06-15,2023-05-20,3.85,Magna Cum Laude,/path/to/john_doe_degree.pdf
   Jane Smith,STU002,jane@email.com,degree,Business Admin,2023-06-15,2023-05-20,3.92,Summa Cum Laude,/path/to/jane_smith_degree.pdf
   ```

3. **Prepare Files:**
   - Organize all PDF files in one folder
   - Name files consistently (e.g., `studentid_documenttype.pdf`)
   - Ensure all files meet size and format requirements
   - Verify file paths in CSV are correct

### Uploading Batch

1. **Upload CSV File:**
   - Click "Upload CSV"
   - Select your prepared CSV file
   - System validates format and data

2. **Upload Document Files:**
   - Click "Upload Documents"
   - Select all PDF files
   - Or drag and drop entire folder
   - System matches files to CSV entries

3. **Review Batch:**
   ```
   Batch Summary
   ├── Total Documents: 50
   ├── Valid Entries: 48
   ├── Errors: 2
   └── Estimated Time: 25 minutes
   
   Errors:
   - Row 15: Missing student email
   - Row 32: File not found
   ```

4. **Fix Errors:**
   - Click on error to see details
   - Edit CSV or upload missing files
   - Re-validate batch

5. **Start Batch Processing:**
   - Click "Process Batch"
   - Confirm MetaMask transaction (one-time for batch)
   - System processes documents sequentially
   - Progress bar shows completion status

### Monitoring Batch Progress

1. **Real-time Progress:**
   ```
   Processing Batch: 25/50 documents
   
   ✓ John Doe - Completed
   ✓ Jane Smith - Completed
   ⏳ Bob Johnson - Uploading to IPFS...
   ⏳ Alice Williams - Computing hash...
   ⏸ Remaining: 25 documents
   ```

2. **Pause/Resume:**
   - Click "Pause" to stop processing
   - Resume later from where you left off
   - Useful for large batches or network issues

3. **Error Handling:**
   - Failed documents are flagged
   - Can retry individual documents
   - Error log available for download

### Batch Completion

1. **Summary Report:**
   ```
   Batch Processing Complete
   
   Success: 48/50 documents
   Failed: 2 documents
   Total Time: 23 minutes
   Total Gas Cost: 0.05 ETH (~$8.50)
   
   Failed Documents:
   - Bob Johnson: IPFS upload timeout
   - Alice Williams: Invalid file format
   ```

2. **Download Results:**
   - CSV with all document hashes
   - QR codes (ZIP file)
   - Verification URLs
   - Error log (if any failures)

3. **Retry Failed Documents:**
   - Click "Retry Failed"
   - System attempts to process again
   - Or process individually with corrections

## Best Practices

### Document Quality

1. **Use High-Quality Scans:**
   - 300 DPI minimum resolution
   - Color scans for official seals
   - Ensure all text is readable
   - No shadows or distortions

2. **Consistent Formatting:**
   - Use institution templates
   - Maintain consistent fonts and layouts
   - Include all required elements
   - Follow institutional branding guidelines

3. **Verification Elements:**
   - Include official letterhead
   - Add authorized signatures
   - Apply official seals/stamps
   - Include document number/reference

### Data Accuracy

1. **Double-Check Information:**
   - Verify student names (exact spelling)
   - Confirm student IDs
   - Check dates (issue, graduation)
   - Validate program names

2. **Use Standardized Formats:**
   - Dates: YYYY-MM-DD
   - Names: First Middle Last
   - IDs: Consistent format (e.g., STU2023001234)
   - Programs: Official names from catalog

3. **Maintain Records:**
   - Keep copies of all registered documents
   - Document any corrections or revocations
   - Maintain correspondence with students
   - Archive batch processing logs

### Security

1. **Protect Your Wallet:**
   - Never share your private key or seed phrase
   - Use strong MetaMask password
   - Enable MetaMask password timeout
   - Consider hardware wallet for production

2. **Verify Transactions:**
   - Always review MetaMask transaction details
   - Check gas fees are reasonable
   - Verify contract address is correct
   - Confirm transaction before signing

3. **Access Control:**
   - Only authorized personnel should have issuer role
   - Use separate accounts for different departments
   - Regularly audit issuer accounts
   - Revoke access for former employees

### Efficiency

1. **Batch Processing:**
   - Use batch upload for 10+ documents
   - Process during off-peak hours
   - Prepare all files before starting
   - Monitor progress and handle errors promptly

2. **Template Usage:**
   - Create document templates
   - Use CSV templates for batch uploads
   - Standardize metadata fields
   - Automate where possible

3. **Communication:**
   - Set up automated email notifications
   - Provide clear instructions to students
   - Create FAQ for common questions
   - Maintain support contact information

## Troubleshooting

### Common Issues

#### Issue: MetaMask Transaction Fails

**Symptoms:**
- "Transaction failed" error
- "Insufficient funds" message
- Transaction stuck pending

**Solutions:**

1. **Check ETH Balance:**
   ```
   - Open MetaMask
   - Verify you have enough ETH for gas
   - Minimum: 0.01 ETH recommended
   - Get more from faucet if needed
   ```

2. **Increase Gas Limit:**
   ```
   - Click "Edit" on MetaMask transaction
   - Increase gas limit by 20%
   - Try again
   ```

3. **Clear Pending Transactions:**
   ```
   - Go to MetaMask Settings > Advanced
   - Click "Reset Account"
   - This clears pending transactions
   - Try uploading again
   ```

4. **Network Congestion:**
   ```
   - Check Etherscan for network status
   - Wait 10-15 minutes
   - Try during off-peak hours
   - Consider increasing gas price
   ```

#### Issue: File Upload Fails

**Symptoms:**
- Upload progress stops
- "Upload failed" error
- File not accepted

**Solutions:**

1. **Check File Requirements:**
   ```
   - Size: Must be under 10MB
   - Format: PDF, DOC, DOCX, JPG, PNG only
   - Compress large files if needed
   - Convert to PDF if other format
   ```

2. **Network Issues:**
   ```
   - Check internet connection
   - Try uploading again
   - Use wired connection if possible
   - Disable VPN temporarily
   ```

3. **Browser Issues:**
   ```
   - Clear browser cache
   - Try different browser
   - Disable ad blockers
   - Update browser to latest version
   ```

#### Issue: IPFS Upload Timeout

**Symptoms:**
- "IPFS upload failed" error
- Upload takes very long
- Timeout message

**Solutions:**

1. **Retry Upload:**
   ```
   - System automatically tries fallback providers
   - Wait for automatic retry
   - Or click "Retry" button
   ```

2. **Check File Size:**
   ```
   - Large files take longer
   - Compress if over 5MB
   - Split very large documents
   ```

3. **Network Connection:**
   ```
   - Ensure stable internet
   - Avoid uploading during peak hours
   - Try again in a few minutes
   ```

#### Issue: Document Not Appearing in List

**Symptoms:**
- Upload successful but document not visible
- Empty document list
- Missing recent uploads

**Solutions:**

1. **Refresh Page:**
   ```
   - Click browser refresh
   - Or press F5
   - Wait for page to fully load
   ```

2. **Check Filters:**
   ```
   - Clear any active filters
   - Check date range selection
   - Verify status filter (Active/All)
   ```

3. **Blockchain Confirmation:**
   ```
   - Transaction may still be pending
   - Check MetaMask for confirmation
   - Wait 1-2 minutes for blockchain confirmation
   - Refresh page after confirmation
   ```

#### Issue: QR Code Not Generating

**Symptoms:**
- QR code area blank
- "Failed to generate QR code" error
- QR code image broken

**Solutions:**

1. **Regenerate QR Code:**
   ```
   - Go to document details
   - Click "Regenerate QR Code"
   - Download new QR code
   ```

2. **Browser Compatibility:**
   ```
   - Try different browser
   - Enable JavaScript
   - Clear browser cache
   - Update browser
   ```

3. **Download Alternative:**
   ```
   - Copy verification URL manually
   - Use online QR code generator
   - Generate QR from document hash
   ```

### Getting Help

#### Self-Service Resources

1. **Documentation:**
   - User Manual: Complete system guide
   - Video Tutorials: Step-by-step walkthroughs
   - FAQ: Common questions answered
   - API Docs: For technical integration

2. **System Status:**
   - Check status page: status.blockchain-docs.com
   - View current incidents
   - Scheduled maintenance notices
   - Service health indicators

#### Contact Support

**Email Support:**
- General: support@blockchain-docs.com
- Technical: tech-support@blockchain-docs.com
- Urgent: urgent@blockchain-docs.com

**Response Times:**
- General inquiries: 24 hours
- Technical issues: 4 hours
- Urgent issues: 1 hour
- Critical outages: Immediate

**Phone Support:**
- Main: +1-XXX-XXX-XXXX
- Hours: Monday-Friday, 9 AM - 5 PM EST
- Emergency: 24/7 for critical issues

**Live Chat:**
- Available: Monday-Friday, 9 AM - 5 PM EST
- Access from dashboard
- Average response: 5 minutes

#### Information to Provide

When contacting support, include:

1. **Your Information:**
   - Name and institution
   - Wallet address
   - Email address
   - Role (Issuer)

2. **Issue Details:**
   - What you were trying to do
   - What happened instead
   - Error messages (exact text)
   - Screenshots if possible

3. **Technical Details:**
   - Browser and version
   - Operating system
   - MetaMask version
   - Transaction hash (if applicable)

4. **Steps to Reproduce:**
   - Step 1: Logged in as issuer
   - Step 2: Clicked "Upload Document"
   - Step 3: Selected file and filled form
   - Step 4: Error occurred when clicking "Register"

---

## Appendix

### Glossary

- **Blockchain**: Distributed ledger technology that stores data immutably
- **Document Hash**: Unique cryptographic fingerprint of a document
- **Gas Fee**: Cost to execute blockchain transactions (paid in ETH)
- **IPFS**: InterPlanetary File System - decentralized storage network
- **MetaMask**: Browser extension for interacting with blockchain
- **Private Key**: Secret key that controls your blockchain account
- **QR Code**: Scannable code containing verification information
- **Smart Contract**: Self-executing code on the blockchain
- **Transaction**: Operation recorded on the blockchain
- **Wallet Address**: Public identifier for your blockchain account

### Keyboard Shortcuts

- `Ctrl/Cmd + U`: Quick upload document
- `Ctrl/Cmd + F`: Search documents
- `Ctrl/Cmd + B`: Batch upload
- `Ctrl/Cmd + R`: Refresh document list
- `Esc`: Close modal/dialog

### Document Type Reference

| Type | Description | Typical Use |
|------|-------------|-------------|
| Bachelor's Degree | Undergraduate degree | Employment, further education |
| Master's Degree | Graduate degree | Employment, doctoral programs |
| Doctoral Degree | PhD or equivalent | Academic positions, research |
| Diploma | Completion certificate | Vocational training, courses |
| Certificate | Achievement certificate | Professional development |
| Transcript | Academic record | University applications |
| Letter of Recommendation | Reference letter | Applications, employment |

### Gas Fee Estimates

| Operation | Estimated Gas | Cost (Sepolia) | Cost (Mainnet) |
|-----------|---------------|----------------|----------------|
| Single Document | 150,000 gas | Free (testnet) | ~$0.50-2.00 |
| Batch (10 docs) | 1,200,000 gas | Free (testnet) | ~$4.00-15.00 |
| Revoke Document | 50,000 gas | Free (testnet) | ~$0.20-0.80 |
| Grant Access | 80,000 gas | Free (testnet) | ~$0.30-1.20 |

*Mainnet costs vary with ETH price and network congestion*

### Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│           ISSUER QUICK REFERENCE                        │
├─────────────────────────────────────────────────────────┤
│ Upload Document:                                        │
│   Dashboard → Upload Document → Fill Form → Register   │
│                                                         │
│ Batch Upload:                                           │
│   Dashboard → Batch Upload → CSV + Files → Process     │
│                                                         │
│ View Documents:                                         │
│   Dashboard → My Documents → Search/Filter              │
│                                                         │
│ Revoke Document:                                        │
│   Document Details → Revoke → Provide Reason → Confirm │
│                                                         │
│ Grant Access:                                           │
│   Document Details → Grant Access → Enter Info → Send  │
│                                                         │
│ Support:                                                │
│   Email: support@blockchain-docs.com                    │
│   Phone: +1-XXX-XXX-XXXX                               │
│   Chat: Available in dashboard                          │
└─────────────────────────────────────────────────────────┘
```

---

**Document Version:** 1.0  
**Last Updated:** November 27, 2024  
**Next Review:** May 27, 2025

For the latest version of this guide, visit: https://docs.blockchain-docs.com/issuer-guide



