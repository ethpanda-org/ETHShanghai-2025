# PayWay Frontend

PayWay 是一个基于智能合约的自动化资金托管与结算平台，让企业无需区块链技术背景即可安全、高效地利用稳定币完成贸易结算。

## 🎯 项目状态

**✅ 第一阶段完成：基础架构与钱包连接**

已实现功能：
- ✅ RainbowKit 钱包连接（支持 MetaMask, OKX Wallet 等）
- ✅ Sepolia 测试网配置
- ✅ 产品首页（Hero + 特性展示）
- ✅ 合约管理面板框架
- ✅ 响应式布局（Header + Footer）
- ✅ Supabase 配置（已集成，待使用）

## 🚀 快速开始

### 1. 安装依赖

依赖已安装，包括：
- Next.js 15.5.6
- RainbowKit 2.2.9
- wagmi 2.18.1
- Supabase
- shadcn/ui

### 2. 配置环境变量

**⚠️ 重要：** 您需要手动创建 `.env.local` 文件：

```bash
# 在 frontend/payway 目录下创建 .env.local
touch .env.local
```

添加以下配置：

```env
# Supabase配置（从 https://supabase.com 获取）
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# WalletConnect配置（从 https://cloud.walletconnect.com 免费获取）
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 准备测试环境

1. 安装 [MetaMask](https://metamask.io) 浏览器扩展
2. 切换到 **Sepolia 测试网**
3. 获取测试 ETH：
   - https://sepoliafaucet.com
   - https://www.alchemy.com/faucets/ethereum-sepolia

## 📁 项目结构

```
src/
├── app/
│   ├── layout.tsx              # Root Layout + Providers
│   ├── page.tsx               # 产品首页
│   └── dashboard/
│       └── page.tsx           # 合约管理面板
├── components/
│   ├── ui/                    # shadcn/ui 组件库
│   ├── layout/
│   │   ├── Header.tsx         # 导航栏 + 钱包连接
│   │   └── Footer.tsx         # 页脚
│   └── home/
│       ├── HeroSection.tsx    # 首页Hero区域
│       └── FeaturesSection.tsx # 特性展示
├── lib/
│   ├── supabase.ts            # Supabase 客户端
│   ├── wagmi.ts               # wagmi 配置
│   └── utils.ts               # 工具函数
└── providers/
    └── Providers.tsx          # Web3 Providers
```

## 🛠️ 技术栈

- **框架：** Next.js 15 (App Router)
- **样式：** Tailwind CSS 4 + shadcn/ui
- **Web3：** RainbowKit 2.2.9 + wagmi 2.x + viem 2.x
- **数据库：** Supabase
- **状态管理：** TanStack React Query

## 📖 详细文档

查看 [SETUP.md](./SETUP.md) 获取完整的设置指南和故障排除。

## 🗺️ 开发路线图

### ✅ 阶段 1：基础架构 (已完成)
- [x] 项目初始化
- [x] RainbowKit 钱包连接
- [x] 产品首页
- [x] 管理面板框架

### 🚧 阶段 2：合约创建（进行中）
- [ ] 创建托管合约表单
- [ ] 智能合约交互
- [ ] USDT授权和转账

### 📋 阶段 3：资金释放
- [ ] 邮件触发系统
- [ ] 后端预言机服务
- [ ] 放款执行

### 📋 阶段 4：合约管理
- [ ] 合约列表展示
- [ ] 合约详情页
- [ ] 取消合约功能

## 🧪 测试清单

启动项目后，请验证：

- [ ] 访问首页显示产品介绍
- [ ] 点击"连接钱包"可以唤起 MetaMask
- [ ] 连接成功后显示钱包地址（掩码格式）
- [ ] 可以切换到 Sepolia 测试网
- [ ] 可以断开钱包连接
- [ ] 访问 /dashboard 显示管理面板
- [ ] 未连接时显示提示信息
- [ ] 已连接时显示欢迎信息和空状态

## 📝 开发命令

```bash
# 开发服务器
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint

# 添加 shadcn/ui 组件
pnpm dlx shadcn@latest add [component-name]
```

## 🔗 相关链接

- [产品需求文档](../../docs/prd.md)
- [RainbowKit 文档](https://rainbowkit.com)
- [wagmi 文档](https://wagmi.sh)
- [shadcn/ui 文档](https://ui.shadcn.com)
- [Supabase 文档](https://supabase.com/docs)

## 📞 问题反馈

遇到问题？请检查：
1. 环境变量是否正确配置
2. 钱包网络是否切换到 Sepolia
3. WalletConnect Project ID 是否有效
4. 浏览器控制台的错误信息

详见 [SETUP.md](./SETUP.md) 的故障排除部分。
