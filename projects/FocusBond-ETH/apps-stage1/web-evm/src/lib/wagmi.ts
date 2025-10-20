import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { localhost } from 'wagmi/chains'

// Define Anvil chain for local development
export const anvil = {
  ...localhost,
  id: 31337,
  name: 'Anvil Local',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { 
      http: ['http://127.0.0.1:8545'],
    },
  },
} as const

export const config = getDefaultConfig({
  appName: 'FocusBond EVM',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [anvil],
  transports: {
    [anvil.id]: http('http://127.0.0.1:8545'),
  },
  ssr: true,
})

// Contract addresses
export const CONTRACTS = {
  [anvil.id]: {
    // Latest deployment addresses - Non-transferable credits system
    focusBond: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as `0x${string}`,
    usdc: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as `0x${string}`,
    focus: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as `0x${string}`, // FocusCredit (non-transferable)
  },
} as const

export function getContracts(chainId: number) {
  return CONTRACTS[chainId as keyof typeof CONTRACTS]
}
