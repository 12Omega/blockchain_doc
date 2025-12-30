import authService from './authService';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('AuthService', () => {
  const mockSigner = {
    signMessage: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Mock axios.create to return a mock instance
    mockedAxios.create.mockReturnValue({
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
        },
        response: {
          use: jest.fn(),
        },
      },
    });
  });

  describe('generateAuthMessage', () => {
    test('should generate correct authentication message', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const nonce = 'test-nonce';
      
      const message = authService.generateAuthMessage(address, nonce);
      
      expect(message).toContain('Please sign this message to authenticate');
      expect(message).toContain(address);
      expect(message).toContain(nonce);
      expect(message).toContain('Timestamp:');
    });
  });

  describe('signMessage', () => {
    test('should sign message successfully', async () => {
      const message = 'test message';
      const expectedSignature = '0xsignature';
      mockSigner.signMessage.mockResolvedValue(expectedSignature);

      const signature = await authService.signMessage(mockSigner, message);

      expect(mockSigner.signMessage).toHaveBeenCalledWith(message);
      expect(signature).toBe(expectedSignature);
    });

    test('should handle signing error', async () => {
      const message = 'test message';
      const error = new Error('User rejected signing');
      mockSigner.signMessage.mockRejectedValue(error);

      await expect(authService.signMessage(mockSigner, message))
        .rejects.toThrow('Failed to sign message: User rejected signing');
    });
  });

  describe('authenticateWallet', () => {
    test('should authenticate successfully', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const nonce = 'test-nonce';
      const signature = '0xsignature';
      const token = 'jwt-token';
      const user = { walletAddress: address, role: 'student' };

      // Mock the API instance
      const mockApi = {
        post: jest.fn(),
      };
      authService.api = mockApi;

      mockApi.post
        .mockResolvedValueOnce({ data: { nonce } })
        .mockResolvedValueOnce({ data: { token, user } });

      mockSigner.signMessage.mockResolvedValue(signature);

      const result = await authService.authenticateWallet(address, mockSigner);

      expect(mockApi.post).toHaveBeenCalledWith('/auth/nonce', { address });
      expect(mockApi.post).toHaveBeenCalledWith('/auth/verify', {
        address,
        signature,
        message: expect.stringContaining(address),
      });
      expect(result).toEqual({ token, user });
      expect(localStorage.getItem('authToken')).toBe(token);
      expect(localStorage.getItem('user')).toBe(JSON.stringify(user));
    });

    test('should handle authentication error', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const error = new Error('Invalid signature');

      const mockApi = {
        post: jest.fn().mockRejectedValue({
          response: { data: { message: 'Invalid signature' } }
        }),
      };
      authService.api = mockApi;

      await expect(authService.authenticateWallet(address, mockSigner))
        .rejects.toThrow('Invalid signature');
    });
  });

  describe('getUserProfile', () => {
    test('should fetch user profile successfully', async () => {
      const mockProfile = { walletAddress: '0x123', role: 'student' };
      
      const mockApi = {
        get: jest.fn().mockResolvedValue({ data: mockProfile }),
      };
      authService.api = mockApi;

      const profile = await authService.getUserProfile();

      expect(mockApi.get).toHaveBeenCalledWith('/users/profile');
      expect(profile).toEqual(mockProfile);
    });

    test('should handle profile fetch error', async () => {
      const mockApi = {
        get: jest.fn().mockRejectedValue({
          response: { data: { message: 'Unauthorized' } }
        }),
      };
      authService.api = mockApi;

      await expect(authService.getUserProfile())
        .rejects.toThrow('Unauthorized');
    });
  });

  describe('updateUserProfile', () => {
    test('should update user profile successfully', async () => {
      const profileData = { profile: { name: 'John Doe' } };
      const updatedUser = { walletAddress: '0x123', profile: { name: 'John Doe' } };
      
      const mockApi = {
        put: jest.fn().mockResolvedValue({ data: updatedUser }),
      };
      authService.api = mockApi;

      const result = await authService.updateUserProfile(profileData);

      expect(mockApi.put).toHaveBeenCalledWith('/users/profile', profileData);
      expect(result).toEqual(updatedUser);
      expect(localStorage.getItem('user')).toBe(JSON.stringify(updatedUser));
    });
  });

  describe('getStoredUser', () => {
    test('should return stored user data', () => {
      const user = { walletAddress: '0x123', role: 'student' };
      localStorage.setItem('user', JSON.stringify(user));

      const storedUser = authService.getStoredUser();

      expect(storedUser).toEqual(user);
    });

    test('should return null for invalid JSON', () => {
      localStorage.setItem('user', 'invalid-json');

      const storedUser = authService.getStoredUser();

      expect(storedUser).toBeNull();
    });

    test('should return null when no user stored', () => {
      const storedUser = authService.getStoredUser();

      expect(storedUser).toBeNull();
    });
  });

  describe('getStoredToken', () => {
    test('should return stored token', () => {
      const token = 'jwt-token';
      localStorage.setItem('authToken', token);

      const storedToken = authService.getStoredToken();

      expect(storedToken).toBe(token);
    });

    test('should return null when no token stored', () => {
      const storedToken = authService.getStoredToken();

      expect(storedToken).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    test('should return true when both token and user exist', () => {
      localStorage.setItem('authToken', 'jwt-token');
      localStorage.setItem('user', JSON.stringify({ walletAddress: '0x123' }));

      const isAuth = authService.isAuthenticated();

      expect(isAuth).toBe(true);
    });

    test('should return false when token is missing', () => {
      localStorage.setItem('user', JSON.stringify({ walletAddress: '0x123' }));

      const isAuth = authService.isAuthenticated();

      expect(isAuth).toBe(false);
    });

    test('should return false when user is missing', () => {
      localStorage.setItem('authToken', 'jwt-token');

      const isAuth = authService.isAuthenticated();

      expect(isAuth).toBe(false);
    });
  });

  describe('logout', () => {
    test('should clear stored authentication data', () => {
      localStorage.setItem('authToken', 'jwt-token');
      localStorage.setItem('user', JSON.stringify({ walletAddress: '0x123' }));

      authService.logout();

      expect(localStorage.getItem('authToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('refreshAuth', () => {
    test('should refresh authentication successfully', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const token = 'new-jwt-token';
      const user = { walletAddress: address, role: 'student' };

      // Set initial auth data
      localStorage.setItem('authToken', 'old-token');
      localStorage.setItem('user', JSON.stringify({ walletAddress: address }));

      const mockApi = {
        post: jest.fn()
          .mockResolvedValueOnce({ data: { nonce: 'nonce' } })
          .mockResolvedValueOnce({ data: { token, user } }),
      };
      authService.api = mockApi;

      mockSigner.signMessage.mockResolvedValue('0xsignature');

      const result = await authService.refreshAuth(address, mockSigner);

      expect(result).toEqual({ token, user });
      expect(localStorage.getItem('authToken')).toBe(token);
      expect(localStorage.getItem('user')).toBe(JSON.stringify(user));
    });
  });
});