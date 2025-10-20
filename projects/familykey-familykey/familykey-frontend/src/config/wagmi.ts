import { createConfig, http } from 'wagmi';
import { baseSepolia } from 'viem/chains';
import { QueryClient } from '@tanstack/react-query';
import { reconnect } from 'wagmi/actions';
import { injected } from 'wagmi/connectors';

export const queryClient = new QueryClient();

// Create wagmi config with minimal connectors to avoid conflicts with Privy
export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  transports: { [baseSepolia.id]: http(import.meta.env.VITE_RPC_URL) },
  connectors: [injected({ shimDisconnect: true })],
  ssr: false,
});

// Only reconnect when we're not using Privy
const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;
const privyEnabled = !!privyAppId && privyAppId !== 'demo-app-id';

if (!privyEnabled) {
  reconnect(wagmiConfig);
}
