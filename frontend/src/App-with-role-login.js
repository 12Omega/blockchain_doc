import React, { useState, useEffect } from 'react';
import axios from 'axios';
import authService from './services/authService';

// Import login components
import LoginSelection from './components/Auth/LoginSelection';
import AdminLogin from './components/Auth/AdminLogin';
import StudentLogin from './components/Auth/StudentLogin';

// Import dashboard components
import AdminDashboard from './components/AdminDashboard/AdminDashboard';
import StudentPortal from './components/StudentPortal/StudentPortal';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function App() {
  const [currentView, setCurrentView] = useState('loginSelection'); // loginSelection, adminLogin, studentLogin, dashboard
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [backendStatus, setBackendStatus] = useState(null);

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setUserRole(userData.role);
          setIsAuthenticated(true);
          setCurrentView('dashboard');
        } catch (error) {
          console.error('Error parsing stored user data:', error);
          // Clear invalid data
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
        }
      }
    };
    
    checkAuth();
  }, []);

  // Test backend connection
  useEffect(() => {
    const testBackend = async () => {
      try {
        const response = await axios.get(`${API_URL}/health`);
        setBackendStatus(response.data);
      } catch (error) {
        console.error('Backend connection failed:', error);
        setBackendStatus({ status: 'ERROR', message: 'Backend unavailable' });
      }
    };

    testBackend();
  }, []);

  // Handle role selection from login selection screen
  const handleRoleSelect = (role) => {
    if (role === 'admin') {
      setCurrentView('adminLogin');
    } else if (role === 'student') {
      setCurrentView('studentLogin');
    }
  };

  // Handle successful login
  const handleLoginSuccess = (userData, role) => {
    setUser(userData);
    setUserRole(role);
    setIsAuthenticated(true);
    setCurrentView('dashboard');
  };

  // Handle logout
  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setUserRole(null);
    setIsAuthenticated(false);
    setCurrentView('loginSelection');
  };

  // Handle back to login selection
  const handleBackToSelection = () => {
    setCurrentView('loginSelection');
  };

  // Render appropriate dashboard based on user role
  const renderDashboard = () => {
    if (!isAuthenticated || !user) {
      return null;
    }

    const dashboardProps = {
      user,
      onLogout: handleLogout,
      backendStatus
    };

    switch (userRole) {
      case 'admin':
      case 'issuer':
        return <AdminDashboard {...dashboardProps} />;
      case 'student':
      case 'verifier':
        return <StudentPortal {...dashboardProps} />;
      default:
        return <StudentPortal {...dashboardProps} />;
    }
  };

  // Main render logic
  switch (currentView) {
    case 'loginSelection':
      return <LoginSelection onRoleSelect={handleRoleSelect} />;
    
    case 'adminLogin':
      return (
        <AdminLogin 
          onLoginSuccess={handleLoginSuccess}
          onBack={handleBackToSelection}
        />
      );
    
    case 'studentLogin':
      return (
        <StudentLogin 
          onLoginSuccess={handleLoginSuccess}
          onBack={handleBackToSelection}
        />
      );
    
    case 'dashboard':
      return (
        <div>
          {/* Header with user info and logout */}
          <div style={{
            backgroundColor: userRole === 'admin' ? '#1976d2' : '#28a745',
            color: 'white',
            padding: '15px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px' }}>
                {userRole === 'admin' ? '👨‍💼 Admin Dashboard' : '🎓 Student Portal'}
              </h2>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                Welcome, {user.profile?.name || `${user.walletAddress.substring(0, 6)}...${user.walletAddress.substring(38)}`}
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {/* Backend Status */}
              {backendStatus && (
                <span style={{ fontSize: '14px', opacity: 0.9 }}>
                  Backend: {backendStatus.status === 'OK' ? '✅' : '❌'}
                </span>
              )}
              
              {/* User Role Badge */}
              <span style={{
                padding: '4px 12px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '12px',
                fontSize: '12px',
                textTransform: 'uppercase',
                fontWeight: 'bold'
              }}>
                {userRole}
              </span>
              
              {/* Logout Button */}
              <button 
                onClick={handleLogout}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'background-color 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.2)';
                }}
              >
                🚪 Logout
              </button>
            </div>
          </div>
          
          {/* Dashboard Content */}
          {renderDashboard()}
        </div>
      );
    
    default:
      return <LoginSelection onRoleSelect={handleRoleSelect} />;
  }
}

export default App;