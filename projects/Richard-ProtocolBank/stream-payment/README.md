# Stream Payment - 点对点支付可视化系统

<div align="center">

![Stream Payment](https://img.shields.io/badge/Ethereum-Sepolia-blue)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

**基于以太坊的企业级点对点支付可视化系统**

[在线演示](https://stream-payment.example.com) · [部署文档](./DEPLOYMENT.md) · [报告问题](https://github.com/protocolbank/stream-payment/issues)

</div>

---

## 📖 项目简介

Stream Payment 是一个创新的区块链支付可视化系统,通过交互式力导向图实时展示企业主钱包到供应商的资金流向。系统结合智能合约、现代Web技术和数据可视化,为企业提供透明、直观的支付管理解决方案。

### ✨ 核心特性

- 🎨 **交互式可视化** - D3.js力导向图实时展示支付网络
- ⛓️ **区块链集成** - 基于以太坊智能合约的去中心化支付
- 📊 **实时统计** - 支付次数、总金额、供应商数量等关键指标
- 👥 **供应商管理** - 完整的供应商信息和支付历史追踪
- 🔍 **交易详情** - 可排序、可筛选的支付记录表格
- 🔐 **安全可靠** - MetaMask钱包集成,链上数据不可篡改
- 📱 **响应式设计** - 适配桌面和移动设备

## 🎯 功能展示

### 1. 支付网络可视化

通过力导向图直观展示:
- **主钱包**(绿色大圆) - 企业主账户
- **供应商节点**(蓝色小圆) - 各个供应商
- **资金流向**(连接线) - 支付关系和金额

节点大小和连接粗细反映支付金额,支持拖拽、缩放、点击查看详情。

### 2. 统计面板

实时显示关键指标:
- 总支付次数
- 总支付金额 (ETH)
- 活跃供应商数量
- 平均支付金额

### 3. 供应商列表

展示所有供应商的:
- 名称和品牌
- 钱包地址
- 累计收款金额
- 支付次数
- 利润率
- 占比进度条

### 4. 支付详情表格

完整的交易记录,包含:
- 供应商信息
- 支付金额
- 类别标签
- 交易状态
- 时间戳
- Etherscan链接

支持按金额、状态、时间排序,按类别筛选。

## 🏗️ 技术架构

### 智能合约层

```
StreamPayment.sol
├── 供应商注册与管理
├── 支付创建与执行
├── 事件日志记录
└── 数据查询接口
```

**技术栈**:
- Solidity 0.8.20
- OpenZeppelin Contracts
- Hardhat 开发框架

### 后端服务层

```
Server
├── tRPC API (类型安全的RPC)
├── Drizzle ORM (数据库访问)
├── MySQL/TiDB (数据存储)
└── Express (HTTP服务器)
```

**核心功能**:
- 链上数据同步
- 统计数据计算
- 可视化数据生成
- 用户认证管理

### 前端应用层

```
Client
├── Next.js (React框架)
├── TypeScript (类型安全)
├── Wagmi + RainbowKit (Web3集成)
├── D3.js (数据可视化)
├── TailwindCSS (样式)
└── shadcn/ui (组件库)
```

## 🚀 快速开始

### 前置要求

- Node.js >= 18
- pnpm >= 8
- MetaMask钱包
- Sepolia测试网ETH

### 安装

```bash
# 克隆仓库
git clone https://github.com/protocolbank/stream-payment.git
cd stream-payment

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入必要配置

# 推送数据库schema
pnpm db:push

# 生成测试数据 (可选)
npx tsx scripts/seed-data.ts
```

### 开发

```bash
# 启动开发服务器
pnpm dev

# 访问 http://localhost:3000
```

### 部署智能合约

```bash
# 编译合约
npx hardhat compile

# 部署到Sepolia测试网
npx hardhat run scripts/deploy.js --network sepolia

# 更新 .env 中的 VITE_CONTRACT_ADDRESS
```

详细部署步骤请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 📁 项目结构

```
stream-payment/
├── contracts/              # Solidity智能合约
│   └── StreamPayment.sol
├── scripts/                # 部署和工具脚本
│   ├── deploy.js
│   └── seed-data.ts
├── client/                 # 前端应用
│   ├── src/
│   │   ├── components/     # React组件
│   │   │   ├── visualization/  # 可视化组件
│   │   │   └── dashboard/      # 仪表板组件
│   │   ├── pages/          # 页面
│   │   ├── hooks/          # 自定义Hooks
│   │   └── lib/            # 工具库
│   └── public/             # 静态资源
├── server/                 # 后端服务
│   ├── routers.ts          # tRPC路由
│   ├── db.ts               # 数据库查询
│   └── _core/              # 核心功能
├── drizzle/                # 数据库Schema
│   └── schema.ts
├── hardhat.config.cjs      # Hardhat配置
└── package.json
```

## 🔧 配置说明

### 环境变量

创建 `.env` 文件:

```env
# 数据库
DATABASE_URL=mysql://user:password@host:port/database

# 以太坊
VITE_CONTRACT_ADDRESS=0x...
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/...
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/...
PRIVATE_KEY=your_private_key

# WalletConnect
VITE_WALLETCONNECT_PROJECT_ID=your_project_id

# Etherscan
ETHERSCAN_API_KEY=your_api_key

# 应用配置
VITE_APP_TITLE=Stream Payment
VITE_APP_LOGO=/logo.svg
```

## 📊 数据库Schema

### suppliers (供应商表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 主键 |
| address | varchar | 钱包地址 |
| name | varchar | 供应商名称 |
| brand | varchar | 品牌名称 |
| category | varchar | 业务类别 |
| profitMargin | int | 利润率(基点) |
| totalReceived | varchar | 累计收款 |
| isActive | boolean | 是否活跃 |

### payments (支付表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 主键 |
| paymentId | varchar | 支付ID |
| fromAddress | varchar | 付款地址 |
| toAddress | varchar | 收款地址 |
| amount | varchar | 金额(wei) |
| category | varchar | 类别 |
| status | enum | 状态 |
| txHash | varchar | 交易哈希 |
| timestamp | datetime | 时间戳 |

## 🛠️ 开发指南

### 添加新功能

1. **智能合约**: 编辑 `contracts/StreamPayment.sol`
2. **数据库**: 更新 `drizzle/schema.ts` 并运行 `pnpm db:push`
3. **后端API**: 在 `server/routers.ts` 添加tRPC路由
4. **前端**: 创建组件并在 `client/src/pages/` 中使用

### 测试

```bash
# 运行Hardhat测试
npx hardhat test

# 检查TypeScript类型
pnpm type-check

# 代码格式化
pnpm format
```

## 🤝 贡献指南

欢迎贡献代码!请遵循以下步骤:

1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🔗 相关链接

- **Sepolia Etherscan**: https://sepolia.etherscan.io
- **Ethereum官网**: https://ethereum.org
- **Hardhat文档**: https://hardhat.org
- **Next.js文档**: https://nextjs.org
- **D3.js文档**: https://d3js.org

## 📧 联系方式

如有问题或建议,请通过以下方式联系:

- 提交 [GitHub Issue](https://github.com/protocolbank/stream-payment/issues)
- 发送邮件至: support@example.com

---

<div align="center">

**Built with ❤️ using Ethereum & Modern Web Technologies**

⭐ 如果这个项目对你有帮助,请给个Star!

</div>

