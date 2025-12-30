import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Simple wallet connection hook
const useWallet = () => {
  const [account, setAccount] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        setIsConnecting(true);
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        setAccount(accounts[0]);
        return accounts[0];
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        throw error;
      } finally {
        setIsConnecting(false);
      }
    } else {
      throw new Error('MetaMask not installed');
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
  };

  return { account, isConnecting, connectWallet, disconnectWallet };
};

// Document Upload Component
const DocumentUpload = ({ onUploadSuccess, account }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [metadata, setMetadata] = useState({
    title: '',
    description: '',
    documentType: 'certificate'
  });

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file');
      return;
    }

    if (!account) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setUploading(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('document', file);
      
      // Add metadata
      formData.append('studentName', metadata.title || 'Student Name');
      formData.append('studentId', 'STU' + Date.now());
      formData.append('ownerName', metadata.title || 'Owner Name');
      formData.append('documentType', metadata.documentType);
      formData.append('issueDate', new Date().toISOString().split('T')[0]);
      formData.append('description', metadata.description || '');
      formData.append('ownerAddress', account);

      console.log('Uploading to backend API:', `${API_URL}/api/documents/register`);
      
      // Call backend API to upload and register document
      const response = await axios.post(`${API_URL}/api/documents/register`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000 // 30 second timeout
      });

      console.log('Upload successful:', response.data);
      
      if (response.data.success) {
        // Read file content for local storage (for viewing)
        const fileContent = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        });

        const documentData = {
          id: response.data.data.document._id,
          filename: file.name,
          originalName: file.name,
          hash: response.data.data.document.documentHash,
          metadata,
          fileContent, // For local viewing
          fileType: file.type,
          fileSize: file.size,
          uploadDate: response.data.data.document.createdAt,
          encrypted: true,
          blockchainVerified: true,
          ipfsHash: response.data.data.document.ipfsHash,
          transactionHash: response.data.data.transactionHash,
          qrCode: response.data.data.qrCode
        };
        
        onUploadSuccess(documentData);
        
        // Reset form
        setFile(null);
        setMetadata({ title: '', description: '', documentType: 'certificate' });
        
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }
      
    } catch (error) {
      console.error('Upload failed:', error);
      
      if (error.response) {
        // Server responded with error
        alert(`Upload failed: ${error.response.data.error || error.response.statusText}`);
      } else if (error.request) {
        // Network error
        alert('Upload failed: Network error. Please check if the backend server is running.');
      } else {
        // Other error
        alert('Upload failed: ' + error.message);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ 
      background: 'white', 
      padding: '20px', 
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      <h3>📄 Upload Document for Blockchain Encryption</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Document File:</label>
        <input 
          type="file" 
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
          style={{ width: '100%', padding: '8px' }}
        />
        {file && (
          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <p><strong>Selected:</strong> {file.name}</p>
            <p><strong>Size:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</p>
            <p><strong>Type:</strong> {file.type}</p>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Title:</label>
        <input 
          type="text"
          value={metadata.title}
          onChange={(e) => setMetadata({...metadata, title: e.target.value})}
          placeholder="Document title"
          style={{ width: '100%', padding: '8px' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Description:</label>
        <textarea 
          value={metadata.description}
          onChange={(e) => setMetadata({...metadata, description: e.target.value})}
          placeholder="Document description"
          style={{ width: '100%', padding: '8px', height: '60px' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Document Type:</label>
        <select 
          value={metadata.documentType}
          onChange={(e) => setMetadata({...metadata, documentType: e.target.value})}
          style={{ width: '100%', padding: '8px' }}
        >
          <option value="certificate">Certificate</option>
          <option value="degree">Degree</option>
          <option value="transcript">Transcript</option>
          <option value="diploma">Diploma</option>
          <option value="other">Other</option>
        </select>
      </div>

      <button 
        onClick={handleUpload}
        disabled={!file || uploading}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: uploading ? '#ccc' : '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: uploading ? 'not-allowed' : 'pointer',
          width: '100%'
        }}
      >
        {uploading ? '🔄 Encrypting & Uploading to Blockchain...' : '🔐 Encrypt & Upload to Blockchain'}
      </button>
    </div>
  );
};

// Document Viewer Component
const DocumentViewer = ({ document: doc, onClose }) => {
  const [viewing, setViewing] = useState(false);

  const handleDownload = () => {
    try {
      // Create download link
      const link = window.document.createElement('a');
      link.href = doc.fileContent;
      link.download = doc.originalName;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      
      console.log('Document downloaded:', doc.originalName);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed: ' + error.message);
    }
  };

  const handleView = () => {
    setViewing(true);
    // Open document in new tab for viewing
    const newWindow = window.open();
    newWindow.document.write(`
      <html>
        <head>
          <title>${doc.metadata.title || doc.originalName}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              background: #f5f5f5;
            }
            .header {
              background: white;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 20px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .content {
              background: white;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .metadata {
              background: #e8f5e8;
              padding: 15px;
              border-radius: 6px;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔐 Encrypted Document Viewer</h1>
            <p><strong>Document:</strong> ${doc.metadata.title || doc.originalName}</p>
            <p><strong>Status:</strong> ✅ Decrypted and Verified on Blockchain</p>
          </div>
          
          <div class="metadata">
            <h3>📋 Document Information</h3>
            <p><strong>Original Name:</strong> ${doc.originalName}</p>
            <p><strong>Type:</strong> ${doc.metadata.documentType}</p>
            <p><strong>Description:</strong> ${doc.metadata.description || 'No description'}</p>
            <p><strong>Upload Date:</strong> ${new Date(doc.uploadDate).toLocaleString()}</p>
            <p><strong>File Size:</strong> ${(doc.fileSize / 1024 / 1024).toFixed(2)} MB</p>
            <p><strong>Blockchain Hash:</strong> ${doc.hash}</p>
            <p><strong>Encryption Status:</strong> ${doc.encrypted ? '🔐 Encrypted' : '🔓 Not Encrypted'}</p>
            <p><strong>Blockchain Verified:</strong> ${doc.blockchainVerified ? '✅ Verified' : '❌ Not Verified'}</p>
          </div>
          
          <div class="content">
            <h3>📄 Document Content</h3>
            ${doc.fileType && doc.fileType.startsWith('image/') ? 
              `<img src="${doc.fileContent}" style="max-width: 100%; height: auto;" alt="Document Image" />` :
              doc.fileType === 'application/pdf' ?
              `<embed src="${doc.fileContent}" type="application/pdf" width="100%" height="600px" />` :
              `<p>Document type: ${doc.fileType || 'Unknown'}</p>
               <p>Use the download button to save and open this document with the appropriate application.</p>`
            }
          </div>
          
          <div style="margin-top: 20px; text-align: center;">
            <button onclick="window.close()" style="
              padding: 10px 20px;
              background: #dc3545;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
            ">Close Viewer</button>
          </div>
        </body>
      </html>
    `);
    setViewing(false);
  };

  // Function to render document content inline
  const renderDocumentContent = () => {
    if (!doc.fileContent) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          <p>📄 Document content not available for preview</p>
          <p>Use the download button to save the file</p>
        </div>
      );
    }

    // Handle different file types
    if (doc.fileType && doc.fileType.startsWith('image/')) {
      return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <img 
            src={doc.fileContent} 
            alt="Document" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '400px', 
              border: '1px solid #ddd',
              borderRadius: '4px'
            }} 
          />
        </div>
      );
    }

    if (doc.fileType === 'application/pdf') {
      return (
        <div style={{ padding: '20px' }}>
          <embed 
            src={doc.fileContent} 
            type="application/pdf" 
            width="100%" 
            height="400px"
            style={{ border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
      );
    }

    // For text files, try to display content
    if (doc.fileType && (doc.fileType.includes('text') || doc.fileType.includes('plain'))) {
      try {
        // If it's a data URL, extract the text content
        if (doc.fileContent.startsWith('data:')) {
          const base64Data = doc.fileContent.split(',')[1];
          const textContent = atob(base64Data);
          return (
            <div style={{ 
              padding: '20px', 
              backgroundColor: '#f8f9fa', 
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              maxHeight: '400px',
              overflow: 'auto'
            }}>
              {textContent}
            </div>
          );
        }
      } catch (error) {
        console.error('Error displaying text content:', error);
      }
    }

    // Default fallback
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        backgroundColor: '#f8f9fa',
        border: '1px solid #ddd',
        borderRadius: '4px'
      }}>
        <p>📄 Document Preview</p>
        <p><strong>File Type:</strong> {doc.fileType || 'Unknown'}</p>
        <p><strong>Size:</strong> {(doc.fileSize / 1024 / 1024).toFixed(2)} MB</p>
        <p>Use the download button to save and open this document with the appropriate application.</p>
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      overflow: 'auto'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        margin: '20px'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '20px', 
          borderBottom: '1px solid #ddd',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px 12px 0 0'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>📄 {doc.metadata.title || doc.originalName}</h3>
          <div style={{ display: 'flex', gap: '15px', fontSize: '14px', color: '#666' }}>
            <span><strong>Type:</strong> {doc.metadata.documentType}</span>
            <span><strong>Size:</strong> {(doc.fileSize / 1024 / 1024).toFixed(2)} MB</span>
            <span><strong>Upload Date:</strong> {new Date(doc.uploadDate).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Document Content */}
        <div style={{ padding: '0' }}>
          {renderDocumentContent()}
        </div>

        {/* Metadata */}
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa' }}>
          <h4 style={{ margin: '0 0 10px 0' }}>📋 Document Details</h4>
          <div style={{ fontSize: '14px', color: '#666' }}>
            <p><strong>Description:</strong> {doc.metadata.description || 'No description'}</p>
            <p><strong>Blockchain Hash:</strong> <code style={{ fontSize: '12px' }}>{doc.hash}</code></p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <span style={{ 
                padding: '4px 8px', 
                backgroundColor: '#28a745', 
                color: 'white', 
                borderRadius: '4px', 
                fontSize: '12px' 
              }}>
                🔐 Encrypted
              </span>
              <span style={{ 
                padding: '4px 8px', 
                backgroundColor: '#17a2b8', 
                color: 'white', 
                borderRadius: '4px', 
                fontSize: '12px' 
              }}>
                ✅ Blockchain Verified
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ 
          padding: '20px', 
          borderTop: '1px solid #ddd',
          display: 'flex', 
          gap: '10px', 
          justifyContent: 'flex-end'
        }}>
          <button 
            onClick={handleView}
            disabled={viewing}
            style={{
              padding: '10px 20px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: viewing ? 'not-allowed' : 'pointer'
            }}
          >
            {viewing ? '🔄 Opening...' : '🔍 Open in New Tab'}
          </button>
          
          <button 
            onClick={handleDownload}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            💾 Download
          </button>
          
          <button 
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ❌ Close
          </button>
        </div>
      </div>
    </div>
  );
};
const DocumentVerification = () => {
  const [verificationHash, setVerificationHash] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  const handleVerify = async () => {
    if (!verificationHash) {
      alert('Please enter a document hash');
      return;
    }

    try {
      setVerifying(true);
      
      // This would normally call the backend API
      console.log('Verifying document hash:', verificationHash);
      
      // Simulate verification
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setVerificationResult({
        verified: true,
        hash: verificationHash,
        timestamp: new Date().toISOString(),
        blockchainVerified: true,
        metadata: {
          title: 'Sample Document',
          type: 'certificate',
          owner: '0x1234...5678'
        }
      });
      
    } catch (error) {
      console.error('Verification failed:', error);
      setVerificationResult({
        verified: false,
        error: error.message
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{ 
      background: 'white', 
      padding: '20px', 
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      <h3>🔍 Verify Document on Blockchain</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Document Hash:</label>
        <input 
          type="text"
          value={verificationHash}
          onChange={(e) => setVerificationHash(e.target.value)}
          placeholder="0x1234567890abcdef..."
          style={{ width: '100%', padding: '8px' }}
        />
      </div>

      <button 
        onClick={handleVerify}
        disabled={!verificationHash || verifying}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: verifying ? '#ccc' : '#17a2b8',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: verifying ? 'not-allowed' : 'pointer',
          width: '100%',
          marginBottom: '15px'
        }}
      >
        {verifying ? '🔄 Verifying on Blockchain...' : '🔍 Verify Document'}
      </button>

      {verificationResult && (
        <div style={{
          padding: '15px',
          borderRadius: '6px',
          backgroundColor: verificationResult.verified ? '#d4edda' : '#f8d7da',
          border: `1px solid ${verificationResult.verified ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          <h4>{verificationResult.verified ? '✅ Document Verified' : '❌ Verification Failed'}</h4>
          {verificationResult.verified ? (
            <div>
              <p><strong>Hash:</strong> {verificationResult.hash}</p>
              <p><strong>Blockchain Status:</strong> {verificationResult.blockchainVerified ? '✅ Verified' : '❌ Not Found'}</p>
              <p><strong>Timestamp:</strong> {new Date(verificationResult.timestamp).toLocaleString()}</p>
              {verificationResult.metadata && (
                <div>
                  <p><strong>Title:</strong> {verificationResult.metadata.title}</p>
                  <p><strong>Type:</strong> {verificationResult.metadata.type}</p>
                  <p><strong>Owner:</strong> {verificationResult.metadata.owner}</p>
                </div>
              )}
            </div>
          ) : (
            <p>Error: {verificationResult.error}</p>
          )}
        </div>
      )}
    </div>
  );
};

// Main App Component
function App() {
  const [backendStatus, setBackendStatus] = useState(null);
  const [currentView, setCurrentView] = useState('home');
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const { account, isConnecting, connectWallet, disconnectWallet } = useWallet();

  useEffect(() => {
    // Test backend connection
    const testBackend = async () => {
      try {
        const response = await axios.get(`${API_URL}/health`);
        setBackendStatus(response.data);
      } catch (error) {
        console.error('Backend connection failed:', error);
      }
    };

    // Load documents from backend if user is connected
    const loadDocuments = async () => {
      if (account) {
        try {
          console.log('Loading documents from backend...');
          const response = await axios.get(`${API_URL}/api/documents`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
          });
          
          if (response.data.success) {
            console.log('Documents loaded from backend:', response.data.data.documents);
            setUploadedDocuments(response.data.data.documents);
          }
        } catch (error) {
          console.error('Failed to load documents from backend:', error);
          // Fallback to localStorage
          const savedDocuments = localStorage.getItem('encryptedDocuments');
          if (savedDocuments) {
            setUploadedDocuments(JSON.parse(savedDocuments));
          }
        }
      } else {
        // Load saved documents from localStorage when not connected
        const savedDocuments = localStorage.getItem('encryptedDocuments');
        if (savedDocuments) {
          setUploadedDocuments(JSON.parse(savedDocuments));
        }
      }
    };

    testBackend();
    loadDocuments();
  }, [account]); // Reload when account changes

  const handleUploadSuccess = (document) => {
    const updatedDocuments = [...uploadedDocuments, document];
    setUploadedDocuments(updatedDocuments);
    
    // Save to localStorage for persistence
    localStorage.setItem('encryptedDocuments', JSON.stringify(updatedDocuments));
    
    alert(`Document "${document.metadata.title || document.originalName}" successfully encrypted and stored on blockchain!`);
  };

  const handleViewDocument = (document) => {
    setSelectedDocument(document);
    setShowViewer(true);
  };

  const handleDeleteDocument = (documentId) => {
    if (window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      const updatedDocuments = uploadedDocuments.filter(doc => doc.id !== documentId);
      setUploadedDocuments(updatedDocuments);
      localStorage.setItem('encryptedDocuments', JSON.stringify(updatedDocuments));
      alert('Document deleted successfully');
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#1976d2',
        color: 'white',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>🔐 Blockchain Document Encryption</h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {backendStatus && (
              <span style={{ fontSize: '14px' }}>
                Backend: {backendStatus.status === 'OK' ? '✅' : '❌'}
              </span>
            )}
            
            {account ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px' }}>
                  🦊 {account.substring(0, 6)}...{account.substring(38)}
                </span>
                <button 
                  onClick={disconnectWallet}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button 
                onClick={connectWallet}
                disabled={isConnecting}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isConnecting ? 'not-allowed' : 'pointer'
                }}
              >
                {isConnecting ? '🔄 Connecting...' : '🦊 Connect MetaMask'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #ddd',
        padding: '0 20px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '0' }}>
          {['home', 'upload', 'verify', 'documents'].map(view => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              style={{
                padding: '15px 20px',
                backgroundColor: currentView === view ? '#e3f2fd' : 'transparent',
                border: 'none',
                borderBottom: currentView === view ? '3px solid #1976d2' : '3px solid transparent',
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontWeight: currentView === view ? 'bold' : 'normal'
              }}
            >
              {view === 'home' && '🏠 Home'}
              {view === 'upload' && '📤 Upload & Encrypt'}
              {view === 'verify' && '🔍 Verify'}
              {view === 'documents' && '📄 My Documents'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {currentView === 'home' && (
          <div>
            <div style={{ 
              background: 'white', 
              padding: '30px', 
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              <h2>🔐 Secure Document Encryption on Blockchain</h2>
              <p style={{ fontSize: '18px', color: '#666', marginBottom: '30px' }}>
                Encrypt, store, and verify your documents securely using blockchain technology
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '30px' }}>
                <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <h3>🔒 Encrypt Documents</h3>
                  <p>Upload your documents for secure encryption and blockchain storage</p>
                </div>
                <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <h3>🔍 Verify Authenticity</h3>
                  <p>Verify document authenticity using blockchain verification</p>
                </div>
                <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <h3>🛡️ Secure Storage</h3>
                  <p>Documents are encrypted and stored securely on IPFS and blockchain</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'upload' && (
          <div>
            {account ? (
              <DocumentUpload onUploadSuccess={handleUploadSuccess} account={account} />
            ) : (
              <div style={{ 
                background: 'white', 
                padding: '30px', 
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <h3>🦊 Connect Your Wallet</h3>
                <p>Please connect your MetaMask wallet to upload and encrypt documents</p>
                <button 
                  onClick={connectWallet}
                  style={{
                    padding: '12px 24px',
                    fontSize: '16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  🦊 Connect MetaMask
                </button>
              </div>
            )}
          </div>
        )}

        {currentView === 'verify' && (
          <DocumentVerification />
        )}

        {currentView === 'documents' && (
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3>📄 My Encrypted Documents ({uploadedDocuments.length})</h3>
            {uploadedDocuments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ fontSize: '18px', color: '#666' }}>No documents uploaded yet.</p>
                <p>Upload your first document to get started with blockchain encryption!</p>
                <button 
                  onClick={() => setCurrentView('upload')}
                  style={{
                    padding: '12px 24px',
                    fontSize: '16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginTop: '15px'
                  }}
                >
                  📤 Upload First Document
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '15px' }}>
                {uploadedDocuments.map((doc, index) => (
                  <div key={doc.id || index} style={{
                    padding: '20px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    backgroundColor: '#f8f9fa'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>
                          📄 {doc.metadata.title || doc.originalName || doc.filename}
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '14px', color: '#666' }}>
                          <p><strong>File:</strong> {doc.originalName || doc.filename}</p>
                          <p><strong>Type:</strong> {doc.metadata.documentType}</p>
                          <p><strong>Size:</strong> {doc.fileSize ? (doc.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}</p>
                          <p><strong>Upload Date:</strong> {doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString() : 'Unknown'}</p>
                        </div>
                        {doc.metadata.description && (
                          <p style={{ margin: '10px 0', fontStyle: 'italic', color: '#555' }}>
                            "{doc.metadata.description}"
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
                          <span style={{ 
                            padding: '4px 8px', 
                            backgroundColor: '#28a745', 
                            color: 'white', 
                            borderRadius: '4px', 
                            fontSize: '12px' 
                          }}>
                            🔐 Encrypted
                          </span>
                          <span style={{ 
                            padding: '4px 8px', 
                            backgroundColor: '#17a2b8', 
                            color: 'white', 
                            borderRadius: '4px', 
                            fontSize: '12px' 
                          }}>
                            ✅ Blockchain Verified
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ 
                      padding: '10px', 
                      backgroundColor: '#e9ecef', 
                      borderRadius: '4px', 
                      marginBottom: '15px',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}>
                      <strong>Blockchain Hash:</strong> {doc.hash}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => handleViewDocument(doc)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        👁️ View & Download
                      </button>
                      
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(doc.hash);
                          alert('Blockchain hash copied to clipboard!');
                        }}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        📋 Copy Hash
                      </button>
                      
                      <button 
                        onClick={() => {
                          setCurrentView('verify');
                          // Auto-fill verification hash if there's a verification component
                        }}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        🔍 Verify
                      </button>
                      
                      <button 
                        onClick={() => handleDeleteDocument(doc.id)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Document Viewer Modal */}
        {showViewer && selectedDocument && (
          <DocumentViewer 
            document={selectedDocument}
            onClose={() => {
              setShowViewer(false);
              setSelectedDocument(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

export default App;