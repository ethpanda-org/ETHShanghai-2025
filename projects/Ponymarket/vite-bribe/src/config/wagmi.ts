import { createConfig, http } from 'wagmi';
import { hardhatLocal, hashkeyTestnet, sepolia } from './chains';
import type { Chain } from 'viem';

// Select chain based on environment variable
const network = import.meta.env.VITE_NETWORK || 'localhost';

const getChains = (): readonly [Chain, ...Chain[]] => {
  switch (network) {
    case 'sepolia':
      return [sepolia];
    case 'hashkey':
      return [hashkeyTestnet];
    case 'localhost':
    default:
      return [hardhatLocal];
  }
};

// Configure transports for each chain
const getTransports = () => {
  switch (network) {
    case 'sepolia':
      return {
        [sepolia.id]: http(), // Uses sepolia's default RPC from viem/chains
      };
    case 'hashkey':
      return {
        [hashkeyTestnet.id]: http(),
      };
    case 'localhost':
    default:
      return {
        [hardhatLocal.id]: http(),
      };
  }
};

export const config = createConfig({
  chains: getChains(),
  transports: getTransports(),
  ssr: false,
});
