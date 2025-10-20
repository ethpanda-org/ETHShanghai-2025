# CrediNet SBT 部署指南

本文档说明如何部署支持 EIP-712 许可式铸造的 CrediNetSBT 合约。

## 📋 前置准备

### 1. 签名者钱包信息

已生成的签名者钱包（用于后端签名服务）:
```
地址: 0xbF5C376e1e43b2569c4fA1087160C34070100aCC
私钥: 0x5efaee9d7c9ef893c61f234bae0685981c57cf5713d45f59292384609e09bbee
```

⚠️ **重要**: 请妥善保管私钥，不要泄露给任何人！

### 2. 部署账户

```
地址: 0x5bc566271Aef07bae2aF6ce0FC7FFa50066BBbb5
私钥: 0x18ee1df5159bcba91b1f731d5c36017417155aec14d2cbf66812f49162b69df3
```

## 🚀 部署步骤

### 方案 A: 使用自己的 RPC 节点（推荐）

1. 获取一个稳定的 RPC URL（如 Infura、Alchemy、QuickNode）

2. 更新 `contracts/.env`:
```bash
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
# 或
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

3. 确保部署账户有足够的 Sepolia ETH:
   - 访问 [Sepolia Faucet](https://sepoliafaucet.com/)
   - 或 [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)

4. 部署合约:
```bash
cd contracts
npx hardhat run scripts/deploy-sbt-with-permit.js --network sepolia
```

### 方案 B: 本地测试网（快速测试）

1. 启动本地 Hardhat 网络:
```bash
cd contracts
npx hardhat node
```

2. 在新终端部署:
```bash
npx hardhat run scripts/deploy-sbt-with-permit.js --network localhost
```

## 📝 部署后配置

部署成功后，您将看到类似输出:

```
========================================
🎉 部署完成！
========================================
📋 部署信息:
   DynamicSBTAgent: 0x1234...
   CrediNetSBT: 0x5678...
   Signer Address: 0xbF5C376e1e43b2569c4fA1087160C34070100aCC
```

### 1. 配置后端环境变量

创建或更新 `backend/.env`:

```bash
# SBT 合约配置
SBT_CONTRACT_ADDRESS=0x5678...  # 从部署输出复制
SBT_CONTRACT_NAME=CrediNet SBT
CHAIN_ID=11155111  # Sepolia

# 签名者私钥
SIGNER_PRIVATE_KEY=0x5efaee9d7c9ef893c61f234bae0685981c57cf5713d45f59292384609e09bbee

# RPC 配置
RPC_URL=https://rpc.sepolia.org  # 或您的 RPC URL
```

### 2. 配置前端合约地址

更新 `frontend/src/contracts/addresses.ts`:

```typescript
export const getContractAddresses = (chainId: number) => {
  const addresses = {
    11155111: {  // Sepolia
      SBTRegistry: '0x5678...',  // 从部署输出复制
      DynamicSBTAgent: '0x1234...',  // 从部署输出复制
    },
  }
  // ...
}
```

### 3. 更新 ABI（如果合约有变化）

```bash
# 复制编译后的 ABI
cp contracts/artifacts/contracts/CrediNetSBT.sol/CrediNetSBT.json frontend/src/contracts/abis/
```

## 🧪 测试

### 1. 测试后端签名服务

```bash
cd backend
cargo run  # 或您的启动命令

# 测试签名 API
curl -X POST http://localhost:8080/sbt/mint_permit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "badge_type": 1,
    "token_uri": "",
    "request_hash": "0x0000000000000000000000000000000000000000000000000000000000000000"
  }'
```

预期响应:
```json
{
  "success": true,
  "issuer": "0xbF5C376e1e43b2569c4fA1087160C34070100aCC",
  "to": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "badge_type": 1,
  "token_uri": "",
  "request_hash": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "deadline": "1234567890",
  "signature": "0x...",
  "message": "签名生成成功"
}
```

### 2. 测试前端铸造功能

1. 启动前端:
```bash
cd frontend
npm run dev
```

2. 访问 http://localhost:3000/mint-sbt

3. 连接钱包（使用没有 MINTER_ROLE 的钱包）

4. 点击"铸造 SBT"

5. 观察控制台输出：
   - ✅ "🔐 正在从后端获取签名..."
   - ✅ "✅ 签名获取成功"
   - ✅ "✅ SBT 铸造完成"

## ⚙️ 权限说明

### 合约部署时自动配置的权限:

1. **DEFAULT_ADMIN_ROLE** (部署者)
   - 地址: 0x5bc566271Aef07bae2aF6ce0FC7FFa50066BBbb5
   - 权限: 管理所有角色

2. **MINTER_ROLE** (签名者)
   - 地址: 0xbF5C376e1e43b2569c4fA1087160C34070100aCC
   - 权限: 签名授权铸造 SBT

3. **UPDATER_ROLE** (SBT合约)
   - 地址: (CrediNetSBT 合约地址)
   - 权限: 更新 DynamicSBTAgent 中的用户评分

### 如需手动授予 MINTER_ROLE:

```bash
npx hardhat console --network sepolia

# 在控制台中:
const sbt = await ethers.getContractAt("CrediNetSBT", "0x5678...")
const MINTER_ROLE = await sbt.MINTER_ROLE()
await sbt.grantRole(MINTER_ROLE, "0xbF5C376e1e43b2569c4fA1087160C34070100aCC")
```

## 🔧 故障排除

### 问题 1: RPC 超时或请求过多

**解决方案**:
- 使用付费的 RPC 服务（Infura、Alchemy）
- 或使用本地 Hardhat 网络进行测试

### 问题 2: 后端签名验证失败

**检查清单**:
- ✅ SIGNER_PRIVATE_KEY 配置正确
- ✅ SBT_CONTRACT_ADDRESS 与部署的合约地址一致
- ✅ SBT_CONTRACT_NAME 为 "CrediNet SBT"（与合约构造函数一致）
- ✅ CHAIN_ID 正确（Sepolia = 11155111）

### 问题 3: 前端铸造失败 "invalid signature"

**可能原因**:
- EIP-712 域信息不匹配
- 签名者没有 MINTER_ROLE
- 签名已过期（超过1小时）

**调试方法**:
```javascript
// 在浏览器控制台
console.log('合约地址:', await sbt.getAddress())
console.log('EIP-712 域:', await sbt.eip712Domain())
console.log('签名者是否有 MINTER_ROLE:', await sbt.hasRole(MINTER_ROLE, '0xbF5C...'))
```

## 📚 相关文档

- [EIP-712 规范](https://eips.ethereum.org/EIPS/eip-712)
- [Hardhat 文档](https://hardhat.org/docs)
- [OpenZeppelin AccessControl](https://docs.openzeppelin.com/contracts/4.x/access-control)

## 🎉 完成！

如果一切配置正确，您的 SBT 铸造功能应该可以正常工作了！

用户无需拥有 MINTER_ROLE，后端会自动为他们生成授权签名，大大简化了铸造流程。
