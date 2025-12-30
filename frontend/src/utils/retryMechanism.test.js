import {
  retryWithBackoff,
  isRetryableError,
  retryBlockchainTransaction,
  retryIPFSOperation,
  retryAPICall,
} from './retryMechanism';

describe('retryMechanism', () => {
  describe('retryWithBackoff', () => {
    test('returns result on first success', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await retryWithBackoff(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('retries on failure and eventually succeeds', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const result = await retryWithBackoff(fn, {
        maxRetries: 3,
        initialDelay: 10,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    test('throws error after max retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('persistent error'));

      await expect(
        retryWithBackoff(fn, {
          maxRetries: 2,
          initialDelay: 10,
        })
      ).rejects.toThrow('persistent error');

      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    test('does not retry if shouldRetry returns false', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('no retry'));

      await expect(
        retryWithBackoff(fn, {
          maxRetries: 3,
          shouldRetry: () => false,
        })
      ).rejects.toThrow('no retry');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('calls onRetry callback', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      
      const onRetry = jest.fn();

      await retryWithBackoff(fn, {
        maxRetries: 2,
        initialDelay: 10,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, 2, expect.any(Error));
    });
  });

  describe('isRetryableError', () => {
    test('returns true for network errors', () => {
      const error = new Error('Network Error');
      expect(isRetryableError(error)).toBe(true);
    });

    test('returns true for timeout errors', () => {
      const error = new Error('Request timeout');
      expect(isRetryableError(error)).toBe(true);
    });

    test('returns true for 5xx errors', () => {
      const error = { response: { status: 500 } };
      expect(isRetryableError(error)).toBe(true);
    });

    test('returns false for 4xx errors', () => {
      const error = { response: { status: 404 } };
      expect(isRetryableError(error)).toBe(false);
    });

    test('returns true for blockchain network errors', () => {
      const error = { code: 'NETWORK_ERROR' };
      expect(isRetryableError(error)).toBe(true);
    });

    test('returns false for non-retryable errors', () => {
      const error = new Error('Validation error');
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('retryBlockchainTransaction', () => {
    test('retries blockchain transactions', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce({ code: 'NETWORK_ERROR' })
        .mockResolvedValue('tx-hash');

      const result = await retryBlockchainTransaction(fn);

      expect(result).toBe('tx-hash');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('retryIPFSOperation', () => {
    test('retries IPFS operations', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('IPFS unavailable'))
        .mockResolvedValue('ipfs-cid');

      const result = await retryIPFSOperation(fn);

      expect(result).toBe('ipfs-cid');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('retryAPICall', () => {
    test('retries API calls', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce({ response: { status: 503 } })
        .mockResolvedValue({ data: 'success' });

      const result = await retryAPICall(fn);

      expect(result).toEqual({ data: 'success' });
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
