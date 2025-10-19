export interface ContractAddresses {
  AquaFluxCore: `0x${string}`
  TokenFactory: `0x${string}`
}

// BSC测试网和主网的合约地址
export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  // BSC Testnet (chainId: 97)
  688688: {
    AquaFluxCore: '0x74b2a1E79516275134E4bfA367B773288106526b',
    TokenFactory: '0x208E8A6eA4589118348aBBF504A18D81b3916aB2'
  },
  // BSC Mainnet (chainId: 56) - 如果需要的话
  // 56: {
  //   AquaFluxCore: '0x...',
  //   TokenFactory: '0x...'
  // }
}

// 获取当前网络的合约地址
export function getContractAddresses(chainId: number): ContractAddresses | null {
  return CONTRACT_ADDRESSES[chainId] || null
}