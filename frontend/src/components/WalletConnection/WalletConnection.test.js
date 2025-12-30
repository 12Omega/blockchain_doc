import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import WalletConnection from './WalletConnection';
import useWallet from '../../hooks/useWallet';
import authService from '../../services/authService';

// Mock the hooks and services
jest.mock('../../hooks/useWallet');
jest.mock('../../services/authService');

const theme = createTheme();

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('WalletConnection', () => {
  const mockUseWallet = {
    account: null,
    signer: null,
    chainId: null,
    network: null,
    balance: null,
    isConnecting: false,
    error: null,
    isConnected: false,
    isMetaMaskInstalled: true,
    isSupportedNetwork: false,
    networkName: 'Unknown Network',
    networkCurrency: 'ETH',
    connectWallet: jest.fn(),
    disconnectWallet: jest.fn(),
    switchNetwork: jest.fn(),
    refreshBalance: jest.fn(),
  };

  beforeEach(() => {
    useWallet.mockReturnValue(mockUseWallet);
    authService.getStoredUser.mockReturnValue(null);
    authService.getStoredToken.mockReturnValue(null);
    authService.authenticateWallet.mockResolvedValue({
      token: 'mock-token',
      user: { walletAddress: '0x123', role: 'student' },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders MetaMask not installed message when MetaMask is not available', () => {
    useWallet.mockReturnValue({
      ...mockUseWallet,
      isMetaMaskInstalled: false,
    });

    renderWithTheme(<WalletConnection />);

    expect(screen.getByText('MetaMask Required')).toBeInTheDocument();
    expect(screen.getByText('Install MetaMask')).toBeInTheDocument();
  });

  test('renders connect wallet button when not connected', () => {
    renderWithTheme(<WalletConnection />);

    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  test('calls connectWallet when connect button is clicked', async () => {
    renderWithTheme(<WalletConnection />);

    const connectButton = screen.getByText('Connect Wallet');
    fireEvent.click(connectButton);

    expect(mockUseWallet.connectWallet).toHaveBeenCalled();
  });

  test('shows connecting state when wallet is connecting', () => {
    useWallet.mockReturnValue({
      ...mockUseWallet,
      isConnecting: true,
    });

    renderWithTheme(<WalletConnection />);

    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  test('shows authenticate button when wallet is connected but not authenticated', () => {
    useWallet.mockReturnValue({
      ...mockUseWallet,
      isConnected: true,
      account: '0x1234567890123456789012345678901234567890',
      signer: { signMessage: jest.fn() },
      chainId: '11155111',
      network: {
        chainId: '0xaa36a7',
        chainIdDecimal: 11155111,
        name: 'Ethereum Sepolia Testnet',
        symbol: 'ETH',
        isTestnet: true,
        free: true,
      },
      isSupportedNetwork: true,
      networkName: 'Ethereum Sepolia Testnet',
      networkCurrency: 'ETH',
      balance: '1.5',
    });

    renderWithTheme(<WalletConnection />);

    expect(screen.getByText('Authenticate')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('0x1234...7890')).toBeInTheDocument();
  });

  test('calls authentication service when authenticate button is clicked', async () => {
    const mockSigner = { signMessage: jest.fn() };
    useWallet.mockReturnValue({
      ...mockUseWallet,
      isConnected: true,
      account: '0x1234567890123456789012345678901234567890',
      signer: mockSigner,
    });

    const onAuthSuccess = jest.fn();
    renderWithTheme(<WalletConnection onAuthSuccess={onAuthSuccess} />);

    const authenticateButton = screen.getByText('Authenticate');
    fireEvent.click(authenticateButton);

    await waitFor(() => {
      expect(authService.authenticateWallet).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        mockSigner
      );
    });
  });

  test('shows authenticated state when user is authenticated', async () => {
    useWallet.mockReturnValue({
      ...mockUseWallet,
      isConnected: true,
      account: '0x1234567890123456789012345678901234567890',
      chainId: '11155111',
      network: {
        chainId: '0xaa36a7',
        chainIdDecimal: 11155111,
        name: 'Ethereum Sepolia Testnet',
        symbol: 'ETH',
        isTestnet: true,
        free: true,
      },
      isSupportedNetwork: true,
      networkName: 'Ethereum Sepolia Testnet',
      networkCurrency: 'ETH',
      balance: '1.5',
    });

    authService.getStoredUser.mockReturnValue({
      walletAddress: '0x1234567890123456789012345678901234567890',
      role: 'student',
    });
    authService.getStoredToken.mockReturnValue('mock-token');
    authService.getUserProfile.mockResolvedValue({
      walletAddress: '0x1234567890123456789012345678901234567890',
      role: 'student',
    });

    renderWithTheme(<WalletConnection />);

    await waitFor(() => {
      expect(screen.getByText('Authenticated')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Disconnect')).toBeInTheDocument();
  });

  test('displays wallet error when present', () => {
    useWallet.mockReturnValue({
      ...mockUseWallet,
      error: 'Connection failed',
    });

    renderWithTheme(<WalletConnection />);

    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  test('calls disconnect when disconnect button is clicked', () => {
    useWallet.mockReturnValue({
      ...mockUseWallet,
      isConnected: true,
      account: '0x1234567890123456789012345678901234567890',
    });

    authService.getStoredUser.mockReturnValue({
      walletAddress: '0x1234567890123456789012345678901234567890',
      role: 'student',
    });

    renderWithTheme(<WalletConnection />);

    const disconnectButton = screen.getByText('Disconnect');
    fireEvent.click(disconnectButton);

    expect(mockUseWallet.disconnectWallet).toHaveBeenCalled();
  });

  test('handles authentication error', async () => {
    const mockSigner = { signMessage: jest.fn() };
    useWallet.mockReturnValue({
      ...mockUseWallet,
      isConnected: true,
      account: '0x1234567890123456789012345678901234567890',
      signer: mockSigner,
    });

    authService.authenticateWallet.mockRejectedValue(new Error('Auth failed'));

    const onAuthError = jest.fn();
    renderWithTheme(<WalletConnection onAuthError={onAuthError} />);

    const authenticateButton = screen.getByText('Authenticate');
    fireEvent.click(authenticateButton);

    await waitFor(() => {
      expect(screen.getByText('Auth failed')).toBeInTheDocument();
    });
  });
});