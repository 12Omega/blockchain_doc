/**
 * Retry a function with exponential backoff
 * @param {Function} fn - The async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} - Result of the function
 */
export const retryWithBackoff = async (
  fn,
  options = {}
) => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    shouldRetry = (error) => true,
    onRetry = null,
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted attempts
      if (attempt === maxRetries) {
        break;
      }

      // Check if we should retry this error
      if (!shouldRetry(error)) {
        throw error;
      }

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, maxRetries, error);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
};

/**
 * Check if an error is retryable (network errors, timeouts, 5xx errors)
 */
export const isRetryableError = (error) => {
  // Network errors
  if (error.message?.includes('Network Error') || error.message?.includes('timeout')) {
    return true;
  }

  // HTTP 5xx errors
  if (error.response?.status >= 500 && error.response?.status < 600) {
    return true;
  }

  // Blockchain network errors
  if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
    return true;
  }

  // IPFS errors
  if (error.message?.includes('IPFS') && error.message?.includes('unavailable')) {
    return true;
  }

  return false;
};

/**
 * Retry specifically for blockchain transactions
 */
export const retryBlockchainTransaction = async (fn, options = {}) => {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    initialDelay: 2000,
    maxDelay: 15000,
    shouldRetry: (error) => {
      // Retry on network errors and nonce issues
      return (
        error.code === 'NETWORK_ERROR' ||
        error.code === 'TIMEOUT' ||
        error.code === 'NONCE_EXPIRED' ||
        error.message?.includes('network')
      );
    },
    ...options,
  });
};

/**
 * Retry specifically for IPFS operations
 */
export const retryIPFSOperation = async (fn, options = {}) => {
  return retryWithBackoff(fn, {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 8000,
    shouldRetry: (error) => {
      // Retry on network errors and 5xx errors
      return (
        isRetryableError(error) ||
        error.message?.includes('IPFS') ||
        error.response?.status === 503
      );
    },
    ...options,
  });
};

/**
 * Retry specifically for API calls
 */
export const retryAPICall = async (fn, options = {}) => {
  return retryWithBackoff(fn, {
    maxRetries: 2,
    initialDelay: 500,
    maxDelay: 5000,
    shouldRetry: isRetryableError,
    ...options,
  });
};

export default retryWithBackoff;
