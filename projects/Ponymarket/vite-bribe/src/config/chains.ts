import { defineChain } from 'viem';
import { sepolia } from 'viem/chains';

export const hardhatLocal = defineChain({
  id: 31337,
  name: 'Hardhat',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
  },
});

export const hashkeyTestnet = defineChain({
  id: 133,
  name: 'HashKey Chain Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'HashKey Token',
    symbol: 'HSK',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.hsk.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'HashKey Chain Explorer',
      url: 'https://hashkeychain-testnet-explorer.alt.technology',
    },
  },
  testnet: true,
});

// Export Sepolia from viem/chains (built-in)
export { sepolia };
