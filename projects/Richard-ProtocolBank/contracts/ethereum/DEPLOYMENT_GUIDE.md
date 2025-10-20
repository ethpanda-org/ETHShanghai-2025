# Protocol Bank - Ethereum Smart Contract Deployment Guide

## 概述

本指南将帮助您将Protocol Bank的流支付智能合约部署到Sepolia测试网。

## 前置条件

### 1. 获取Sepolia测试币

您需要在Sepolia测试网上有一些ETH来支付gas费用。可以通过以下水龙头获取：

- **Alchemy Sepolia Faucet**: https://sepoliafaucet.com/
- **Infura Sepolia Faucet**: https://www.infura.io/faucet/sepolia
- **QuickNode Sepolia Faucet**: https://faucet.quicknode.com/ethereum/sepolia

### 2. 准备钱包私钥

1. 使用MetaMask或其他以太坊钱包
2. 切换到Sepolia测试网
3. 导出您的私钥（设置 -> 安全与隐私 -> 显示私钥）
4. **重要**: 仅用于测试，切勿使用包含真实资金的钱包！

### 3. 获取RPC URL（可选）

虽然可以使用公共RPC，但建议使用专用RPC以获得更好的性能：

- **Alchemy**: https://www.alchemy.com/ (免费计划)
- **Infura**: https://www.infura.io/ (免费计划)
- **QuickNode**: https://www.quicknode.com/ (免费试用)

## 配置步骤

### 1. 创建环境变量文件

在 `contracts/ethereum` 目录下创建 `.env` 文件：

```bash
cd /home/ubuntu/Protocol-Bank/contracts/ethereum
cp .env.example .env
```

### 2. 编辑 `.env` 文件

```env
# Sepolia RPC URL (使用公共RPC或您的专用RPC)
SEPOLIA_RPC_URL=https://rpc.sepolia.org

# 您的钱包私钥（不要包含0x前缀）
PRIVATE_KEY=your_private_key_here

# Etherscan API Key（用于合约验证，可选）
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Gas报告（可选）
REPORT_GAS=false
```

### 3. 验证配置

检查您的钱包余额：

```bash
npx hardhat run scripts/check-balance.js --network sepolia
```

## 部署到Sepolia测试网

### 1. 编译合约

```bash
npx hardhat compile
```

### 2. 运行测试（可选但推荐）

```bash
npx hardhat test
```

### 3. 部署合约

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

部署过程将：
- 部署Mock USDC代币合约
- 部署Mock DAI代币合约
- 部署StreamPayment流支付合约
- 为部署者铸造测试代币
- 保存部署信息到 `deployments/` 目录

### 4. 验证合约（可选）

部署完成后，可以在Etherscan上验证合约：

```bash
# 验证Mock USDC
npx hardhat verify --network sepolia <USDC_ADDRESS> "Mock USDC" "USDC" 6

# 验证Mock DAI
npx hardhat verify --network sepolia <DAI_ADDRESS> "Mock DAI" "DAI" 18

# 验证StreamPayment
npx hardhat verify --network sepolia <STREAM_PAYMENT_ADDRESS>
```

## 部署后配置

### 1. 记录合约地址

部署信息会自动保存在 `deployments/` 目录下，格式为 `sepolia-<timestamp>.json`

### 2. 更新前端配置

将合约地址更新到前端配置文件中：

```javascript
// src/config/contracts.js
export const CONTRACTS = {
  sepolia: {
    streamPayment: "0x...", // StreamPayment合约地址
    mockUSDC: "0x...",      // Mock USDC地址
    mockDAI: "0x...",       // Mock DAI地址
  }
};
```

### 3. 更新后端配置

在后端API中配置合约地址和ABI：

```python
# protocol-bank-api/src/config/blockchain.py
SEPOLIA_CONFIG = {
    "rpc_url": "https://rpc.sepolia.org",
    "chain_id": 11155111,
    "contracts": {
        "stream_payment": "0x...",
        "mock_usdc": "0x...",
        "mock_dai": "0x...",
    }
}
```

## 使用测试币

### 获取测试代币

部署者账户已经有1,000,000 USDC和1,000,000 DAI测试币。其他用户可以通过以下方式获取：

#### 方法1：使用Faucet函数

```javascript
// 使用ethers.js
const mockUSDC = await ethers.getContractAt("MockERC20", USDC_ADDRESS);
await mockUSDC.faucet(ethers.parseUnits("1000", 6)); // 获取1000 USDC
```

#### 方法2：从部署者转账

部署者可以转账给其他测试用户。

## 创建流支付示例

### 使用ethers.js

