# 🧪 ZKredential 测试指南

## 合约测试

### 运行测试

```bash
cd packages/zk-contracts
pnpm test
# 或
npx hardhat test
```

**测试内容**:
- ✅ 合约部署
- ✅ 三个平台证明生成（PropertyFy, RealT, RealestateIO）
- ✅ 本地 snarkjs 验证
- ✅ 链上验证
- ✅ 多平台隔离

---

## 端到端测试

### 前置条件

1. ZK 服务器运行在 8080 端口
2. 前端运行在 3000 端口
3. MetaMask 连接到 Sepolia

### 测试 PropertyFy 平台

1. **生成证明**: http://localhost:3000/proof-generation
   - 选择 PropertyFy
   - 完成 KYC + 资产验证
   - 生成证明
   - ✅ 12 个公共信号

2. **链上注册**: http://localhost:3000/rwa-platform/register
   - 上传证明
   - 注册到链上
   - ✅ 交易成功

### 测试 RealT 平台

重复上述流程，选择 RealT:
- 验证模块: KYC + AML
- ✅ 12 个公共信号（不同字段）

### 测试 RealestateIO 平台

重复流程，选择 RealestateIO:
- 验证模块: KYC + 资产 + AML
- ✅ 16 个公共信号

---

## ✅ 成功标志

- 证明生成: 0.5-2 秒
- 公共信号数量正确
- 链下验证通过
- 链上注册成功
- 可在 Etherscan 查看交易


