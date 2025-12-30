import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  HourglassEmpty as PendingIcon,
} from '@mui/icons-material';

const RegistrationProgress = ({ status, error }) => {
  const steps = [
    {
      label: 'Computing Document Hash',
      key: 'hashing',
      description: 'Generating SHA-256 hash of document content',
    },
    {
      label: 'Encrypting Document',
      key: 'encrypting',
      description: 'Encrypting document with AES-256',
    },
    {
      label: 'Uploading to IPFS',
      key: 'ipfs',
      description: 'Storing encrypted document on decentralized storage',
    },
    {
      label: 'Blockchain Registration',
      key: 'blockchain',
      description: 'Recording document hash on blockchain',
    },
    {
      label: 'Generating QR Code',
      key: 'qrcode',
      description: 'Creating verification QR code',
    },
  ];

  const getStepStatus = (stepKey) => {
    if (!status) return 'pending';
    
    const stepOrder = ['hashing', 'encrypting', 'ipfs', 'blockchain', 'qrcode'];
    const currentIndex = stepOrder.indexOf(status.currentStep);
    const stepIndex = stepOrder.indexOf(stepKey);

    if (status.error && stepIndex === currentIndex) {
      return 'error';
    }

    if (stepIndex < currentIndex) {
      return 'completed';
    }

    if (stepIndex === currentIndex) {
      return 'active';
    }

    return 'pending';
  };

  const getStepIcon = (stepKey) => {
    const stepStatus = getStepStatus(stepKey);

    switch (stepStatus) {
      case 'completed':
        return <CheckIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'active':
        return <CircularProgress size={24} />;
      default:
        return <PendingIcon color="disabled" />;
    }
  };

  const activeStep = status ? steps.findIndex(step => step.key === status.currentStep) : -1;

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Registration Progress
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {status && status.message && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {status.message}
        </Alert>
      )}

      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => {
          const stepStatus = getStepStatus(step.key);
          const isActive = activeStep === index;

          return (
            <Step key={step.key} active={isActive} completed={stepStatus === 'completed'}>
              <StepLabel
                error={stepStatus === 'error'}
                icon={getStepIcon(step.key)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1">{step.label}</Typography>
                  {stepStatus === 'completed' && (
                    <Chip label="Done" size="small" color="success" />
                  )}
                  {stepStatus === 'error' && (
                    <Chip label="Failed" size="small" color="error" />
                  )}
                  {stepStatus === 'active' && (
                    <Chip label="In Progress" size="small" color="primary" />
                  )}
                </Box>
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary">
                  {step.description}
                </Typography>
                {isActive && status.details && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {status.details}
                    </Typography>
                  </Box>
                )}
              </StepContent>
            </Step>
          );
        })}
      </Stepper>

      {status && status.currentStep === 'completed' && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Document registered successfully!
        </Alert>
      )}
    </Paper>
  );
};

export default RegistrationProgress;
