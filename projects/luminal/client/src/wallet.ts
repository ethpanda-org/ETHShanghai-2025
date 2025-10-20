import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim();
const rpcUrl = import.meta.env.VITE_PUBLIC_RPC_URL?.trim();
const targetChain = import.meta.env.VITE_CHAIN?.trim().toLowerCase();
const disableWalletConnect =
  import.meta.env.VITE_DISABLE_WALLETCONNECT?.trim().toLowerCase() === "true";

const anvilRpcUrl = rpcUrl ?? "http://127.0.0.1:8545";

const anvil = defineChain({
  id: 31337,
  name: "Anvil",
  network: "anvil",
  nativeCurrency: {
    name: "Anvil ETH",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    default: { http: [anvilRpcUrl] },
    public: { http: [anvilRpcUrl] }
  }
});

const useAnvil = targetChain === "anvil" || targetChain === "31337";

const resolvedChains = (useAnvil ? [anvil] : [sepolia]) as const;

const transports = resolvedChains.reduce(
  (map, chain) => {
    const url = rpcUrl ?? chain.rpcUrls.default.http[0];
    map[chain.id] = http(url);
    return map;
  },
  {} as Record<number, ReturnType<typeof http>>
);

const shouldUseWalletConnect = Boolean(projectId) && !disableWalletConnect;

export const wagmiConfig = shouldUseWalletConnect
  ? getDefaultConfig({
      appName: "Luminial AMM",
      projectId: projectId!,
      chains: resolvedChains,
      ssr: false,
      transports
    })
  : createConfig({
      connectors: [
        injected({
          shimDisconnect: true
        })
      ],
      chains: resolvedChains,
      ssr: false,
      transports,
      multiInjectedProviderDiscovery: true
    });

if (!shouldUseWalletConnect && !projectId) {
  // eslint-disable-next-line no-console
  console.info(
    "WalletConnect project id not provided. Falling back to injected wallets only."
  );
}

export const chains = resolvedChains;
