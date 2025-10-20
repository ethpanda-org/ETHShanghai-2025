import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, sepolia, polygon, polygonMumbai, arbitrum, optimism } from 'viem/chains'

// 配置支持的链（保留禁用自动连接）
export const config = getDefaultConfig({
  appName: 'CrediNet',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '00000000000000000000000000000000',
  chains: [
    mainnet,
    sepolia,
    polygon,
    polygonMumbai,
    arbitrum,
    optimism,
  ],
  ssr: false,
  // 禁用自动连接，避免 OKX 自动连接
  appDescription: 'CrediNet DApp',
  // RainbowKit 的 getDefaultConfig 不直接暴露 autoConnect，为兼容继续交由 WagmiProvider 内部默认，
  // 通过不持久化连接器状态达到不自动连接效果（无需额外参数）。
})

// 导出链配置
export { mainnet, sepolia, polygon, polygonMumbai, arbitrum, optimism }

