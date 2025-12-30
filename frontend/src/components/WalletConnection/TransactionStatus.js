import React, { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  LinearProgress,
  Alert,
  Link,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  CheckCircle,
  HourglassEmpty,
  Error as ErrorIcon,
  OpenInNew,
} from '@mui/icons-material';
import { getExplorerUrl } from '../../utils/networks';

const TransactionStatus = ({ 
  transaction, 
  chainId, 
  open, 
  onClose,
  requiredConfirmations = 2 
}) => {
  const [status, setStatus] = useState('pending');
  const [confirmations, setConfirmations] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!transaction || !open) return;

    let isMounted = true;
    let intervalId;

    const checkTransactionStatus = async () => {
      try {
        if (!transaction.wait) {
          // Transaction object doesn't have wait method, it's already confirmed
          if (isMounted) {
            setStatus('confirmed');
            setConfirmations(requiredConfirmations);
          }
          return;
        }

        // Wait for transaction to be mined
        const receipt = await transaction.wait(1);
        
        if (!isMounted) return;

        if (receipt.status === 1) {
          setStatus('confirmed');
          setConfirmations(1);

          // Continue checking for additional confirmations
          intervalId = setInterval(async () => {
            try {
              const currentConfirmations = await receipt.confirmations();
              if (isMounted) {
                setConfirmations(currentConfirmations);
                if (currentConfirmations >= requiredConfirmations) {
                  setStatus('finalized');
                  clearInterval(intervalId);
                }
              }
            } catch (err) {
              console.error('Error checking confirmations:', err);
            }
          }, 5000); // Check every 5 seconds
        } else {
          setStatus('failed');
          setError('Transaction failed');
        }
      } catch (err) {
        console.error('Transaction error:', err);
        if (isMounted) {
          setStatus('failed');
          setError(err.message || 'Transaction failed');
        }
      }
    };

    checkTransactionStatus();

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [transaction, open, requiredConfirmations]);

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <HourglassEmpty color="warning" />;
      case 'confirmed':
      case 'finalized':
        return <CheckCircle color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      default:
        return <HourglassEmpty />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'finalized':
        return 'Finalized';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'confirmed':
        return 'info';
      case 'finalized':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const explorerUrl = transaction?.hash ? getExplorerUrl(transaction.hash, chainId) : null;

  const steps = [
    {
      label: 'Transaction Submitted',
      description: 'Your transaction has been submitted to the network',
      completed: true,
    },
    {
      label: 'Mining',
      description: 'Waiting for the transaction to be included in a block',
      completed: status !== 'pending',
    },
    {
      label: 'Confirmed',
      description: `Waiting for ${requiredConfirmations} confirmation${requiredConfirmations > 1 ? 's' : ''}`,
      completed: confirmations >= requiredConfirmations,
    },
  ];

  return (
    <Dialog open={open} onClose={status === 'finalized' || status === 'failed' ? onClose : undefined} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            {getStatusIcon()}
            <Typography variant="h6" sx={{ ml: 1 }}>
              Transaction Status
            </Typography>
          </Box>
          <Chip label={getStatusText()} color={getStatusColor()} size="small" />
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {status === 'pending' && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Processing transaction...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {transaction?.hash && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Transaction Hash:
            </Typography>
            <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
              {transaction.hash}
            </Typography>
            {explorerUrl && (
              <Link
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}
              >
                View on Block Explorer
                <OpenInNew fontSize="small" />
              </Link>
            )}
          </Box>
        )}

        {status !== 'failed' && (
          <Stepper activeStep={status === 'pending' ? 1 : status === 'confirmed' ? 2 : 3} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label} completed={step.completed}>
                <StepLabel>
                  {step.label}
                  {index === 2 && confirmations > 0 && (
                    <Chip
                      label={`${confirmations}/${requiredConfirmations}`}
                      size="small"
                      color={confirmations >= requiredConfirmations ? 'success' : 'default'}
                      sx={{ ml: 1 }}
                    />
                  )}
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        )}

        {status === 'finalized' && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Transaction has been finalized with {confirmations} confirmations!
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={onClose} 
          disabled={status === 'pending'}
          variant={status === 'finalized' || status === 'failed' ? 'contained' : 'text'}
        >
          {status === 'pending' ? 'Please Wait...' : 'Close'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransactionStatus;
