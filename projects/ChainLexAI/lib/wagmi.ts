import { createConfig } from "wagmi";
import { baseSepolia, polygonAmoy, sepolia } from "wagmi/chains";
import { InjectedConnector } from "wagmi/connectors/injected";
import { createPublicClient, http } from "viem";

const chains = [sepolia, baseSepolia, polygonAmoy];

export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors: [
    new InjectedConnector({
      chains,
      options: { shimDisconnect: true },
    }),
  ],
  publicClient: ({ chainId }) => {
    const chain = chains.find((candidate) => candidate.id === (chainId ?? sepolia.id)) ?? sepolia;
    return createPublicClient({
      chain,
      transport: http(),
    }) as any;
  },
});
