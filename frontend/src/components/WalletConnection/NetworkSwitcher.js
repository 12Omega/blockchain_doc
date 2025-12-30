import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Chip,
  Typography,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  SwapHoriz,
  OpenInNew,
} from '@mui/icons-material';
import { SUPPORTED_NETWORKS } from '../../utils/networks';

const NetworkSwitcher = ({ currentChainId, onNetworkSwitch, open, onClose }) => {
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState(null);
  const [selectedNetwork, setSelectedNetwork] = useState(null);

  const handleNetworkSelect = async (networkKey) => {
    setSelectedNetwork(networkKey);
    setSwitching(true);
    setError(null);

    try {
      const success = await onNetworkSwitch(networkKey);
      if (success) {
        // Dialog will close automatically on chain change
        setTimeout(() => {
          onClose();
        }, 500);
      }
    } catch (err) {
      setError(err.message || 'Failed to switch network');
    } finally {
      setSwitching(false);
      setSelectedNetwork(null);
    }
  };

  const isCurrentNetwork = (network) => {
    if (!currentChainId) return false;
    const chainIdDecimal = typeof currentChainId === 'string' && currentChainId.startsWith('0x')
      ? parseInt(currentChainId, 16)
      : parseInt(currentChainId, 10);
    return network.chainIdDecimal === chainIdDecimal;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <SwapHoriz sx={{ mr: 1 }} />
          Switch Network
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select a network to switch to. All supported networks are free testnets.
        </Typography>

        <List>
          {Object.entries(SUPPORTED_NETWORKS).map(([key, network]) => {
            const isCurrent = isCurrentNetwork(network);
            const isSwitching = switching && selectedNetwork === key;

            return (
              <React.Fragment key={key}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleNetworkSelect(key)}
                    disabled={isCurrent || switching}
                    selected={isCurrent}
                  >
                    <ListItemIcon>
                      {isCurrent ? (
                        <CheckCircle color="success" />
                      ) : network.isTestnet ? (
                        <Warning color="warning" />
                      ) : null}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body1">{network.name}</Typography>
                          {isCurrent && (
                            <Chip label="Connected" size="small" color="success" />
                          )}
                          {network.free && (
                            <Chip label="Free" size="small" color="info" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            Chain ID: {network.chainIdDecimal} • Currency: {network.symbol}
                          </Typography>
                          {network.faucets.length > 0 && (
                            <Typography variant="caption" color="primary">
                              {network.faucets.length} faucet{network.faucets.length > 1 ? 's' : ''} available
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    {isSwitching && <CircularProgress size={20} />}
                  </ListItemButton>
                </ListItem>
                <Divider />
              </React.Fragment>
            );
          })}
        </List>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Need testnet tokens?</strong> Click "Get Testnet Tokens" after switching to see available faucets.
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={switching}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NetworkSwitcher;
