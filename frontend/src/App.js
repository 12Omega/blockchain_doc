import React, { useState } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Alert,
} from '@mui/material';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { config, queryClient } from './config/walletConfig';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { OfflineProvider } from './contexts/OfflineContext';
import ErrorBoundary from './components/ErrorBoundary';
import MultiWalletConnect from './components/WalletConnection/MultiWalletConnect';
import UserProfile from './components/UserProfile/UserProfile';
import ConnectionStatus from './components/ConnectionStatus/ConnectionStatus';
import { DocumentVerification } from './components/DocumentVerification';
import { Dashboard } from './components/Dashboard';
import { IssuerDashboard } from './components/IssuerDashboard';
import UnifiedDashboard from './components/Dashboard/UnifiedDashboard';
import EnhancedVerification from './components/DocumentVerification/EnhancedVerification';
import EnhancedDocumentUpload from './components/DocumentUpload/EnhancedDocumentUpload';
import DocumentList from './components/DocumentList/DocumentList';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const AppContent = () => {
  const { isAuthenticated, user: contextUser, logout } = useAuth();
  const [currentView, setCurrentView] = useState('connection');
  const [authSuccess, setAuthSuccess] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [localUser, setLocalUser] = useState(null);
  
  // Use context user if available, otherwise use local user
  const user = contextUser || localUser;

  // Debug logging
  console.log('AppContent render:', { isAuthenticated, contextUser, localUser, user, currentView });

  const handleAuthSuccess = async (userData) => {
    console.log('Auth success! User data:', userData);
    setLocalUser(userData); // Store user in local state
    setAuthSuccess(`Successfully authenticated as ${userData.role}`);
    setAuthError(null);
    setCurrentView('documents'); // Show documents after login
  };

  const handleAuthError = (error) => {
    setAuthError(error.message);
    setAuthSuccess(null);
  };

  const handleProfileUpdate = (updatedUser) => {
    setAuthSuccess('Profile updated successfully');
    setAuthError(null);
  };

  const handleLogout = () => {
    logout();
    setLocalUser(null); // Clear local user state
    setCurrentView('connection');
    setAuthSuccess(null);
    setAuthError(null);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Document Verification System
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ConnectionStatus />
            
            {user && (
              <>
                <Button
                  color="inherit"
                  onClick={() => setCurrentView('connection')}
                  variant={currentView === 'connection' ? 'outlined' : 'text'}
                >
                  Connection
                </Button>
                <Button
                  color="inherit"
                  onClick={() => setCurrentView('dashboard')}
                  variant={currentView === 'dashboard' ? 'outlined' : 'text'}
                >
                  Dashboard
                </Button>
                <Button
                  color="inherit"
                  onClick={() => setCurrentView('documents')}
                  variant={currentView === 'documents' ? 'outlined' : 'text'}
                >
                  Documents
                </Button>
                {user?.role === 'admin' && (
                  <Button
                    color="inherit"
                    onClick={() => setCurrentView('upload')}
                    variant={currentView === 'upload' ? 'outlined' : 'text'}
                  >
                    Upload
                  </Button>
                )}
                <Button
                  color="inherit"
                  onClick={() => setCurrentView('verify')}
                  variant={currentView === 'verify' ? 'outlined' : 'text'}
                >
                  Verify
                </Button>
                <Button
                  color="inherit"
                  onClick={() => setCurrentView('profile')}
                  variant={currentView === 'profile' ? 'outlined' : 'text'}
                >
                  Profile
                </Button>
                <Button
                  color="inherit"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {authSuccess && (
          <Alert 
            severity="success" 
            sx={{ mb: 2 }}
            onClose={() => setAuthSuccess(null)}
          >
            {authSuccess}
          </Alert>
        )}

        {authError && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            onClose={() => setAuthError(null)}
          >
            {authError}
          </Alert>
        )}

        {currentView === 'connection' && (
          <MultiWalletConnect
            onAuthSuccess={handleAuthSuccess}
            onAuthError={handleAuthError}
          />
        )}

        {currentView === 'dashboard' && user && (
          <UnifiedDashboard />
        )}

        {currentView === 'documents' && user && (
          <DocumentList />
        )}

        {currentView === 'upload' && user && user?.role === 'admin' && (
          <EnhancedDocumentUpload onUploadSuccess={() => {
            setAuthSuccess('Document uploaded successfully!');
            setCurrentView('documents');
          }} />
        )}

        {currentView === 'verify' && (
          <EnhancedVerification />
        )}

        {currentView === 'profile' && user && (
          <UserProfile
            user={user}
            onProfileUpdate={handleProfileUpdate}
          />
        )}

        {!user && (currentView === 'profile' || currentView === 'dashboard' || currentView === 'documents') && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Please connect and authenticate your wallet to access this feature.
          </Alert>
        )}
      </Container>
    </Box>
  );
};

const App = () => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ErrorBoundary>
            <NotificationProvider>
              <OfflineProvider>
                <AuthProvider>
                  <AppContent />
                </AuthProvider>
              </OfflineProvider>
            </NotificationProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default App;
