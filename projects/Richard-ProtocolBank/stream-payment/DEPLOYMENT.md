# Stream Payment 部署指南

## 智能合约部署

### 前置要求

1. **安装依赖**
```bash
pnpm install
```

2. **配置环境变量**

创建 `.env` 文件并添加以下配置:

```env
# Sepolia测试网RPC URL
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# 部署账户私钥 (不要提交到Git!)
PRIVATE_KEY=your_private_key_here

# Etherscan API Key (用于合约验证)
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 部署步骤

1. **编译合约**
```bash
cd /home/ubuntu/stream-payment
npx hardhat compile
```

2. **部署到Sepolia测试网**
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

3. **记录合约地址**

部署成功后,记录输出的合约地址,例如:
```
StreamPayment deployed to: 0x1234567890123456789012345678901234567890
```

4. **更新前端配置**

在 `.env` 文件中添加:
```env
VITE_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

5. **验证合约 (可选)**
```bash
npx hardhat verify --network sepolia CONTRACT_ADDRESS
```

## 前端部署

### 本地开发

```bash
pnpm dev
```

访问 http://localhost:3000

### 生产构建

```bash
pnpm build
pnpm start
```

## 测试网水龙头

获取Sepolia测试网ETH:
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia

## 使用说明

### 1. 连接钱包

点击右上角 "Connect Wallet" 按钮,连接MetaMask钱包到Sepolia测试网。

### 2. 注册为供应商

```javascript
// 调用智能合约的registerSupplier函数
await contract.registerSupplier(
  "供应商名称",
  "品牌名称", 
  "类别",
  1500  // 利润率 (15% = 1500)
);
```

### 3. 创建支付

```javascript
// 向供应商支付
await contract.createPayment(
  "0x供应商地址",
  "类别",
  { value: ethers.parseEther("1.0") }  // 支付1 ETH
);
```

### 4. 查看可视化

支付完成后,刷新页面即可在可视化图表中看到:
- 主钱包到供应商的资金流向
- 供应商列表和统计数据
- 详细的支付记录表格

## 故障排除

### 合约部署失败

1. 确保钱包有足够的Sepolia ETH
2. 检查RPC URL是否正确
3. 验证私钥格式(不要包含0x前缀)

### 前端连接失败

1. 确保MetaMask已切换到Sepolia测试网
2. 检查VITE_CONTRACT_ADDRESS是否正确
3. 清除浏览器缓存并重新加载

### 交易失败

1. 检查Gas费用是否足够
2. 确认供应商地址已注册
3. 查看Etherscan上的交易详情

## 技术栈

- **智能合约**: Solidity 0.8.20
- **开发框架**: Hardhat
- **前端**: Next.js + React + TypeScript
- **Web3库**: Ethers.js + Wagmi + RainbowKit
- **可视化**: D3.js
- **数据库**: MySQL (TiDB)
- **API**: tRPC

## 安全注意事项

⚠️ **重要提醒**:

1. **永远不要**将私钥提交到Git仓库
2. **永远不要**在主网使用测试私钥
3. 使用 `.gitignore` 排除 `.env` 文件
4. 定期轮换API密钥
5. 审计智能合约代码后再部署到主网

## 链接

- Sepolia Etherscan: https://sepolia.etherscan.io
- 项目GitHub: https://github.com/protocolbank/stream-payment
- 文档: https://github.com/protocolbank/stream-payment/blob/main/README.md

