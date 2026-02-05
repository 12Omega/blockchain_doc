import React, { useState } from 'react';
import { generateDemoStudent, generateDemoAdmin, generateDemoDocuments } from '../../utils/demoData';

const DemoModeToggle = ({ onDemoLogin }) => {
  const [showDemo, setShowDemo] = useState(false);

  const handleDemoLogin = (role) => {
    const demoUser = role === 'admin' ? generateDemoAdmin() : generateDemoStudent();
    const demoDocuments = generateDemoDocuments(5);
    
    // Store demo data
    localStorage.setItem('demoMode', 'true');
    localStorage.setItem('user', JSON.stringify(demoUser));
    localStorage.setItem('authToken', 'demo-token-' + Date.now());
    localStorage.setItem('encryptedDocuments', JSON.stringify(demoDocuments));
    
    onDemoLogin(demoUser, role);
  };

  if (!showDemo) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000
      }}>
        <button
          onClick={() => setShowDemo(true)}
          style={{
            padding: '10px 15px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          🎮 Demo Mode
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      zIndex: 1000,
      minWidth: '250px'
    }}>
      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 5px 0', color: '#495057' }}>🎮 Demo Mode</h4>
        <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
          Try the system without MetaMask
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={() => handleDemoLogin('admin')}
          style={{
            padding: '8px 12px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          👨‍💼 Demo Admin
        </button>
        
        <button
          onClick={() => handleDemoLogin('student')}
          style={{
            padding: '8px 12px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🎓 Demo Student
        </button>
        
        <button
          onClick={() => setShowDemo(false)}
          style={{
            padding: '6px 12px',
            backgroundColor: 'transparent',
            color: '#6c757d',
            border: '1px solid #6c757d',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default DemoModeToggle;