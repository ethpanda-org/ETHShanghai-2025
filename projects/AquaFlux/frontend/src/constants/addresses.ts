import { SEPOLIA_CHAIN_ID } from './tokens'

type ChainAddresses = {
  [chainId: number]: string
}

// 为主要链ID创建相同地址的映射
export const constructSameAddressMap = (address: string): ChainAddresses => {
  return {
    [SEPOLIA_CHAIN_ID]: address, // Sepolia testnet
  }
}

// Uniswap V3 核心合约地址 (Sepolia)
export const V3_CORE_FACTORY_ADDRESSES: ChainAddresses = {
  [SEPOLIA_CHAIN_ID]: '0x0227628f3F023bb0B980b67D528571c95c6DaC1c', // Sepolia工厂地址
}

// Quoter合约地址 - 用于获取交换报价
export const QUOTER_ADDRESSES: ChainAddresses = {
  [SEPOLIA_CHAIN_ID]: '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3', // Sepolia Quoter地址
}

// NFT仓位管理器地址
export const NONFUNGIBLE_POSITION_MANAGER_ADDRESSES: ChainAddresses = {
  [SEPOLIA_CHAIN_ID]: '0x1238536071E1c677A632429e3655c799b22cDA52', // Sepolia NFT管理器
}

// SwapRouter地址
export const SWAP_ROUTER_ADDRESSES: ChainAddresses = {
  [SEPOLIA_CHAIN_ID]: '0x65669fE35312947050C450Bd5d36e6361F85eC12', // Sepolia SwapRouter
}

// Multicall2合约地址
export const MULTICALL2_ADDRESSES: ChainAddresses = {
  [SEPOLIA_CHAIN_ID]: '0xcA11bde05977b3631167028862bE2a173976CA11',
}

// V2 Router地址
export const V2_ROUTER_ADDRESS: ChainAddresses = {
  [SEPOLIA_CHAIN_ID]: '0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3',
}

// V3 Migrator地址
export const V3_MIGRATOR_ADDRESSES: ChainAddresses = {
  [SEPOLIA_CHAIN_ID]: '0x729004182cF005CEC8Bd85df140094b6aCbe8b15', // Sepolia迁移器
}

// 获取指定链的合约地址
export function getQuoterAddress(chainId: number): string | undefined {
  return QUOTER_ADDRESSES[chainId]
}

export function getSwapRouterAddress(chainId: number): string | undefined {
  return SWAP_ROUTER_ADDRESSES[chainId]
}

export function getV3CoreFactoryAddress(chainId: number): string | undefined {
  return V3_CORE_FACTORY_ADDRESSES[chainId]
}

export function getNonfungiblePositionManagerAddress(chainId: number): string | undefined {
  return NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId]
}