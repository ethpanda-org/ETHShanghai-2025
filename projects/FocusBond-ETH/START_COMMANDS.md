# FocusBond-ETH 启动指令

## 🚀 完整启动流程

### 方法 1: 一键启动（推荐）

如果您想一键启动所有服务：
```bash
./run.sh
```

### 方法 2: 手动分步启动

如果您想手动控制每个步骤，请按顺序执行：

---

## 📋 步骤 1: 启动本地区块链

**在终端 1 中运行：**
```bash
cd /Users/mingji/postgraduate/FocusBond-ETH
anvil --port 8545 --gas-price 500000000
```

**说明：** 
- 启动 Anvil 本地以太坊节点
- 监听端口: 8545
- 提供 10 个测试账户，每个账户 10,000 ETH
- 按 `Ctrl+C` 停止

**验证：** 看到类似输出表示成功
```
Available Accounts
==================
(0) 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
...
```

---

## 📋 步骤 2: 部署智能合约

**在终端 2 中运行：**
```bash
cd /Users/mingji/postgraduate/FocusBond-ETH

# 部署合规版本合约
forge script script/DeployCompliant.s.sol \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

**说明：**
- 部署 FocusBond, MockUSDC, FocusCredit 合约
- 使用 Anvil 第一个测试账户作为部署者

**验证：** 看到类似输出表示成功
```
=== Contract Addresses ===
  MockUSDC:      0x5FbDB2315678afecb367f032d93F642f64180aa3
  FocusCredit:   0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
  FocusBond:     0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

=== Setting up test accounts ===
  Sent 1 ETH to: 0x891402c216Dbda3eD7BEB0f95Dd89b010523642A
  Granted 1000 FOCUS to: 0x891402c216Dbda3eD7BEB0f95Dd89b010523642A
```

**重要：** 
- 记下这些合约地址！
- 测试账户 `0x891402c216Dbda3eD7BEB0f95Dd89b010523642A` 已自动获得 1 ETH 和 1000 FOCUS

---

## 📋 步骤 3: 更新前端配置（如果地址变化）

如果合约地址与以下不同，需要更新配置：

**编辑文件：** `apps/web-evm/src/lib/wagmi.ts`
```typescript
export const CONTRACTS = {
  [anvil.id]: {
    focusBond: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as `0x${string}`,
    usdc: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as `0x${string}`,
    focus: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as `0x${string}`,
  },
}
```

**编辑文件：** `apps/web-evm/src/app/api/session/calculate-fee/route.ts`
```typescript
const FOCUSBOND_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as `0x${string}`
const USDC_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3' as `0x${string}`
const FOCUS_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as `0x${string}`
```

---

## 📋 步骤 4: 启动前端应用

**在终端 3 中运行：**
```bash
cd /Users/mingji/postgraduate/FocusBond-ETH/apps/web-evm
npm run dev
```

**说明：**
- 启动 Next.js 开发服务器
- 默认端口: 3000 (如果被占用会自动使用 3001, 3002 等)
- 按 `Ctrl+C` 停止

**验证：** 看到类似输出表示成功
```
  ▲ Next.js 15.x.x
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000
```

---

## 📋 步骤 5: 给其他测试账户添加代币（可选）

**注意：** 测试账户 `0x891402c216Dbda3eD7BEB0f95Dd89b010523642A` 在部署时已自动获得 1 ETH 和 1000 FOCUS，无需手动添加！

如果需要给**其他地址**添加测试代币：

```bash
cd /Users/mingji/postgraduate/FocusBond-ETH

# 发送 ETH
cast send <其他地址> \
  --value 1ether \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://127.0.0.1:8545

# 发送 FOCUS 积分（使用部署后的实际地址）
cast send <FocusCredit合约地址> \
  "grantCredits(address,uint256,string)" \
  <其他地址> \
  1000000000000000000000 \
  "Test credits" \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://127.0.0.1:8545
```

---

## 🌐 访问应用

打开浏览器访问: **http://localhost:3000**

---

## 🔧 常用调试命令

### 检查合约部署状态
```bash
# 检查 FocusBond 合约
cast call 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0 "baseFeeUsdc()" --rpc-url http://127.0.0.1:8545

# 检查账户余额
cast balance <地址> --rpc-url http://127.0.0.1:8545

# 检查 FOCUS 代币余额
cast call 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "balanceOf(address)" <地址> --rpc-url http://127.0.0.1:8545
```

### 检查端口占用
```bash
# 检查所有相关端口
lsof -i :8545 -i :3000 -i :3001 -i :3002 | grep LISTEN

# 检查特定端口
lsof -i :8545
```

### 关闭所有服务
```bash
# 关闭 Anvil
pkill -f anvil

# 关闭前端
pkill -f "next-server"

# 或者使用停止脚本
./stop.sh
```

---

## 🐛 常见问题

### 1. 端口已被占用
```bash
# 关闭占用端口的进程
pkill -f anvil
pkill -f "next-server"
```

### 2. 合约地址不匹配
- 重新部署合约
- 更新 `apps/web-evm/src/lib/wagmi.ts` 中的地址
- 重启前端应用

### 3. Nonce 错误
```bash
# 重启 Anvil 区块链（会清空所有数据）
pkill -f anvil
anvil --port 8545 --gas-price 500000000

# 重新部署合约
forge script script/DeployCompliant.s.sol --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
```

### 4. 钱包连接失败
- 确保 MetaMask 已安装
- 添加 Anvil 网络配置：
  - 网络名称: Anvil Local
  - RPC URL: http://127.0.0.1:8545
  - Chain ID: 31337
  - 货币符号: ETH

---

## 📝 测试账户信息

**默认测试账户（Anvil 提供）：**
```
账户 0:
地址: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
私钥: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
余额: 10,000 ETH

账户 1:
地址: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
私钥: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
余额: 10,000 ETH
```

---

## 🎯 完整启动示例

```bash
# 终端 1: 启动区块链
cd /Users/mingji/postgraduate/FocusBond-ETH
anvil --port 8545 --gas-price 500000000

# 终端 2: 部署合约
cd /Users/mingji/postgraduate/FocusBond-ETH
forge script script/DeployCompliant.s.sol --rpc-url http://127.0.0.1:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast

# 终端 3: 启动前端
cd /Users/mingji/postgraduate/FocusBond-ETH/apps/web-evm
npm run dev

# 浏览器: 打开应用
open http://localhost:3000
```

---

✅ **所有端口已关闭，您可以按照上述指令重新启动！**

