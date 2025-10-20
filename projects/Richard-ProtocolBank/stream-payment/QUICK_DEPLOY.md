# Stream Payment 快速部署指南

## 🚀 部署智能合约到 Sepolia 测试网

### 步骤 1: 准备工作

#### 1.1 获取 Sepolia 测试网 ETH

访问以下水龙头获取免费的测试 ETH:
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://sepolia-faucet.pk910.de/

**建议**: 获取至少 0.1 ETH 用于部署和测试

#### 1.2 获取 Alchemy API Key

1. 访问 https://www.alchemy.com/
2. 注册/登录账户
3. 创建新的 App
   - Chain: Ethereum
   - Network: Sepolia
4. 复制 API Key

#### 1.3 导出钱包私钥

**⚠️ 警告**: 仅使用测试钱包,不要使用包含真实资金的钱包!

在 MetaMask 中:
1. 点击账户详情
2. 导出私钥
3. 复制私钥(不包含 0x 前缀)

### 步骤 2: 配置环境变量

在 Protocol-Bank 项目根目录创建 `.env` 文件:

```bash
# Sepolia RPC URL
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# 部署私钥 (不要包含 0x 前缀)
PRIVATE_KEY=your_private_key_here

# Etherscan API Key (可选,用于合约验证)
ETHERSCAN_API_KEY=your_etherscan_api_key

# 前端合约地址 (部署后填写)
VITE_STREAM_PAYMENT_CONTRACT=
```

### 步骤 3: 安装依赖

```bash
cd Protocol-Bank/stream-payment
npm install
```

### 步骤 4: 编译合约

```bash
npx hardhat compile
```

预期输出:
```
Compiled 1 Solidity file successfully
```

### 步骤 5: 部署合约

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

预期输出:
```
🚀 Deploying StreamPayment contract...
📝 Deploying with account: 0x...
💰 Account balance: 0.1 ETH
✅ StreamPayment deployed to: 0x1234567890123456789012345678901234567890
```

**重要**: 复制合约地址!

### 步骤 6: 更新前端配置

在 `.env` 文件中添加合约地址:

```bash
VITE_STREAM_PAYMENT_CONTRACT=0x1234567890123456789012345678901234567890
```

### 步骤 7: 重启开发服务器

```bash
cd Protocol-Bank
npm run dev
```

### 步骤 8: 测试功能

1. 打开浏览器访问 http://localhost:5173
2. 点击顶部导航的 "Visualization" 标签
3. 点击 "连接钱包" 按钮
4. 在 MetaMask 中确认连接
5. 确保切换到 Sepolia 测试网
6. 点击 "注册供应商" 测试注册功能
7. 点击 "创建支付" 测试支付功能

## 🎯 完整部署流程示例

```bash
# 1. 进入 stream-payment 目录
cd Protocol-Bank/stream-payment

# 2. 安装依赖
npm install

# 3. 编译合约
npx hardhat compile

# 4. 部署到 Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# 5. 复制输出的合约地址
# StreamPayment deployed to: 0xABCD...

# 6. 更新 .env 文件
echo "VITE_STREAM_PAYMENT_CONTRACT=0xABCD..." >> ../.env

# 7. 返回项目根目录并重启
cd ..
npm run dev
```

## 📝 验证部署

### 在 Etherscan 上查看

访问: https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS

你应该能看到:
- 合约代码
- 交易历史
- 事件日志

### 验证合约源码 (可选)

```bash
npx hardhat verify --network sepolia YOUR_CONTRACT_ADDRESS
```

## 🔧 故障排除

### 问题 1: "insufficient funds for gas"

**解决方案**: 从水龙头获取更多 Sepolia ETH

### 问题 2: "nonce too low"

**解决方案**: 在 MetaMask 中重置账户
1. 设置 > 高级 > 重置账户

### 问题 3: "network does not support ENS"

**解决方案**: 确保使用正确的 Sepolia RPC URL

### 问题 4: 合约地址未显示

**解决方案**: 
1. 检查 `.env` 文件是否正确配置
2. 重启开发服务器
3. 清除浏览器缓存

### 问题 5: MetaMask 连接失败

**解决方案**:
1. 确保 MetaMask 已安装
2. 刷新页面
3. 手动切换到 Sepolia 网络

## 📊 Gas 费用估算

| 操作 | 估算 Gas | 估算费用 (Sepolia) |
|------|---------|-------------------|
| 部署合约 | ~2,000,000 | ~0.02 ETH |
| 注册供应商 | ~100,000 | ~0.001 ETH |
| 创建支付 | ~80,000 | ~0.0008 ETH |

**注意**: Sepolia 是测试网,Gas 费用仅供参考

## 🎉 部署成功后

你现在可以:

1. ✅ 连接 MetaMask 钱包
2. ✅ 注册供应商到智能合约
3. ✅ 创建链上支付
4. ✅ 实时查看支付网络可视化
5. ✅ 追踪所有交易记录
6. ✅ 在 Etherscan 上验证交易

## 🔐 安全提示

1. **永远不要**将私钥提交到 Git
2. **永远不要**在主网使用测试私钥
3. **永远不要**分享你的 `.env` 文件
4. 使用 `.gitignore` 排除敏感文件
5. 定期轮换 API 密钥

## 📚 相关资源

- [Hardhat 文档](https://hardhat.org/docs)
- [Ethers.js 文档](https://docs.ethers.org/)
- [Sepolia Etherscan](https://sepolia.etherscan.io/)
- [Alchemy 文档](https://docs.alchemy.com/)
- [MetaMask 文档](https://docs.metamask.io/)

## 💬 需要帮助?

如果遇到问题:
1. 检查控制台错误信息
2. 查看 Hardhat 输出日志
3. 在 GitHub 提交 Issue
4. 查看项目文档

---

**祝部署顺利! 🚀**

