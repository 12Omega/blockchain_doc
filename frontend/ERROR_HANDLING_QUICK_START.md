# Error Handling - Quick Start Guide

## 🚀 Quick Integration

### 1. Show Notifications
```javascript
import { useNotification } from './contexts/NotificationContext';

const { showSuccess, showError, showWarning, showInfo } = useNotification();

// Usage
showSuccess('Document registered successfully!');
showError('Failed to upload document');
showWarning('Please connect your wallet');
showInfo('Processing your request...');
```

### 2. Handle Async Operations
```javascript
import { useAsyncOperation } from './hooks/useAsyncOperation';

const { execute, loading, error, data } = useAsyncOperation();

const handleSubmit = async () => {
  await execute(
    async () => await api.registerDocument(file),
    {
      successMessage: 'Document registered!',
      retry: true
    }
  );
};

return (
  <>
    {loading && <LoadingSpinner message="Registering..." />}
    {error && <ErrorDisplay error={error} onRetry={handleSubmit} />}
    {data && <div>Success!</div>}
  </>
);
```

### 3. Add Loading States
```javascript
import { LoadingSpinner, LoadingOverlay } from './components/LoadingState';

// Simple spinner
<LoadingSpinner message="Loading..." />

// Full screen
<LoadingSpinner message="Processing..." fullScreen />

// Overlay content
<LoadingOverlay isLoading={loading} message="Uploading...">
  <YourContent />
</LoadingOverlay>
```

### 4. Retry Failed Operations
```javascript
import { retryAPICall, retryBlockchainTransaction } from './utils/retryMechanism';

// API calls
const data = await retryAPICall(async () => {
  return await axios.get('/api/documents');
});

// Blockchain transactions
const tx = await retryBlockchainTransaction(async () => {
  return await contract.registerDocument(...);
});
```

### 5. Handle Offline Scenarios
```javascript
import { useOffline } from './contexts/OfflineContext';

const { isOnline, enqueueOperation } = useOffline();

const handleSubmit = async () => {
  if (!isOnline) {
    enqueueOperation({
      execute: async () => await submitData()
    });
    showInfo('Queued - will submit when online');
  } else {
    await submitData();
  }
};
```

### 6. Display Error Pages
```javascript
import { NotFoundPage, ServerErrorPage, NetworkErrorPage } from './components/ErrorPages';

// 404
<NotFoundPage onNavigateHome={() => navigate('/')} />

// 500
<ServerErrorPage onRetry={handleRetry} />

// Network error
<NetworkErrorPage onRetry={handleRetry} isOffline={!navigator.onLine} />
```

## 📦 What's Included

✅ Global error boundary
✅ Toast notifications (success, error, warning, info)
✅ Error pages (404, 500, network error)
✅ Loading states (spinner, bar, overlay, progress)
✅ Retry mechanisms (exponential backoff)
✅ Offline detection and queueing
✅ Actionable error messages
✅ 34 passing tests

## 📚 Full Documentation

See `frontend/src/components/ErrorHandling.README.md` for complete documentation.

## 🎯 Already Integrated

The error handling system is already integrated into the app:

```javascript
// App.js
<ErrorBoundary>
  <NotificationProvider>
    <OfflineProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </OfflineProvider>
  </NotificationProvider>
</ErrorBoundary>
```

Just import and use the hooks/components in your code!
