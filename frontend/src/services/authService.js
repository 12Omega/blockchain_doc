import axios from 'axios';
import { ethers } from 'ethers';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class AuthService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api`,
      timeout: 10000,
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.logout();
        }
        return Promise.reject(error);
      }
    );
  }

  // Generate authentication message
  generateAuthMessage(address, nonce) {
    return `Please sign this message to authenticate with the Document Verification System.\n\nAddress: ${address}\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;
  }

  // Sign authentication message
  async signMessage(signer, message) {
    try {
      const signature = await signer.signMessage(message);
      return signature;
    } catch (error) {
      throw new Error('Failed to sign message: ' + error.message);
    }
  }

  // Authenticate with wallet signature
  async authenticateWallet(address, signer, role = 'student') {
    try {
      // Get nonce from server with role
      const nonceResponse = await this.api.post('/auth/nonce', { 
        walletAddress: address,
        role: role 
      });
      const { nonce } = nonceResponse.data.data;

      // Generate and sign message
      const message = this.generateAuthMessage(address, nonce);
      const signature = await this.signMessage(signer, message);

      // Send signature to server for verification with role
      const authResponse = await this.api.post('/auth/verify', {
        walletAddress: address,
        signature,
        message,
        nonce,
        role: role,
      });

      const { token, user } = authResponse.data.data;

      // Store auth token
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));

      return { token, user };
    } catch (error) {
      console.error('Authentication error:', error);
      throw new Error(
        error.response?.data?.message || 'Authentication failed'
      );
    }
  }

  // Get current user profile
  async getUserProfile() {
    try {
      const response = await this.api.get('/users/profile');
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to fetch user profile'
      );
    }
  }

  // Update user profile
  async updateUserProfile(profileData) {
    try {
      const response = await this.api.put('/users/profile', profileData);
      const updatedUser = response.data;
      
      // Update stored user data
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to update user profile'
      );
    }
  }

  // Get stored user data
  getStoredUser() {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      return null;
    }
  }

  // Get stored auth token
  getStoredToken() {
    return localStorage.getItem('authToken');
  }

  // Check if user is authenticated
  isAuthenticated() {
    const token = this.getStoredToken();
    const user = this.getStoredUser();
    return !!(token && user);
  }

  // Logout user
  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  // Refresh authentication
  async refreshAuth(address, signer) {
    try {
      this.logout();
      return await this.authenticateWallet(address, signer);
    } catch (error) {
      console.error('Error refreshing authentication:', error);
      throw error;
    }
  }
}

export default new AuthService();