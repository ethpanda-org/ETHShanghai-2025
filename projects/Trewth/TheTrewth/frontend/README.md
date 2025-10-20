# Trewth Interaction

Trewth 网络的交互式前端应用，提供代币交易、代币发行、AI代理交互和事件币监控等功能。

## 项目结构

```
Trewth-Interaction/
├── public/                 # 静态资源文件
├── src/                    # 源代码目录
│   ├── components/         # React 组件
│   │   ├── Trading/        # 交易相关组件
│   │   │   ├── TokenInfo.tsx        # 代币信息展示
│   │   │   ├── TokenPrice.tsx       # 代币价格图表
│   │   │   └── EventCoinTading.tsx  # 事件币交易
│   │   ├── TokenLaunch/    # 代币发行组件
│   │   │   └── TokenMetadata.tsx    # 代币元数据配置
│   │   ├── AgentInteraction/  # AI代理交互组件
│   │   │   ├── Session.tsx          # 会话管理
│   │   │   └── Agent_setting.tsx    # 代理设置
│   │   ├── EventCoinMonitor/  # 事件币监控组件
│   │   │   ├── NewlyListToken.tsx   # 新上市代币
│   │   │   └── CoinLiquity.tsx      # 代币流动性
│   │   └── TabNavigation.tsx   # 标签导航
│   ├── App.tsx             # 主应用组件
│   ├── App.css             # 应用样式
│   ├── index.tsx           # 应用入口
│   └── index.css           # 全局样式
├── package.json            # 项目依赖配置
├── tsconfig.json           # TypeScript 配置
└── README.md               # 项目文档

```
## 功能模块

1. **Trading (交易)**: 代币交易功能，包括代币信息查看、价格走势图表、事件币交易
2. **Token Launch (代币发行)**: 创建和发行新代币
3. **Agent Interaction (AI代理交互)**: 与 AI 代理进行会话和设置
4. **Event Coin Monitor (事件币监控)**: 监控新上市代币和流动性变化

## 快速开始

### 环境要求

- Node.js >= 14.0.0
- npm >= 6.0.0

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm start
```

应用将在开发模式下启动，打开浏览器访问 [http://localhost:3000](http://localhost:3000) 查看应用。

页面将在你编辑代码时自动重新加载，控制台会显示任何 lint 错误。

### 构建生产版本

```bash
npm run build
```

构建生产版本到 `build` 文件夹。
React 将在生产模式下正确打包，并优化构建以获得最佳性能。

### 运行测试

```bash
npm test
```

在交互式监视模式下启动测试运行器。
