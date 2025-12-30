import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { 
  getNetworkByChainId, 
  isSupportedNetwork, 
  switchNetwork as switchToNetwork,
  getNetworkName,
  getNetworkCurrency
} from '../utils/networks';

const useWallet = () => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [network, setNetwork] = useState(null);
  const [balance, setBalance] = useState(null);

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  };

  // Connect to MetaMask
  const connectWallet = useCallback(async () => {
    if (!isMetaMaskInstalled()) {
      setError('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please connect your MetaMask wallet.');
      }

      // Create provider and signer
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const web3Signer = await web3Provider.getSigner();
      const networkInfo = await web3Provider.getNetwork();
      const chainIdDecimal = Number(networkInfo.chainId);

      setAccount(accounts[0]);
      setProvider(web3Provider);
      setSigner(web3Signer);
      setChainId(chainIdDecimal.toString());

      // Get network configuration
      const networkConfig = getNetworkByChainId(chainIdDecimal);
      setNetwork(networkConfig);

      // Get balance
      const accountBalance = await web3Provider.getBalance(accounts[0]);
      setBalance(ethers.formatEther(accountBalance));

      // Store connection in localStorage
      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('walletAccount', accounts[0]);

    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
    setNetwork(null);
    setBalance(null);
    setError(null);
    
    // Clear localStorage
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAccount');
  }, []);

  // Check if wallet was previously connected
  const checkConnection = useCallback(async () => {
    if (!isMetaMaskInstalled()) {
      return;
    }

    const wasConnected = localStorage.getItem('walletConnected');
    if (!wasConnected) {
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_accounts',
      });

      if (accounts.length > 0) {
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        const web3Signer = await web3Provider.getSigner();
        const networkInfo = await web3Provider.getNetwork();
        const chainIdDecimal = Number(networkInfo.chainId);

        setAccount(accounts[0]);
        setProvider(web3Provider);
        setSigner(web3Signer);
        setChainId(chainIdDecimal.toString());

        // Get network configuration
        const networkConfig = getNetworkByChainId(chainIdDecimal);
        setNetwork(networkConfig);

        // Get balance
        const accountBalance = await web3Provider.getBalance(accounts[0]);
        setBalance(ethers.formatEther(accountBalance));
      } else {
        // Clear localStorage if no accounts
        localStorage.removeItem('walletConnected');
        localStorage.removeItem('walletAccount');
      }
    } catch (err) {
      console.error('Error checking connection:', err);
      localStorage.removeItem('walletConnected');
      localStorage.removeItem('walletAccount');
    }
  }, []);

  // Handle account changes
  const handleAccountsChanged = useCallback((accounts) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else if (accounts[0] !== account) {
      setAccount(accounts[0]);
      localStorage.setItem('walletAccount', accounts[0]);
    }
  }, [account, disconnectWallet]);

  // Handle chain changes
  const handleChainChanged = useCallback((newChainId) => {
    const chainIdDecimal = parseInt(newChainId, 16);
    setChainId(chainIdDecimal.toString());
    
    // Get network configuration
    const networkConfig = getNetworkByChainId(chainIdDecimal);
    setNetwork(networkConfig);
    
    // Reload the page to reset the dapp state
    window.location.reload();
  }, []);

  // Switch network
  const switchNetwork = useCallback(async (networkKey) => {
    setError(null);
    try {
      await switchToNetwork(networkKey);
      return true;
    } catch (err) {
      console.error('Error switching network:', err);
      setError(err.message || 'Failed to switch network');
      return false;
    }
  }, []);

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!provider || !account) return;
    try {
      const accountBalance = await provider.getBalance(account);
      setBalance(ethers.formatEther(accountBalance));
    } catch (err) {
      console.error('Error refreshing balance:', err);
    }
  }, [provider, account]);

  // Set up event listeners
  useEffect(() => {
    if (!isMetaMaskInstalled()) {
      return;
    }

    // Check existing connection on mount
    checkConnection();

    // Set up event listeners
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    // Cleanup event listeners
    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [checkConnection, handleAccountsChanged, handleChainChanged]);

  return {
    account,
    provider,
    signer,
    chainId,
    network,
    balance,
    isConnecting,
    error,
    isConnected: !!account,
    isMetaMaskInstalled: isMetaMaskInstalled(),
    isSupportedNetwork: network ? isSupportedNetwork(chainId) : false,
    networkName: network ? network.name : getNetworkName(chainId),
    networkCurrency: network ? network.symbol : getNetworkCurrency(chainId),
    connectWallet,
    disconnectWallet,
    switchNetwork,
    refreshBalance,
  };
};

export default useWallet;