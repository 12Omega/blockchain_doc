Error Handling and User Feedback System

This document describes the comprehensive error handling and user feedback system implemented in the application.

Overview

The error handling system provides:
- Global error boundary for catching React errors
- Toast notifications for user feedback
- Error pages (404, 500, Network Error)
- Loading states for async operations
- Retry mechanisms with exponential backoff
- Offline detection and operation queueing
- Actionable error messages with guidance

Components

1. ErrorBoundary

A React error boundary that catches JavaScript errors anywhere in the component tree.

Usage:
```jsx
import ErrorBoundary from './components/ErrorBoundary';

<ErrorBoundary>
  <YourApp />
</ErrorBoundary>
```

Features:
- Catches and displays errors gracefully
- Shows error details in development mode
- Provides "Try Again" and "Reload Page" options
- Logs errors to monitoring service (if configured)

2. NotificationContext

Provides toast notifications for user feedback.

Usage:
```jsx
import { useNotification } from './contexts/NotificationContext';

const MyComponent = () => {
  const { showSuccess, showError, showWarning, showInfo } = useNotification();

  const handleAction = async () => {
    try {
      await someAsyncOperation();
      showSuccess('Operation completed successfully!');
    } catch (error) {
      showError('Operation failed. Please try again.');
    }
  };
};
```

Methods:
- `showSuccess(message, title)` - Show success notification
- `showError(message, title)` - Show error notification
- `showWarning(message, title)` - Show warning notification
- `showInfo(message, title)` - Show info notification

3. Error Pages

Pre-built error pages for common scenarios.

NotFoundPage (404):
```jsx
import { NotFoundPage } from './components/ErrorPages';

<NotFoundPage onNavigateHome={() => navigate('/')} />
```

ServerErrorPage (500):
```jsx
import { ServerErrorPage } from './components/ErrorPages';

<ServerErrorPage onRetry={handleRetry} errorMessage="Custom error message" />
```

NetworkErrorPage:
```jsx
import { NetworkErrorPage } from './components/ErrorPages';

<NetworkErrorPage onRetry={handleRetry} isOffline={!navigator.onLine} />
```

4. Loading States

Components for displaying loading states.

LoadingSpinner:
```jsx
import { LoadingSpinner } from './components/LoadingState';

<LoadingSpinner message="Loading data..." size={60} />
<LoadingSpinner message="Processing..." fullScreen={true} />
```

LoadingBar:
```jsx
import { LoadingBar } from './components/LoadingState';

<LoadingBar message="Uploading document..." />
```

LoadingOverlay:
```jsx
import { LoadingOverlay } from './components/LoadingState';

<LoadingOverlay isLoading={loading} message="Processing...">
  <YourContent />
</LoadingOverlay>
```

ProgressWithSteps:
```jsx
import { ProgressWithSteps } from './components/LoadingState';

<ProgressWithSteps
  steps={['Hashing', 'Encrypting', 'Uploading', 'Blockchain']}
  currentStep={2}
  message="Uploading to IPFS..."
/>
```

5. ErrorDisplay

Component for displaying detailed error information with actionable guidance.

Usage:
```jsx
import ErrorDisplay from './components/ErrorDisplay';

<ErrorDisplay
  error={error}
  onRetry={handleRetry}
  onDismiss={() => setError(null)}
  showDetails={true}
/>
```

Utilities

1. Retry Mechanism

Utilities for retrying failed operations with exponential backoff.

retryWithBackoff:
```jsx
import { retryWithBackoff } from './utils/retryMechanism';

const result = await retryWithBackoff(
  async () => {
    return await apiCall();
  },
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    shouldRetry: (error) => error.code === 'NETWORK_ERROR',
    onRetry: (attempt, maxRetries) => {
      console.log(`Retry ${attempt}/${maxRetries}`);
    },
  }
);
```

Specialized retry functions:
```jsx
import {
  retryBlockchainTransaction,
  retryIPFSOperation,
  retryAPICall,
} from './utils/retryMechanism';

// Blockchain transactions
await retryBlockchainTransaction(async () => {
  return await contract.registerDocument(...);
});

// IPFS operations
await retryIPFSOperation(async () => {
  return await ipfs.upload(file);
});

// API calls
await retryAPICall(async () => {
  return await axios.get('/api/documents');
});
```

2. Error Messages

Utility for generating user-friendly error messages with actionable guidance.

Usage:
```jsx
import { getErrorMessage, isErrorRetryable } from './utils/errorMessages';

try {
  await someOperation();
} catch (error) {
  const errorInfo = getErrorMessage(error);
  
  console.log(errorInfo.title);      // "Network Connection Error"
  console.log(errorInfo.message);    // "Unable to connect..."
  console.log(errorInfo.actions);    // ["Check internet", "Try again"]
  console.log(errorInfo.retryable);  // true
  
  if (isErrorRetryable(error)) {
    // Show retry button
  }
}
```

3. Offline Queue

System for queueing operations when offline and processing them when back online.

