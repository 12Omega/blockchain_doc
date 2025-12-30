import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert, Snackbar, Box, Typography, Chip } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import WifiIcon from '@mui/icons-material/Wifi';
import offlineQueue from '../utils/offlineQueue';

const OfflineContext = createContext();

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
};

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueSize, setQueueSize] = useState(0);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const [showOnlineAlert, setShowOnlineAlert] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineAlert(true);
      setShowOfflineAlert(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineAlert(true);
      setShowOnlineAlert(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to queue events
    const unsubscribe = offlineQueue.subscribe((event, data) => {
      if (event === 'enqueue' || event === 'dequeue' || event === 'clear') {
        setQueueSize(offlineQueue.size());
      }
    });

    // Initialize queue size
    setQueueSize(offlineQueue.size());

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const enqueueOperation = (operation) => {
    return offlineQueue.enqueue(operation);
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        queueSize,
        enqueueOperation,
      }}
    >
      {children}

      {/* Offline Alert */}
      <Snackbar
        open={showOfflineAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="warning"
          icon={<WifiOffIcon />}
          sx={{ width: '100%', minWidth: 400 }}
        >
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              You are offline
            </Typography>
            <Typography variant="body2">
              Your operations will be queued and processed when connection is restored.
            </Typography>
            {queueSize > 0 && (
              <Chip
                label={`${queueSize} operation${queueSize > 1 ? 's' : ''} queued`}
                size="small"
                sx={{ mt: 1 }}
              />
            )}
          </Box>
        </Alert>
      </Snackbar>

      {/* Online Alert */}
      <Snackbar
        open={showOnlineAlert}
        autoHideDuration={4000}
        onClose={() => setShowOnlineAlert(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          icon={<WifiIcon />}
          onClose={() => setShowOnlineAlert(false)}
          sx={{ width: '100%', minWidth: 400 }}
        >
          <Typography variant="subtitle2">
            You are back online
          </Typography>
          {queueSize > 0 && (
            <Typography variant="body2">
              Processing {queueSize} queued operation{queueSize > 1 ? 's' : ''}...
            </Typography>
          )}
        </Alert>
      </Snackbar>
    </OfflineContext.Provider>
  );
};
