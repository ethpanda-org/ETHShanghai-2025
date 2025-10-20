# FocusBond-ETH 🎯

> 基于以太坊的去中心化专注协议 - 通过经济激励保持专注

[![Tests](https://img.shields.io/badge/tests-19%20passing-brightgreen)](./test/)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](./test/)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Solidity](https://img.shields.io/badge/solidity-0.8.19-red)](./contracts/)

**⚠️ 合规声明 / COMPLIANCE NOTICE**

本项目不进行任何代币销售、预售、空投销售或募资活动。"专注积分(FCRED)"是不可转让的应用内积分，仅用于费用折扣和成就系统，不具有投资价值或价格升值预期。

This hackathon prototype does not conduct any token sale. "Focus Credits (FCRED)" are non-transferable, app-internal credits used only for fee discounts. They are not designed for investment or price appreciation.

---

## 🚀 快速开始（三步启动）

### 步骤 1: 启动区块链
```bash
# 终端 1
anvil --port 8545 --gas-price 500000000
```

### 步骤 2: 部署合约
```bash
# 终端 2
cd /Users/mingji/postgraduate/FocusBond-ETH
forge script script/DeployCompliant.s.sol \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

### 步骤 3: 启动前端
```bash
# 终端 3
cd /Users/mingji/postgraduate/FocusBond-ETH/apps/web-evm
npm run dev
```

### 访问应用
打开浏览器: **http://localhost:3000**

> 💡 **提示**: 部署时会自动为测试账户 `0x891402c216Dbda3eD7BEB0f95Dd89b010523642A` 分配 1 ETH 和 1000 FOCUS

## 🎯 专注积分系统

**合规的积分经济模型**：

- 🎯 **ETH质押**: 用ETH质押创建专注会话
- 💎 **积分奖励**: 完成会话获得专注积分(FCRED)奖励
- 💸 **服务费折扣**: 使用积分抵扣会话中断服务费 (基础100 FCRED)
- 📈 **费用递增**: 会话时间越长，中断服务费越高 (每10分钟+20%)
- 🚫 **不可转让**: 积分仅限个人使用，无法转让或交易

## ✨ 核心特性

🔒 **智能质押** - 质押 ETH 开始专注会话  
💰 **动态费用** - 提前结束支付递增费用 (基础费用 × 1.2^时间步长)  
🎁 **完整退款** - 达成目标获得 100% 质押返还  
🤖 **看门狗机制** - 自动检测和处理超时会话  
🪙 **多代币支付** - 支持 USDC 和 FOCUS 代币支付费用  
💓 **心跳监控** - 实时监控会话活跃状态  

## 🏗️ 技术架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │ Smart Contracts │
│   (Next.js)     │◄──►│   (Next.js)     │◄──►│   (Solidity)    │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • Fee Calc API  │    │ • FocusBond     │
│ • Wallet UI     │    │ • Heartbeat API │    │ • MockUSDC      │
│ • Session Mgmt  │    │ • Watchdog Cron │    │ • MockFOCUS     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   SDK-EVM       │
                    │   (TypeScript)  │
                    │                 │
                    │ • Client Lib    │
                    │ • Type Defs     │
                    │ • Utils         │
                    └─────────────────┘
```

### 🔧 技术栈

- **智能合约**: Solidity 0.8.19 + Foundry + OpenZeppelin
- **SDK**: TypeScript + Viem + 类型安全
- **前端**: Next.js 15 + Wagmi + RainbowKit + Tailwind CSS
- **后端**: Next.js API Routes + Cron Jobs
- **部署**: Vercel + Base Sepolia

## 👨‍💻 开发指南

### 📁 项目结构
```
FocusBond-ETH/
├── contracts/          # 智能合约 (FocusBond, MockUSDC, FocusCredit)
├── apps/web-evm/      # 前端应用 (Next.js + Wagmi + RainbowKit)
├── packages/sdk-evm/  # SDK 包 (TypeScript)
├── script/            # 部署脚本
└── test/             # 测试文件 (19个测试用例, 100%覆盖)
```

### 🧪 测试
```bash
forge test              # 合约测试
forge test -vvv        # 详细输出
```

### 🔧 常见问题

| 问题 | 解决方案 |
|------|---------|
| Nonce 错误 | `pkill anvil && anvil --port 8545 --gas-price 500000000` |
| 端口占用 | `lsof -i :8545` 然后 `kill <PID>` |
| 钱包连接失败 | 添加 Anvil 网络 (RPC: http://127.0.0.1:8545, Chain ID: 31337) |
| 合约地址不匹配 | 更新 `apps/web-evm/src/lib/wagmi.ts` 中的地址 |

📖 **完整文档**: [开发指南](./docs/开发指南.md) | [启动指令](./START_COMMANDS.md) | [测试账户](./TEST_ACCOUNT_INFO.md)

---

## 📋 环境要求

- **Node.js** 18+
- **Foundry** (forge, cast, anvil)
- **MetaMask** 浏览器扩展

### 安装 Foundry
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

---

## ⚙️ 配置 MetaMask

1. 打开 MetaMask → 网络下拉菜单 → 添加网络 → 手动添加网络
2. 填入以下信息:

| 配置项 | 值 |
|--------|------|
| 网络名称 | Anvil Local |
| RPC URL | http://127.0.0.1:8545 |
| 链 ID | 31337 |
| 货币符号 | ETH |

3. **导入测试账户**（可选）:
   - MetaMask → 导入账户 → 私钥
   - 私钥: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

---

## 🔑 测试账户信息

### 自动配置账户（推荐）
```
地址: 0x891402c216Dbda3eD7BEB0f95Dd89b010523642A
初始余额: 1 ETH + 1000 FOCUS（部署时自动分配）
```

### Anvil 默认账户
```
地址: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
私钥: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
余额: 10,000 ETH
```

### 合约地址（每次部署后需确认）
```
FocusBond:    0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
MockUSDC:     0x5FbDB2315678afecb367f032d93F642f64180aa3
FocusCredit:  0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

---

## 🔌 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/session/calculate-fee` | GET | 计算中断费用 |
| `/api/session/heartbeat` | POST | 更新心跳状态 |
| `/api/cron/watchdog` | POST | 看门狗监控（需认证） |

---

## 📊 费用机制

递增费用模式：`费用 = 基础费用 × (1 + 0.2 × floor(已用时间/10分钟))`

| 时间段 | 费用倍数 | 示例 (基础100 FOCUS) |
|--------|---------|---------------------|
| 0-9分钟 | 1.0x | 100 FOCUS |
| 10-19分钟 | 1.2x | 120 FOCUS |
| 20-29分钟 | 1.4x | 140 FOCUS |
| 30-39分钟 | 1.6x | 160 FOCUS |

---

## 📖 相关文档

| 文档 | 说明 |
|------|------|
| [开发指南](./docs/开发指南.md) | 开发环境设置和规范 |
| [启动指令](./START_COMMANDS.md) | 详细的启动命令和调试方法 |
| [测试账户](./TEST_ACCOUNT_INFO.md) | 测试账户使用说明 |

## 🤝 贡献指南

1. Fork 项目 → 2. 创建功能分支 → 3. 提交更改 → 4. 推送分支 → 5. 创建 Pull Request

详见：[docs/开发指南.md](./docs/开发指南.md)

## 🏆 项目里程碑

✅ v0.1.0 - v0.4.0: 核心功能完成 | 🔄 v0.5.0: 测试网部署（进行中） | ⏳ v1.0.0: 主网发布

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## ⚠️ 免责声明

本项目仅用于教育和研究目的。智能合约尚未经过专业审计，请在生产环境使用前进行充分的测试和安全审计。

---

<div align="center">

**🎯 专注创造价值，让区块链激励更好的自己！**

Made with ❤️ by the FocusBond Team

[Website](https://focusbond-eth.vercel.app) | [Docs](./docs/) | [Issues](https://github.com/Jim3503/FocusBond-ETH/issues)

</div>