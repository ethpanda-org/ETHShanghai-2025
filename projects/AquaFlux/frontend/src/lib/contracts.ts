export interface ContractAddresses {
  AquaFluxCore: `0x${string}`
  TokenFactory: `0x${string}`
}

// Celo Alfajores网络的合约地址
export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  // Celo Alfajores Testnet
  97: {
    AquaFluxCore: '0xcA40C9c462942f3b704f5D69f2003760001b6eC3',
    TokenFactory: '0xAEb421dC51A5d1BC6dB2B98fB32016BF430E5FE8'
  },
}

// 获取当前网络的合约地址
export function getContractAddresses(chainId: number): ContractAddresses | null {
  return CONTRACT_ADDRESSES[chainId] || null
}