import React, { useState, useEffect } from 'react';
import documentService from '../../services/documentService';

const EnhancedStudentPortal = ({ user, onLogout, backendStatus }) => {
  const [currentTab, setCurrentTab] = useState('documents');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verificationHash, setVerificationHash] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  // Document upload state
  const [uploadForm, setUploadForm] = useState({
    file: null,
    documentType: 'certificate',
    issueDate: '',
    description: '',
    course: '',
    grade: ''
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        // Try to load from demo mode or localStorage
        const demoMode = localStorage.getItem('demoMode');
        if (demoMode) {
          const savedDocuments = localStorage.getItem('encryptedDocuments');
          if (savedDocuments) {
            setDocuments(JSON.parse(savedDocuments));
          }
        }
        setLoading(false);
        return;
      }

      const response = await documentService.getUserDocuments();
      
      if (response.success) {
        setDocuments(response.data.documents || []);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      setError('Failed to load documents');
      
      // Fallback to localStorage
      const savedDocuments = localStorage.getItem('encryptedDocuments');
      if (savedDocuments) {
        setDocuments(JSON.parse(savedDocuments));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = async (doc) => {
    try {
      // First try to download from base64 content if available (for demo/offline mode)
      if (doc.fileContent) {
        const link = document.createElement('a');
        link.href = doc.fileContent;
        link.download = doc.originalName || doc.filename || 'document.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      
      // Otherwise, download from API using documentHash
      const hash = doc.documentHash || doc.hash;
      if (!hash) {
        alert('Document hash not available');
        return;
      }

      const blob = await documentService.downloadDocument(hash);
      
      // Create download link - blob is already a Blob, don't wrap it again
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from fileInfo.originalName or metadata
      const filename = doc.fileInfo?.originalName || 
                      doc.originalName || 
                      doc.filename || 
                      doc.metadata?.title || 
                      'document.pdf';
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      console.log('Document downloaded successfully:', filename);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed: ' + error.message);
    }
  };

  const handleVerifyDocument = async () => {
    if (!verificationHash) {
      alert('Please enter a document hash');
      return;
    }

    try {
      setVerifying(true);
      setVerificationResult(null);
      
      const response = await documentService.verifyDocumentByHash(verificationHash);
      
      if (response.success) {
        setVerificationResult({
          verified: true,
          hash: verificationHash,
          timestamp: new Date().toISOString(),
          blockchainVerified: true,
          metadata: response.data.metadata || {
            title: 'Document Found',
            type: 'verified',
            owner: 'Blockchain Verified'
          }
        });
      } else {
        setVerificationResult({
          verified: false,
          error: 'Document not found or invalid'
        });
      }
    } catch (error) {
      console.error('Verification failed:', error);
      setVerificationResult({
        verified: false,
        error: error.message || 'Verification failed'
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    e.preventDefault();
    
    if (!uploadForm.file) {
      alert('Please select a file');
      return;
    }

    try {
      setUploadingDocument(true);
      
      const metadata = {
        studentName: user.profile?.name || 'Student',
        studentId: user.walletAddress.substring(0, 10),
        ownerName: user.profile?.name || 'Student',
        documentType: uploadForm.documentType,
        issueDate: uploadForm.issueDate || new Date().toISOString().split('T')[0],
        description: uploadForm.description,
        course: uploadForm.course,
        grade: uploadForm.grade,
        ownerAddress: user.walletAddress,
        institutionName: 'Self-Uploaded'
      };

      const response = await documentService.studentUploadDocument(uploadForm.file, metadata);

      if (response.success) {
        alert('Document uploaded and registered on blockchain successfully!');
        setUploadForm({
          file: null,
          documentType: 'certificate',
          issueDate: '',
          description: '',
          course: '',
          grade: ''
        });
        // Reset file input
        const fileInput = document.getElementById('student-document-file-input');
        if (fileInput) fileInput.value = '';
        loadDocuments(); // Refresh documents list
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setUploadForm({ ...uploadForm, file });
  };

  const renderDocuments = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔄</div>
          <p>Loading your documents...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{
          padding: '20px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          color: '#721c24',
          textAlign: 'center'
        }}>
          <p>❌ {error}</p>
          <button 
            onClick={loadDocuments}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    if (documents.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📄</div>
          <h3>No Documents Found</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            You don't have any documents yet. Documents issued by your institution will appear here.
          </p>
          <button 
            onClick={loadDocuments}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gap: '20px' }}>
        {documents.map((doc, index) => (
          <div key={doc._id || doc.id || index} style={{
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '12px',
            backgroundColor: 'white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '18px' }}>
                  📄 {doc.metadata?.title || doc.originalName || doc.filename || 'Document'}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '14px', color: '#666' }}>
                  <p><strong>Type:</strong> {doc.metadata?.documentType || 'Unknown'}</p>
                  <p><strong>Student:</strong> {doc.metadata?.studentName || 'N/A'}</p>
                  <p><strong>Issue Date:</strong> {doc.metadata?.issueDate ? new Date(doc.metadata.issueDate).toLocaleDateString() : 'N/A'}</p>
                  <p><strong>Created:</strong> {doc.createdAt || doc.uploadDate ? new Date(doc.createdAt || doc.uploadDate).toLocaleDateString() : 'N/A'}</p>
                </div>
                {doc.metadata?.description && (
                  <p style={{ margin: '10px 0', fontStyle: 'italic', color: '#555' }}>
                    "{doc.metadata.description}"
                  </p>
                )}
              </div>
            </div>
            
            {/* Document Hash */}
            <div style={{ 
              padding: '10px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '6px', 
              marginBottom: '15px',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}>
              <strong>Blockchain Hash:</strong> {doc.documentHash || doc.hash || 'N/A'}
            </div>

            {/* Status Badges */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
              <span style={{ 
                padding: '4px 12px', 
                backgroundColor: '#28a745', 
                color: 'white', 
                borderRadius: '12px', 
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                ✅ Verified
              </span>
              <span style={{ 
                padding: '4px 12px', 
                backgroundColor: '#17a2b8', 
                color: 'white', 
                borderRadius: '12px', 
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                🔐 Encrypted
              </span>
              {(doc.ipfsHash || doc.encrypted) && (
                <span style={{ 
                  padding: '4px 12px', 
                  backgroundColor: '#6f42c1', 
                  color: 'white', 
                  borderRadius: '12px', 
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  📡 IPFS Stored
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => handleDownloadDocument(doc)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'background-color 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
              >
                💾 Download
              </button>
              
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(doc.documentHash || doc.hash || '');
                  alert('Document hash copied to clipboard!');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                📋 Copy Hash
              </button>
              
              <button 
                onClick={() => {
                  const verifyUrl = `${window.location.origin}?verify=${doc.documentHash || doc.hash}`;
                  navigator.clipboard.writeText(verifyUrl);
                  alert('Verification link copied to clipboard!');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🔗 Share Link
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderVerification = () => (
    <div style={{
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '12px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      maxWidth: '600px'
    }}>
      <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>🔍 Verify Document on Blockchain</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Document Hash:
        </label>
        <input 
          type="text"
          value={verificationHash}
          onChange={(e) => setVerificationHash(e.target.value)}
          placeholder="0x1234567890abcdef..."
          style={{ 
            width: '100%', 
            padding: '12px', 
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}
        />
      </div>

      <button 
        onClick={handleVerifyDocument}
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
          marginBottom: '20px'
        }}
      >
        {verifying ? '🔄 Verifying on Blockchain...' : '🔍 Verify Document'}
      </button>

      {verificationResult && (
        <div style={{
          padding: '20px',
          borderRadius: '8px',
          backgroundColor: verificationResult.verified ? '#d4edda' : '#f8d7da',
          border: `1px solid ${verificationResult.verified ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          <h4 style={{ margin: '0 0 15px 0' }}>
            {verificationResult.verified ? '✅ Document Verified' : '❌ Verification Failed'}
          </h4>
          {verificationResult.verified ? (
            <div>
              <p><strong>Hash:</strong> <code style={{ fontSize: '12px' }}>{verificationResult.hash}</code></p>
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

      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#e3f2fd',
        borderRadius: '8px',
        fontSize: '14px'
      }}>
        <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>🔒 How Verification Works:</p>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Enter the document hash from your certificate</li>
          <li>System checks the Ethereum blockchain</li>
          <li>Verifies document authenticity and integrity</li>
          <li>Shows original registration details</li>
        </ul>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div style={{
      background: 'white',
      padding: '30px',
      borderRadius: '12px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>👤 Profile Information</h3>
      
      <div style={{ display: 'grid', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Wallet Address:</label>
          <p style={{ 
            margin: 0, 
            padding: '10px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            {user.walletAddress}
          </p>
        </div>
        
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Role:</label>
          <span style={{
            padding: '6px 12px',
            backgroundColor: '#28a745',
            color: 'white',
            borderRadius: '6px',
            fontSize: '14px',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>
            {user.role}
          </span>
        </div>
        
        {user.profile?.name && (
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Name:</label>
            <p style={{ margin: 0 }}>{user.profile.name}</p>
          </div>
        )}
        
        {user.profile?.email && (
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Email:</label>
            <p style={{ margin: 0 }}>{user.profile.email}</p>
          </div>
        )}
        
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Member Since:</label>
          <p style={{ margin: 0 }}>{new Date(user.createdAt).toLocaleDateString()}</p>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Documents Owned:</label>
          <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>{documents.length}</p>
        </div>
      </div>
    </div>
  );

  const renderUpload = () => (
    <div>
      <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>📤 Upload Your Documents</h2>
      
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        maxWidth: '600px'
      }}>
        <form onSubmit={handleDocumentUpload}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Document File *
            </label>
            <input
              id="student-document-file-input"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '2px dashed #ddd',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            />
            {uploadForm.file && (
              <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  <strong>Selected:</strong> {uploadForm.file.name} ({(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Document Type *
              </label>
              <select
                value={uploadForm.documentType}
                onChange={(e) => setUploadForm({ ...uploadForm, documentType: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px'
                }}
              >
                <option value="certificate">Certificate</option>
                <option value="degree">Degree</option>
                <option value="diploma">Diploma</option>
                <option value="transcript">Transcript</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Issue Date
              </label>
              <input
                type="date"
                value={uploadForm.issueDate}
                onChange={(e) => setUploadForm({ ...uploadForm, issueDate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Course/Program
              </label>
              <input
                type="text"
                value={uploadForm.course}
                onChange={(e) => setUploadForm({ ...uploadForm, course: e.target.value })}
                placeholder="e.g., Computer Science"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Grade/Score
              </label>
              <input
                type="text"
                value={uploadForm.grade}
                onChange={(e) => setUploadForm({ ...uploadForm, grade: e.target.value })}
                placeholder="e.g., A+, 3.8 GPA"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Description
            </label>
            <textarea
              value={uploadForm.description}
              onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
              rows="3"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                resize: 'vertical'
              }}
              placeholder="Optional description of the document..."
            />
          </div>

          <button
            type="submit"
            disabled={uploadingDocument || !uploadForm.file}
            style={{
              width: '100%',
              padding: '15px',
              backgroundColor: uploadingDocument ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: uploadingDocument ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s ease'
            }}
          >
            {uploadingDocument ? '🔄 Uploading to Blockchain...' : '🔐 Upload & Register on Blockchain'}
          </button>
        </form>

        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>🔒 Security Features:</p>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>Document encrypted before IPFS storage</li>
            <li>Hash registered on Ethereum blockchain</li>
            <li>Immutable proof of authenticity</li>
            <li>QR code generated for easy verification</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {/* Navigation Tabs */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
            {[
              { id: 'documents', label: '📄 My Documents', icon: '📄' },
              { id: 'upload', label: '📤 Upload Documents', icon: '📤' },
              { id: 'verify', label: '🔍 Verify Documents', icon: '🔍' },
              { id: 'profile', label: '👤 Profile', icon: '👤' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                style={{
                  padding: '15px 25px',
                  backgroundColor: currentTab === tab.id ? '#28a745' : 'transparent',
                  color: currentTab === tab.id ? 'white' : '#333',
                  border: 'none',
                  borderRadius: currentTab === tab.id ? '12px 12px 0 0' : '0',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: currentTab === tab.id ? 'bold' : 'normal',
                  transition: 'all 0.3s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {currentTab === 'documents' && (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h2 style={{ margin: 0, color: '#333' }}>📄 My Documents ({documents.length})</h2>
                <button 
                  onClick={loadDocuments}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🔄 Refresh
                </button>
              </div>
              {renderDocuments()}
            </div>
          )}
          
          {currentTab === 'upload' && renderUpload()}
          
          {currentTab === 'verify' && (
            <div>
              <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>🔍 Document Verification</h2>
              {renderVerification()}
            </div>
          )}
          
          {currentTab === 'profile' && renderProfile()}
        </div>
      </div>
    </div>
  );
};

export default EnhancedStudentPortal;