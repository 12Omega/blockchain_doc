import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import {
  AccountBalanceWallet,
  Email,
  Logout,
  Refresh,
  ContentCopy,
  CheckCircle,
  AdminPanelSettings,
  School,
} from '@mui/icons-material';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import useMultiWallet from '../../hooks/useMultiWallet';
import authService from '../../services/authService';

const MultiWalletConnect = ({ onAuthSuccess, onAuthError }) => {
  const { open } = useWeb3Modal();
  const {
    account,
    balance,
    isConnecting,
    error: walletError,
    isConnected,
    connectionType,
    connectWithMagic,
    disconnectWallet,
    signMessage,
    refreshBalance,
    isMagicAvailable,
  } = useMultiWallet();

  const [email, setEmail] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);
  const [selectedRole, setSelectedRole] = useState('student');

  // Handle WalletConnect button
  const handleWalletConnect = async () => {
    try {
      await open();
    } catch (err) {
      console.error('WalletConnect error:', err);
      setAuthError(err.message);
    }
  };

  // Handle Magic Link login
  const handleMagicLogin = async (e) => {
    e.preventDefault();
    if (!email) {
      setAuthError('Please enter your email');
      return;
    }

    try {
      setAuthError(null);
      await connectWithMagic(email);
      // After connection, authenticate
      await handleAuthenticate();
    } catch (err) {
      console.error('Magic login error:', err);
      setAuthError(err.message || 'Failed to login with Magic Link');
      onAuthError?.(err);
    }
  };

  // Authenticate with backend
  const handleAuthenticate = async () => {
    if (!account) {
      setAuthError('No wallet connected');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      // Create a signer object that has the signMessage method
      const signer = {
        signMessage: signMessage
      };

      // Use the new authenticateWallet method with selected role
      const authResponse = await authService.authenticateWallet(account, signer, selectedRole);

      setUser(authResponse.user);
      onAuthSuccess?.(authResponse.user);
    } catch (err) {
      console.error('Authentication error:', err);
      setAuthError(err.message || 'Authentication failed');
      onAuthError?.(err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
      setUser(null);
      setEmail('');
      authService.logout();
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  // Copy address to clipboard
  const handleCopyAddress = () => {
    navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format address
  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <Card sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom align="center">
          Connect Your Wallet
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Choose your preferred authentication method
        </Typography>

        {!isConnected ? (
          <Stack spacing={3}>
            {/* Role Selection */}
            <FormControl component="fieldset">
              <FormLabel component="legend" sx={{ mb: 1 }}>
                Select Your Role
              </FormLabel>
              <RadioGroup
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <FormControlLabel
                  value="admin"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AdminPanelSettings fontSize="small" />
                      <Box>
                        <Typography variant="body2">Admin</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Can upload and manage documents
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="student"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <School fontSize="small" />
                      <Box>
                        <Typography variant="body2">Student</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Can view and verify documents only
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>

            <Divider />

            {/* WalletConnect Option */}
            <Box>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<AccountBalanceWallet />}
                onClick={handleWalletConnect}
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect with WalletConnect'}
              </Button>
              <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
                Supports 300+ wallets (Trust, Rainbow, Coinbase, etc.)
              </Typography>
            </Box>

            <Divider>
              <Chip label="OR" size="small" />
            </Divider>

            {/* Magic Link Option */}
            {isMagicAvailable ? (
              <Box component="form" onSubmit={handleMagicLogin}>
                <TextField
                  fullWidth
                  type="email"
                  label="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={isConnecting}
                  sx={{ mb: 2 }}
                />
                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  type="submit"
                  startIcon={<Email />}
                  disabled={isConnecting || !email}
                >
                  {isConnecting ? 'Sending Magic Link...' : 'Login with Email'}
                </Button>
                <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
                  No wallet needed - we'll create one for you
                </Typography>
              </Box>
            ) : (
              <Alert severity="info">
                Magic Link not configured. Add REACT_APP_MAGIC_API_KEY to enable email login.
              </Alert>
            )}
          </Stack>
        ) : (
          <Stack spacing={2}>
            {/* Connected State */}
            <Alert severity="success" icon={<CheckCircle />}>
              Connected via {connectionType === 'walletconnect' ? 'WalletConnect' : 'Magic Link'}
            </Alert>

            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Wallet Address
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                  {formatAddress(account)}
                </Typography>
                <Tooltip title={copied ? 'Copied!' : 'Copy address'}>
                  <IconButton size="small" onClick={handleCopyAddress}>
                    {copied ? <CheckCircle fontSize="small" color="success" /> : <ContentCopy fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {balance && (
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Balance
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Typography variant="body1">
                    {parseFloat(balance).toFixed(4)} ETH
                  </Typography>
                  <Tooltip title="Refresh balance">
                    <IconButton size="small" onClick={refreshBalance}>
                      <Refresh fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            )}

            {!user ? (
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleAuthenticate}
                disabled={isAuthenticating}
              >
                {isAuthenticating ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Authenticating...
                  </>
                ) : (
                  'Authenticate with Backend'
                )}
              </Button>
            ) : (
              <Alert severity="success">
                Authenticated as {user.role}
              </Alert>
            )}

            <Button
              fullWidth
              variant="outlined"
              color="error"
              startIcon={<Logout />}
              onClick={handleDisconnect}
            >
              Disconnect
            </Button>
          </Stack>
        )}

        {(walletError || authError) && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {walletError || authError}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default MultiWalletConnect;
