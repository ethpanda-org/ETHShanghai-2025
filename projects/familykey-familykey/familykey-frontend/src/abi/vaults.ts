// Vault合约ABI和配置
export const VAULT_ABI = [
  { type: 'receive', stateMutability: 'payable' },
  {
    type: 'function',
    name: 'APY',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'user', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'calculateRewards',
    inputs: [{ name: 'user', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'deposit',
    inputs: [],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'deposits',
    inputs: [{ name: '', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTVL',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'name',
    inputs: [],
    outputs: [{ name: '', type: 'string', internalType: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [{ name: 'amount', type: 'uint256', internalType: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      { name: 'user', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Withdrawn',
    inputs: [
      { name: 'user', type: 'address', indexed: true, internalType: 'address' },
      { name: 'principal', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'rewards', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
    anonymous: false,
  },
] as const;

// Vault合约地址配置 (TODO: 部署后填入真实地址)
export const VAULT_ADDRESSES = {
  lido: '0xc9e483C757A65a4Ac2Ac647AcA8833eBf898bC5E' as `0x${string}`, // TODO: 填入LidoVault地址
  aave: '0x5098958B177C5c1B0843D990A9C85a1538eaC19D' as `0x${string}`, // TODO: 填入AaveVault地址
  morpho: '0x79C9536C42F3Cbafe8A8beb3a03C9f758f0E1ce3' as `0x${string}`, // TODO: 填入MorphoVault地址
};

// DeFi协议配置
export type VaultProtocol = 'lido' | 'aave' | 'morpho';

export interface VaultConfig {
  id: VaultProtocol;
  name: string;
  symbol: string;
  description: string;
  apy: number;
  risk: 'low' | 'medium' | 'high';
  riskLevel: number; // 1-5
  logo: string;
  color: string;
  features: string[];
  address: `0x${string}`;
}

export const VAULT_CONFIGS: Record<VaultProtocol, VaultConfig> = {
  lido: {
    id: 'lido',
    name: 'Lido Staking',
    symbol: 'stETH',
    description: 'Stake ETH and earn stable staking rewards with Lido liquid staking protocol',
    apy: 4.5,
    risk: 'low',
    riskLevel: 1,
    logo: '🛡️',
    color: '#00A3FF',
    features: ['Liquid Staking', 'No Lock-up', 'Stable Yields'],
    address: VAULT_ADDRESSES.lido,
  },
  aave: {
    id: 'aave',
    name: 'Aave Lending',
    symbol: 'aETH',
    description: 'Supply ETH to Aave lending protocol and earn interest from borrowers',
    apy: 7.5,
    risk: 'medium',
    riskLevel: 3,
    logo: '⚖️',
    color: '#c04fcdff',
    features: ['Auto-compound', 'High Liquidity', 'Battle-tested'],
    address: VAULT_ADDRESSES.aave,
  },
  morpho: {
    id: 'morpho',
    name: 'MakerDAO Staking',
    symbol: 'moETH',
    description: 'Stake with MakerDAO strategies to earn stable returns',
    apy: 12.0,
    risk: 'high',
    riskLevel: 4,
    logo: '🚀',
    color: '#00D395',
    features: ['Max Yields', 'Early Bird Bonus', 'Auto-compound'],
    address: VAULT_ADDRESSES.morpho,
  },
};
