# FocusBond EVM 版本

这是 FocusBond 的 EVM (Ethereum Virtual Machine) 版本，支持在以太坊兼容链上运行。

## 🎯 功能特性

### ✅ 已整合的功能（从 apps-stage1/web-evm 迁移）

- **连接钱包** - 使用 RainbowKit 连接 MetaMask 等钱包
- **创建会话** - 设置专注时长和质押金额
- **实时倒计时** - HH:MM:SS 格式显示剩余时间
- **心跳监控** - 每2分钟检测心跳，超时显示警告
- **费用计算** - 实时计算中断费用（每10分钟增加20%）
- **中断惩罚** - 提前结束支付 FCRED 代币费用
- **完成奖励** - 完成会话获得 ETH 奖励 + 质押返还
- **余额显示** - ETH、USDC、FCRED 余额实时显示

## 🚀 快速开始

### 1. 启动本地区块链
```bash
cd /Users/mingji/postgraduate/FocusBond-ETH
./run.sh
```

### 2. 安装依赖并启动
```bash
cd /Users/mingji/postgraduate/FocusBond-ETH/apps/web
pnpm install
pnpm dev
```

### 3. 访问应用
打开浏览器：`http://localhost:3000/dashboard-evm`

### 4. 配置 MetaMask
- 网络名称: Anvil Local
- RPC URL: http://127.0.0.1:8545
- Chain ID: 31337
- 货币符号: ETH

### 5. 导入测试账户（可选）
```
私钥: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
地址: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

## 📚 文档索引

| 文档 | 说明 | 链接 |
|------|------|------|
| 快速启动 | 5分钟上手指南 | [QUICK_START.md](./QUICK_START.md) |
| 功能整合 | 详细功能说明 | [EVM_INTEGRATION.md](./EVM_INTEGRATION.md) |
| 测试指南 | 完整测试清单 | [TESTING_GUIDE.md](./TESTING_GUIDE.md) |
| 整合总结 | 技术实现细节 | [INTEGRATION_SUMMARY.md](./INTEGRATION_SUMMARY.md) |
| 文件清单 | 所有新增文件 | [FILES_CHECKLIST.md](./FILES_CHECKLIST.md) |

## 🏗️ 项目结构

```
apps/web/
├── app/
│   ├── dashboard-evm/          # EVM Dashboard 页面
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   └── session/
│   │       └── calculate-fee/  # 费用计算 API
│   │           └── route.ts
│   └── providers-evm.tsx       # EVM Providers
├── components/
│   ├── FocusBondApp.tsx        # 主要功能组件
│   ├── EVMDashboard.tsx        # Dashboard 主界面
│   ├── ConnectButton.tsx       # 钱包连接按钮
│   └── ui/                     # UI 组件库
│       ├── card.tsx
│       ├── button.tsx
│       ├── input.tsx
│       ├── label.tsx
│       └── badge.tsx
├── lib/
│   ├── wagmi.ts               # wagmi 配置
│   └── hooks/                 # 自定义 Hooks
│       ├── useStartSession.ts
│       ├── useBreakSession.ts
│       ├── useCompleteSession.ts
│       └── useHeartbeat.ts
└── [文档文件].md
```

## 🎮 使用流程

### 创建会话
1. 连接 MetaMask 钱包
2. 输入专注时长（分钟）
3. 输入质押金额（ETH）
4. 点击"创建会话"按钮
5. 在 MetaMask 中确认交易

### 管理会话
- **发送心跳**：点击"💓 心跳"保持会话活跃
- **查看费用**：实时显示中断费用和完成奖励
- **中断会话**：提前结束（支付 FCRED 费用）
- **完成会话**：时间到后完成（获得 ETH 奖励）

## 🔧 技术栈

- **框架**: Next.js 15
- **钱包**: wagmi 2.5.7 + RainbowKit 2.0.0
- **以太坊**: viem 2.7.10
- **状态**: @tanstack/react-query 5.24.1
- **样式**: Tailwind CSS
- **语言**: TypeScript 5.9.3

## ⚙️ 合约地址（Anvil Local）

```typescript
FocusBond: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
MockUSDC:  0x5FbDB2315678afecb367f032d93F642f64180aa3
FCRED:     0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

## 🎯 核心功能

### 倒计时系统
- 实时更新（每秒）
- HH:MM:SS 格式
- 时间结束自动提示

### 心跳监控
- 检测间隔：2分钟
- 超时警告显示
- 一键发送心跳

### 费用计算
- 每10分钟增加20%
- 实时 API 更新（每5秒）
- 费用倍数显示
- 滑点保护（+10%）

### 奖励系统
- 完成奖励：质押金额的5%
- 质押金全额返还
- 实时奖励预览

## 📊 数据刷新策略

| 数据类型 | 刷新频率 | 说明 |
|---------|---------|------|
| 会话状态 | 1秒 | 倒计时、心跳状态 |
| 费用计算 | 5秒 | 中断费用、奖励 |
| 余额 | 按需 | 交易后自动刷新 |

## ⚠️ 注意事项

### 使用前
1. ✅ 确保 Anvil 节点正在运行
2. ✅ MetaMask 已安装并连接到正确网络
3. ✅ 账户有足够的 ETH 和 FCRED

### 使用中
1. ⏰ 每2分钟发送一次心跳
2. 💰 确保有足够的 FCRED 支付中断费用
3. 📱 保持浏览器标签页活跃

### 已知限制
- 仅支持 Anvil Local 网络（Chain ID: 31337）
- 同一地址只能有一个活跃会话
- 需要手动发送心跳（暂无自动心跳）

## 🐛 故障排除

### 常见问题

**1. 无法连接钱包**
- 检查 MetaMask 是否已安装
- 确认已添加并切换到 Anvil Local 网络

**2. 创建会话失败**
- 检查 ETH 余额是否足够
- 确认参数有效（时长 1-65535，金额 ≥ 0.001）

**3. 中断会话失败**
- 检查 FCRED 余额是否足够

**4. 完成会话失败**
- 确认倒计时已结束
- 检查会话仍在活跃状态

更多问题请查看 [QUICK_START.md](./QUICK_START.md) 的故障排除部分。

## 🧪 测试

完整测试清单请查看 [TESTING_GUIDE.md](./TESTING_GUIDE.md)

主要测试项：
- ✅ 钱包连接
- ✅ 创建会话
- ✅ 倒计时功能
- ✅ 心跳检测
- ✅ 费用计算
- ✅ 中断会话
- ✅ 完成会话
- ✅ 错误处理

## 🔄 与旧版本的区别

### apps-stage1/web-evm (旧版本)
- ✅ 所有功能已保留
- ✅ 代码完全未修改
- ✅ 作为参考保留

### apps/web (新版本)
- ✅ 整合了所有旧版本功能
- ✅ 保持了新版本界面风格
- ✅ 优化了用户体验
- ✅ 添加了详细文档

## 📈 后续计划

### 短期优化
- [ ] 添加自动心跳功能
- [ ] 优化移动端体验
- [ ] 添加会话历史记录
- [ ] 实现通知提醒

### 长期规划
- [ ] 支持多链部署
- [ ] 添加社交功能
- [ ] 实现排行榜系统
- [ ] 开发移动端 App

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目采用 MIT 许可证

---

## 🎉 开始使用

准备好了吗？让我们开始专注之旅！

```bash
# 1. 启动 Anvil
./run.sh

# 2. 启动前端
cd apps/web
pnpm install
pnpm dev

# 3. 打开浏览器
open http://localhost:3000/dashboard-evm
```

**祝您专注愉快！** 🚀

