import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import '@rainbow-me/rainbowkit/styles.css'
import {
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import {
  mainnet,
  bscTestnet,
  sepolia,
} from 'wagmi/chains'
import {
  QueryClientProvider,
  QueryClient,
} from '@tanstack/react-query'


export const PharosTestnet = {
  id: 688688,
  name: 'Pharos Testnet',
  nativeCurrency: {
    name: 'Pharos',
    symbol: 'PHRS', // Verify the correct symbol
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.dplabs-internal.com'], // Verify the correct RPC URL
    },
    public: {
      http: ['https://testnet.dplabs-internal.com'], // Verify the correct RPC URL
    },
  },
  blockExplorers: {
    default: {
      name: 'Pharosscan',
      url: 'https://testnet.pharosscan.xyz/', // Verify the correct explorer URL
    },
  },
  testnet: true,
};

const config = getDefaultConfig({
  appName: 'AquaFlux',
  projectId: 'YOUR_PROJECT_ID',
  chains: [sepolia, mainnet, bscTestnet, PharosTestnet],
  ssr: false,
})

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
