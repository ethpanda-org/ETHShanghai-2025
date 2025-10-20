# Protocol Bank - Ethereum Smart Contracts

Protocol Bank的以太坊智能合约实现，提供完整的流支付（Stream Payment）功能。

## 📋 目录

- [功能特性](#功能特性)
- [合约架构](#合约架构)
- [快速开始](#快速开始)
- [测试](#测试)
- [部署](#部署)
- [使用示例](#使用示例)

## 🚀 功能特性

### 流支付核心功能

- ✅ **创建流支付**: 设置持续的代币流转
- ✅ **实时提取**: 接收方可随时提取已流转的代币
- ✅ **暂停/恢复**: 发送方可暂停和恢复流支付
- ✅ **取消流支付**: 双方都可取消并结算
- ✅ **多代币支持**: 支持任何ERC20代币
- ✅ **精确计算**: 按秒计算流转金额

### 安全特性

- 🔒 使用OpenZeppelin安全库
- 🔒 ReentrancyGuard防重入攻击
- 🔒 SafeERC20安全代币转账
- 🔒 完整的权限控制

## 📐 合约架构

```
contracts/
├── interfaces/
│   └── IStreamPayment.sol      # 流支付接口定义
├── streaming/
│   └── StreamPayment.sol       # 流支付核心实现
└── tokens/
    └── MockERC20.sol           # 测试用ERC20代币
```

### 主要合约

#### StreamPayment.sol

核心流支付合约，实现以下功能：

- `createStream()` - 创建新的流支付
- `withdrawFromStream()` - 提取可用余额
- `pauseStream()` - 暂停流支付
- `resumeStream()` - 恢复流支付
- `cancelStream()` - 取消流支付
- `getStream()` - 查询流支付信息
- `balanceOf()` - 查询可提取余额

#### MockERC20.sol

测试用ERC20代币合约，包含：

- 标准ERC20功能
- `mint()` - 铸造代币（仅owner）
- `faucet()` - 水龙头功能（任何人可获取测试币）

## 🏁 快速开始

### 前置要求

- Node.js >= 18.0.0
- npm 或 yarn

### 安装依赖

```bash
cd contracts/ethereum
npm install
```

### 编译合约

```bash
npx hardhat compile
```

### 运行测试

```bash
npx hardhat test
```

## 🧪 测试

测试覆盖所有核心功能：

```bash
# 运行所有测试
npx hardhat test

# 运行特定测试文件
npx hardhat test test/StreamPayment.test.js

# 查看测试覆盖率
npx hardhat coverage

# 查看gas使用报告
REPORT_GAS=true npx hardhat test
```

### 测试结果

```
StreamPayment
  Stream Creation
    ✔ Should create a stream successfully
    ✔ Should reject stream with zero amount
    ✔ Should reject stream to self
    ✔ Should reject stream with duration too short
  Stream Withdrawal
    ✔ Should allow recipient to withdraw after time passes
    ✔ Should not allow non-recipient to withdraw
    ✔ Should allow full withdrawal after stream ends
  Stream Pause and Resume
    ✔ Should allow sender to pause stream
    ✔ Should not allow non-sender to pause
    ✔ Should allow sender to resume paused stream
  Stream Cancellation
    ✔ Should allow sender to cancel stream
    ✔ Should allow recipient to cancel stream
    ✔ Should not allow unauthorized user to cancel
  View Functions
    ✔ Should return correct stream information
    ✔ Should calculate correct available balance
    ✔ Should return streams by sender
    ✔ Should return streams by recipient

18 passing (1s)
```

## 🚢 部署

### 本地网络

```bash
# 启动本地Hardhat节点
npx hardhat node

# 在另一个终端部署
npx hardhat run scripts/deploy.js --network localhost
```

### Sepolia测试网

1. 配置环境变量：

```bash
cp .env.example .env
# 编辑.env文件，填入您的私钥和RPC URL
```

2. 获取Sepolia测试币：
   - https://sepoliafaucet.com/
   - https://www.infura.io/faucet/sepolia

3. 检查余额：

```bash
npx hardhat run scripts/check-balance.js --network sepolia
```

4. 部署合约：

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

5. 验证合约（可选）：

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

详细部署指南请参考 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## 💡 使用示例

### JavaScript/TypeScript (ethers.js v6)

```javascript
import { ethers } from "ethers";

// 连接到网络
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// 连接到合约
const streamPayment = new ethers.Contract(
  STREAM_PAYMENT_ADDRESS,
  STREAM_PAYMENT_ABI,
  wallet
);

const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, wallet);

// 1. 授权代币
const amount = ethers.parseUnits("1000", 18);
await token.approve(STREAM_PAYMENT_ADDRESS, amount);

// 2. 创建流支付（1小时）
const tx = await streamPayment.createStream(
  recipientAddress,
  TOKEN_ADDRESS,
  amount,
  3600, // duration in seconds
  "Monthly Salary"
);
await tx.wait();

// 3. 查询流支付信息
const stream = await streamPayment.getStream(streamId);
console.log("Stream:", stream);

// 4. 查询可提取余额
const balance = await streamPayment.balanceOf(streamId);
console.log("Available:", ethers.formatUnits(balance, 18));

// 5. 提取资金（接收方）
await streamPayment.connect(recipient).withdrawFromStream(streamId);

// 6. 暂停流支付（发送方）
await streamPayment.pauseStream(streamId);

// 7. 恢复流支付（发送方）
await streamPayment.resumeStream(streamId);

// 8. 取消流支付
await streamPayment.cancelStream(streamId);
```

### Python (web3.py)

```python
from web3 import Web3

# 连接到网络
w3 = Web3(Web3.HTTPProvider(RPC_URL))
account = w3.eth.account.from_key(PRIVATE_KEY)

# 加载合约
stream_payment = w3.eth.contract(
    address=STREAM_PAYMENT_ADDRESS,
    abi=STREAM_PAYMENT_ABI
)

token = w3.eth.contract(address=TOKEN_ADDRESS, abi=ERC20_ABI)

# 1. 授权代币
amount = 1000 * 10**18
tx = token.functions.approve(
    STREAM_PAYMENT_ADDRESS, amount
).build_transaction({
    'from': account.address,
    'nonce': w3.eth.get_transaction_count(account.address),
})
signed = account.sign_transaction(tx)
tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
w3.eth.wait_for_transaction_receipt(tx_hash)

# 2. 创建流支付
tx = stream_payment.functions.createStream(
    recipient_address,
    TOKEN_ADDRESS,
    amount,
    3600,  # duration
    "Monthly Salary"
).build_transaction({
    'from': account.address,
    'nonce': w3.eth.get_transaction_count(account.address),
})
signed = account.sign_transaction(tx)
tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

# 3. 查询流支付
stream = stream_payment.functions.getStream(stream_id).call()
print(f"Stream: {stream}")

# 4. 提取资金
tx = stream_payment.functions.withdrawFromStream(stream_id).build_transaction({
    'from': recipient_address,
    'nonce': w3.eth.get_transaction_count(recipient_address),
})
# ... 签名并发送
```

## 📊 Gas消耗估算

| 操作 | Gas消耗 (估算) |
|------|---------------|
| 创建流支付 | ~150,000 |
| 提取资金 | ~80,000 |
| 暂停流支付 | ~50,000 |
| 恢复流支付 | ~50,000 |
| 取消流支付 | ~100,000 |

*注：实际gas消耗取决于网络状况和具体参数*

## 🔧 配置

### Hardhat配置

编辑 `hardhat.config.js` 自定义网络配置：

```javascript
module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
    // 添加其他网络...
  },
};
```

### 环境变量

创建 `.env` 文件：

```env
SEPOLIA_RPC_URL=https://rpc.sepolia.org
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## 📝 合约地址

### Sepolia测试网

部署后的合约地址会保存在 `deployments/` 目录下。

示例：
```json
{
  "network": "sepolia",
  "deployer": "0x...",
  "contracts": {
    "mockUSDC": "0x...",
    "mockDAI": "0x...",
    "streamPayment": "0x..."
  }
}
```

## 🛡️ 安全

### 审计状态

⚠️ **警告**: 这些合约尚未经过专业安全审计，仅用于测试和开发目的。

在生产环境使用前，请：
1. 进行完整的安全审计
2. 进行广泛的测试
3. 考虑bug赏金计划

### 已知限制

- 最小流支付时长：60秒
- 不支持原生ETH（仅ERC20代币）
- 流速精度受Solidity整数除法限制

## 🤝 贡献

欢迎贡献！请遵循以下步骤：

1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📄 许可证

MIT License

## 📞 联系方式

- GitHub: https://github.com/everest-an/Protocol-Bank
- Website: https://www.protocolbanks.com/

## 🔗 相关资源

- [Protocol Bank白皮书](../../docs/protocol_bank_complete_whitepaper.md)
- [部署指南](./DEPLOYMENT_GUIDE.md)
- [Hardhat文档](https://hardhat.org/docs)
- [OpenZeppelin合约](https://docs.openzeppelin.com/contracts)
- [Ethers.js文档](https://docs.ethers.org/)

