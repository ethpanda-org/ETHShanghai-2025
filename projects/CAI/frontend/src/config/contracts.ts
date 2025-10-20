export const CONTRACT_ADDRESSES = {
  CAIRegistry:
    process.env.NEXT_PUBLIC_CAI_REGISTRY ||
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5',
  AHINAnchor:
    process.env.NEXT_PUBLIC_AHIN_ANCHOR ||
    '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318',
  ERC8004Agent:
    process.env.NEXT_PUBLIC_ERC8004_AGENT ||
    '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
} as const;

export const NETWORK_CONFIG = {
  chainId: 11155111,
  name: 'sepolia',
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.infura.io/v3/',
  explorerUrl: 'https://sepolia.etherscan.io',
} as const;

export type ContractName = keyof typeof CONTRACT_ADDRESSES;
