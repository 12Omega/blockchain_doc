import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  AccountBalanceWallet,
  Refresh,
  ExitToApp,
  CheckCircle,
  Error,
  SwapHoriz,
  LocalAtm,
  Warning,
  OpenInNew,
} from '@mui/icons-material';
import useWallet from '../../hooks/useWallet';
import authService from '../../services/authService';
import NetworkSwitcher from './NetworkSwitcher';
import FaucetInfo from './FaucetInfo';
import { getExplorerUrl, getAddressExplorerUrl } from '../../utils/networks';

const WalletConnection = ({ onAuthSuccess, onAuthError }) => {
  const {
    account,
    signer,
    chainId,
    network,
    balance,
    isConnecting,
    error: walletError,
    isConnected,
    isMetaMaskInstalled,
    isSupportedNetwork,
    networkName,
    networkCurrency,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    refreshBalance,
  } = useWallet();

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [user, setUser] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [showNetworkSwitcher, setShowNetworkSwitcher] = useState(false);
  const [showFaucetInfo, setShowFaucetInfo] = useState(false);

  // Check authentication status on mount and when account changes
  useEffect(() => {
    if (isConnected && account) {
      checkAuthenticationStatus();
    } else {
      setUser(null);
      setConnectionStatus('disconnected');
    }
  }, [isConnected, account]);

  const checkAuthenticationStatus = async () => {
    try {
      const storedUser = authService.getStoredUser();
      const storedToken = authService.getStoredToken();

      if (storedUser && storedToken && storedUser.walletAddress === account) {
        // Verify token is still valid
        const profile = await authService.getUserProfile();
        setUser(profile);
        setConnectionStatus('authenticated');
        onAuthSuccess?.(profile);
      } else {
        setConnectionStatus('connected');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setConnectionStatus('connected');
    }
  };

  const handleConnect = async () => {
    setAuthError(null);
    await connectWallet();
  };

  const handleAuthenticate = async () => {
    if (!signer || !account) {
      setAuthError('Wallet not connected');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const authResult = await authService.authenticateWallet(account, signer);
      setUser(authResult.user);
      setConnectionStatus('authenticated');
      onAuthSuccess?.(authResult.user);
    } catch (error) {
      console.error('Authentication failed:', error);
      setAuthError(error.message);
      onAuthError?.(error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = () => {
    authService.logout();
    disconnectWallet();
    setUser(null);
    setConnectionStatus('disconnected');
    setAuthError(null);
  };

  const handleRefresh = async () => {
    if (account && signer) {
      await checkAuthenticationStatus();
      await refreshBalance();
    }
  };

  const handleNetworkSwitch = async (networkKey) => {
    try {
      const success = await switchNetwork(networkKey);
      return success;
    } catch (error) {
      console.error('Network switch error:', error);
      return false;
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'authenticated':
        return 'success';
      case 'connected':
        return 'warning';
      case 'disconnected':
      default:
        return 'default';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'authenticated':
        return 'Authenticated';
      case 'connected':
        return 'Connected';
      case 'disconnected':
      default:
        return 'Disconnected';
    }
  };

  if (!isMetaMaskInstalled) {
    return (
      <Card sx={{ maxWidth: 400, mx: 'auto', mt: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Error color="error" sx={{ mr: 1 }} />
            <Typography variant="h6">MetaMask Required</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Please install MetaMask to connect your wallet and access the document verification system.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={() => window.open('https://metamask.io/download/', '_blank')}
          >
            Install MetaMask
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ maxWidth: 500, mx: 'auto', mt: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center">
            <AccountBalanceWallet sx={{ mr: 1 }} />
            <Typography variant="h6">Wallet Connection</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={getStatusText()}
              color={getStatusColor()}
              size="small"
              icon={connectionStatus === 'authenticated' ? <CheckCircle /> : undefined}
            />
            {isConnected && (
              <Tooltip title="Refresh connection">
                <IconButton size="small" onClick={handleRefresh}>
                  <Refresh />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {(walletError || authError) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {walletError || authError}
          </Alert>
        )}

        {!isConnected ? (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Connect your MetaMask wallet to access the document verification system.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleConnect}
              disabled={isConnecting}
              startIcon={isConnecting ? <CircularProgress size={20} /> : <AccountBalanceWallet />}
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          </Box>
        ) : connectionStatus === 'connected' ? (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={1}>
              Wallet Address:
            </Typography>
            <Typography variant="body1" fontFamily="monospace" mb={2}>
              {formatAddress(account)}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Please authenticate to access the system features.
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleAuthenticate}
                disabled={isAuthenticating}
                startIcon={isAuthenticating ? <CircularProgress size={20} /> : undefined}
                sx={{ flex: 1 }}
              >
                {isAuthenticating ? 'Authenticating...' : 'Authenticate'}
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleDisconnect}
                startIcon={<ExitToApp />}
              >
                Disconnect
              </Button>
            </Box>
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={1}>
              Wallet Address:
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Typography variant="body1" fontFamily="monospace">
                {formatAddress(account)}
              </Typography>
              {account && chainId && getAddressExplorerUrl(account, chainId) && (
                <Tooltip title="View on Block Explorer">
                  <IconButton
                    size="small"
                    onClick={() => window.open(getAddressExplorerUrl(account, chainId), '_blank')}
                  >
                    <OpenInNew fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {balance !== null && (
              <Typography variant="body2" color="text.secondary" mb={1}>
                Balance: {parseFloat(balance).toFixed(4)} {networkCurrency}
              </Typography>
            )}

            {user && (
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Role: <Chip label={user.role} size="small" />
                </Typography>
                {user.profile?.name && (
                  <Typography variant="body2" color="text.secondary">
                    Name: {user.profile.name}
                  </Typography>
                )}
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Network Information */}
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary" mb={1}>
                Network:
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Typography variant="body2">{networkName}</Typography>
                {!isSupportedNetwork && (
                  <Chip
                    icon={<Warning />}
                    label="Unsupported"
                    size="small"
                    color="warning"
                  />
                )}
                {network?.isTestnet && (
                  <Chip label="Testnet" size="small" color="info" />
                )}
                {network?.free && (
                  <Chip label="Free" size="small" color="success" />
                )}
              </Box>
              {chainId && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Chain ID: {chainId}
                </Typography>
              )}
            </Box>

            {/* Network Actions */}
            <Box display="flex" gap={1} mb={2}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SwapHoriz />}
                onClick={() => setShowNetworkSwitcher(true)}
                fullWidth
              >
                Switch Network
              </Button>
              {network?.faucets && network.faucets.length > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<LocalAtm />}
                  onClick={() => setShowFaucetInfo(true)}
                  fullWidth
                >
                  Get Tokens
                </Button>
              )}
            </Box>

            {!isSupportedNetwork && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  You're connected to an unsupported network. Please switch to Sepolia or Mumbai testnet.
                </Typography>
              </Alert>
            )}

            <Button
              variant="outlined"
              color="secondary"
              fullWidth
              onClick={handleDisconnect}
              startIcon={<ExitToApp />}
            >
              Disconnect
            </Button>
          </Box>
        )}

        {/* Network Switcher Dialog */}
        <NetworkSwitcher
          currentChainId={chainId}
          onNetworkSwitch={handleNetworkSwitch}
          open={showNetworkSwitcher}
          onClose={() => setShowNetworkSwitcher(false)}
        />

        {/* Faucet Info Dialog */}
        <FaucetInfo
          chainId={chainId}
          open={showFaucetInfo}
          onClose={() => setShowFaucetInfo(false)}
        />
      </CardContent>
    </Card>
  );
};

export default WalletConnection;