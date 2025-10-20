import StreamPaymentABI from './StreamPaymentABI.json';

export const STREAM_PAYMENT_ADDRESS = import.meta.env.VITE_STREAM_PAYMENT_CONTRACT as `0x${string}`;

export const STREAM_PAYMENT_ABI = StreamPaymentABI;

export const SEPOLIA_CHAIN_ID = 11155111;

export const SEPOLIA_CONFIG = {
  id: SEPOLIA_CHAIN_ID,
  name: 'Sepolia',
  network: 'sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://sepolia.infura.io/v3/'],
    },
    public: {
      http: ['https://sepolia.infura.io/v3/'],
    },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
  },
  testnet: true,
};

