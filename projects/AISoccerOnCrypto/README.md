# AI Soccer On Crypto - 链上AI足球竞技平台

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## 🌐 English Version

### Project Overview

AI Soccer On Crypto is a decentralized gaming platform where AI agents compete in soccer matches on the blockchain. The platform combines NFT-based agent identities, fair launch token mechanisms, on-chain reputation systems, and automated token economics.

### Key Features

🤖 **AI Agent Identity System**
- NFT-based registration for AI soccer agents
- Unique agent IDs with metadata (team name, model version)
- Ownership tracking and transfer capabilities

💰 **Fair Launch Token Platform**
- Launch agent-bound ERC20 tokens
- Fair distribution: 50% public mint, 5% owner, 45% liquidity
- Batch minting with attached messages
- Automatic Uniswap V2 liquidity provision
- Refund mechanism for failed launches

⚽ **Decentralized Competition System**
- Create and accept match invitations
- Match queue managed by authorized servers
- Transparent fee distribution
- Token buyback and burn mechanism

📊 **On-chain Reputation System**
- Server-validated match results
- Win/loss/draw statistics
- Dynamic reputation scoring
- Cryptographic proof of match logs

🔥 **Automated Token Buyback**
- 20% of match rewards used for token buyback
- Purchased tokens automatically burned
- Supports agent token economy

### Architecture

```
User/Developer
    ↓
SoccerAgentRegistry (NFT Identity)
    ↓
┌────────────┬─────────────┬──────────────┐
│            │             │              │
LaunchPad   Competition   ServerRegistry  
(Token)     (Matches)     (Reputation)    
│            │                             
└────────────┴─────────────────────────────
             ↓
      Uniswap V2 (Liquidity & Buyback)
```

### Smart Contracts

| Contract | Address (Sepolia) | Description |
|----------|-------------------|-------------|
| SoccerAgentRegistry | `0x93D251E6a2F08b61c06d36eEDD81bA6ac384E40D` | Agent identity & NFT management |
| ServerReputationRegistry | `0x0D5a8A2f22cC59a9293C14404a41818E71b3528A` | Server authorization & reputation |
| LaunchPad | `0xBA9d3DA6116d8D3d5F90B3065f59d7B205F5C852` | Token fair launch platform |
| Competition | `0xDe30530F1Fa736E656A42fCb3f91E004B1e1819a` | Match management & fee distribution |

### Quick Start

#### 1. Register an Agent
```javascript
const agentRegistry = new ethers.Contract(AGENT_REGISTRY_ADDRESS, ABI, signer);
const tx = await agentRegistry.registerSoccerAgent(
  "Dream Team FC",
  "v1.0.0",
  "ipfs://QmXYZ..."
);
const receipt = await tx.wait();
const agentId = receipt.events[0].args.agentId;
```

#### 2. Launch Agent Token
```javascript
const launchPad = new ethers.Contract(LAUNCHPAD_ADDRESS, ABI, signer);
const tx = await launchPad.launchToken(agentId);
await tx.wait();
```

#### 3. Mint Tokens
```javascript
const tx = await launchPad.mint(
  agentId,
  10, // 10 batches = 10,000 tokens
  "Go Team!",
  { value: ethers.utils.parseEther("0.01") }
);
```

#### 4. Create a Match
```javascript
const competition = new ethers.Contract(COMPETITION_ADDRESS, ABI, signer);
const tx = await competition.createMatchInvitation(
  myAgentId,
  opponentAgentId,
  { value: ethers.utils.parseEther("0.001") }
);
```

### Token Economics

**Total Supply**: 100,000,000 tokens per agent

**Distribution**:
- 50% Public Mint (50M tokens)
- 5% Agent Owner (5M tokens)
- 45% Liquidity Pool (45M tokens)

**Minting**:
- Price: 0.001 ETH per batch (1,000 tokens)
- Batch Range: 1-100 batches per transaction
- Time Limit: 3 days
- Foundation Fee: 5% of mint fees
- Liquidity: 95% of mint fees

### Fee Structure

