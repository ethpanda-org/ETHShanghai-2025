# 📦 ZKredential 部署指南

## 🌐 已部署的合约（Sepolia 测试网）

**项目**: ZKredential  
**网络**: Sepolia 测试网 (Chain ID: 11155111)  
**GitHub**: https://github.com/janebirkey/ZKredential

### 验证器合约

| 平台 | 合约地址 | 公共信号 |
|------|---------|---------|
| PropertyFy | `0xe0c16bDE095DD8C2794881b4a7261e2C0Fc9d2dc` | 12 |
| RealT | `0x71dE2f8cD0b5483DAB7dc7064e82156DFd966257` | 12 |
| RealestateIO | `0xaa276B0729fEAa83530e5CC1Cd387B634A6c45d6` | 16 |

### 核心合约

| 合约 | 地址 |
|------|------|
| ZKRWARegistryMultiPlatform | `0x2dF31b4814dff5c99084FD93580FE90011EE92b2` |
| ZKComplianceModule | `0x4512387c0381c59D0097574bAAd7BF67A8Cc7B81` |

---

## 🚀 部署到新网络

### 步骤 1: 配置环境变量

创建 `packages/zk-contracts/.env`:
```env
SEPOLIA_RPC_URL=https://sepolia.gateway.tenderly.co
SEPOLIA_PRIVATE_KEY=your_private_key_here
```

### 步骤 2: 运行部署脚本

```bash
cd packages/zk-contracts
npx hardhat run scripts/deploy-multi-platform-system.ts --network sepolia
```

### 步骤 3: 更新前端配置

复制输出的地址到 `lib/contracts/addresses.ts`

---

## ✅ 验证部署

访问 Etherscan:
- PropertyFyVerifier: https://sepolia.etherscan.io/address/0xe0c16bDE095DD8C2794881b4a7261e2C0Fc9d2dc
- ZKRWARegistry: https://sepolia.etherscan.io/address/0x2dF31b4814dff5c99084FD93580FE90011EE92b2

---

## 📝 部署信息

详细信息保存在:
```
packages/zk-contracts/deployments/multi-platform-sepolia-[timestamp].json
```
