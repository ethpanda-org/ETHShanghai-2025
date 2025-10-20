"use client";

import { RainbowKitProvider, darkTheme, getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, http } from "wagmi";
import { baseSepolia, polygonAmoy, sepolia } from "wagmi/chains";
import { useMemo } from "react";

const queryClient = new QueryClient();

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo";

const config = getDefaultConfig({
  appName: "NOMOS",
  projectId,
  chains: [baseSepolia, polygonAmoy, sepolia],
  transports: {
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA),
    [polygonAmoy.id]: http(process.env.NEXT_PUBLIC_RPC_POLYGON_AMOY),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_SEPOLIA),
  },
  ssr: false, // 关键：禁用 SSR，避免 indexedDB/MetaMask SDK 在服务端执行
});

export default function Web3Provider({ children }: { children: React.ReactNode }) {
  const theme = useMemo(() => darkTheme(), []);
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={theme}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
