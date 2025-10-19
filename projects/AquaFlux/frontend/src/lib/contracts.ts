export interface ContractAddresses {
  AquaFluxCore: `0x${string}`
  TokenFactory: `0x${string}`
}

// 各网络的合约地址
export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  11155111: {
    AquaFluxCore: '0x4709b7DA7af7Dd5043930B5Dce19D2ffA815F837',
    TokenFactory: '0x60E31ED1C76bE2C69B6C4f1F22927A986fF24108'
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