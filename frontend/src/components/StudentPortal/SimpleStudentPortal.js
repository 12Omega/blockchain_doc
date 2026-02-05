import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const SimpleStudentPortal = ({ user, onLogout, backendStatus }) => {
  const [currentTab, setCurrentTab] = useState('documents');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_URL}/api/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setDocuments(response.data.data.documents || []);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = async (documentId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_URL}/api/documents/${documentId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `document-${documentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed: ' + error.message);
    }
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
          <div key={doc._id || index} style={{
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '12px',
            backgroundColor: 'white',
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
                  <p><strong>Issue Date:</strong> {doc.metadata?.issueDate ? new Date(doc.metadata.issueDate).toLocaleDateString() : 'N/A'}</p>
                  <p><strong>Created:</strong> {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'N/A'}</p>
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
              <strong>Blockchain Hash:</strong> {doc.documentHash || 'N/A'}
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
                onClick={() => handleDownloadDocument(doc._id)}
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
                onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
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
    );
  };

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
          
          {currentTab === 'profile' && renderProfile()}
        </div>
      </div>
    </div>
  );
};

export default SimpleStudentPortal;