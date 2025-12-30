import React from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Alert,
  Link,
  Divider,
} from '@mui/material';
import {
  LocalAtm,
  OpenInNew,
  Info,
} from '@mui/icons-material';
import { getNetworkFaucets, getNetworkByChainId } from '../../utils/networks';

const FaucetInfo = ({ chainId, open, onClose }) => {
  const network = getNetworkByChainId(chainId);
  const faucets = getNetworkFaucets(chainId);

  if (!network) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <LocalAtm sx={{ mr: 1 }} />
          Get Testnet Tokens
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>{network.name}</strong> uses <strong>{network.symbol}</strong> for gas fees.
            Use these free faucets to get testnet tokens.
          </Typography>
        </Alert>

        {faucets.length === 0 ? (
          <Alert severity="warning">
            <Typography variant="body2">
              No faucets available for this network. If this is a local network, tokens should be pre-funded.
            </Typography>
          </Alert>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Click on any faucet below to get free testnet tokens:
            </Typography>

            <List>
              {faucets.map((faucet, index) => (
                <React.Fragment key={index}>
                  <ListItem disablePadding>
                    <ListItemIcon>
                      <LocalAtm color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Link
                          href={faucet.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          underline="hover"
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                        >
                          {faucet.name}
                          <OpenInNew fontSize="small" />
                        </Link>
                      }
                      secondary={faucet.description}
                    />
                  </ListItem>
                  {index < faucets.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>

            <Alert severity="success" icon={<Info />} sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Tips:</strong>
              </Typography>
              <Typography variant="caption" component="div">
                • Most faucets require you to paste your wallet address
              </Typography>
              <Typography variant="caption" component="div">
                • Tokens usually arrive within a few minutes
              </Typography>
              <Typography variant="caption" component="div">
                • Some faucets have daily limits
              </Typography>
              <Typography variant="caption" component="div">
                • Keep some tokens for gas fees when registering documents
              </Typography>
            </Alert>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default FaucetInfo;
