Wallet Integration and Blockchain Connection

This module provides comprehensive wallet integration for the Academic Document Blockchain Verification System, with support for MetaMask and multiple blockchain networks.

Features

1. MetaMask Connection
- Automatic detection of MetaMask Getting Everything Set Up
- One-click wallet connection
- Persistent connection across sessions
- Account change detection
- Secure wallet disconnection

2. Network Management
- Supported Networks:
  - Ethereum Sepolia Testnet (Chain ID: 11155111)
  - Polygon Mumbai Testnet (Chain ID: 80001)
  - Localhost (Chain ID: 31337) for development

- Network Switching:
  - Easy network switching via UI
  - Automatic network addition to MetaMask if not configured
  - Network validation and warnings for unsupported networks

3. Testnet Token Faucets
- Built-in faucet information for each network
- Direct links to multiple faucet providers
- Instructions for obtaining free testnet tokens
- Tips for using faucets effectively

4. Transaction Status Tracking
- Real-time transaction status monitoring
- Confirmation tracking (configurable threshold)
- Block explorer integration
- Visual progress indicators
- Transaction hash display with copy functionality

5. Account Information Display
- Wallet address with formatted display
- Account balance in native currency
- Network information (name, chain ID, currency)
- Network status indicators (testnet, free, supported)
- Block explorer links for addresses

Components

WalletConnection
Main component that orchestrates wallet connection and authentication.

Props:
- `onAuthSuccess`: Callback when authentication succeeds
- `onAuthError`: Callback when authentication fails

Features:
- MetaMask Getting Everything Set Up detection
- Wallet connection/disconnection
- Authentication flow
- Network information display
- Access to network switcher and faucet info

NetworkSwitcher
Dialog component for switching between supported networks.

Props:
- `currentChainId`: Current connected chain ID
- `onNetworkSwitch`: Callback for network switch
- `open`: Dialog open state
- `onClose`: Callback to close dialog

Features:
- List of all supported networks
- Current network indication
- Network metadata display
- One-click network switching

FaucetInfo
Dialog component displaying faucet information for getting testnet tokens.

Props:
- `chainId`: Chain ID to show faucets for
- `open`: Dialog open state
- `onClose`: Callback to close dialog

Features:
- Network-specific faucet list
- Direct links to faucet websites
- Usage tips and instructions
- Faucet descriptions

TransactionStatus
Dialog component for tracking transaction status and confirmations.

Props:
- `transaction`: Transaction object from ethers.js
- `chainId`: Chain ID for block explorer links
- `open`: Dialog open state
- `onClose`: Callback to close dialog
- `requiredConfirmations`: Number of confirmations to wait for (default: 2)

Features:
- Real-time status updates
- Confirmation counting
- Block explorer integration
- Visual progress stepper
- Error handling

Utilities

networks.js
Centralized network Setting Things Up and utilities.

Key Functions:
- `getNetworkByChainId(chainId)`: Get network config by chain ID
- `isSupportedNetwork(chainId)`: Check if network is supported
- `switchNetwork(networkKey)`: Switch to a specific network
- `getExplorerUrl(txHash, chainId)`: Get block explorer URL for transaction
- `getAddressExplorerUrl(address, chainId)`: Get block explorer URL for address
- `getNetworkName(chainId)`: Get formatted network name
- `getNetworkCurrency(chainId)`: Get network currency symbol
- `getNetworkFaucets(chainId)`: Get faucets for a network

Network Setting Things Up:
Each network includes:
- Chain ID (hex and decimal)
- Network name
- Native currency information
- RPC URLs (with fallbacks)
- Block explorer URLs
- Faucet information
- Testnet/mainnet flag
- Free/paid flag

Hook

useWallet
Custom React hook for wallet state management.

Returns:
- `account`: Connected wallet address
- `provider`: Ethers.js provider instance
- `signer`: Ethers.js signer instance
- `chainId`: Current chain ID
- `network`: Network Setting Things Up object
- `balance`: Account balance in native currency
- `isConnecting`: Connection in progress flag
- `error`: Error message if any
- `isConnected`: Connection status
- `isMetaMaskInstalled`: MetaMask Getting Everything Set Up status
- `isSupportedNetwork`: Whether current network is supported
- `networkName`: Current network name
- `networkCurrency`: Current network currency symbol
- `connectWallet()`: Function to connect wallet
- `disconnectWallet()`: Function to disconnect wallet
- `switchNetwork(networkKey)`: Function to switch networks
- `refreshBalance()`: Function to refresh account balance