Usage:
```jsx
import { useOfflineQueue } from './utils/offlineQueue';

const MyComponent = () => {
  const { enqueue, isOnline, size } = useOfflineQueue();

  const handleSubmit = async () => {
    if (!isOnline()) {
      // Queue operation for later
      enqueue({
        execute: async () => {
          await submitData(formData);
        },
      });
      showInfo('Operation queued. Will execute when online.');
    } else {
      // Execute immediately
      await submitData(formData);
    }
  };
};
```

OfflineContext:
```jsx
import { useOffline } from './contexts/OfflineContext';

const MyComponent = () => {
  const { isOnline, queueSize, enqueueOperation } = useOffline();

  return (
    <div>
      Status: {isOnline ? 'Online' : 'Offline'}
      Queued: {queueSize} operations
    </div>
  );
};
```

Hooks

useAsyncOperation

Custom hook for handling async operations with loading, error states, and retry logic.

Usage:
```jsx
import { useAsyncOperation } from './hooks/useAsyncOperation';

const MyComponent = () => {
  const { execute, loading, error, data, reset } = useAsyncOperation({
    showSuccessNotification: true,
    showErrorNotification: true,
  });

  const handleSubmit = async () => {
    try {
      await execute(
        async () => {
          return await api.submitData(formData);
        },
        {
          successMessage: 'Data submitted successfully!',
          errorMessage: 'Failed to submit data',
          retry: true,
          retryOptions: { maxRetries: 3 },
        }
      );
    } catch (err) {
      // Error is already handled
    }
  };

  return (
    <div>
      {loading && <LoadingSpinner />}
      {error && <ErrorDisplay error={error} onRetry={handleSubmit} />}
      {data && <div>Success: {JSON.stringify(data)}</div>}
      <button onClick={handleSubmit} disabled={loading}>
        Submit
      </button>
    </div>
  );
};
```

Best Practices

1. Always Handle Errors

```jsx
// ❌ Bad
const handleAction = async () => {
  await someAsyncOperation();
};

// ✅ Good
const handleAction = async () => {
  try {
    await someAsyncOperation();
    showSuccess('Operation completed!');
  } catch (error) {
    showError(getErrorMessage(error).message);
  }
};
```

2. Use Loading States

```jsx
// ❌ Bad
const handleAction = async () => {
  await someAsyncOperation();
};

// ✅ Good
const handleAction = async () => {
  setLoading(true);
  try {
    await someAsyncOperation();
  } finally {
    setLoading(false);
  }
};
```

3. Provide Actionable Guidance

```jsx
// ❌ Bad
showError('Error occurred');

// ✅ Good
const errorInfo = getErrorMessage(error);
showError(errorInfo.message, errorInfo.title);
// User sees: "Network Connection Error" with actions like "Check internet"
```

4. Use Retry for Transient Errors

```jsx
// ✅ Good
await retryWithBackoff(
  async () => await apiCall(),
  {
    shouldRetry: isRetryableError,
    maxRetries: 3,
  }
);
```

5. Queue Operations When Offline

```jsx
// ✅ Good
if (!isOnline) {
  enqueueOperation({
    execute: async () => await submitData(),
  });
  showInfo('Queued for when you\'re back online');
} else {
  await submitData();
}
```

Integration Example

Complete example of a component using all error handling features:

```jsx
import React, { useState } from 'react';
import { useNotification } from './contexts/NotificationContext';
import { useOffline } from './contexts/OfflineContext';
import { useAsyncOperation } from './hooks/useAsyncOperation';
import ErrorDisplay from './components/ErrorDisplay';
import { LoadingOverlay } from './components/LoadingState';

const MyComponent = () => {
  const [formData, setFormData] = useState({});
  const { showSuccess } = useNotification();
  const { isOnline, enqueueOperation } = useOffline();
  const { execute, loading, error, reset } = useAsyncOperation();

  const handleSubmit = async () => {
    if (!isOnline) {
      enqueueOperation({
        execute: async () => await submitToAPI(formData),
      });
      showSuccess('Queued for when online');
      return;
    }

    try {
      await execute(
        async () => await submitToAPI(formData),
        {
          successMessage: 'Submitted successfully!',
          retry: true,
        }
      );
    } catch (err) {
      // Error handled by useAsyncOperation
    }
  };

  return (
    <LoadingOverlay isLoading={loading} message="Submitting...">
      {error && (
        <ErrorDisplay
          error={error}
          onRetry={handleSubmit}
          onDismiss={reset}
        />
      )}
      
      <form onSubmit={handleSubmit}>
        {/ Form fields /}
        <button type="submit" disabled={loading}>
          Submit
        </button>
      </form>
    </LoadingOverlay>
  );
};
```

Testing

All error handling components and utilities include comprehensive tests. Run tests with:

```bash
npm test
```

Test files:
- `ErrorBoundary.test.js`
- `retryMechanism.test.js`
- `errorMessages.test.js`

Summary

This error handling system provides a complete solution for:
- ✅ Catching and displaying errors gracefully
- ✅ Providing user feedback through notifications
- ✅ Showing loading states during async operations
- ✅ Retrying failed operations automatically
- ✅ Handling offline scenarios with queueing
- ✅ Displaying actionable error messages
- ✅ Creating a better user experience

All components are fully tested and ready to use throughout the application.

