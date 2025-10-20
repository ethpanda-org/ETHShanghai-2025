# 智能合约

## 📦 合约列表

### 核心合约（推荐使用）

| 合约 | 文件 | 用途 |
|------|------|------|
| **ZKRWARegistryMultiPlatform** | ZKRWARegistryMultiPlatform.sol | 多平台身份注册中心 |
| **ZKComplianceModule** | adapters/ZKComplianceModule.sol | ERC-3643 即插即用合规模块 |
| **PropertyFyVerifier** | verifiers/PropertyFyVerifier.sol | PropertyFy 平台验证器（12信号） |
| **RealTVerifier** | verifiers/RealTVerifier.sol | RealT 平台验证器（12信号） |
| **RealestateVerifier** | verifiers/RealestateVerifier.sol | RealestateIO 平台验证器（16信号） |

### 可选合约

| 合约 | 文件 | 用途 |
|------|------|------|
| ComplianceGateway | ComplianceGateway.sol | 一步式验证执行（可选方案） |

### 保留合约（向后兼容）

| 合约 | 文件 | 用途 |
|------|------|------|
| ZKRWARegistry | ZKRWARegistry.sol | 单平台版本（旧） |
| CompositeProofVerifier | CompositeProofVerifier.sol | 通用验证器（旧） |
| ZKToERC3643Adapter | adapters/ZKToERC3643Adapte.sol | 简化版适配器（旧） |

---

## 🚀 部署

### 部署到 Sepolia

```bash
npx hardhat run scripts/deploy-multi-platform-system.ts --network sepolia
```

### 部署到本地

```bash
# 终端 1: 启动本地网络
npx hardhat node

# 终端 2: 部署
npx hardhat run scripts/deploy-multi-platform-system.ts --network localhost
```

---

## 🧪 测试

```bash
npx hardhat test
```

**主要测试**:
- `test/ZKRWARegistry.multi-platform.test.ts` - 多平台测试

---

## 📍 已部署地址（Sepolia）

- ZKRWARegistryMultiPlatform: `0x2dF31b4814dff5c99084FD93580FE90011EE92b2`
- PropertyFyVerifier: `0xe0c16bDE095DD8C2794881b4a7261e2C0Fc9d2dc`
- RealTVerifier: `0x71dE2f8cD0b5483DAB7dc7064e82156DFd966257`
- RealestateVerifier: `0xaa276B0729fEAa83530e5CC1Cd387B634A6c45d6`
- ZKComplianceModule: `0x4512387c0381c59D0097574bAAd7BF67A8Cc7B81`

详见: `deployments/multi-platform-sepolia-*.json`

---

## 📚 更多信息

查看主文档: [../README.md](../README.md)
