import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import {
  mainnet,
  sepolia,
  polygon,
  polygonMumbai,
  arbitrum,
  optimism,
} from 'viem/chains'

const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '00000000000000000000000000000000'

const rpcUrls = {
  [mainnet.id]:
    import.meta.env.VITE_MAINNET_RPC_URL ||
    'https://ethereum.publicnode.com',
  [sepolia.id]:
    import.meta.env.VITE_SEPOLIA_RPC_URL ||
    'https://1rpc.io/sepolia',
  [polygon.id]:
    import.meta.env.VITE_POLYGON_RPC_URL ||
    'https://polygon.llamarpc.com',
  [polygonMumbai.id]:
    import.meta.env.VITE_MUMBAI_RPC_URL ||
    'https://rpc-mumbai.maticvigil.com',
  [arbitrum.id]:
    import.meta.env.VITE_ARBITRUM_RPC_URL ||
    'https://arbitrum-one.publicnode.com',
  [optimism.id]:
    import.meta.env.VITE_OPTIMISM_RPC_URL ||
    'https://mainnet.optimism.io',
} as const

// 为每条链显式设置 RPC，避免 WalletConnect 云端代理触发来源校验限制
export const config = getDefaultConfig({
  appName: 'CrediNet',
  appDescription: 'CrediNet DApp',
  projectId: walletConnectProjectId,
  chains: [mainnet, sepolia, polygon, polygonMumbai, arbitrum, optimism],
  transports: {
    [mainnet.id]: http(rpcUrls[mainnet.id]),
    [sepolia.id]: http(rpcUrls[sepolia.id]),
    [polygon.id]: http(rpcUrls[polygon.id]),
    [polygonMumbai.id]: http(rpcUrls[polygonMumbai.id]),
    [arbitrum.id]: http(rpcUrls[arbitrum.id]),
    [optimism.id]: http(rpcUrls[optimism.id]),
  },
  ssr: false,
})

export { mainnet, sepolia, polygon, polygonMumbai, arbitrum, optimism }