```javascript
import { ethers } from "ethers";

// 连接到Sepolia
const provider = new ethers.JsonRpcProvider("https://rpc.sepolia.org");
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// 连接到合约
const streamPayment = new ethers.Contract(
  STREAM_PAYMENT_ADDRESS,
  STREAM_PAYMENT_ABI,
  wallet
);

const mockUSDC = new ethers.Contract(
  MOCK_USDC_ADDRESS,
  ERC20_ABI,
  wallet
);

// 1. 授权StreamPayment合约使用代币
const amount = ethers.parseUnits("1000", 6); // 1000 USDC
await mockUSDC.approve(STREAM_PAYMENT_ADDRESS, amount);

// 2. 创建流支付
const duration = 3600; // 1小时
const tx = await streamPayment.createStream(
  recipientAddress,
  MOCK_USDC_ADDRESS,
  amount,
  duration,
  "Employee Salary Stream"
);

const receipt = await tx.wait();
console.log("Stream created:", receipt);
```

### 使用Web3.py（Python后端）

```python
from web3 import Web3

# 连接到Sepolia
w3 = Web3(Web3.HTTPProvider("https://rpc.sepolia.org"))
account = w3.eth.account.from_key(private_key)

# 加载合约
stream_payment = w3.eth.contract(
    address=STREAM_PAYMENT_ADDRESS,
    abi=STREAM_PAYMENT_ABI
)

mock_usdc = w3.eth.contract(
    address=MOCK_USDC_ADDRESS,
    abi=ERC20_ABI
)

# 1. 授权
amount = 1000 * 10**6  # 1000 USDC
tx = mock_usdc.functions.approve(
    STREAM_PAYMENT_ADDRESS,
    amount
).build_transaction({
    'from': account.address,
    'nonce': w3.eth.get_transaction_count(account.address),
})

signed_tx = account.sign_transaction(tx)
tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
w3.eth.wait_for_transaction_receipt(tx_hash)

# 2. 创建流支付
duration = 3600  # 1小时
tx = stream_payment.functions.createStream(
    recipient_address,
    MOCK_USDC_ADDRESS,
    amount,
    duration,
    "Employee Salary Stream"
).build_transaction({
    'from': account.address,
    'nonce': w3.eth.get_transaction_count(account.address),
})

signed_tx = account.sign_transaction(tx)
tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
print(f"Stream created: {receipt}")
```

## 监控和管理

### 查看流支付信息

```javascript
// 获取流支付详情
const stream = await streamPayment.getStream(streamId);
console.log("Stream info:", stream);

// 查看可提取余额
const balance = await streamPayment.balanceOf(streamId);
console.log("Available balance:", ethers.formatUnits(balance, 6));

// 查看用户的所有流支付
const senderStreams = await streamPayment.getStreamsBySender(senderAddress);
const recipientStreams = await streamPayment.getStreamsByRecipient(recipientAddress);
```

### 提取资金

```javascript
// 接收方提取资金
await streamPayment.connect(recipient).withdrawFromStream(streamId);
```

### 暂停/恢复流支付

```javascript
// 发送方暂停流支付
await streamPayment.connect(sender).pauseStream(streamId);

// 发送方恢复流支付
await streamPayment.connect(sender).resumeStream(streamId);
```

### 取消流支付

```javascript
// 发送方或接收方可以取消流支付
await streamPayment.connect(sender).cancelStream(streamId);
```

## 浏览器查看

部署后，您可以在Sepolia Etherscan上查看合约和交易：

- **Sepolia Etherscan**: https://sepolia.etherscan.io/
- 搜索您的合约地址查看所有交易历史

## 故障排除

### 问题1：交易失败 - insufficient funds

**解决方案**: 确保您的钱包有足够的Sepolia ETH支付gas费用。

### 问题2：交易pending太久

**解决方案**: Sepolia测试网有时会拥堵，可以：
- 等待更长时间
- 使用更高的gas price
- 使用专用RPC提供商

### 问题3：合约验证失败

**解决方案**: 
- 确保使用正确的编译器版本（0.8.20）
- 确保构造函数参数正确
- 检查Etherscan API key是否有效

### 问题4：nonce too low

**解决方案**: 清除pending交易或等待之前的交易确认。

## 安全注意事项

1. **永远不要**在主网使用测试私钥
2. **永远不要**将私钥提交到Git仓库
3. `.env` 文件已添加到 `.gitignore`
4. 仅在测试网使用Mock代币
5. 在生产环境部署前进行完整的安全审计

## 下一步

1. 集成前端钱包连接（MetaMask）
2. 实现后端API调用智能合约
3. 添加实时事件监听
4. 部署到主网前进行安全审计

## 资源链接

- **Sepolia Testnet Info**: https://sepolia.dev/
- **Hardhat Documentation**: https://hardhat.org/docs
- **OpenZeppelin Contracts**: https://docs.openzeppelin.com/contracts
- **Ethers.js Documentation**: https://docs.ethers.org/
- **Web3.py Documentation**: https://web3py.readthedocs.io/

