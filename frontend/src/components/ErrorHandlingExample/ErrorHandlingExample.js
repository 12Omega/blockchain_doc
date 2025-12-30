import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Divider,
} from '@mui/material';
import { useNotification } from '../../contexts/NotificationContext';
import { useOffline } from '../../contexts/OfflineContext';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';
import ErrorDisplay from '../ErrorDisplay';
import { LoadingSpinner, LoadingOverlay } from '../LoadingState';

/**
 * Example component demonstrating error handling features
 * This can be used as a reference for implementing error handling in other components
 */
const ErrorHandlingExample = () => {
  const [testInput, setTestInput] = useState('');
  const { showSuccess, showError, showWarning, showInfo } = useNotification();
  const { isOnline, queueSize, enqueueOperation } = useOffline();
  const { execute, loading, error, data, reset } = useAsyncOperation({
    showSuccessNotification: true,
    showErrorNotification: true,
  });

  // Simulate successful operation
  const handleSuccess = () => {
    showSuccess('Operation completed successfully!', 'Success');
  };

  // Simulate error
  const handleError = () => {
    showError('Something went wrong. Please try again.', 'Error');
  };

  // Simulate warning
  const handleWarning = () => {
    showWarning('This action requires confirmation.', 'Warning');
  };

  // Simulate info
  const handleInfo = () => {
    showInfo('This is an informational message.');
  };

  // Simulate async operation with loading
  const handleAsyncOperation = async () => {
    await execute(
      async () => {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return { message: 'Data loaded successfully' };
      },
      {
        successMessage: 'Async operation completed!',
        errorMessage: 'Async operation failed!',
      }
    );
  };

  // Simulate async operation that fails
  const handleFailingOperation = async () => {
    try {
      await execute(
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          throw new Error('Simulated error');
        },
        {
          retry: true,
          retryOptions: {
            maxRetries: 2,
          },
        }
      );
    } catch (err) {
      // Error is already handled by useAsyncOperation
    }
  };

  // Simulate offline operation
  const handleOfflineOperation = () => {
    if (!isOnline) {
      const operationId = enqueueOperation({
        execute: async () => {
          console.log('Executing queued operation:', testInput);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        },
      });
      showInfo(`Operation queued (ID: ${operationId}). Will execute when online.`);
    } else {
      showInfo('You are online. Operation will execute immediately.');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Error Handling & User Feedback Examples
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        This page demonstrates all error handling and user feedback features.
      </Typography>

      {/* Notification Examples */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Toast Notifications
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="contained" color="success" onClick={handleSuccess}>
            Show Success
          </Button>
          <Button variant="contained" color="error" onClick={handleError}>
            Show Error
          </Button>
          <Button variant="contained" color="warning" onClick={handleWarning}>
            Show Warning
          </Button>
          <Button variant="contained" color="info" onClick={handleInfo}>
            Show Info
          </Button>
        </Box>
      </Paper>

      {/* Async Operations */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Async Operations with Loading & Error States
        </Typography>
        
        <LoadingOverlay isLoading={loading} message="Processing...">
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <Button
              variant="contained"
              onClick={handleAsyncOperation}
              disabled={loading}
            >
              Successful Operation
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleFailingOperation}
              disabled={loading}
            >
              Failing Operation (with retry)
            </Button>
            <Button variant="outlined" onClick={reset} disabled={loading}>
              Reset
            </Button>
          </Box>
        </LoadingOverlay>

        {loading && <LoadingSpinner message="Loading data..." />}

        {error && (
          <ErrorDisplay
            error={error}
            onRetry={handleAsyncOperation}
            onDismiss={reset}
            showDetails={true}
          />
        )}

        {data && !loading && (
          <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
            <Typography variant="body2">
              Result: {JSON.stringify(data)}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Offline Detection */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Offline Detection & Queueing
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Status: {isOnline ? '🟢 Online' : '🔴 Offline'} | Queued Operations: {queueSize}
        </Typography>
        <TextField
          fullWidth
          label="Test Input"
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button variant="contained" onClick={handleOfflineOperation}>
          Submit (Will Queue if Offline)
        </Button>
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Try disconnecting your internet to test offline queueing
        </Typography>
      </Paper>

      <Divider sx={{ my: 3 }} />

      <Typography variant="body2" color="text.secondary">
        All error handling features are integrated throughout the application.
        This page is for demonstration purposes only.
      </Typography>
    </Box>
  );
};

export default ErrorHandlingExample;
