import React from 'react';
import {
  Box,
  Chip,
  Tooltip,
  IconButton,
  Typography,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error,
  Refresh,
  AccountBalanceWallet,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const ConnectionStatus = ({ showDetails = false, onRefresh }) => {
  const { wallet, isAuthenticated, user, authError, checkAuthStatus } = useAuth();

  const getStatusInfo = () => {
    if (!wallet.isMetaMaskInstalled) {
      return {
        status: 'error',
        label: 'MetaMask Not Installed',
        icon: <Error />,
        color: 'error',
        description: 'Please install MetaMask to continue',
      };
    }

    if (wallet.error) {
      return {
        status: 'error',
        label: 'Connection Error',
        icon: <Error />,
        color: 'error',
        description: wallet.error,
      };
    }

    if (!wallet.isConnected) {
      return {
        status: 'disconnected',
        label: 'Wallet Disconnected',
        icon: <AccountBalanceWallet />,
        color: 'default',
        description: 'Connect your wallet to continue',
      };
    }

    if (wallet.isConnecting) {
      return {
        status: 'connecting',
        label: 'Connecting...',
        icon: <AccountBalanceWallet />,
        color: 'primary',
        description: 'Connecting to MetaMask',
      };
    }

    if (authError) {
      return {
        status: 'auth-error',
        label: 'Authentication Error',
        icon: <Error />,
        color: 'error',
        description: authError,
      };
    }

    if (!isAuthenticated) {
      return {
        status: 'connected',
        label: 'Connected - Not Authenticated',
        icon: <Warning />,
        color: 'warning',
        description: 'Please authenticate to access features',
      };
    }

    return {
      status: 'authenticated',
      label: 'Authenticated',
      icon: <CheckCircle />,
      color: 'success',
      description: `Connected as ${user?.role || 'user'}`,
    };
  };

  const statusInfo = getStatusInfo();

  const handleRefresh = async () => {
    if (onRefresh) {
      onRefresh();
    } else {
      await checkAuthStatus();
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!showDetails) {
    return (
      <Tooltip title={statusInfo.description}>
        <Chip
          icon={statusInfo.icon}
          label={statusInfo.label}
          color={statusInfo.color}
          size="small"
          variant="outlined"
        />
      </Tooltip>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
      }}
    >
      <Box display="flex" alignItems="center" gap={1} flex={1}>
        <Chip
          icon={statusInfo.icon}
          label={statusInfo.label}
          color={statusInfo.color}
          size="small"
        />
        
        {wallet.account && (
          <Typography variant="caption" color="text.secondary" fontFamily="monospace">
            {formatAddress(wallet.account)}
          </Typography>
        )}

        {user && (
          <Chip
            label={user.role}
            size="small"
            variant="outlined"
            color="primary"
          />
        )}
      </Box>

      <Tooltip title="Refresh connection status">
        <IconButton size="small" onClick={handleRefresh}>
          <Refresh />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default ConnectionStatus;