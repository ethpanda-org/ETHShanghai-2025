// 智能合约地址配置
// 根据不同的链 ID 配置不同的合约地址

export interface ContractAddresses {
  CrediNetCore: string
  CRNToken: string
  SBTRegistry: string
  DataMarketplace: string
  DynamicSBTAgent: string
}

// 主网地址
export const MAINNET_ADDRESSES: ContractAddresses = {
  CrediNetCore: '0x0000000000000000000000000000000000000000', // TODO: 替换为实际部署的合约地址
  CRNToken: '0x0000000000000000000000000000000000000000',
  SBTRegistry: '0x0000000000000000000000000000000000000000',
  DataMarketplace: '0x0000000000000000000000000000000000000000',
  DynamicSBTAgent: '0x0000000000000000000000000000000000000000',
}

// Sepolia 测试网地址
export const SEPOLIA_ADDRESSES: ContractAddresses = {
  CrediNetCore: '0x7CE2fbEfDF5dc7E43477816bfD2e89d5b26Cff38', // 使用 DynamicSBTAgent 作为核心评分合约
  CRNToken: '0x0000000000000000000000000000000000000000',
  SBTRegistry: '0xec261261c83B76549181909ec09995e56Ca549E7',
  DataMarketplace: '0x0000000000000000000000000000000000000000',
  DynamicSBTAgent: '0x7CE2fbEfDF5dc7E43477816bfD2e89d5b26Cff38',
}

// Polygon 地址
export const POLYGON_ADDRESSES: ContractAddresses = {
  CrediNetCore: '0x0000000000000000000000000000000000000000',
  CRNToken: '0x0000000000000000000000000000000000000000',
  SBTRegistry: '0x0000000000000000000000000000000000000000',
  DataMarketplace: '0x0000000000000000000000000000000000000000',
  DynamicSBTAgent: '0x0000000000000000000000000000000000000000',
}

// 根据链 ID 获取合约地址
export const getContractAddresses = (chainId: number): ContractAddresses => {
  switch (chainId) {
    case 1: // Mainnet
      return MAINNET_ADDRESSES
    case 11155111: // Sepolia
      return SEPOLIA_ADDRESSES
    case 137: // Polygon
      return POLYGON_ADDRESSES
    case 80001: // Polygon Mumbai
      return SEPOLIA_ADDRESSES // 使用测试网地址
    default:
      return SEPOLIA_ADDRESSES // 默认使用测试网地址
  }
}

