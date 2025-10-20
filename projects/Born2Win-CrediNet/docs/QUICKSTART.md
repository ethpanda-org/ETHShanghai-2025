# 🚀 CrediNet 快速开始指南

> 5分钟快速上手 CrediNet 前端项目

---

## 📋 前置条件

- ✅ Node.js >= 18.0
- ✅ npm >= 9.0 或 yarn >= 1.22
- ✅ MetaMask 或其他 Web3 钱包

---

## 🎯 快速启动（3步）

### 1️⃣ 安装依赖

```bash
npm install
```

### 2️⃣ 配置环境变量

```bash
# 复制环境变量模板
copy env.example .env

# 编辑 .env 文件，添加 WalletConnect Project ID
# 从 https://cloud.walletconnect.com/ 免费获取
```

### 3️⃣ 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:5173` 🎉

---

## 🔗 合约对接（等待部署）

### 步骤 1: 获取合约地址

等合约同事部署后，会得到两个地址：
- **CrediNetSBT**: `0x...`
- **DynamicSBTAgent**: `0x...`

### 步骤 2: 更新配置

编辑 `src/contracts/addresses.ts`：

```typescript
export const SEPOLIA_ADDRESSES: ContractAddresses = {
  CrediNetCore: '0x...',
  CRNToken: '0x...',
  SBTRegistry: '0xCrediNetSBT合约地址',       // ← 填这里
  DataMarketplace: '0x...',
  DynamicSBTAgent: '0xDynamicSBTAgent合约地址',  // ← 填这里
}
```

### 步骤 3: 测试连接

1. 访问 `http://localhost:5173/web3-demo`
2. 点击右上角 "Connect Wallet"
3. 连接到 Sepolia 测试网
4. 查看合约调用是否成功

---

## 🎨 核心页面

| 路由 | 页面 | 功能 |
|------|------|------|
| `/dashboard` | 仪表盘 | C-Score、五维雷达图、数据源 |
| `/mint-sbt` | 铸造 SBT | 铸造动态 SBT + 动画 |
| `/profile` | 个人中心 | SBT 展示、动态更新 |
| `/web3-demo` | Web3 演示 | 合约调用测试 |
| `/data` | 数据管理 | 数据源授权 |
| `/marketplace` | 应用市场 | 生态应用 |

---

## 🤖 动态 SBT 功能

### 功能 1: 铸造时触发动画

```tsx
// 访问 /mint-sbt 页面
// 点击"铸造 SBT"按钮
// ✅ 自动触发铸造动画
// ✅ 自动注册到 DynamicSBTAgent
// ✅ 初始化默认评分 500
```

### 功能 2: Agent 动态更新

```tsx
// 评分更新流程：
// 1. Oracle 调用 agent.updateCreditScore()
// 2. 触发 ScoreUpdated 事件
// 3. 前端自动监听并刷新
// 4. 稀有度升级触发动画
```

### 五维评分系统

```
总分 = 基石×25% + 能力×30% + 财富×20% + 健康×15% + 行为×10%

稀有度分级：
- COMMON (普通): < 700
- RARE (稀有): 700-799
- EPIC (史诗): 800-899  
- LEGENDARY (传说): ≥ 900
```

---

## 🧪 测试步骤

### 前端测试（无需合约）

```bash
# 1. 启动项目
npm run dev

# 2. 测试页面路由
✅ http://localhost:5173/dashboard
✅ http://localhost:5173/mint-sbt
✅ http://localhost:5173/profile
✅ http://localhost:5173/web3-demo

# 3. 测试钱包连接
- 点击 "Connect Wallet"
- 选择 MetaMask
- 连接成功 ✅
```

### 合约集成测试（需要合约地址）

```bash
# 1. 配置合约地址（见上面步骤 2）

# 2. 连接钱包到 Sepolia 测试网

# 3. 测试铸造
访问 /mint-sbt → 点击铸造 → 确认交易

# 4. 测试动态更新
访问 /profile → 查看 SBT 卡片 → 等待评分更新
```

---

## 📚 技术栈

- **React 18.3** - UI 框架
- **TypeScript 5.6** - 类型系统
- **Vite 5.4** - 构建工具
- **TailwindCSS 3.4** - 样式
- **Wagmi 2.12** - 以太坊 React Hooks
- **RainbowKit 2.1** - 钱包连接
- **Framer Motion 11.5** - 动画

---

## 🐛 常见问题

### Q1: 钱包连接失败？

**A**: 检查环境变量
```bash
# .env 文件中确保有：
VITE_WALLETCONNECT_PROJECT_ID=你的PROJECT_ID
```

### Q2: 合约调用失败？

**A**: 检查合约地址配置
```typescript
// src/contracts/addresses.ts
// 确保地址不是 0x0000... 
```

### Q3: 页面显示 "暂无SBT"？

**A**: 需要先铸造 SBT
```
访问 /mint-sbt → 铸造 SBT → 返回 /profile 查看
```

### Q4: 动画不显示？

**A**: 检查交易状态
```typescript
// 确保交易已确认
// 打开浏览器控制台查看日志
```

---

## 🔧 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview

# 类型检查
npm run type-check

# Lint 检查
npm run lint
```

---

## 📖 相关文档

- 📄 [完整 README](./README.md)
- 📄 [Web3 集成指南](./docs/integration/WEB3_INTEGRATION_SUMMARY.md)
- 📄 [合约集成说明](./credinet-contract/INTEGRATION_GUIDE.md)
- 📄 [PRD 文档](./docs/PRD.md)

---

## 🎯 下一步

1. ✅ **前端已完成** - 所有功能已实现
2. ⏳ **等待合约部署** - 获取合约地址
3. ⏳ **配置地址** - 更新 `addresses.ts`
4. ⏳ **联调测试** - 测试完整流程
5. ⏳ **部署上线** - 部署到生产环境

---

## 💡 提示

- 🔥 访问 `/web3-demo` 查看所有 Web3 功能演示
- 🎨 访问 `/mint-sbt` 体验铸造动画
- 📊 访问 `/profile` 查看动态 SBT 展示
- 🤖 DynamicSBTAgent 会自动处理评分更新

---

**Built with ❤️ for ETH Shanghai 2025**
