import { configureChains, createConfig } from "wagmi"
import { mainnet, sepolia } from "wagmi/chains"
import { InjectedConnector } from "wagmi/connectors/injected"
import { WalletConnectConnector } from "wagmi/connectors/walletConnect"
import { publicProvider } from "wagmi/providers/public"

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet, sepolia],
  [publicProvider()]
)

// 创建连接器数组，只在有有效Project ID时才包含WalletConnect
const getConnectors = () => {
  const connectors = [
    new InjectedConnector({
      chains,
      options: {
        name: "Injected",
        shimDisconnect: true,
      },
    }),
  ]
  
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
  
  // 只有在有真实Project ID时才启用WalletConnect
  if (projectId && projectId !== "demo" && projectId.length > 10) {
    connectors.push(
      new WalletConnectConnector({
        chains,
        options: {
          projectId,
          showQrModal: true,
        },
      })
    )
  }
  
  return connectors
}

export const config = createConfig({
  autoConnect: true,
  connectors: getConnectors(),
  publicClient,
  webSocketPublicClient,
})
