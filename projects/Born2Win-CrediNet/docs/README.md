# CrediNet MVP - ETH Shanghai 2025

<div align="center">
  
  ![CrediNet Logo](https://img.shields.io/badge/CrediNet-去中心化信用网络-blue?style=for-the-badge)
  
  **基于区块链的去中心化信用协议**
  
  [![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
  [![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  
</div>

---

## 📖 项目简介

CrediNet 是一个基于区块链的去中心化信用协议，为用户提供**自有、自治、自享**的信用数据服务。通过创新的"信用光谱"模型（五维评估：基石、能力、财富、健康、行为），将用户的链上链下行为转化为动态可视的 SBT 勋章。

### 核心特性

✨ **多维信用模型** - 五维科学量化人类信用  
🔐 **数据主权** - 用户完全拥有和控制自己的数据  
💰 **经济激励** - 通过 CRN 代币奖励数据贡献  
🎨 **动态 SBT** - 可视化、可成长的链上信用肖像  
🌐 **生态应用** - 连接 DeFi、招聘、保险、DAO 等场景

---

## 🚀 快速开始

### 前置要求

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0 或 **yarn** >= 1.22.0
- **MetaMask** 或其他 Web3 钱包

### 安装依赖

```bash
# 克隆项目
git clone <your-repo-url>
cd CrediNet

# 安装依赖
npm install
# 或
yarn install
```

### 配置环境变量

```bash
# 复制环境变量模板
copy env.example .env

# 编辑 .env 文件，添加 WalletConnect Project ID
# 从 https://cloud.walletconnect.com/ 免费获取
VITE_WALLETCONNECT_PROJECT_ID=你的PROJECT_ID
```

### 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

项目将在 `http://localhost:5173` 启动 🎉

### 构建生产版本

```bash
npm run build
# 或
yarn build
```

构建产物将生成在 `dist/` 目录下。

---

## 📖 详细文档

- 📄 [快速开始指南](./QUICKSTART.md) - 5分钟上手
- 📄 [部署清单](./DEPLOYMENT_CHECKLIST.md) - 部署前检查
- 📄 [合约集成指南](./credinet-contract/INTEGRATION_GUIDE.md) - 合约对接

---

## 📁 项目结构

```
CrediNet/
├── docs/                      # 文档
│   └── PRD.md                # 产品需求文档
├── src/
│   ├── components/           # React组件
│   │   ├── charts/          # 图表组件（雷达图等）
│   │   ├── dashboard/       # Dashboard页面组件
│   │   ├── layout/          # 布局组件（Navbar, Footer）
│   │   ├── particles/       # 粒子背景效果
│   │   └── ui/              # 通用UI组件（Card, Button等）
│   ├── pages/               # 页面组件
│   │   ├── Dashboard.tsx    # 仪表盘（核心页面）
│   │   ├── Data.tsx         # 数据管理
│   │   ├── Marketplace.tsx  # 应用市场
│   │   ├── Profile.tsx      # 个人中心
│   │   └── Settings.tsx     # 设置
│   ├── mock/                # Mock数据
│   │   └── data.ts          # 模拟数据
│   ├── types/               # TypeScript类型定义
│   │   └── index.ts         # 全局类型
│   ├── App.tsx              # 应用入口
│   ├── main.tsx             # React挂载
│   └── index.css            # 全局样式
├── package.json
├── tailwind.config.js       # TailwindCSS配置
├── vite.config.ts           # Vite配置
└── tsconfig.json            # TypeScript配置
```

---

## 🎨 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| **React** | 18.3 | 前端框架 |
| **TypeScript** | 5.6 | 类型系统 |
| **Vite** | 5.4 | 构建工具 |
| **TailwindCSS** | 3.4 | CSS框架 |
| **Framer Motion** | 11.5 | 动画库 |
| **Recharts** | 2.12 | 数据可视化 |
| **React Router** | 6.26 | 路由管理 |
| **Zustand** | 4.5 | 状态管理 |
| **ethers.js** | 6.13 | 以太坊交互 |
| **wagmi** | 2.12 | React Hooks for Ethereum |
| **viem** | 2.21 | TypeScript Ethereum 库 |
| **RainbowKit** | 2.1 | 钱包连接 UI |
| **React Query** | 5.56 | 数据获取和缓存 |

---

## 🌟 核心功能

### 1. Dashboard（仪表盘）
- ✅ 用户 DID 和 C-Score 展示
- ✅ 五维信用雷达图（可交互）
- ✅ 动态 SBT 勋章预览（实时渲染）
- ✅ CRN 代币余额和收益统计
- ✅ 数据源连接状态（World ID, self.xyz, Wallet, Off-chain VC）
- ✅ 生态应用快捷入口
- ✅ 使用与收益记录表格

### 2. Data（数据管理）
- ✅ 数据源连接/断开（Toggle开关）
- ✅ 已接入数据源列表
- ✅ 数据授权管理
- ✅ 使用记录和撤销授权

### 3. Marketplace（应用市场）
- ✅ 应用分类筛选（DeFi, 招聘, 保险, 社交, DAO, KYC）
- ✅ 应用搜索
- ✅ 应用卡片展示（需授权维度、状态）
- ✅ 立即使用/即将推出

### 4. Profile（个人中心）
- ✅ 用户信息和 C-Score
- ✅ SBT 勋章列表
- ✅ CRN 积分和成就
- ✅ 安全与隐私设置

### 5. Settings（设置）
- ✅ 通用设置（显示名称、语言、时区）
- ✅ 通知设置（系统通知、收益提醒、授权变化）
- ✅ 外观设置（主题、对比度）
- ✅ 隐私与数据

---

## 🎯 黑客松路线图

### ✅ Phase 1: Foundation（已完成）
- [x] 项目架构搭建
- [x] TailwindCSS主题配置
- [x] 粒子背景效果
- [x] TypeScript类型定义
- [x] Mock数据创建

### ✅ Phase 2: Core Pages（已完成）
- [x] Dashboard页面（核心展示）
- [x] Data页面（数据管理）
- [x] Marketplace页面（应用市场）
- [x] Profile页面（个人中心）
- [x] Settings页面（设置）

### ✅ Phase 3: Web3 Integration（已完成）
- [x] 钱包连接集成（RainbowKit）
- [x] Wagmi + Viem 配置
- [x] 智能合约 ABI 配置
- [x] 自定义 Hooks（useCrediNet, useCRNToken, useSBTRegistry, useDataMarketplace）
- [x] Web3 工具函数
- [x] Web3 演示页面
- [x] 完整技术文档
- [ ] World ID SDK 集成（可选）
- [ ] self.xyz SDK 集成（可选）

### 🚧 Phase 4: Optimization（待实现）
- [ ] 页面动画优化
- [ ] 响应式布局完善
- [ ] 性能优化
- [ ] Demo演示准备

---

## 📊 Mock 数据说明

当前项目使用 Mock 数据进行开发和演示，所有数据来自 `src/mock/data.ts`。

主要 Mock 数据包括：
- **mockUser** - 用户信息
- **mockCreditScore** - 信用分数（五维数据）
- **mockCRNBalance** - CRN代币余额
- **mockDataSources** - 数据源连接状态
- **mockUsageRecords** - 使用与收益记录
- **mockSBTBadges** - SBT勋章
- **mockEcoApps** - 生态应用列表
- **mockDataAuthorizations** - 数据授权记录

---

## 🎨 UI设计风格

### 颜色系统
- **主背景**: `#0f1729` (深蓝黑)
- **卡片背景**: `#1a1e3d` (深蓝紫)
- **边框**: `#2d3250` (中灰蓝)
- **主色调**: 蓝紫渐变 `#6366f1 → #8b5cf6 → #06b6d4`

### 信用光谱配色
- **基石 K**: `#8b5cf6` 紫色
- **能力 A**: `#3b82f6` 蓝色
- **财富 F**: `#f59e0b` 金色
- **健康 H**: `#10b981` 绿色
- **行为 B**: `#ef4444` 红色

### 特效
- 毛玻璃卡片（`backdrop-blur-xl`）
- 渐变边框
- 粒子背景动画
- 光晕效果（Hover）

---

## 🔗 相关链接

- 📄 [完整PRD文档](./docs/PRD.md)
- 📄 [白皮书（中文版）](./doc/CrediNet白皮书（中文版）.md)
- 🎨 [Figma设计稿](https://www.figma.com/design/bKA1hWdzMCjdR6NNUBJW9f/Untitled)
- 🌐 [World ID Docs](https://docs.worldcoin.org/)
- 🌐 [self.xyz Docs](https://docs.self.xyz/)

---

## 👥 团队

- **项目负责人**: Born2Win - 智能合约 + 后端开发
- **前端开发**: [你的名字] - PC端前端实现

---

## 📝 开发注意事项

### 当前状态
✅ **已完成**: 所有页面UI、粒子背景、Mock数据、Web3集成、智能合约交互  
⚠️ **待配置**: WalletConnect Project ID、智能合约地址、合约ABI  
🔜 **可选集成**: World ID、self.xyz、后端API

### Web3 集成说明
前端已完成智能合约直接调用的完整架构：

1. **钱包连接**: ✅ RainbowKit 集成完成
2. **合约交互**: ✅ Wagmi + Viem 配置完成
3. **自定义 Hooks**: ✅ 4个核心 Hooks（信用数据、Token、SBT、数据市场）
4. **工具函数**: ✅ 地址格式化、错误处理等
5. **演示页面**: ✅ `/web3-demo` 页面展示所有功能

**📚 详细文档**:
- [Web3 集成指南](./WEB3_INTEGRATION_GUIDE.md) - 完整技术文档
- [快速开始](./WEB3_QUICKSTART.md) - 5分钟上手
- [部署清单](./DEPLOYMENT_CHECKLIST.md) - 部署前检查
- [合约集成说明](./CONTRACT_INTEGRATION_README.md) - 与后端协作
- [集成总结](./WEB3_INTEGRATION_SUMMARY.md) - 完成情况总结

### 性能优化
- 粒子数量可根据设备性能动态调整（当前60个）
- 大型列表考虑虚拟滚动
- 图片资源使用懒加载

---

## 🔍 项目审计状态

**最新更新**: 2025-10-14 ✅  
**前端完成度**: 95/100 (优秀)  
**部署就绪度**: 
- ✅ 前端完全就绪（只需合约地址）
- ✅ 动态 SBT 功能完成
- ✅ 铸造动画功能完成
- ⏳ 等待合约部署到测试网

### 已修复的问题
- ✅ 删除代码冗余（handover目录、重复合约）
- ✅ CrediNetSBT.sol 安全加固（添加容错机制）
- ✅ 环境变量配置示例
- ✅ 安全改进文档

### 待修复的关键问题
- ⏳ agent-service 功能完善（5-7天）
- ⏳ DynamicSBTAgent 安全增强（1天）
- ⏳ SBT 图片资源上传（3-4天）

**详细报告**: 
- 📄 [完整审计报告](./AUDIT_REPORT_FULL_2024.md)
- 📋 [修复清单](./AUDIT_FIXES_CHECKLIST.md)
- 📊 [审计总结](./AUDIT_SUMMARY.md)

---

## 🐛 已知问题

- [x] ~~钱包连接按钮为模拟状态~~，已集成RainbowKit ✅
- [x] ~~代码冗余问题~~，已清理 ✅
- [x] ~~合约安全隐患~~，已修复 ✅
- [x] ~~合约 ABI 提取~~，已完成 ✅
- [x] ~~动态 SBT 功能~~，已完成 ✅
- [x] ~~铸造动画功能~~，已完成 ✅
- [ ] agent-service 五维数据采集未实现（P1）
- [ ] 授权弹窗需要实现Modal组件
- [ ] 数据导出功能待实现
- [ ] Toast通知系统待添加
- [ ] 响应式布局在移动端需要优化

## ⚙️ Web3 配置

### 1. 环境变量配置

创建 `.env` 文件：

```bash
# 从 https://cloud.walletconnect.com/ 获取
VITE_WALLETCONNECT_PROJECT_ID=你的PROJECT_ID
```

### 2. 更新智能合约地址

编辑 `src/contracts/addresses.ts`：

```typescript
export const SEPOLIA_ADDRESSES: ContractAddresses = {
  CrediNetCore: '0x你的合约地址',
  CRNToken: '0x你的合约地址',
  SBTRegistry: '0x你的合约地址',
  DataMarketplace: '0x你的合约地址',
}
```

### 3. 测试 Web3 功能

访问 `http://localhost:5173/web3-demo` 查看完整功能演示。

---

## 📄 License

本项目仅用于 ETH Shanghai 2025 黑客松展示。

---

## 🙏 致谢

感谢 ETH Shanghai 2025 组织方提供的机会！  
感谢所有开源项目的贡献者！

**Built with ❤️ for DeSoc**
