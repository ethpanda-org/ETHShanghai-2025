import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base } from "wagmi/chains";

// Wagmi configuration - Base chain only
export const config = getDefaultConfig({
  appName: "GoHacker",
  projectId:
    process.env.NEXT_PUBLIC_WC_PROJECT_ID || "05c3ea68819376e65dc4a8802f90f41b",
  chains: [base], // Only Base chain supported
  ssr: false, // Disable SSR init to avoid browser storage access on the server
});

export const chain = {
  id: 8453,
  name: "Base",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
};