**Match Fees**:
- Minimum: 0.001 ETH
- Platform: min fee + 20% of remaining
- Opponent: 80% of remaining
  - If token launched: 20% used for buyback & burn
  - Remaining 80% to opponent owner

### Development

```bash
# Clone repository
git clone <repository-url>
cd projects/AISoccerOnCrypto/contracts

# Install dependencies
forge install

# Build contracts
forge build

# Run tests
forge test

# Deploy
forge script script/Deploy.s.sol:Deploy --rpc-url $RPC_URL --broadcast
```

### Documentation

Detailed documentation available in:
- [Smart Contracts Documentation](./contracts/README.md)
- Frontend Documentation: Coming soon

### Security

- ✅ OpenZeppelin security libraries
- ✅ ReentrancyGuard on all state-changing functions
- ✅ Access control and authorization
- ✅ Agent ownership verification
- ⚠️ **Not audited** - Use at your own risk

### License

MIT License

---

<a name="chinese"></a>
## 🇨🇳 中文版本

### 项目概述

AI Soccer On Crypto 是一个去中心化的游戏平台，AI代理在区块链上进行足球比赛。该平台结合了基于NFT的代理身份、公平发行代币机制、链上声誉系统和自动化代币经济学。

### 核心功能

🤖 **AI代理身份系统**
- 基于NFT的AI足球代理注册
- 唯一的代理ID和元数据（团队名称、模型版本）
- 所有权追踪和转移功能

💰 **公平发行代币平台**
- 发行与代理绑定的ERC20代币
- 公平分配：50%公开铸造、5%所有者、45%流动性
- 批量铸造并附带消息
- 自动Uniswap V2流动性供应
- 失败发行的退款机制

⚽ **去中心化竞赛系统**
- 创建和接受比赛邀请
- 由授权服务器管理的比赛队列
- 透明的费用分配
- 代币回购和销毁机制

📊 **链上声誉系统**
- 服务器验证的比赛结果
- 胜/负/平统计数据
- 动态声誉评分
- 比赛日志的密码学证明

🔥 **自动代币回购**
- 使用20%的比赛奖励进行代币回购
- 购买的代币自动销毁
- 支持代理代币经济

### 系统架构

```
用户/开发者
    ↓
SoccerAgentRegistry（NFT身份）
    ↓
┌────────────┬─────────────┬──────────────┐
│            │             │              │
LaunchPad   Competition   ServerRegistry  
（代币）    （比赛）      （声誉）        
│            │                             
└────────────┴─────────────────────────────
             ↓
      Uniswap V2（流动性与回购）
```

### 智能合约

| 合约 | 地址（Sepolia测试网） | 说明 |
|----------|-------------------|-------------|
| SoccerAgentRegistry | `0x93D251E6a2F08b61c06d36eEDD81bA6ac384E40D` | 代理身份与NFT管理 |
| ServerReputationRegistry | `0x0D5a8A2f22cC59a9293C14404a41818E71b3528A` | 服务器授权与声誉管理 |
| LaunchPad | `0xBA9d3DA6116d8D3d5F90B3065f59d7B205F5C852` | 代币公平发行平台 |
| Competition | `0xDe30530F1Fa736E656A42fCb3f91E004B1e1819a` | 比赛管理与费用分配 |

### 快速开始

#### 1. 注册代理
```javascript
const agentRegistry = new ethers.Contract(AGENT_REGISTRY_ADDRESS, ABI, signer);
const tx = await agentRegistry.registerSoccerAgent(
  "梦之队足球俱乐部",
  "v1.0.0",
  "ipfs://QmXYZ..."
);
const receipt = await tx.wait();
const agentId = receipt.events[0].args.agentId;
```

#### 2. 发行代理代币
```javascript
const launchPad = new ethers.Contract(LAUNCHPAD_ADDRESS, ABI, signer);
const tx = await launchPad.launchToken(agentId);
await tx.wait();
```

#### 3. 铸造代币
```javascript
const tx = await launchPad.mint(
  agentId,
  10, // 10批次 = 10,000代币
  "加油！",
  { value: ethers.utils.parseEther("0.01") }
);
```

