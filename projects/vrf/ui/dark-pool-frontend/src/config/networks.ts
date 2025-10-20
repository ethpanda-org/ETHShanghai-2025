export const NETWORKS = {
  localhost: {
    chainId: '0x7A69', // 31337 in hex
    chainName: 'Hardhat Localhost',
    rpcUrls: ['http://127.0.0.1:8545'],
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrls: null,
  },
  // Add other networks as needed
};

export const DEFAULT_NETWORK = 'localhost';

// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  localhost: {
    darkPool: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  },
};