import { createWeb3Modal } from '@web3modal/wagmi/react';
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
import { WagmiProvider } from 'wagmi';
import { sepolia, mainnet, polygon, arbitrum } from 'wagmi/chains';
import { http, fallback } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// WalletConnect Project ID - Get from https://cloud.walletconnect.com
const projectId = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

// Magic Link API Key - Get from https://magic.link
export const magicApiKey = process.env.REACT_APP_MAGIC_API_KEY || 'YOUR_MAGIC_API_KEY';

// Define chains
const chains = [sepolia, mainnet, polygon, arbitrum];

// Wagmi config
const metadata = {
  name: 'Blockchain Document Verification',
  description: 'Secure document storage and verification on blockchain',
  url: 'http://localhost:3000',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

export const config = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  transports: {
    [sepolia.id]: fallback([
      http('https://rpc.sepolia.org', { timeout: 5000 }),
      http('https://ethereum-sepolia-rpc.publicnode.com', { timeout: 5000 }),
      http('https://rpc2.sepolia.org', { timeout: 5000 }),
    ]),
    [mainnet.id]: fallback([
      http('https://eth.llamarpc.com', { timeout: 5000 }),
      http('https://ethereum-rpc.publicnode.com', { timeout: 5000 }),
      http('https://rpc.ankr.com/eth', { timeout: 5000 }),
    ]),
    [polygon.id]: fallback([
      http('https://polygon-rpc.com', { timeout: 5000 }),
      http('https://polygon-bor-rpc.publicnode.com', { timeout: 5000 }),
    ]),
    [arbitrum.id]: fallback([
      http('https://arb1.arbitrum.io/rpc', { timeout: 5000 }),
      http('https://arbitrum-one-rpc.publicnode.com', { timeout: 5000 }),
    ]),
  },
});

// Create modal
export const web3Modal = createWeb3Modal({
  wagmiConfig: config,
  projectId,
  enableAnalytics: false,
  themeMode: 'light',
  themeVariables: {
    '--w3m-accent': '#1976d2',
  }
});

// Query client for React Query
export const queryClient = new QueryClient();
