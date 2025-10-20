// Contract addresses configuration
// Update these after deploying contracts

export const CONTRACT_ADDRESSES = {
  // Testnet addresses (Sepolia) - ✅ 已部署 (2025-10-19) - 多平台系统
  sepolia: {
    verifiers: {
      propertyfy: "0xe0c16bDE095DD8C2794881b4a7261e2C0Fc9d2dc",  // PropertyFyVerifier (12信号)
      realt: "0x71dE2f8cD0b5483DAB7dc7064e82156DFd966257",       // RealTVerifier (12信号)
      realestate: "0xaa276B0729fEAa83530e5CC1Cd387B634A6c45d6", // RealestateVerifier (16信号)
    },
    registry: "0x2dF31b4814dff5c99084FD93580FE90011EE92b2",         // ZKRWARegistryMultiPlatform
    complianceModule: "0x4512387c0381c59D0097574bAAd7BF67A8Cc7B81", // ZKComplianceModule (即插即用)
    // 向后兼容
    verifier: "0xe0c16bDE095DD8C2794881b4a7261e2C0Fc9d2dc",      // 默认 PropertyFyVerifier
    compliance: "0x4512387c0381c59D0097574bAAd7BF67A8Cc7B81",   // ZKComplianceModule
    rwaFactory: "0x0669240e9ec3D995144CD7cEc711EAFC09F8f66a",   // ZKRWAAssetFactory (保留)
    sampleAsset: "0x0000000000000000000000000000000000000000",  // Sample RWA Token (TBD)
  },
  // Mainnet addresses (Polygon)
  polygon: {
    verifier: "0x0000000000000000000000000000000000000000", // Update after deployment
    registry: "0x0000000000000000000000000000000000000000", // Update after deployment
    compliance: "0x0000000000000000000000000000000000000000", // Update after deployment
    rwaFactory: "0x0000000000000000000000000000000000000000", // Update after deployment
    sampleAsset: "0x0000000000000000000000000000000000000000", // Update after deployment
  },
  // Local development (多平台系统) - ✅ 已部署
  localhost: {
    verifiers: {
      propertyfy: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",  // PropertyFyVerifier (12信号)
      realt: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",       // RealTVerifier (12信号)
      realestate: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9", // RealestateVerifier (16信号)
    },
    registry: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",     // ZKRWARegistryMultiPlatform
    complianceModule: "0x0165878A594ca255338adfa4d48449f69242Eb8F", // ZKComplianceModule (即插即用)
    // 向后兼容
    verifier: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",    // 默认使用 PropertyFyVerifier
    compliance: "0x0165878A594ca255338adfa4d48449f69242Eb8F",  // ZKComplianceModule
    rwaFactory: "0x0000000000000000000000000000000000000000",  // 待部署
    sampleAsset: "0x0000000000000000000000000000000000000000", // 待部署
  },
}

// Get contract addresses for current network
export function getContractAddresses(chainId: number) {
  switch (chainId) {
    case 11155111: // Sepolia
      return CONTRACT_ADDRESSES.sepolia
    case 137: // Polygon Mainnet
      return CONTRACT_ADDRESSES.polygon
    case 31337: // Localhost
    case 1337:
      return CONTRACT_ADDRESSES.localhost
    default:
      return CONTRACT_ADDRESSES.localhost
  }
}