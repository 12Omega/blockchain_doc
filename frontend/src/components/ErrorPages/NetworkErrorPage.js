import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Alert,
} from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import RefreshIcon from '@mui/icons-material/Refresh';

const NetworkErrorPage = ({ onRetry, isOffline }) => {
  return (
    <Container maxWidth="md" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <WifiOffIcon
            sx={{ fontSize: 100, color: 'warning.main', mb: 2 }}
          />
          <Typography variant="h4" gutterBottom>
            Network Connection Error
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {isOffline
              ? "You appear to be offline. Please check your internet connection."
              : "Unable to connect to the server. Please check your network connection."}
          </Typography>

          <Alert severity="info" sx={{ mb: 3, width: '100%' }}>
            <Typography variant="subtitle2" gutterBottom>
              Troubleshooting Steps:
            </Typography>
            <Typography variant="body2" component="ul" sx={{ textAlign: 'left', pl: 2 }}>
              <li>Check your internet connection</li>
              <li>Verify your firewall settings</li>
              <li>Try disabling VPN if enabled</li>
              <li>Check if the blockchain network is accessible</li>
            </Typography>
          </Alert>

          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={onRetry || (() => window.location.reload())}
            size="large"
          >
            Retry Connection
          </Button>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            Your pending operations will be queued and processed when connection is restored.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default NetworkErrorPage;
