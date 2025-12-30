import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  LinearProgress,
  Backdrop,
} from '@mui/material';

export const LoadingSpinner = ({ size = 40, message = null, fullScreen = false }) => {
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 3,
      }}
    >
      <CircularProgress size={size} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );

  if (fullScreen) {
    return (
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={true}
      >
        {content}
      </Backdrop>
    );
  }

  return content;
};

export const LoadingBar = ({ message = null }) => {
  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      <LinearProgress />
      {message && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
          {message}
        </Typography>
      )}
    </Box>
  );
};

export const LoadingOverlay = ({ message = 'Loading...', children, isLoading }) => {
  if (!isLoading) {
    return children;
  }

  return (
    <Box sx={{ position: 'relative', minHeight: 200 }}>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 1,
        }}
      >
        <LoadingSpinner message={message} />
      </Box>
      <Box sx={{ opacity: 0.3 }}>{children}</Box>
    </Box>
  );
};

export const ProgressWithSteps = ({ steps, currentStep, message }) => {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Step {currentStep + 1} of {steps.length}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {Math.round(progress)}%
        </Typography>
      </Box>
      <LinearProgress variant="determinate" value={progress} sx={{ mb: 1 }} />
      <Typography variant="body2" color="primary">
        {message || steps[currentStep]}
      </Typography>
    </Box>
  );
};

export default LoadingSpinner;
