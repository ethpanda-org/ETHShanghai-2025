// 🔧 RWA合约ABI配置文件
// ✅ 已更新为真实的合约ABI

// 导入真实的ABI文件
import ZKRWATokenERC3643ABI from './abis/ZKRWATokenERC3643.json'
import ZKRWAAssetFactoryABI from './abis/ZKRWAAssetFactory.json'
import ZKToERC3643AdapterABI from './abis/ZKToERC3643Adapter.json'

// 使用真实的ABI
export const ZKRWA_TOKEN_ABI = ZKRWATokenERC3643ABI;
export const ZKRWA_ASSET_FACTORY_ABI = ZKRWAAssetFactoryABI;
export const ZKRWA_ADAPTER_ABI = ZKToERC3643AdapterABI;

// 导入统一的地址配置
import { getContractAddresses } from './addresses'

// 获取当前网络的RWA合约地址
export function getRWAContractAddresses(chainId: number) {
  const addresses = getContractAddresses(chainId)
  return {
    assetFactory: addresses.rwaFactory,
    adapter: addresses.compliance,
    registry: addresses.registry,
    verifier: addresses.verifier,
    // 示例资产地址，实际使用时从工厂合约获取
    sampleAssets: {
      realEstate: addresses.sampleAsset || "0x0000000000000000000000000000000000000000",
    }
  }
}



// ABI导出便于使用
export const RWA_ABIS = {
  token: ZKRWA_TOKEN_ABI,
  factory: ZKRWA_ASSET_FACTORY_ABI,
  adapter: ZKRWA_ADAPTER_ABI
} as const;
