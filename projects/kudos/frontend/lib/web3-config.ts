import { http, createConfig } from "wagmi"
import { mainnet, polygon, bsc, arbitrum, optimism, base, sepolia, polygonAmoy, bscTestnet } from "wagmi/chains"
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors"

// WalletConnect Project ID (在实际项目中需要从 https://cloud.walletconnect.com/ 获取)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID"

export const config = createConfig({
  chains: [mainnet, sepolia, polygon, polygonAmoy, bsc, bscTestnet, arbitrum, optimism, base],
  connectors: [
    injected({ target: "metaMask" }),
    walletConnect({ projectId }),
    coinbaseWallet({ appName: "炒词 Chao Ci" }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [polygonAmoy.id]: http(),
    [bsc.id]: http(),
    [bscTestnet.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
  },
})

export const supportedChains = [
  { id: mainnet.id, name: "Ethereum", icon: "⟠", isTestnet: false },
  { id: sepolia.id, name: "Sepolia", icon: "⟠", isTestnet: true },
  { id: polygon.id, name: "Polygon", icon: "⬡", isTestnet: false },
  { id: polygonAmoy.id, name: "Polygon Amoy", icon: "⬡", isTestnet: true },
  { id: bsc.id, name: "BSC", icon: "◆", isTestnet: false },
  { id: bscTestnet.id, name: "BSC Testnet", icon: "◆", isTestnet: true },
  { id: arbitrum.id, name: "Arbitrum", icon: "◉", isTestnet: false },
  { id: optimism.id, name: "Optimism", icon: "◎", isTestnet: false },
  { id: base.id, name: "Base", icon: "◈", isTestnet: false },
]
