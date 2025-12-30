import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, AlertTitle } from '@mui/material';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback((message, severity = 'info', title = null, duration = 6000) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [
      ...prev,
      { id, message, severity, title, duration, open: true },
    ]);
  }, []);

  const showSuccess = useCallback((message, title = 'Success') => {
    showNotification(message, 'success', title);
  }, [showNotification]);

  const showError = useCallback((message, title = 'Error') => {
    showNotification(message, 'error', title, 8000);
  }, [showNotification]);

  const showWarning = useCallback((message, title = 'Warning') => {
    showNotification(message, 'warning', title);
  }, [showNotification]);

  const showInfo = useCallback((message, title = null) => {
    showNotification(message, 'info', title);
  }, [showNotification]);

  const closeNotification = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, open: false } : notif
      )
    );
    // Remove from array after animation
    setTimeout(() => {
      setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    }, 300);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        showSuccess,
        showError,
        showWarning,
        showInfo,
      }}
    >
      {children}
      {notifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open={notification.open}
          autoHideDuration={notification.duration}
          onClose={() => closeNotification(notification.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{ mt: index * 7 }}
        >
          <Alert
            onClose={() => closeNotification(notification.id)}
            severity={notification.severity}
            variant="filled"
            sx={{ width: '100%', minWidth: 300 }}
          >
            {notification.title && (
              <AlertTitle>{notification.title}</AlertTitle>
            )}
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </NotificationContext.Provider>
  );
};
