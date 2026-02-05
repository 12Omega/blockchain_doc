import React, { useState } from 'react';
import { ethers } from 'ethers';
import authService from '../../services/authService';

const AdminLogin = ({ onLoginSuccess, onBack }) => {
  const [account, setAccount] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState(null);

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        setIsConnecting(true);
        setError(null);
        
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        setAccount(accounts[0]);
        return accounts[0];
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        setError('Failed to connect wallet: ' + error.message);
        throw error;
      } finally {
        setIsConnecting(false);
      }
    } else {
      const errorMsg = 'MetaMask not installed. Please install MetaMask to continue.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const handleAuthenticate = async () => {
    if (!account) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setIsAuthenticating(true);
      setError(null);
      
      // Get the signer from MetaMask
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Authenticate with admin role
      const result = await authService.authenticateWallet(account, signer, 'admin');
      
      console.log('Admin authentication successful:', result);
      onLoginSuccess(result.user, 'admin');
      
    } catch (error) {
      console.error('Admin authentication failed:', error);
      setError('Authentication failed: ' + error.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

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
        {/* Header */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ fontSize: '64px', marginBottom: '15px' }}>👨‍💼</div>
          <h1 style={{ 
            margin: '0 0 10px 0', 
            color: '#1976d2',
            fontSize: '28px'
          }}>
            Admin / Institution Login
          </h1>
          <p style={{ 
            color: '#666', 
            marginBottom: '0',
            fontSize: '16px'
          }}>
            Connect your authorized wallet to access the admin dashboard
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            padding: '15px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '8px',
            color: '#721c24',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Wallet Connection */}
        {!account ? (
          <div>
            <div style={{
              padding: '20px',
              backgroundColor: '#e3f2fd',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>
                Step 1: Connect Wallet
              </h3>
              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                Connect your MetaMask wallet to authenticate as an administrator
              </p>
            </div>

            <button 
              onClick={connectWallet}
              disabled={isConnecting}
              style={{
                padding: '15px 30px',
                fontSize: '16px',
                backgroundColor: isConnecting ? '#ccc' : '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isConnecting ? 'not-allowed' : 'pointer',
                width: '100%',
                marginBottom: '20px',
                transition: 'background-color 0.3s ease'
              }}
            >
              {isConnecting ? '🔄 Connecting...' : '🦊 Connect MetaMask Wallet'}
            </button>
          </div>
        ) : (
          <div>
            {/* Connected Wallet Info */}
            <div style={{
              padding: '20px',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#155724' }}>
                ✅ Wallet Connected
              </h3>
              <p style={{ 
                margin: 0, 
                color: '#155724', 
                fontSize: '14px',
                fontFamily: 'monospace'
              }}>
                {account.substring(0, 6)}...{account.substring(38)}
              </p>
            </div>

            {/* Authentication Step */}
            <div style={{
              padding: '20px',
              backgroundColor: '#fff3cd',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>
                Step 2: Authenticate as Admin
              </h3>
              <p style={{ margin: 0, color: '#856404', fontSize: '14px' }}>
                Sign a message to verify your admin privileges
              </p>
            </div>

            <button 
              onClick={handleAuthenticate}
              disabled={isAuthenticating}
              style={{
                padding: '15px 30px',
                fontSize: '16px',
                backgroundColor: isAuthenticating ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isAuthenticating ? 'not-allowed' : 'pointer',
                width: '100%',
                marginBottom: '20px',
                transition: 'background-color 0.3s ease'
              }}
            >
              {isAuthenticating ? '🔄 Authenticating...' : '🔐 Sign & Authenticate'}
            </button>
          </div>
        )}

        {/* Admin Privileges Info */}
        <div style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>
            🔑 Admin Privileges
          </h4>
          <div style={{ fontSize: '14px', color: '#666', textAlign: 'left' }}>
            <p style={{ margin: '5px 0' }}>✅ Issue and manage documents</p>
            <p style={{ margin: '5px 0' }}>✅ View system analytics and reports</p>
            <p style={{ margin: '5px 0' }}>✅ Manage user roles and permissions</p>
            <p style={{ margin: '5px 0' }}>✅ Access blockchain transaction logs</p>
          </div>
        </div>

        {/* Back Button */}
        <button 
          onClick={onBack}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: 'transparent',
            color: '#6c757d',
            border: '1px solid #6c757d',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#6c757d';
            e.target.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.color = '#6c757d';
          }}
        >
          ← Back to Login Selection
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;