export interface ContractAddresses {
  AquaFluxCore: `0x${string}`
  TokenFactory: `0x${string}`
}

// 各网络的合约地址
export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  // Pharos Testnet (chainId: 688688)
  688688: {
    AquaFluxCore: '0x74b2a1E79516275134E4bfA367B773288106526b',
    TokenFactory: '0x208E8A6eA4589118348aBBF504A18D81b3916aB2'
  },
  // Sepolia Testnet (chainId: 11155111) - 需要部署合约后更新地址
  // 11155111: {
  //   AquaFluxCore: '0x...',
  //   TokenFactory: '0x...'
  // },
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