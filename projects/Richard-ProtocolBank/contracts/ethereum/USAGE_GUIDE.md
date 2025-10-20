# Protocol Bank - 使用指南

## 🎯 本地测试网络已部署

您的流支付系统已成功部署到本地Hardhat网络！

### 📋 部署信息

**网络**: Hardhat本地网络 (localhost:8545)

**已部署的合约**:
- **Mock USDC**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **Mock DAI**: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- **StreamPayment**: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`

**测试账户**:
- **Deployer**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (10,000 ETH + 1,000,000 USDC + 1,000,000 DAI)
- **Alice**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` (10,000 ETH)
- **Bob**: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` (10,000 ETH)
- **Charlie**: `0x90F79bf6EB2c4f870365E785982E1f101E93b906` (10,000 ETH)

---

## 🚀 快速开始

### 1. 运行完整演示

```bash
cd /home/ubuntu/Protocol-Bank/contracts/ethereum
npx hardhat run scripts/demo-stream-payment.js --network localhost
```

这个演示展示了：
- ✅ 创建流支付（USDC和DAI）
- ✅ 提取资金
- ✅ 暂停和恢复流支付
- ✅ 取消流支付并退款

### 2. 运行集成测试

```bash
npx hardhat run scripts/test-integration.js --network localhost
```

### 3. 运行单元测试

```bash
npx hardhat test
```

---

## 💻 代码示例

### 使用JavaScript/ethers.js

#### 1. 连接到本地网络

```javascript
const { ethers } = require("hardhat");

// 获取签名者
const [deployer, alice, bob] = await ethers.getSigners();

// 连接到合约
const streamPayment = await ethers.getContractAt(
  "StreamPayment",
  "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
);

const mockUSDC = await ethers.getContractAt(
  "MockERC20",
  "0x5FbDB2315678afecb367f032d93F642f64180aa3"
);
```

#### 2. 获取测试代币

```javascript
// 铸造1000 USDC给Alice
const amount = ethers.parseUnits("1000", 6);
await mockUSDC.mint(alice.address, amount);

// 或使用faucet（任何人都可以调用）
await mockUSDC.connect(alice).faucet(ethers.parseUnits("100", 6));
```

#### 3. 创建流支付

```javascript
// 1. Alice授权StreamPayment合约
const streamAmount = ethers.parseUnits("1000", 6); // 1000 USDC
await mockUSDC.connect(alice).approve(
  streamPayment.target,
  streamAmount
);

// 2. 创建流支付（30天）
const duration = 30 * 24 * 60 * 60; // 30天
const tx = await streamPayment.connect(alice).createStream(
  bob.address,
  mockUSDC.target,
  streamAmount,
  duration,
  "Bob的月工资"
);

const receipt = await tx.wait();
const event = receipt.logs.find(
  log => log.fragment && log.fragment.name === "StreamCreated"
);
const streamId = event.args.streamId;
console.log("Stream ID:", streamId);
```

#### 4. 查询流支付信息

```javascript
// 获取流支付详情
const stream = await streamPayment.getStream(streamId);
console.log("发送方:", stream.sender);
console.log("接收方:", stream.recipient);
console.log("总金额:", ethers.formatUnits(stream.totalAmount, 6));
console.log("状态:", ["活跃", "暂停", "完成", "取消"][stream.status]);

// 查询可提取余额
const balance = await streamPayment.balanceOf(streamId);
console.log("可提取:", ethers.formatUnits(balance, 6), "USDC");

// 查询用户的所有流支付
const senderStreams = await streamPayment.getStreamsBySender(alice.address);
const recipientStreams = await streamPayment.getStreamsByRecipient(bob.address);
console.log("Alice发送的流支付:", senderStreams.length);
console.log("Bob接收的流支付:", recipientStreams.length);
```

#### 5. 提取资金

```javascript
// Bob提取可用余额
await streamPayment.connect(bob).withdrawFromStream(streamId);
console.log("提取成功！");
```

#### 6. 暂停和恢复

```javascript
// Alice暂停流支付
await streamPayment.connect(alice).pauseStream(streamId);
console.log("已暂停");

// Alice恢复流支付
await streamPayment.connect(alice).resumeStream(streamId);
console.log("已恢复");
```

#### 7. 取消流支付

```javascript
// Alice或Bob可以取消流支付
await streamPayment.connect(alice).cancelStream(streamId);
console.log("已取消");
```

---

## 🧪 测试时间操作

在本地Hardhat网络上，您可以模拟时间流逝：

```javascript
// 快进1天
await hre.network.provider.send("evm_increaseTime", [24 * 60 * 60]);
await hre.network.provider.send("evm_mine");

// 现在可以提取更多资金
const newBalance = await streamPayment.balanceOf(streamId);
console.log("新的可提取余额:", ethers.formatUnits(newBalance, 6));
```

---

## 📊 监听事件

```javascript
// 监听StreamCreated事件
streamPayment.on("StreamCreated", (streamId, sender, recipient, totalAmount, event) => {
  console.log("新流支付创建:");
  console.log("- ID:", streamId.toString());
  console.log("- 发送方:", sender);
  console.log("- 接收方:", recipient);
  console.log("- 金额:", ethers.formatUnits(totalAmount, 6));
});

// 监听StreamWithdrawn事件
streamPayment.on("StreamWithdrawn", (streamId, recipient, amount, event) => {
  console.log("资金提取:");
  console.log("- Stream ID:", streamId.toString());
  console.log("- 接收方:", recipient);
  console.log("- 金额:", ethers.formatUnits(amount, 6));
});

