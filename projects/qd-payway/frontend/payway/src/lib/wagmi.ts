import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { sepolia } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'PayWay',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [sepolia],
  ssr: true, // Next.js 15 SSR支持
})

