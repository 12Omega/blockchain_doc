/**
 * Error message utility with actionable guidance
 */

export const getErrorMessage = (error) => {
  // Network errors
  if (error.message?.includes('Network Error') || error.code === 'NETWORK_ERROR') {
    return {
      title: 'Network Connection Error',
      message: 'Unable to connect to the server. Please check your internet connection.',
      actions: [
        'Check your internet connection',
        'Verify firewall settings',
        'Try again in a few moments',
      ],
      severity: 'error',
      retryable: true,
    };
  }

  // Timeout errors
  if (error.message?.includes('timeout') || error.code === 'TIMEOUT') {
    return {
      title: 'Request Timeout',
      message: 'The request took too long to complete. The server might be busy.',
      actions: [
        'Try again in a few moments',
        'Check your internet speed',
        'Contact support if this persists',
      ],
      severity: 'warning',
      retryable: true,
    };
  }

  // Blockchain errors
  if (error.code === 'INSUFFICIENT_FUNDS') {
    return {
      title: 'Insufficient Funds',
      message: 'You don\'t have enough tokens to complete this transaction.',
      actions: [
        'Get free testnet tokens from a faucet',
        'Check your wallet balance',
        'Switch to a different account',
      ],
      severity: 'error',
      retryable: false,
    };
  }

  if (error.code === 'USER_REJECTED' || error.message?.includes('user rejected')) {
    return {
      title: 'Transaction Rejected',
      message: 'You rejected the transaction in your wallet.',
      actions: [
        'Try again and approve the transaction',
        'Check transaction details before approving',
      ],
      severity: 'info',
      retryable: true,
    };
  }

  if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
    return {
      title: 'Transaction Failed',
      message: 'Unable to estimate gas for this transaction. The transaction might fail.',
      actions: [
        'Check if you have the required permissions',
        'Verify the contract is deployed correctly',
        'Contact support for assistance',
      ],
      severity: 'error',
      retryable: false,
    };
  }

  // Wallet errors
  if (error.message?.includes('wallet') || error.code === 'WALLET_NOT_CONNECTED') {
    return {
      title: 'Wallet Not Connected',
      message: 'Please connect your wallet to continue.',
      actions: [
        'Click the "Connect Wallet" button',
        'Install MetaMask if you don\'t have it',
        'Unlock your wallet',
      ],
      severity: 'warning',
      retryable: true,
    };
  }

  // Authentication errors
  if (error.response?.status === 401) {
    return {
      title: 'Authentication Required',
      message: 'You need to be logged in to perform this action.',
      actions: [
        'Connect and authenticate your wallet',
        'Check if your session has expired',
        'Try logging in again',
      ],
      severity: 'warning',
      retryable: true,
    };
  }

  // Authorization errors
  if (error.response?.status === 403) {
    return {
      title: 'Access Denied',
      message: 'You don\'t have permission to perform this action.',
      actions: [
        'Check if you have the required role',
        'Contact an administrator for access',
        'Verify you\'re using the correct account',
      ],
      severity: 'error',
      retryable: false,
    };
  }

  // Not found errors
  if (error.response?.status === 404) {
    return {
      title: 'Not Found',
      message: 'The requested resource could not be found.',
      actions: [
        'Check if the document exists',
        'Verify the document hash is correct',
        'Try searching for the document',
      ],
      severity: 'warning',
      retryable: false,
    };
  }

  // Validation errors
  if (error.response?.status === 400) {
    const validationMessage = error.response?.data?.message || 'Invalid input data.';
    return {
      title: 'Validation Error',
      message: validationMessage,
      actions: [
        'Check all required fields are filled',
        'Verify the data format is correct',
        'Review the error details above',
      ],
      severity: 'warning',
      retryable: false,
    };
  }

  // Server errors
  if (error.response?.status >= 500) {
    return {
      title: 'Server Error',
      message: 'The server encountered an error. Our team has been notified.',
      actions: [
        'Try again in a few moments',
        'Contact support if this persists',
        'Check the status page for updates',
      ],
      severity: 'error',
      retryable: true,
    };
  }

  // IPFS errors
  if (error.message?.includes('IPFS')) {
    return {
      title: 'Storage Error',
      message: 'Unable to upload or retrieve document from storage.',
      actions: [
        'Try again in a few moments',
        'Check your internet connection',
        'The system will try alternative storage providers',
      ],
      severity: 'error',
      retryable: true,
    };
  }

  // File upload errors
  if (error.message?.includes('file') || error.message?.includes('upload')) {
    return {
      title: 'File Upload Error',
      message: 'Unable to upload the file.',
      actions: [
        'Check the file size (max 10MB)',
        'Verify the file format is supported',
        'Try a different file',
      ],
      severity: 'error',
      retryable: true,
    };
  }

  // Generic error
  return {
    title: 'An Error Occurred',
    message: error.message || 'An unexpected error occurred.',
    actions: [
      'Try again',
      'Refresh the page',
      'Contact support if this persists',
    ],
    severity: 'error',
    retryable: true,
  };
};

/**
 * Format error for display
 */
export const formatErrorForDisplay = (error) => {
  const errorInfo = getErrorMessage(error);
  
  return {
    ...errorInfo,
    timestamp: new Date().toISOString(),
    originalError: process.env.NODE_ENV === 'development' ? error : undefined,
  };
};

/**
 * Check if error is retryable
 */
export const isErrorRetryable = (error) => {
  const errorInfo = getErrorMessage(error);
  return errorInfo.retryable;
};

export default getErrorMessage;
