# Protocol Bank - 快速开始指南

本指南帮助您快速上手Protocol Bank的流支付智能合约。

## 🚀 5分钟快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/everest-an/Protocol-Bank.git
cd Protocol-Bank/contracts/ethereum
```

### 2. 安装依赖

```bash
npm install
```

### 3. 编译合约

```bash
npx hardhat compile
```

### 4. 运行测试

```bash
npx hardhat test
```

预期输出：
```
  18 passing (1s)
```

### 5. 运行集成测试

```bash
npx hardhat run scripts/test-integration.js --network hardhat
```

预期输出：
```
✅ Integration test completed successfully!
```

## 🎯 在Sepolia测试网上使用

### 步骤1: 获取测试币

访问以下任一水龙头获取Sepolia ETH：
- https://sepoliafaucet.com/
- https://www.infura.io/faucet/sepolia

### 步骤2: 配置环境

```bash
cd contracts/ethereum
cp .env.example .env
```

编辑 `.env` 文件：
```env
SEPOLIA_RPC_URL=https://rpc.sepolia.org
PRIVATE_KEY=your_private_key_here
```

### 步骤3: 检查余额

```bash
npx hardhat run scripts/check-balance.js --network sepolia
```

### 步骤4: 部署合约

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

部署完成后，您会看到合约地址：
```
Mock USDC deployed to: 0x...
Mock DAI deployed to: 0x...
StreamPayment deployed to: 0x...
```

### 步骤5: 使用流支付

#### 获取测试代币

```javascript
// 使用ethers.js
const mockUSDC = await ethers.getContractAt("MockERC20", USDC_ADDRESS);
await mockUSDC.faucet(ethers.parseUnits("1000", 6)); // 获取1000 USDC
```

#### 创建流支付

```javascript
// 1. 授权
await mockUSDC.approve(STREAM_PAYMENT_ADDRESS, amount);

// 2. 创建流支付
await streamPayment.createStream(
  recipientAddress,
  USDC_ADDRESS,
  ethers.parseUnits("1000", 6),  // 1000 USDC
  3600,                           // 1小时
  "Employee Salary"
);
```

#### 提取资金

```javascript
// 接收方提取
await streamPayment.connect(recipient).withdrawFromStream(streamId);
```

## 📚 更多资源

- **完整文档**: [README.md](contracts/ethereum/README.md)
- **部署指南**: [DEPLOYMENT_GUIDE.md](contracts/ethereum/DEPLOYMENT_GUIDE.md)
- **实现报告**: [SMART_CONTRACT_IMPLEMENTATION_REPORT.md](SMART_CONTRACT_IMPLEMENTATION_REPORT.md)
- **白皮书**: [docs/protocol_bank_complete_whitepaper.md](docs/protocol_bank_complete_whitepaper.md)

## 🆘 遇到问题？

1. 确保Node.js版本 >= 18.0.0
2. 确保有足够的Sepolia ETH支付gas费
3. 检查 `.env` 文件配置是否正确
4. 查看 [故障排除](contracts/ethereum/DEPLOYMENT_GUIDE.md#故障排除)

## 💡 示例代码

完整的使用示例请参考：
- JavaScript: [DEPLOYMENT_GUIDE.md](contracts/ethereum/DEPLOYMENT_GUIDE.md#使用示例)
- Python: [DEPLOYMENT_GUIDE.md](contracts/ethereum/DEPLOYMENT_GUIDE.md#使用示例)

## 🔗 链接

- **GitHub**: https://github.com/everest-an/Protocol-Bank
- **网站**: https://www.protocolbanks.com/
- **Sepolia浏览器**: https://sepolia.etherscan.io/

