'use client'

import React from 'react'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'

// Create a client for React Query
const queryClient = new QueryClient()

// Local Hardhat network configuration
const hardhat = {
  id: 31337,
  name: 'Hardhat',
  network: 'hardhat',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['http://localhost:8545'] },
    public: { http: ['http://localhost:8545'] },
  },
  testnet: true,
}

// Configure wagmi with better error handling
const config = createConfig({
  chains: [hardhat, mainnet, sepolia],
  connectors: [
    injected({
      target: 'metaMask',
    }),
    metaMask({
      dappMetadata: {
        name: 'FocusBond',
        url: 'http://localhost:3000',
      },
    }),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
      metadata: {
        name: 'FocusBond',
        description: 'Focus Bond DApp',
        url: 'http://localhost:3000',
        icons: ['/favicon.ico']
      },
      showQrModal: false // 禁用自动显示二维码模态框，避免重复初始化
    }),
  ],
  transports: {
    [hardhat.id]: http('http://localhost:8545'),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: false, // Disable SSR for better compatibility
})

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
