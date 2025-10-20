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
  SBTRegistry: '0xFb1D71967EeDFDa27EF2038f6b8CcB35286Dc791',
  DataMarketplace: '0x0000000000000000000000000000000000000000',
  DynamicSBTAgent: '0xD395aD6F33Ac2cDE368429f3A3DeC3FC3B70C099',
}

// Polygon 地址
export const POLYGON_ADDRESSES: ContractAddresses = {
  CrediNetCore: '0x0000000000000000000000000000000000000000',
  CRNToken: '0x0000000000000000000000000000000000000000',
  SBTRegistry: '0x0000000000000000000000000000000000000000',
  DataMarketplace: '0x0000000000000000000000000000000000000000',
  DynamicSBTAgent: '0x0000000000000000000000000000000000000000',
}

// Hardhat 本地网络地址
export const LOCALHOST_ADDRESSES: ContractAddresses = {
  CrediNetCore: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // DynamicSBTAgent
  CRNToken: '0x0000000000000000000000000000000000000000',
  SBTRegistry: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512', // CrediNetSBT
  DataMarketplace: '0x0000000000000000000000000000000000000000',
  DynamicSBTAgent: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
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
    case 31337: // Hardhat 本地网络
      return LOCALHOST_ADDRESSES
    case 1337: // Hardhat 本地网络（备用）
      return LOCALHOST_ADDRESSES
    default:
      return LOCALHOST_ADDRESSES // 默认使用本地地址方便开发
  }
}