Usage Examples

Basic Wallet Connection
```jsx
import WalletConnection from './components/WalletConnection';

function App() {
  const handleAuthSuccess = (user) => {
    console.log('User authenticated:', user);
  };

  const handleAuthError = (error) => {
    console.error('Authentication failed:', error);
  };

  return (
    <WalletConnection
      onAuthSuccess={handleAuthSuccess}
      onAuthError={handleAuthError}
    />
  );
}
```

Using the Wallet Hook
```jsx
import useWallet from './hooks/useWallet';

function MyComponent() {
  const {
    account,
    balance,
    networkName,
    isConnected,
    isSupportedNetwork,
    connectWallet,
    switchNetwork,
  } = useWallet();

  if (!isConnected) {
    return <button onClick={connectWallet}>Connect Wallet</button>;
  }

  return (
    <div>
      <p>Address: {account}</p>
      <p>Balance: {balance} ETH</p>
      <p>Network: {networkName}</p>
      {!isSupportedNetwork && (
        <button onClick={() => switchNetwork('SEPOLIA')}>
          Switch to Sepolia
        </button>
      )}
    </div>
  );
}
```

Transaction Status Tracking
```jsx
import { TransactionStatus } from './components/WalletConnection';

function DocumentRegistration() {
  const [transaction, setTransaction] = useState(null);
  const [showStatus, setShowStatus] = useState(false);
  const { chainId } = useWallet();

  const handleRegister = async () => {
    const tx = await contract.registerDocument(...);
    setTransaction(tx);
    setShowStatus(true);
  };

  return (
    <>
      <button onClick={handleRegister}>Register Document</button>
      <TransactionStatus
        transaction={transaction}
        chainId={chainId}
        open={showStatus}
        onClose={() => setShowStatus(false)}
        requiredConfirmations={2}
      />
    </>
  );
}
```

Network Setting Things Up

Adding a New Network
To add support for a new network, update `frontend/src/utils/networks.js`:

```javascript
export const SUPPORTED_NETWORKS = {
  // ... existing networks
  NEW_NETWORK: {
    chainId: '0x...', // hex chain ID
    chainIdDecimal: 12345, // decimal chain ID
    name: 'Network Name',
    currency: 'TOKEN',
    symbol: 'TOKEN',
    decimals: 18,
    rpcUrls: ['https://rpc.example.com'],
    blockExplorerUrls: ['https://explorer.example.com'],
    faucets: [
      {
        name: 'Faucet Name',
        url: 'https://faucet.example.com',
        description: 'Get free tokens'
      }
    ],
    isTestnet: true,
    free: true
  }
};
```

Environment Variables

No environment variables are required for the wallet integration. Network Setting Things Ups are hardcoded for security and reliability.

Testing

All components include comprehensive unit tests:
- `useWallet.test.js`: Hook functionality tests
- `WalletConnection.test.js`: Component integration tests

Run tests:
```bash
npm test -- WalletConnection.test.js --watchAll=false
npm test -- useWallet.test.js --watchAll=false
```

Security Considerations

1. Private Keys: Never expose private keys in the frontend
2. Network Validation: Always validate network before transactions
3. Transaction Signing: All transactions require user approval in MetaMask
4. RPC URLs: Use trusted RPC providers
5. Block Explorer Links: Verify URLs before opening

Browser Compatibility

- Chrome/Brave with MetaMask extension
- Firefox with MetaMask extension
- Edge with MetaMask extension
- Mobile browsers with MetaMask mobile app

Troubleshooting

MetaMask Not Detected
- Ensure MetaMask extension is installed
- Refresh the page after Getting Everything Set Up
- Check browser console for errors

Network Switch Fails
- Ensure MetaMask is unlocked
- Check if network is already added to MetaMask
- Verify RPC URLs are accessible

Transaction Stuck
- Check network congestion
- Verify sufficient gas balance
- Try increasing gas price in MetaMask

Balance Not Updating
- Click refresh button to manually update
- Check if transaction is confirmed
- Verify correct network is selected

Future Enhancements

- WalletConnect support for mobile wallets
- Hardware wallet integration (Ledger, Trezor)
- Multi-wallet support
- Gas price estimation and optimization
- Transaction history tracking
- ENS name resolution

