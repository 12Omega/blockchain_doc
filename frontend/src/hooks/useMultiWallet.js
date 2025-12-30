import { useState, useEffect, useCallback } from 'react';
import { useAccount, useDisconnect, useSignMessage } from 'wagmi';
import { Magic } from 'magic-sdk';
import { ethers } from 'ethers';
import { magicApiKey } from '../config/walletConfig';

// Initialize Magic
let magic = null;
if (typeof window !== 'undefined' && magicApiKey !== 'YOUR_MAGIC_API_KEY') {
  magic = new Magic(magicApiKey, {
    network: 'sepolia'
  });
}

const useMultiWallet = () => {
  // WalletConnect state
  const { address: wcAddress, isConnected: wcIsConnected, connector } = useAccount();
  const { disconnect: wcDisconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  // Magic state
  const [magicAccount, setMagicAccount] = useState(null);
  const [magicProvider, setMagicProvider] = useState(null);
  const [isMagicConnected, setIsMagicConnected] = useState(false);

  // Unified state
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [connectionType, setConnectionType] = useState(null); // 'walletconnect' or 'magic'
  const [balance, setBalance] = useState(null);

  // Update account when WalletConnect connects
  useEffect(() => {
    if (wcIsConnected && wcAddress) {
      setAccount(wcAddress);
      setConnectionType('walletconnect');
      updateWalletConnectProvider();
    }
  }, [wcIsConnected, wcAddress]);

  // Check Magic connection on mount
  useEffect(() => {
    checkMagicConnection();
  }, []);

  const updateWalletConnectProvider = async () => {
    try {
      if (connector && typeof connector.getProvider === 'function') {
        const wcProvider = await connector.getProvider();
        const ethersProvider = new ethers.BrowserProvider(wcProvider);
        const ethersSigner = await ethersProvider.getSigner();
        
        setProvider(ethersProvider);
        setSigner(ethersSigner);
        
        // Get balance
        const bal = await ethersProvider.getBalance(wcAddress);
        setBalance(ethers.formatEther(bal));
      }
    } catch (err) {
      console.error('Error updating WalletConnect provider:', err);
    }
  };

  const checkMagicConnection = async () => {
    if (!magic) return;
    
    try {
      const isLoggedIn = await magic.user.isLoggedIn();
      if (isLoggedIn) {
        const metadata = await magic.user.getMetadata();
        setMagicAccount(metadata.publicAddress);
        setAccount(metadata.publicAddress);
        setIsMagicConnected(true);
        setConnectionType('magic');
        
        // Set up provider
        const magicWeb3Provider = new ethers.BrowserProvider(magic.rpcProvider);
        setMagicProvider(magicWeb3Provider);
        setProvider(magicWeb3Provider);
        
        const magicSigner = await magicWeb3Provider.getSigner();
        setSigner(magicSigner);
        
        // Get balance
        const bal = await magicWeb3Provider.getBalance(metadata.publicAddress);
        setBalance(ethers.formatEther(bal));
      }
    } catch (err) {
      console.error('Error checking Magic connection:', err);
    }
  };

  // Connect with Magic (email)
  const connectWithMagic = useCallback(async (email) => {
    if (!magic) {
      setError('Magic Link is not configured. Please add REACT_APP_MAGIC_API_KEY to .env');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Login with Magic Link
      await magic.auth.loginWithEmailOTP({ email });
      
      const metadata = await magic.user.getMetadata();
      setMagicAccount(metadata.publicAddress);
      setAccount(metadata.publicAddress);
      setIsMagicConnected(true);
      setConnectionType('magic');
      
      // Set up provider
      const magicWeb3Provider = new ethers.BrowserProvider(magic.rpcProvider);
      setMagicProvider(magicWeb3Provider);
      setProvider(magicWeb3Provider);
      
      const magicSigner = await magicWeb3Provider.getSigner();
      setSigner(magicSigner);
      
      // Get balance
      const bal = await magicWeb3Provider.getBalance(metadata.publicAddress);
      setBalance(ethers.formatEther(bal));
      
      return metadata.publicAddress;
    } catch (err) {
      console.error('Magic connection error:', err);
      setError(err.message || 'Failed to connect with Magic Link');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    try {
      if (connectionType === 'walletconnect') {
        wcDisconnect();
      } else if (connectionType === 'magic' && magic) {
        await magic.user.logout();
        setMagicAccount(null);
        setIsMagicConnected(false);
      }
      
      setAccount(null);
      setProvider(null);
      setSigner(null);
      setConnectionType(null);
      setBalance(null);
      setError(null);
    } catch (err) {
      console.error('Disconnect error:', err);
      setError(err.message);
    }
  }, [connectionType, wcDisconnect]);

  // Sign message
  const signMessage = useCallback(async (message) => {
    try {
      if (connectionType === 'walletconnect') {
        return await signMessageAsync({ message });
      } else if (connectionType === 'magic' && signer) {
        return await signer.signMessage(message);
      }
      throw new Error('No wallet connected');
    } catch (err) {
      console.error('Sign message error:', err);
      throw err;
    }
  }, [connectionType, signer, signMessageAsync]);

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!provider || !account) return;
    
    try {
      const bal = await provider.getBalance(account);
      setBalance(ethers.formatEther(bal));
    } catch (err) {
      console.error('Error refreshing balance:', err);
    }
  }, [provider, account]);

  return {
    account,
    provider,
    signer,
    balance,
    isConnecting,
    error,
    isConnected: wcIsConnected || isMagicConnected,
    connectionType,
    connectWithMagic,
    disconnectWallet,
    signMessage,
    refreshBalance,
    isMagicAvailable: !!magic,
  };
};

export default useMultiWallet;
