/**
 * Network Configuration for Free Testnets
 * Supports Ethereum Sepolia and Polygon Mumbai testnets
 */

export const SUPPORTED_NETWORKS = {
  SEPOLIA: {
    chainId: '0xaa36a7', // 11155111 in hex
    chainIdDecimal: 11155111,
    name: 'Ethereum Sepolia Testnet',
    currency: 'ETH',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: [
      'https://rpc.sepolia.org',
      'https://ethereum-sepolia.publicnode.com',
      'https://rpc2.sepolia.org'
    ],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    faucets: [
      {
        name: 'Sepolia Faucet',
        url: 'https://sepoliafaucet.com',
        description: 'Get 0.5 ETH per day'
      },
      {
        name: 'Alchemy Sepolia Faucet',
        url: 'https://www.alchemy.com/faucets/ethereum-sepolia',
        description: 'Requires Alchemy account'
      },
      {
        name: 'Infura Sepolia Faucet',
        url: 'https://www.infura.io/faucet/sepolia',
        description: 'Requires Infura account'
      }
    ],
    isTestnet: true,
    free: true
  },
  MUMBAI: {
    chainId: '0x13881', // 80001 in hex
    chainIdDecimal: 80001,
    name: 'Polygon Mumbai Testnet',
    currency: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
    rpcUrls: [
      'https://rpc-mumbai.maticvigil.com',
      'https://polygon-mumbai.blockpi.network/v1/rpc/public',
      'https://polygon-mumbai-bor.publicnode.com'
    ],
    blockExplorerUrls: ['https://mumbai.polygonscan.com'],
    faucets: [
      {
        name: 'Polygon Faucet',
        url: 'https://faucet.polygon.technology',
        description: 'Get 0.5 MATIC per day'
      },
      {
        name: 'Alchemy Mumbai Faucet',
        url: 'https://www.alchemy.com/faucets/polygon-mumbai',
        description: 'Requires Alchemy account'
      }
    ],
    isTestnet: true,
    free: true
  },
  LOCALHOST: {
    chainId: '0x7a69', // 31337 in hex (Hardhat default)
    chainIdDecimal: 31337,
    name: 'Localhost',
    currency: 'ETH',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: ['http://localhost:8545'],
    blockExplorerUrls: [],
    faucets: [],
    isTestnet: true,
    free: true
  }
};

// Default network (can be configured via environment variable)
export const DEFAULT_NETWORK = process.env.REACT_APP_DEFAULT_NETWORK || 'SEPOLIA';

/**
 * Get network configuration by chain ID
 * @param {string|number} chainId - Chain ID (hex or decimal)
 * @returns {Object|null} Network configuration or null if not found
 */
export const getNetworkByChainId = (chainId) => {
  const chainIdStr = typeof chainId === 'number' 
    ? `0x${chainId.toString(16)}` 
    : chainId;
  
  const chainIdDecimal = typeof chainId === 'string' && chainId.startsWith('0x')
    ? parseInt(chainId, 16)
    : parseInt(chainId, 10);

  return Object.values(SUPPORTED_NETWORKS).find(
    network => network.chainId === chainIdStr || network.chainIdDecimal === chainIdDecimal
  );
};

/**
 * Check if a chain ID is supported
 * @param {string|number} chainId - Chain ID to check
 * @returns {boolean} True if supported
 */
export const isSupportedNetwork = (chainId) => {
  return getNetworkByChainId(chainId) !== null;
};

/**
 * Get block explorer URL for a transaction
 * @param {string} txHash - Transaction hash
 * @param {string|number} chainId - Chain ID
 * @returns {string|null} Explorer URL or null
 */
export const getExplorerUrl = (txHash, chainId) => {
  const network = getNetworkByChainId(chainId);
  if (!network || network.blockExplorerUrls.length === 0) {
    return null;
  }
  return `${network.blockExplorerUrls[0]}/tx/${txHash}`;
};

/**
 * Get block explorer URL for an address
 * @param {string} address - Ethereum address
 * @param {string|number} chainId - Chain ID
 * @returns {string|null} Explorer URL or null
 */
export const getAddressExplorerUrl = (address, chainId) => {
  const network = getNetworkByChainId(chainId);
  if (!network || network.blockExplorerUrls.length === 0) {
    return null;
  }
  return `${network.blockExplorerUrls[0]}/address/${address}`;
};

/**
 * Switch to a specific network in MetaMask
 * @param {string} networkKey - Network key (e.g., 'SEPOLIA', 'MUMBAI')
 * @returns {Promise<boolean>} True if successful
 */
export const switchNetwork = async (networkKey) => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  const network = SUPPORTED_NETWORKS[networkKey];
  if (!network) {
    throw new Error(`Unsupported network: ${networkKey}`);
  }

  try {
    // Try to switch to the network
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: network.chainId }],
    });
    return true;
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        // Add the network to MetaMask
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: network.chainId,
              chainName: network.name,
              nativeCurrency: {
                name: network.currency,
                symbol: network.symbol,
                decimals: network.decimals,
              },
              rpcUrls: network.rpcUrls,
              blockExplorerUrls: network.blockExplorerUrls,
            },
          ],
        });
        return true;
      } catch (addError) {
        throw new Error(`Failed to add network: ${addError.message}`);
      }
    }
    throw new Error(`Failed to switch network: ${switchError.message}`);
  }
};

/**
 * Get formatted network name for display
 * @param {string|number} chainId - Chain ID
 * @returns {string} Network name or 'Unknown Network'
 */
export const getNetworkName = (chainId) => {
  const network = getNetworkByChainId(chainId);
  return network ? network.name : 'Unknown Network';
};

/**
 * Get network currency symbol
 * @param {string|number} chainId - Chain ID
 * @returns {string} Currency symbol or 'ETH'
 */
export const getNetworkCurrency = (chainId) => {
  const network = getNetworkByChainId(chainId);
  return network ? network.symbol : 'ETH';
};

/**
 * Check if network is a testnet
 * @param {string|number} chainId - Chain ID
 * @returns {boolean} True if testnet
 */
export const isTestnet = (chainId) => {
  const network = getNetworkByChainId(chainId);
  return network ? network.isTestnet : false;
};

/**
 * Get all faucets for a network
 * @param {string|number} chainId - Chain ID
 * @returns {Array} Array of faucet objects
 */
export const getNetworkFaucets = (chainId) => {
  const network = getNetworkByChainId(chainId);
  return network ? network.faucets : [];
};
