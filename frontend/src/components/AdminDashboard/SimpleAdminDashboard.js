import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const SimpleAdminDashboard = ({ user, onLogout, backendStatus }) => {
  const [currentTab, setCurrentTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [users, setUsers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Load dashboard data
      const response = await axios.get(`${API_URL}/api/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      setDashboardData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load dashboard data');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Loading Admin Dashboard...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Error: {error}</h2>
        <button onClick={loadDashboardData}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>👨‍💼 Admin Dashboard</h1>
      <p>Welcome, {user?.profile?.name || 'Administrator'}</p>
      
      {/* Navigation Tabs */}
      <div style={{ marginBottom: '20px' }}>
        {['overview', 'users', 'documents'].map(tab => (
          <button
            key={tab}
            onClick={() => setCurrentTab(tab)}
            style={{
              padding: '10px 20px',
              marginRight: '10px',
              backgroundColor: currentTab === tab ? '#1976d2' : '#f5f5f5',
              color: currentTab === tab ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {currentTab === 'overview' && (
        <div>
          <h2>System Overview</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{ padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
              <h3>Total Users</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{users.length}</p>
            </div>
            <div style={{ padding: '20px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
              <h3>Total Documents</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{documents.length}</p>
            </div>
            <div style={{ padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
              <h3>Backend Status</h3>
              <p style={{ fontSize: '18px' }}>{backendStatus?.status || 'Unknown'}</p>
            </div>
          </div>
        </div>
      )}

      {currentTab === 'users' && (
        <div>
          <h2>User Management</h2>
          <p>User management features will be implemented here.</p>
        </div>
      )}

      {currentTab === 'documents' && (
        <div>
          <h2>Document Management</h2>
          <p>Document management features will be implemented here.</p>
        </div>
      )}
    </div>
  );
};

export default SimpleAdminDashboard;