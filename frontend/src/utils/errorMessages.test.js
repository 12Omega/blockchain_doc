import { getErrorMessage, formatErrorForDisplay, isErrorRetryable } from './errorMessages';

describe('errorMessages', () => {
  describe('getErrorMessage', () => {
    test('handles network errors', () => {
      const error = new Error('Network Error');
      const result = getErrorMessage(error);

      expect(result.title).toBe('Network Connection Error');
      expect(result.retryable).toBe(true);
      expect(result.actions).toContain('Check your internet connection');
    });

    test('handles timeout errors', () => {
      const error = { message: 'Request timeout', code: 'TIMEOUT' };
      const result = getErrorMessage(error);

      expect(result.title).toBe('Request Timeout');
      expect(result.retryable).toBe(true);
    });

    test('handles insufficient funds error', () => {
      const error = { code: 'INSUFFICIENT_FUNDS' };
      const result = getErrorMessage(error);

      expect(result.title).toBe('Insufficient Funds');
      expect(result.retryable).toBe(false);
      expect(result.actions).toContain('Get free testnet tokens from a faucet');
    });

    test('handles user rejected transaction', () => {
      const error = { message: 'user rejected transaction' };
      const result = getErrorMessage(error);

      expect(result.title).toBe('Transaction Rejected');
      expect(result.severity).toBe('info');
    });

    test('handles 401 unauthorized', () => {
      const error = { response: { status: 401 } };
      const result = getErrorMessage(error);

      expect(result.title).toBe('Authentication Required');
      expect(result.retryable).toBe(true);
    });

    test('handles 403 forbidden', () => {
      const error = { response: { status: 403 } };
      const result = getErrorMessage(error);

      expect(result.title).toBe('Access Denied');
      expect(result.retryable).toBe(false);
    });

    test('handles 404 not found', () => {
      const error = { response: { status: 404 } };
      const result = getErrorMessage(error);

      expect(result.title).toBe('Not Found');
      expect(result.retryable).toBe(false);
    });

    test('handles 400 validation error', () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Invalid email format' },
        },
      };
      const result = getErrorMessage(error);

      expect(result.title).toBe('Validation Error');
      expect(result.message).toBe('Invalid email format');
    });

    test('handles 500 server error', () => {
      const error = { response: { status: 500 } };
      const result = getErrorMessage(error);

      expect(result.title).toBe('Server Error');
      expect(result.retryable).toBe(true);
    });

    test('handles IPFS errors', () => {
      const error = new Error('IPFS upload failed');
      const result = getErrorMessage(error);

      expect(result.title).toBe('Storage Error');
      expect(result.retryable).toBe(true);
    });

    test('handles generic errors', () => {
      const error = new Error('Something went wrong');
      const result = getErrorMessage(error);

      expect(result.title).toBe('An Error Occurred');
      expect(result.message).toBe('Something went wrong');
    });
  });

  describe('formatErrorForDisplay', () => {
    test('formats error with timestamp', () => {
      const error = new Error('Test error');
      const result = formatErrorForDisplay(error);

      expect(result.timestamp).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.message).toBeDefined();
    });

    test('includes original error in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      const result = formatErrorForDisplay(error);

      expect(result.originalError).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('isErrorRetryable', () => {
    test('returns true for retryable errors', () => {
      const error = new Error('Network Error');
      expect(isErrorRetryable(error)).toBe(true);
    });

    test('returns false for non-retryable errors', () => {
      const error = { response: { status: 403 } };
      expect(isErrorRetryable(error)).toBe(false);
    });
  });
});