// 监听StreamCancelled事件
streamPayment.on("StreamCancelled", (streamId, sender, recipient, refund, event) => {
  console.log("流支付取消:");
  console.log("- Stream ID:", streamId.toString());
  console.log("- 退款:", ethers.formatUnits(refund, 6));
});
```

---

## 🔧 实用脚本

### 创建自定义流支付脚本

创建文件 `scripts/my-stream.js`:

```javascript
const hre = require("hardhat");

async function main() {
  const [sender, recipient] = await hre.ethers.getSigners();
  
  const streamPayment = await hre.ethers.getContractAt(
    "StreamPayment",
    "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
  );
  
  const mockUSDC = await hre.ethers.getContractAt(
    "MockERC20",
    "0x5FbDB2315678afecb367f032d93F642f64180aa3"
  );
  
  // 获取测试币
  await mockUSDC.faucet(hre.ethers.parseUnits("1000", 6));
  
  // 授权
  const amount = hre.ethers.parseUnits("500", 6);
  await mockUSDC.approve(streamPayment.target, amount);
  
  // 创建流支付
  const tx = await streamPayment.createStream(
    recipient.address,
    mockUSDC.target,
    amount,
    7 * 24 * 60 * 60, // 7天
    "测试流支付"
  );
  
  await tx.wait();
  console.log("流支付创建成功！");
}

main();
```

运行：
```bash
npx hardhat run scripts/my-stream.js --network localhost
```

---

## 🌐 连接到前端

### 使用MetaMask连接本地网络

1. **添加本地网络到MetaMask**:
   - 网络名称: Hardhat Local
   - RPC URL: http://localhost:8545
   - Chain ID: 31337
   - 货币符号: ETH

2. **导入测试账户**:
   - 使用Hardhat提供的私钥导入账户
   - 例如Alice的私钥: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`

3. **添加代币到MetaMask**:
   - USDC: `0x5FbDB2315678afecb367f032d93F642f64180aa3` (6位小数)
   - DAI: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` (18位小数)

### 前端集成示例

```javascript
// 使用ethers.js v6
import { ethers } from "ethers";

// 连接到MetaMask
const provider = new ethers.BrowserProvider(window.ethereum);
await provider.send("eth_requestAccounts", []);
const signer = await provider.getSigner();

// 连接到合约
const streamPayment = new ethers.Contract(
  "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  STREAM_PAYMENT_ABI,
  signer
);

// 创建流支付
const tx = await streamPayment.createStream(
  recipientAddress,
  tokenAddress,
  amount,
  duration,
  name
);

await tx.wait();
alert("流支付创建成功！");
```

---

## 📚 合约ABI

合约ABI文件位于：
```
artifacts/contracts/streaming/StreamPayment.sol/StreamPayment.json
artifacts/contracts/tokens/MockERC20.sol/MockERC20.json
```

在JavaScript中导入：
```javascript
const StreamPaymentABI = require("../artifacts/contracts/streaming/StreamPayment.sol/StreamPayment.json").abi;
const ERC20ABI = require("../artifacts/contracts/tokens/MockERC20.sol/MockERC20.json").abi;
```

---

## 🔍 调试技巧

### 查看交易详情

```javascript
const tx = await streamPayment.createStream(...);
const receipt = await tx.wait();

console.log("交易哈希:", receipt.hash);
console.log("Gas使用:", receipt.gasUsed.toString());
console.log("区块号:", receipt.blockNumber);
console.log("事件:", receipt.logs);
```

### 查看合约状态

```javascript
// 查看合约余额
const contractBalance = await mockUSDC.balanceOf(streamPayment.target);
console.log("合约持有的USDC:", ethers.formatUnits(contractBalance, 6));

// 查看流支付总数
const streamCount = await streamPayment.nextStreamId();
console.log("总流支付数:", streamCount.toString());
```

### 错误处理

```javascript
try {
  await streamPayment.connect(bob).pauseStream(streamId);
} catch (error) {
  if (error.message.includes("Only sender can pause")) {
    console.log("只有发送方可以暂停流支付");
  } else {
    console.error("未知错误:", error);
  }
}
```

---

## 🎓 学习资源

- **Hardhat文档**: https://hardhat.org/docs
- **Ethers.js文档**: https://docs.ethers.org/
- **OpenZeppelin合约**: https://docs.openzeppelin.com/contracts
- **Solidity文档**: https://docs.soliditylang.org/

---

## 🆘 常见问题

### Q: 如何重启本地网络？

```bash
# 停止当前节点
pkill -f "hardhat node"

# 重新启动
npx hardhat node

# 在新终端重新部署
npx hardhat run scripts/deploy.js --network localhost
```

### Q: 如何清除缓存？

```bash
npx hardhat clean
npx hardhat compile
```

### Q: 如何查看所有测试账户？

```bash
npx hardhat node
# 会显示20个测试账户及其私钥
```

### Q: 如何在脚本中使用特定账户？

```javascript
const [account0, account1, account2] = await ethers.getSigners();
// 或使用私钥
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
```

---

## 🎉 下一步

1. **前端集成**: 将合约集成到React/Vue应用
2. **后端API**: 使用Web3.py创建REST API
3. **事件监听**: 实现实时通知系统
4. **测试网部署**: 部署到Sepolia测试网
5. **安全审计**: 进行专业安全审计

---

## 📞 支持

- **GitHub**: https://github.com/everest-an/Protocol-Bank
- **文档**: 查看项目根目录的README和DEPLOYMENT_GUIDE

**祝您使用愉快！** 🚀

