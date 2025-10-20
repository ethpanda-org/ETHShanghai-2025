# Bribe - 预测市场 DApp

基于 Conditional Token Framework (CTF) 的二元预测市场全栈项目，为 ETHShanghai 2025 开发。

## 项目结构

```
251011/
├── hardhat-bribe/      # 智能合约层 (Hardhat + Viem)
├── nestjs-bribe/       # 后端索引服务 (NestJS + Redis)
├── vite-bribe/         # 前端 DApp (React + RainbowKit + Wagmi)
└── README.md           # 本文档
```

---

## 快速开始

### 1️⃣ 启动本地 Hardhat 节点

```bash
cd hardhat-bribe
npm install
npx hardhat node
```

保持终端运行，本地链将在 `http://127.0.0.1:8545` 启动（Chain ID: 31337）

---

### 2️⃣ 部署智能合约（新终端）

```bash
cd hardhat-bribe

# 部署合约到本地链
npx hardhat ignition deploy ignition/modules/Deploy.ts --network localhost

# 导出 ABI 和合约地址到前端
npm run export-abis
```

**`export-abis` 脚本会自动：**
- ✅ 导出 `MockCTF.json` 和 `MockERC20.json` 到 `vite-bribe/src/contracts/`
- ✅ 生成 `vite-bribe/.env.local` 文件，包含最新合约地址

**合约说明：**
- **MockERC20** - 模拟 USDC（6 位小数）
- **MockCTF** - 简化版 Gnosis CTF，支持二元市场（YES/NO）

---

### 3️⃣ 启动后端索引服务

```bash
cd nestjs-bribe
npm install

# 启动 Redis (需要 Docker)
docker run -d -p 6381:6379 redis:alpine

# 启动 NestJS 服务
npm run start:dev
```

后端将监听：
- API: `http://localhost:3000`
- Swagger 文档: `http://localhost:3000/api`

**功能：**
- 实时索引链上 `ConditionPreparation` 事件
- 提供市场列表查询接口

---

### 4️⃣ 启动前端 DApp

```bash
cd vite-bribe
npm install
npm run dev
```

前端将在 `http://localhost:5173` 启动

**页面：**
- `/` - 主页
- `/markets` - 市场列表（创建市场、交易 YES/NO 代币）
- `/faucet` - 领取测试 USDC

---

## ⚠️ 重启 Hardhat 后的流程

**电脑重启或 Hardhat 节点重启后，链状态会重置，需要重新部署：**

```bash
# 1. 重启 Hardhat 节点（终端 1）
cd hardhat-bribe
npx hardhat node

# 2. 重新部署合约（终端 2）
cd hardhat-bribe
npx hardhat ignition deploy ignition/modules/Deploy.ts --network localhost
npm run export-abis

# 3. 重启前端（让 Vite 重新读取 .env.local）
cd vite-bribe
# 按 Ctrl+C 停止，然后重新运行
npm run dev

# 4. 后端无需重启（会自动索引新部署的合约事件）
```

**注意：**
- 🔄 链状态重置后，之前的市场、余额都会消失
- 🔄 MetaMask 账户需要重新领取测试币
- 🔄 合约地址会变化，但 `export-abis` 会自动更新前端配置

---

## 技术栈

### 智能合约 (hardhat-bribe)
- Hardhat 3.0 + Viem
- Solidity 0.8.28
- OpenZeppelin Contracts
- Foundry (forge-std) 测试框架

### 后端 (nestjs-bribe)
- NestJS 11
- Redis (ioredis)
- Viem (链上事件监听)
- Swagger API 文档

### 前端 (vite-bribe)
- React 19 + TypeScript
- Vite 7
- Wagmi v2 + Viem
- RainbowKit v2 (钱包连接)
- React Router v7

---

## 核心功能

### 智能合约 API

**创建市场：**
```solidity
function prepareCondition(
    address oracle,
    bytes32 questionId,
    uint256 outcomeSlotCount,  // 必须为 2（二元市场）
    uint256 initialYesPrice    // 初始 YES 价格（0-1 ether，表示 0-100%）
) external
```

**交易代币（AMM 自动做市）：**
```solidity
function buyYes(bytes32 conditionId, uint256 amount) external
function buyNo(bytes32 conditionId, uint256 amount) external
```

**提供流动性（1:1 铸造 YES+NO）：**
```solidity
function splitPosition(bytes32 conditionId, uint256 amount) external
function mergePositions(bytes32 conditionId, uint256 amount) external
```

**市场解决（Oracle 调用）：**
```solidity
function reportPayouts(bytes32 questionId, uint256[] calldata payouts) external
function redeemPositions(bytes32 conditionId, uint256[] calldata indexSets) external
```

### 后端 API

**获取所有市场：**
```bash
GET http://localhost:3000/markets
```

**获取单个市场：**
```bash
GET http://localhost:3000/markets/:conditionId
```

---

## 开发脚本

### hardhat-bribe
```bash
npm run build           # 编译合约
npm test                # 运行测试（Solidity + Node.js）
npm run export-abis     # 导出 ABI 和地址到前端
```

### nestjs-bribe
```bash
npm run start:dev       # 开发模式（热重载）
npm run build           # 构建生产版本
npm test                # 运行单元测试
```

### vite-bribe
```bash
npm run dev             # 开发服务器
npm run build           # 构建生产版本
npm run preview         # 预览生产构建
```

---

## 配置文件

### 环境变量

**hardhat-bribe/.env**
```bash
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology/
PRIVATE_KEY=your_private_key_here
```

**vite-bribe/.env.local** *(自动生成，勿手动编辑)*
```bash
VITE_MOCK_CTF_ADDRESS=0x...
VITE_MOCK_USDC_ADDRESS=0x...
```

### Hardhat 网络配置

- `hardhatMainnet` - 本地模拟以太坊主网
- `hardhatOp` - 本地模拟 Optimism
- `localhost` - 连接本地 Hardhat 节点 (http://127.0.0.1:8545)
- `polygonAmoy` - Polygon Amoy 测试网

---

## 故障排查

### 前端无法读取合约地址
**症状：** 控制台显示 `0x0000...0000`

**解决：**
```bash
cd hardhat-bribe
npm run export-abis
cd ../vite-bribe
# 重启 Vite 开发服务器（Ctrl+C 后重新运行 npm run dev）
```

### 后端无法索引事件
**症状：** 市场列表为空

**检查：**
1. Hardhat 节点是否运行？
2. 合约是否已部署？
3. Redis 是否启动？（`docker ps` 查看）
4. 后端配置的合约地址是否正确？（参考 `nestjs-bribe/src/markets/markets.service.ts:22`）

### MetaMask 交易失败
**可能原因：**
- 账户 nonce 错误 → 设置 → 高级 → 重置账户
- Gas 不足 → Hardhat 本地链提供充足 ETH
- USDC 未授权 → 先调用 `approve` 再交易

---

## 后续优化建议

- [ ] 后端合约地址也从环境变量读取
- [ ] 添加价格更新事件索引（实时显示市场价格）
- [ ] 优化 AMM 算法（当前为固定价格）
- [ ] 添加图表展示价格走势
- [ ] 部署到 Polygon Amoy 测试网

---

## 许可证

UNLICENSED (仅用于学习和黑客松项目)

---

## 参考资料

- [Hardhat 文档](https://hardhat.org/docs)
- [Gnosis CTF 白皮书](https://docs.gnosis.io/conditionaltokens/)
- [Viem 文档](https://viem.sh/)
- [RainbowKit 文档](https://www.rainbowkit.com/)
