import { localhost } from 'wagmi/chains'

// Anvil Local Chain Configuration - 与旧前端保持一致
export const anvil = {
  ...localhost,
  id: 31337,
  name: 'Anvil Local',
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
} as const

// Contract addresses - 使用与apps-stage1相同的结构
export const CONTRACTS = {
  [anvil.id]: {
    focusBond: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9' as `0x${string}`,
    usdc: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as `0x${string}`,
    focus: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as `0x${string}`,
    weth: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as `0x${string}`,
    focusVault: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9' as `0x${string}`,
  },
} as const

// Helper function to get contracts for current chain
export function getContracts(chainId: number) {
  return CONTRACTS[chainId as keyof typeof CONTRACTS]
}

// 打印调试信息 - 只在客户端执行
if (typeof window !== 'undefined') {
  console.log('📍 Contract Addresses:', CONTRACTS[anvil.id])
}

// FocusBond ABI
export const FOCUSBOND_ABI = [
  {
    "inputs": [{"internalType": "uint16", "name": "targetMinutes", "type": "uint16"}],
    "name": "startSession",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "maxFee", "type": "uint256"}],
    "name": "breakSession",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "completeSession",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "updateHeartbeat",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "sessions",
    "outputs": [
      {"internalType": "uint64", "name": "startTs", "type": "uint64"},
      {"internalType": "uint64", "name": "lastHeartbeatTs", "type": "uint64"},
      {"internalType": "uint96", "name": "depositWei", "type": "uint96"},
      {"internalType": "uint16", "name": "targetMinutes", "type": "uint16"},
      {"internalType": "bool", "name": "isActive", "type": "bool"},
      {"internalType": "bool", "name": "watchdogClosed", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "baseFeeUsdc",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "baseFeeFocus",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "buyFocusCredits",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
] as const

// ERC20 ABI
export const ERC20_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

