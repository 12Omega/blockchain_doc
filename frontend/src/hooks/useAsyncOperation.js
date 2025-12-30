import { useState, useCallback } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { retryWithBackoff, isRetryableError } from '../utils/retryMechanism';
import { getErrorMessage } from '../utils/errorMessages';

/**
 * Custom hook for handling async operations with loading, error states, and retry logic
 */
export const useAsyncOperation = (options = {}) => {
  const {
    onSuccess = null,
    onError = null,
    showSuccessNotification = false,
    showErrorNotification = true,
    retryOptions = {},
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const { showSuccess, showError } = useNotification();

  const execute = useCallback(
    async (asyncFn, customOptions = {}) => {
      setLoading(true);
      setError(null);

      try {
        let result;

        // Use retry mechanism if enabled
        if (customOptions.retry !== false) {
          result = await retryWithBackoff(asyncFn, {
            shouldRetry: isRetryableError,
            onRetry: (attempt, maxRetries) => {
              console.log(`Retry attempt ${attempt}/${maxRetries}`);
            },
            ...retryOptions,
            ...customOptions.retryOptions,
          });
        } else {
          result = await asyncFn();
        }

        setData(result);
        setLoading(false);

        // Show success notification if enabled
        if (showSuccessNotification || customOptions.showSuccessNotification) {
          const successMessage = customOptions.successMessage || 'Operation completed successfully';
          showSuccess(successMessage);
        }

        // Call success callback
        if (onSuccess) {
          onSuccess(result);
        }
        if (customOptions.onSuccess) {
          customOptions.onSuccess(result);
        }

        return result;
      } catch (err) {
        console.error('Async operation failed:', err);
        setError(err);
        setLoading(false);

        // Get formatted error message
        const errorInfo = getErrorMessage(err);

        // Show error notification if enabled
        if (showErrorNotification || customOptions.showErrorNotification) {
          const errorMessage = customOptions.errorMessage || errorInfo.message;
          showError(errorMessage, errorInfo.title);
        }

        // Call error callback
        if (onError) {
          onError(err);
        }
        if (customOptions.onError) {
          customOptions.onError(err);
        }

        throw err;
      }
    },
    [onSuccess, onError, showSuccessNotification, showErrorNotification, retryOptions, showSuccess, showError]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    execute,
    loading,
    error,
    data,
    reset,
  };
};

export default useAsyncOperation;
