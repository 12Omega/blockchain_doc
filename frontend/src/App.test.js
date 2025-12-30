import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// Mock the hooks and services to avoid dependency issues in tests
jest.mock('./hooks/useWallet', () => ({
  __esModule: true,
  default: () => ({
    account: null,
    provider: null,
    signer: null,
    chainId: null,
    isConnecting: false,
    error: null,
    isConnected: false,
    isMetaMaskInstalled: true,
    connectWallet: jest.fn(),
    disconnectWallet: jest.fn(),
  }),
}));

jest.mock('./services/authService', () => ({
  __esModule: true,
  default: {
    getStoredUser: jest.fn(() => null),
    getStoredToken: jest.fn(() => null),
    authenticateWallet: jest.fn(),
    getUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
    logout: jest.fn(),
    isAuthenticated: jest.fn(() => false),
  },
}));

test('renders app with wallet connection', () => {
  render(<App />);
  
  // Check if the main app elements are rendered
  expect(screen.getByText('Document Verification System')).toBeInTheDocument();
  expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
});