import React, { useState, useEffect } from 'react';
import documentService from '../../services/documentService';

const EnhancedAdminDashboard = ({ user, onLogout, backendStatus }) => {
  const [currentTab, setCurrentTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [users, setUsers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  // Document upload state
  const [uploadForm, setUploadForm] = useState({
    file: null,
    studentName: '',
    studentId: '',
    documentType: 'certificate',
    issueDate: '',
    description: ''
  });

  useEffect(() => {
    loadDashboardData();
    loadUsers();
    loadDocuments();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication required. Please login again.');
        return;
      }

      // Load dashboard data
      const response = await documentService.getAdminDashboard();
      setDashboardData(response);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      
      const response = await documentService.getAllUsers();
      setUsers(response.data?.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      
      const response = await documentService.getAllDocuments();
      setDocuments(response.data?.documents || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
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
        studentName: uploadForm.studentName,
        studentId: uploadForm.studentId,
        ownerName: uploadForm.studentName,
        institutionName: user.profile?.institutionName || 'Admin Institution', // Required field
        documentType: uploadForm.documentType,
        issueDate: uploadForm.issueDate,
        description: uploadForm.description,
        ownerAddress: user.walletAddress
      };

      const response = await documentService.registerDocument(uploadForm.file, metadata);

      if (response.success) {
        alert('Document uploaded and registered on blockchain successfully!');
        setUploadForm({
          file: null,
          studentName: '',
          studentId: '',
          documentType: 'certificate',
          issueDate: '',
          description: ''
        });
        // Reset file input
        const fileInput = document.getElementById('document-file-input');
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

  const handleDownloadDocument = async (doc) => {
    try {
      // Use documentHash for API download
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

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔄</div>
        <h2>Loading Admin Dashboard...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
        <h2>Error: {error}</h2>
        <button 
          onClick={loadDashboardData}
          style={{
            padding: '10px 20px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

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
              { id: 'overview', label: '📊 Overview', icon: '📊' },
              { id: 'upload', label: '📤 Upload Documents', icon: '📤' },
              { id: 'documents', label: '📄 Manage Documents', icon: '📄' },
              { id: 'users', label: '👥 User Management', icon: '👥' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                style={{
                  padding: '15px 25px',
                  backgroundColor: currentTab === tab.id ? '#1976d2' : 'transparent',
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
          {/* Overview Tab */}
          {currentTab === 'overview' && (
            <div>
              <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>📊 System Overview</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{
                  padding: '25px',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>👥</div>
                  <h3 style={{ margin: '0 0 5px 0', color: '#1976d2' }}>Total Users</h3>
                  <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#333' }}>{users.length}</p>
                </div>
                
                <div style={{
                  padding: '25px',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>📄</div>
                  <h3 style={{ margin: '0 0 5px 0', color: '#28a745' }}>Total Documents</h3>
                  <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#333' }}>{documents.length}</p>
                </div>
                
                <div style={{
                  padding: '25px',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔗</div>
                  <h3 style={{ margin: '0 0 5px 0', color: '#17a2b8' }}>Backend Status</h3>
                  <p style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: backendStatus?.status === 'OK' ? '#28a745' : '#dc3545' }}>
                    {backendStatus?.status === 'OK' ? '✅ Online' : '❌ Offline'}
                  </p>
                </div>
                
                <div style={{
                  padding: '25px',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>⛓️</div>
                  <h3 style={{ margin: '0 0 5px 0', color: '#6f42c1' }}>Blockchain</h3>
                  <p style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#28a745' }}>
                    ✅ Sepolia
                  </p>
                </div>
              </div>

              {/* Recent Activity */}
              <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>📈 Recent Activity</h3>
                <div style={{ color: '#666' }}>
                  <p>• System monitoring active</p>
                  <p>• Blockchain connection established</p>
                  <p>• IPFS storage operational</p>
                  <p>• All services running normally</p>
                </div>
              </div>
            </div>
          )}

          {/* Upload Documents Tab */}
          {currentTab === 'upload' && (
            <div>
              <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>📤 Upload & Register Documents</h2>
              
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
                      id="document-file-input"
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
                        Student Name *
                      </label>
                      <input
                        type="text"
                        value={uploadForm.studentName}
                        onChange={(e) => setUploadForm({ ...uploadForm, studentName: e.target.value })}
                        required
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
                        Student ID *
                      </label>
                      <input
                        type="text"
                        value={uploadForm.studentId}
                        onChange={(e) => setUploadForm({ ...uploadForm, studentId: e.target.value })}
                        required
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
          )}

          {/* Documents Management Tab */}
          {currentTab === 'documents' && (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h2 style={{ margin: 0, color: '#333' }}>📄 Document Management ({documents.length})</h2>
                <button 
                  onClick={loadDocuments}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#1976d2',
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

              {documents.length === 0 ? (
                <div style={{
                  backgroundColor: 'white',
                  padding: '40px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>📄</div>
                  <h3>No Documents Found</h3>
                  <p style={{ color: '#666', marginBottom: '20px' }}>
                    No documents have been uploaded yet. Use the Upload tab to add documents.
                  </p>
                  <button 
                    onClick={() => setCurrentTab('upload')}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    📤 Upload First Document
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '20px' }}>
                  {documents.map((doc, index) => (
                    <div key={doc._id || index} style={{
                      backgroundColor: 'white',
                      padding: '25px',
                      borderRadius: '12px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '18px' }}>
                            📄 {doc.metadata?.title || doc.originalName || 'Document'}
                          </h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '14px', color: '#666' }}>
                            <p><strong>Type:</strong> {doc.metadata?.documentType || 'Unknown'}</p>
                            <p><strong>Student:</strong> {doc.metadata?.studentName || 'N/A'}</p>
                            <p><strong>Student ID:</strong> {doc.metadata?.studentId || 'N/A'}</p>
                            <p><strong>Created:</strong> {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ 
                        padding: '12px', 
                        backgroundColor: '#f8f9fa', 
                        borderRadius: '6px', 
                        marginBottom: '15px',
                        fontSize: '12px',
                        fontFamily: 'monospace'
                      }}>
                        <strong>Blockchain Hash:</strong> {doc.documentHash || 'N/A'}
                      </div>

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap' }}>
                        <span style={{ 
                          padding: '4px 12px', 
                          backgroundColor: '#28a745', 
                          color: 'white', 
                          borderRadius: '12px', 
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          ✅ Blockchain Verified
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
                        {doc.ipfsHash && (
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
                            navigator.clipboard.writeText(doc.documentHash || '');
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
                            const verifyUrl = `${window.location.origin}?verify=${doc.documentHash}`;
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
              )}
            </div>
          )}

          {/* Users Management Tab */}
          {currentTab === 'users' && (
            <div>
              <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>👥 User Management ({users.length})</h2>
              
              <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                  User management features are available. Users are automatically created when they connect their wallets.
                </p>
                
                {users.length > 0 ? (
                  <div style={{ display: 'grid', gap: '15px' }}>
                    {users.slice(0, 5).map((user, index) => (
                      <div key={user._id || index} style={{
                        padding: '15px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        backgroundColor: '#f8f9fa'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                              {user.profile?.name || `User ${index + 1}`}
                            </p>
                            <p style={{ margin: 0, fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>
                              {user.walletAddress}
                            </p>
                          </div>
                          <span style={{
                            padding: '4px 12px',
                            backgroundColor: user.role === 'admin' ? '#dc3545' : user.role === 'issuer' ? '#ffc107' : '#28a745',
                            color: user.role === 'issuer' ? '#000' : 'white',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                          }}>
                            {user.role}
                          </span>
                        </div>
                      </div>
                    ))}
                    {users.length > 5 && (
                      <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                        ... and {users.length - 5} more users
                      </p>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <p style={{ color: '#666' }}>No users found. Users will appear here when they connect their wallets.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedAdminDashboard;