import { renderHook, act } from '@testing-library/react';
import useWallet from './useWallet';

// Mock network utilities
jest.mock('../utils/networks', () => ({
  getNetworkByChainId: jest.fn((chainId) => {
    if (chainId === 1 || chainId === '1') {
      return {
        chainId: '0x1',
        chainIdDecimal: 1,
        name: 'Ethereum Mainnet',
        symbol: 'ETH',
        isTestnet: false,
      };
    }
    return null;
  }),
  isSupportedNetwork: jest.fn(() => true),
  switchNetwork: jest.fn().mockResolvedValue(true),
  getNetworkName: jest.fn(() => 'Ethereum Mainnet'),
  getNetworkCurrency: jest.fn(() => 'ETH'),
}));

// Mock ethers
const mockGetBalance = jest.fn().mockResolvedValue(BigInt('1000000000000000000'));
const mockGetNetwork = jest.fn().mockResolvedValue({
  chainId: BigInt(1),
});
const mockGetSigner = jest.fn().mockResolvedValue({
  signMessage: jest.fn(),
});

jest.mock('ethers', () => ({
  BrowserProvider: jest.fn().mockImplementation(() => ({
    getSigner: mockGetSigner,
    getNetwork: mockGetNetwork,
    getBalance: mockGetBalance,
  })),
  formatEther: jest.fn((value) => '1.0'),
}));

// Mock window.ethereum
const mockEthereum = {
  request: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
};

Object.defineProperty(window, 'ethereum', {
  value: mockEthereum,
  writable: true,
});

describe('useWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockEthereum.request.mockClear();
    mockEthereum.on.mockClear();
    mockEthereum.removeListener.mockClear();
  });

  test('should initialize with default values', () => {
    const { result } = renderHook(() => useWallet());

    expect(result.current.account).toBeNull();
    expect(result.current.provider).toBeNull();
    expect(result.current.signer).toBeNull();
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.chainId).toBeNull();
    expect(result.current.network).toBeNull();
    expect(result.current.balance).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isMetaMaskInstalled).toBe(true);
    expect(result.current.isSupportedNetwork).toBe(false);
  });

  test('should detect when MetaMask is not installed', () => {
    // Temporarily remove ethereum from window
    const originalEthereum = window.ethereum;
    delete window.ethereum;

    const { result } = renderHook(() => useWallet());

    expect(result.current.isMetaMaskInstalled).toBe(false);

    // Restore ethereum
    window.ethereum = originalEthereum;
  });

  test('should connect wallet successfully', async () => {
    const mockAccounts = ['0x1234567890123456789012345678901234567890'];
    mockEthereum.request.mockResolvedValueOnce(mockAccounts);

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connectWallet();
    });

    expect(mockEthereum.request).toHaveBeenCalledWith({
      method: 'eth_requestAccounts',
    });
    expect(result.current.account).toBe(mockAccounts[0]);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.error).toBeNull();
  });

  test('should handle connection error', async () => {
    const errorMessage = 'User rejected the request';
    mockEthereum.request.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connectWallet();
    });

    expect(result.current.account).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBe(errorMessage);
  });

  test('should handle empty accounts array', async () => {
    mockEthereum.request.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connectWallet();
    });

    expect(result.current.account).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBe('No accounts found. Please connect your MetaMask wallet.');
  });

  test('should disconnect wallet', () => {
    const { result } = renderHook(() => useWallet());

    // First set some connected state
    act(() => {
      result.current.account = '0x123';
      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('walletAccount', '0x123');
    });

    act(() => {
      result.current.disconnectWallet();
    });

    expect(result.current.account).toBeNull();
    expect(result.current.provider).toBeNull();
    expect(result.current.signer).toBeNull();
    expect(result.current.chainId).toBeNull();
    expect(result.current.network).toBeNull();
    expect(result.current.balance).toBeNull();
    expect(result.current.error).toBeNull();
    expect(localStorage.getItem('walletConnected')).toBeNull();
    expect(localStorage.getItem('walletAccount')).toBeNull();
  });

  test('should check existing connection on mount', async () => {
    const mockAccounts = ['0x1234567890123456789012345678901234567890'];
    localStorage.setItem('walletConnected', 'true');
    mockEthereum.request.mockResolvedValueOnce(mockAccounts);

    const { result } = renderHook(() => useWallet());

    // Wait for the effect to run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockEthereum.request).toHaveBeenCalledWith({
      method: 'eth_accounts',
    });
  });

  test('should set up event listeners on mount', () => {
    renderHook(() => useWallet());

    expect(mockEthereum.on).toHaveBeenCalledWith('accountsChanged', expect.any(Function));
    expect(mockEthereum.on).toHaveBeenCalledWith('chainChanged', expect.any(Function));
  });

  test('should handle account change event', () => {
    const { result } = renderHook(() => useWallet());

    // Get the accountsChanged handler
    const accountsChangedHandler = mockEthereum.on.mock.calls.find(
      call => call[0] === 'accountsChanged'
    )[1];

    // Simulate account change
    act(() => {
      accountsChangedHandler(['0xnewaccount']);
    });

    expect(result.current.account).toBe('0xnewaccount');
  });

  test('should handle account disconnection event', () => {
    const { result } = renderHook(() => useWallet());

    // Set initial connected state
    act(() => {
      result.current.account = '0x123';
    });

    // Get the accountsChanged handler
    const accountsChangedHandler = mockEthereum.on.mock.calls.find(
      call => call[0] === 'accountsChanged'
    )[1];

    // Simulate account disconnection
    act(() => {
      accountsChangedHandler([]);
    });

    expect(result.current.account).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });
});