import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
} from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import RefreshIcon from '@mui/icons-material/Refresh';

const ServerErrorPage = ({ onRetry, errorMessage }) => {
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
          <BuildIcon
            sx={{ fontSize: 100, color: 'error.main', mb: 2 }}
          />
          <Typography variant="h1" sx={{ fontSize: '6rem', fontWeight: 'bold', color: 'error.main' }}>
            500
          </Typography>
          <Typography variant="h4" gutterBottom>
            Server Error
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            We're experiencing technical difficulties. Our team has been notified.
          </Typography>
          
          {errorMessage && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, fontStyle: 'italic' }}>
              {errorMessage}
            </Typography>
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={onRetry || (() => window.location.reload())}
              size="large"
            >
              Try Again
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            If the problem persists, please contact support or try again later.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default ServerErrorPage;