#### 4. 创建比赛
```javascript
const competition = new ethers.Contract(COMPETITION_ADDRESS, ABI, signer);
const tx = await competition.createMatchInvitation(
  myAgentId,
  opponentAgentId,
  { value: ethers.utils.parseEther("0.001") }
);
```

### 代币经济学

**总供应量**：每个代理100,000,000代币

**分配方案**：
- 50% 公开铸造（5000万代币）
- 5% 代理所有者（500万代币）
- 45% 流动性池（4500万代币）

**铸造规则**：
- 价格：每批次0.001 ETH（1,000代币）
- 批次范围：每笔交易1-100批次
- 时间限制：3天
- 基金会费用：铸造费用的5%
- 流动性：铸造费用的95%

### 费用结构

**比赛费用**：
- 最低：0.001 ETH
- 平台：最低费用 + 剩余部分的20%
- 对手：剩余部分的80%
  - 如果已发行代币：20%用于回购和销毁
  - 剩余80%给对手所有者

### 开发指南

```bash
# 克隆仓库
git clone <repository-url>
cd projects/AISoccerOnCrypto/contracts

# 安装依赖
forge install

# 构建合约
forge build

# 运行测试
forge test

# 部署
forge script script/Deploy.s.sol:Deploy --rpc-url $RPC_URL --broadcast
```

### 文档

详细文档请查看：
- [智能合约文档](./contracts/README.md)
- 前端文档：即将推出

### 安全性

- ✅ OpenZeppelin安全库
- ✅ 所有状态更改函数的重入保护
- ✅ 访问控制和授权
- ✅ 代理所有权验证
- ⚠️ **未经审计** - 风险自负

### 主要工作流程

#### 工作流程1：注册代理并发行代币
1. 开发者调用 `SoccerAgentRegistry.registerSoccerAgent()` 注册代理
2. 获得唯一的代理ID（NFT）
3. 代理所有者调用 `LaunchPad.launchToken(agentId)` 发行代币
4. TokenBoundAgent ERC20合约部署
5. 用户在3天内铸造代币（目标50%）
6. 达到50%后自动添加流动性并启用转账

#### 工作流程2：创建并执行比赛
1. 挑战者创建比赛邀请并支付费用
2. 对手接受邀请
3. 比赛进入队列
4. 授权服务器启动比赛
5. 服务器完成比赛
6. 自动分配费用，如果对手有代币则自动回购并销毁

#### 工作流程3：代币回购机制
1. 比赛完成时检查对手是否成功发行代币
2. 如果有，使用对手奖励的20%购买代币
3. 从Uniswap V2池购买代币
4. 将购买的代币发送到死亡地址（销毁）
5. 发出回购事件

### 技术栈

- **智能合约**: Solidity ^0.8.20
- **开发框架**: Foundry
- **标准库**: OpenZeppelin Contracts
- **DeFi集成**: Uniswap V2
- **网络**: 以太坊及兼容链

### 路线图

- [x] 核心智能合约开发
- [x] Sepolia测试网部署
- [ ] 前端界面开发
- [ ] 主网部署
- [ ] 安全审计
- [ ] 游戏服务器集成
- [ ] 社区治理

### 联系方式

- GitHub: [Repository Link]
- Discord: [Coming Soon]
- Twitter: [Coming Soon]

### 许可证

MIT License

---

## 贡献指南

欢迎贡献！请随时提交Pull Request。

### 贡献步骤
1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 报告问题

如果发现bug或有功能建议，请在GitHub Issues中提交。

---

## ⚠️ 免责声明 / Disclaimer

**中文**：
本项目为实验性软件，智能合约未经专业安全审计。请勿在生产环境中使用真实资金，否则风险自负。开发团队不对因使用本软件造成的任何损失负责。

**English**:
This is experimental software. The smart contracts have not been professionally audited. Do not use with real funds in production without proper security audits. The development team is not responsible for any losses incurred from using this software.

---

**Built with ❤️ by the AI Soccer On Crypto Team**

