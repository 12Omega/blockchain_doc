import React from 'react';
import DemoModeToggle from './DemoModeToggle';

const LoginSelection = ({ onRoleSelect, onDemoLogin }) => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        maxWidth: '500px',
        width: '90%',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          margin: '0 0 10px 0', 
          color: '#1976d2',
          fontSize: '28px'
        }}>
          🔐 Blockchain Document Verification
        </h1>
        
        <p style={{ 
          color: '#666', 
          marginBottom: '40px',
          fontSize: '16px'
        }}>
          Choose your login type to access the appropriate dashboard
        </p>

        <div style={{
          display: 'grid',
          gap: '20px',
          marginBottom: '30px'
        }}>
          {/* Admin/Issuer Login */}
          <div 
            onClick={() => onRoleSelect('admin')}
            style={{
              padding: '30px',
              border: '2px solid #e3f2fd',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backgroundColor: '#fafafa'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#1976d2';
              e.target.style.backgroundColor = '#e3f2fd';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#e3f2fd';
              e.target.style.backgroundColor = '#fafafa';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>👨‍💼</div>
            <h3 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>
              Admin / Institution Login
            </h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              For educational institutions, administrators, and document issuers
            </p>
            <div style={{ 
              marginTop: '15px', 
              fontSize: '12px', 
              color: '#888' 
            }}>
              ✅ Issue Documents • ✅ Manage Users • ✅ View Analytics
            </div>
          </div>

          {/* Student Login */}
          <div 
            onClick={() => onRoleSelect('student')}
            style={{
              padding: '30px',
              border: '2px solid #e8f5e8',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backgroundColor: '#fafafa'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#28a745';
              e.target.style.backgroundColor = '#e8f5e8';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#e8f5e8';
              e.target.style.backgroundColor = '#fafafa';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎓</div>
            <h3 style={{ margin: '0 0 10px 0', color: '#28a745' }}>
              Student Login
            </h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              For students to access and manage their documents
            </p>
            <div style={{ 
              marginTop: '15px', 
              fontSize: '12px', 
              color: '#888' 
            }}>
              ✅ View Documents • ✅ Share Access • ✅ Download Certificates
            </div>
          </div>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#666'
        }}>
          <p style={{ margin: '0 0 10px 0' }}>
            🔒 <strong>Secure Authentication:</strong>
          </p>
          <p style={{ margin: 0 }}>
            Both login types use MetaMask wallet authentication for maximum security
          </p>
        </div>
      </div>

      {/* Demo Mode Toggle */}
      <DemoModeToggle onDemoLogin={onDemoLogin} />
    </div>
  );
};

export default LoginSelection;