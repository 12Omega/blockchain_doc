import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Test backend connection with retry logic
    const testConnection = async (attempt = 1) => {
      try {
        console.log(`Testing connection to: ${API_URL} (attempt ${attempt})`);
        
        // Add timeout and better error handling
        const response = await axios.get(`${API_URL}/health`, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log('Connection successful!', response.data);
        setHealth(response.data);
        setError(null);
        setRetryCount(0);
      } catch (err) {
        console.error(`Connection failed (attempt ${attempt}):`, err);
        
        if (attempt < 3) {
          // Retry up to 3 times with delay
          setTimeout(() => {
            setRetryCount(attempt);
            testConnection(attempt + 1);
          }, 2000);
          return;
        }
        
        setError(`Failed to connect after ${attempt} attempts: ${err.message}`);
      } finally {
        if (attempt >= 3 || health) {
          setLoading(false);
        }
      }
    };

    testConnection();
  }, []); // Remove health dependency to fix warning

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setRetryCount(0);
    
    // Force reload the page to clear any cache
    window.location.reload();
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>🔄 Loading...</h1>
        <p>Testing connection to backend...</p>
        <p>API URL: {API_URL}</p>
        {retryCount > 0 && <p>Retry attempt: {retryCount}/3</p>}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h1>❌ Connection Error</h1>
        <p>{error}</p>
        <p>Backend URL: {API_URL}</p>
        
        <div style={{ marginTop: '20px' }}>
          <h3>🔧 Troubleshooting:</h3>
          <ul style={{ textAlign: 'left', display: 'inline-block' }}>
            <li>Make sure backend server is running on port 3001</li>
            <li>Check if backend health endpoint works: <a href={`${API_URL}/health`} target="_blank" rel="noopener noreferrer">{API_URL}/health</a></li>
            <li>Verify CORS configuration allows localhost:3000</li>
            <li>Clear browser cache and cookies</li>
          </ul>
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={handleRetry}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            🔄 Retry Connection
          </button>
          
          <button 
            onClick={() => window.open(`${API_URL}/health`, '_blank')}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔗 Test Backend Directly
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>🎉 Blockchain Document Verification</h1>
      
      <div style={{ 
        background: '#d4edda', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #c3e6cb'
      }}>
        <h2>✅ Backend Connection Successful!</h2>
        <p><strong>Status:</strong> {health?.status}</p>
        <p><strong>Environment:</strong> {health?.environment}</p>
        <p><strong>Version:</strong> {health?.version}</p>
        <p><strong>Uptime:</strong> {Math.round(health?.uptime || 0)} seconds</p>
        <p><strong>API URL:</strong> {API_URL}</p>
      </div>

      <div style={{ 
        background: '#fff3cd', 
        padding: '20px', 
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #ffeaa7'
      }}>
        <h2>🚀 System Status</h2>
        <p>✅ Frontend: Running on port 3000</p>
        <p>✅ Backend: Running on port 3001</p>
        <p>✅ API Connection: Working</p>
        <p>✅ CORS: Configured</p>
      </div>

      <div style={{ 
        background: '#d1ecf1', 
        padding: '20px', 
        borderRadius: '8px',
        border: '1px solid #bee5eb'
      }}>
        <h2>📋 Next Steps</h2>
        <ul>
          <li>✅ Backend API is working</li>
          <li>✅ Frontend is loading</li>
          <li>✅ Connection established</li>
          <li>🔄 Ready for wallet integration</li>
          <li>🔄 Ready for document upload/verification</li>
        </ul>
      </div>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          🔄 Refresh Status
        </button>
        
        <button 
          onClick={() => window.open(`${API_URL}/test-cors`, '_blank')}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🧪 Test CORS
        </button>
      </div>
    </div>
  );
}

export default App;