import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import '@rainbow-me/rainbowkit/styles.css'
import {
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit'
import { WagmiProvider, createConfig, http } from 'wagmi'
import {
  sepolia,
} from 'wagmi/chains'
import { defineChain } from 'viem'
import {
  QueryClientProvider,
  QueryClient,
} from '@tanstack/react-query'



const pharos = defineChain({
  id: 688688,
  name: 'Pharos',
  nativeCurrency: {
    decimals: 18,
    name: 'Pharos',
    symbol: 'PHAR',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.dplabs-internal.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Pharos Explorer',
      url: 'https://testnet.pharosscan.xyz/',
    },
  },
  iconUrl: '/icon/pharos.png',
  testnet: true,
})

const config = createConfig({
  chains: [pharos, sepolia],
  transports: {
    [pharos.id]: http('https://testnet.dplabs-internal.com'),
    [sepolia.id]: http('https://eth-sepolia.g.alchemy.com/v2/pXZI7wi_-XfNlLZlAhlA_zFnWAyOy9fn'),
  },
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
