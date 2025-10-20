# ZK Flex - ETHShanghai 2025

> 基于零知识证明的链上隐私验资协议

## 一、提交物清单 (Deliverables)

- [x] GitHub 仓库：[https://github.com/TreapGoGo/zk-flex](https://github.com/TreapGoGo/zk-flex)（完整代码）
- [x] Demo 视频：[https://drive.google.com/file/d/1pst6BI9snMBEFiJs8w7Fcbaz_ynqhVVR/view?usp=sharing](https://drive.google.com/file/d/1pst6BI9snMBEFiJs8w7Fcbaz_ynqhVVR/view?usp=sharing) （≤ 3 分钟，中文）
- [x] 在线演示链接：本地可运行（见下方复现指南）
- [x] 合约部署信息：包含本地部署脚本与测试网部署指南
- [x] Pitch Deck：[https://gamma.app/docs/ZK-Flex-24p4lchlppubeic](https://gamma.app/docs/ZK-Flex-24p4lchlppubeic)

## 二、参赛队伍填写区 (Fill-in Template)

### 1) 项目概述 (Overview)

- **项目名称**：ZK Flex
- **一句话介绍**：证明你有钱，但不说你是谁 - 基于零知识证明的链上隐私验资协议
- **目标用户**：
  - 💼 需要证明资金实力但不想暴露地址的项目方
  - 💰 需要匿名验证资产的高净值个人
  - 🏛️ 需要隐私治理的 DAO 组织
- **核心问题与动机（Pain Points）**：
  - Web3 的透明性导致隐私泄露（地址跟踪、攻击风险）
  - 传统验资需要暴露具体钱包地址
  - 链下验证存在信任问题
- **解决方案（Solution）**：
  - 用户将钱包地址混入 32 个公开地址池中
  - 使用零知识证明技术证明"拥有池中某个地址且余额 ≥ 阈值"
  - 验证者可以链上验证证明，但无法知道具体是哪个地址

### 2) 架构与实现 (Architecture & Implementation)

- **总览图**：
```
用户（Bob）                    验证者（Alice）
    │                              │
    ├─ 1. 创建钱包池（32个地址）    │
    │     ↓                         │
    ├─ 2. 链上创建实例合约         │
    │     ↓                         │
    ├─ 3. 生成余额快照（链上）     │
    │     ↓                         │
    ├─ 4. 生成 ZK 证明（链下）     │
    │     ↓                         │
    └────────── 证明 ──────────→  验证（链上）
                                    ✅ 证明有效
                                    ❓ 不知道具体地址
```

- **关键模块**：
  - **前端**：Next.js 14 + TypeScript + Tailwind CSS + daisyUI
    - Bob 界面：创建实例、生成证明
    - Alice 界面：验证证明、查看历史
  - **合约**：Solidity 0.8.20 + Foundry
    - `WealthProofRegistry.sol`：主注册合约
    - `WealthProofInstance.sol`：实例合约（工厂模式）
    - `Groth16Verifier.sol`：ZK 验证器
  - **ZK 电路**：Circom 2.x
    - `wealth_proof.circom`：核心证明逻辑
    - 约束：ECDSA 签名验证 + 余额比较
  - **部署**：Scaffold-ETH 2 框架

- **依赖与技术栈**：
  - **前端**：Next.js, RainbowKit, wagmi, viem, snarkjs
  - **合约**：Foundry, OpenZeppelin
  - **ZK**：Circom, snarkjs, circomlib
  - **部署**：本地 Anvil, Sepolia 测试网

### 3) 合约与部署 (Contracts & Deployment)

#### 本地部署（快速开始）

**网络**：本地 Anvil 链

**部署脚本**：
```bash
# Terminal 1: 启动链
yarn chain

# Terminal 2: 部署合约
cd packages/foundry
forge script script/Deploy.s.sol \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://localhost:8545 \
  --broadcast

# 生成前端 ABI
node scripts-js/generateTsAbis.js
```

**核心合约地址**（本地链，每次重启会变）：
```
WealthProofRegistry: [部署后显示]
Groth16Verifier:     [部署后显示]
```

#### 测试网部署（可选）

**网络**：Sepolia

```bash
# 配置环境变量
export SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
export ETHERSCAN_API_KEY=your_key

# 部署
forge script script/Deploy.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify
```

### 4) 运行与复现 (Run & Reproduce)

#### 前置要求
- Node.js >= v20.18.3
- Yarn v1 或 v2+
- Git
- Foundry (foundryup)
- Circom >= 2.0.2（ZK 证明生成）
- **Windows 用户**：需要 WSL 2 环境

#### 环境变量样例

```bash
# packages/foundry/.env（可选，测试网部署用）
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ETHERSCAN_API_KEY=your_etherscan_key
ETH_KEYSTORE_ACCOUNT=scaffold-eth-custom

# packages/nextjs/.env.local（可选）
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_id
```

#### 一键启动（本地示例）

```bash
# 1. 克隆仓库
git clone https://github.com/TreapGoGo/zk-flex.git
cd zk-flex

# 2. 安装依赖
yarn install

# 3. 启动本地链（Terminal 1）
yarn chain

# 4. 部署合约（Terminal 2）
cd packages/foundry
forge script script/Deploy.s.sol \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://localhost:8545 \
  --broadcast

# 生成前端 ABI（重要！）
node scripts-js/generateTsAbis.js

# 5. 启动前端（Terminal 3）
cd ../..
yarn start

# 6. 打开浏览器
# http://localhost:3000 - 主页
# http://localhost:3000/zk-flex/bob - Bob 界面
# http://localhost:3000/zk-flex/alice - Alice 界面
```

#### 快速 Demo 脚本

```bash
# 在 packages/foundry 目录下运行
export BOB_REAL_ADDRESS=0x你的钱包地址
export BOB_PROXY_ADDRESS=0x代理地址
export ALICE_ADDRESS=0x验证者地址

# 运行 Demo（自动创建实例、生成快照、生成证明）
forge script script/DemoSimple.s.sol \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://localhost:8545 \
  --broadcast
```

#### 在线 Demo
- 本地运行：http://localhost:3000
- 测试网部署：[待部署]

#### 账号与测试说明
- 使用 Foundry 本地链自带的测试账户
- 或连接自己的 MetaMask 钱包
- 需要少量 ETH 用于交易（本地链免费）

### 5) Demo 与关键用例 (Demo & Key Flows)

#### 视频链接
- **Demo 视频**（≤3 分钟，中文）：[待添加]

#### 关键用例步骤

**用例 1：Bob 创建钱包池并生成证明**
1. 访问 Bob 界面 (`/zk-flex/bob`)
2. 输入 32 个钱包地址（其中一个是 Bob 的真实地址）
3. 点击 "Create Instance" 创建实例合约
4. 系统自动生成初始余额快照
5. Bob 输入私钥和阈值（如 10 ETH）
6. 点击 "Generate ZK Proof" 生成证明（约 1-2 秒）
7. 下载证明文件（JSON 格式）

**用例 2：Alice 验证证明**
1. 访问 Alice 界面 (`/zk-flex/alice`)
2. 上传 Bob 提供的证明文件
3. 输入实例合约地址
4. 输入验证阈值（如 10 ETH）
5. 点击 "Verify Proof" 提交链上验证
6. 查看验证结果：✅ 证明有效，❌ 证明无效

**用例 3：查看验证历史**
1. 在 Alice 界面查看所有验证记录
2. 显示：验证时间、实例地址、阈值、结果
3. 点击实例地址查看钱包池和快照信息

### 6) 可验证边界 (Verifiable Scope)

#### 完全开源并可复现的模块
- ✅ 所有智能合约代码（`packages/foundry/contracts/`）
- ✅ 所有前端代码（`packages/nextjs/`）
- ✅ ZK 电路代码（`circuits/`）
- ✅ 部署脚本和测试（`packages/foundry/script/`, `packages/foundry/test/`）
- ✅ 本地一键启动脚本

#### 技术限制说明
- ZK 证明生成需要约 1-2 秒（受电路复杂度限制）
- 当前版本仅支持 ETH 余额验证（未来可扩展到 ERC20）
- 钱包池固定 32 个地址（隐私性与 gas 成本的平衡）

### 7) 路线图与影响 (Roadmap & Impact)

#### 赛后 1-3 周
- [ ] 部署到主流测试网（Sepolia, Arbitrum Sepolia）
- [ ] 优化 ZK 证明生成速度（Web Worker）
- [ ] 添加 ERC20 代币支持
- [ ] 完善文档和教程

#### 赛后 1-3 个月
- [ ] 主网部署与审计
- [ ] 支持多快照验证（历史时间点）
- [ ] 集成 Chainlink Automation（自动快照）
- [ ] 开发移动端界面
- [ ] 与 DeFi 协议集成（如 Aave, Compound）

#### 预期对以太坊生态的价值
- **隐私保护**：为 Web3 用户提供隐私验资解决方案
- **应用场景**：支持 DAO 治理、DeFi 协议、NFT 白名单等场景
- **技术创新**：推动 ZK 技术在实际场景的应用
- **生态贡献**：开源工具，供其他开发者参考学习

### 8) 团队与联系 (Team & Contacts)

- **团队名**：TreapGoGo
- **成员与分工**：
  - [TreapGoGo] - 全栈开发 - 合约、电路、前端、部署
- **联系方式**：
  - GitHub: https://github.com/TreapGoGo
  - Email: [待添加]
  - Telegram: [待添加]
- **可演示时段（时区）**：UTC+8 (中国标准时间)，任意时间可演示

## 三、快速自检清单 (Submission Checklist)

- [x] README 按模板填写完整（概述、架构、复现、Demo、边界）
- [x] 本地可一键运行，关键用例可复现
- [x] 本地合约部署脚本与验证链接已提供
- [ ] Demo 视频（≤3 分钟，中文）链接可访问
- [x] 完全开源，所有代码可验证
- [x] 联系方式与可演示时段已填写

---

## 四、技术亮点 (Technical Highlights)

### 零知识证明技术
- **电路约束**：约 15,000 个 R1CS 约束
- **证明系统**：Groth16（验证 gas ~280k）
- **隐私保证**：匿名集大小 32（1/32 猜中概率）

### 智能合约设计
- **工厂模式**：用户隔离，可扩展
- **Gas 优化**：批量余额读取，优化存储
- **安全性**：使用 OpenZeppelin 标准库

### 前端技术
- **框架**：Scaffold-ETH 2（最佳实践）
- **Web3 集成**：RainbowKit + wagmi + viem
- **用户体验**：实时状态更新、错误处理、交易反馈

---

## 五、文档导航 (Documentation)

| 文档 | 用途 |
|------|------|
| [README.md](README.md) | 项目介绍与黑客松提交（你在这里）|
| [运行指南.md](运行指南.md) | **详细启动步骤（必读）** |
| [PRODUCT.md](PRODUCT.md) | 完整产品规格与技术设计 |
| [SLIDES.md](SLIDES.md) | Pitch 演示文稿大纲 |
| [ROADMAP.md](ROADMAP.md) | 开发进度与路线图 |

---

## 六、致谢 (Acknowledgments)

本项目基于以下开源工具和框架构建：
- [Scaffold-ETH 2](https://scaffoldeth.io/) - 快速 dApp 开发框架
- [Foundry](https://book.getfoundry.sh/) - 智能合约开发工具
- [Circom](https://docs.circom.io/) - ZK 电路编译器
- [snarkjs](https://github.com/iden3/snarkjs) - ZK 证明生成库

特别感谢 ETHShanghai 2025 组织者和评委！

---

**License**: MIT  
**Repository**: https://github.com/TreapGoGo/zk-flex  
**Version**: v1.0.0 (Hackathon Submission)
