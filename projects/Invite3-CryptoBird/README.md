# CryptoBird产品介绍

CryptoBird 是一款“社群版本的Kaito”，让“嘴撸”赛道从推特走入以telegram为代表的社群。

- CryptoBird会监控社群的Meme币发车信号和群成员的跟车订单，将群成员的交易手续费的80%返佣给群主，让群主的每一次发车信号都有所收获；
- CryptoBird会跟踪社群中的Meme币喊单信号的未来表现，分析社群喊单的胜率，为加密玩家发现最值得追随的聪明社群；
- CryptoBird会使用AI技术总结出某个项目在社群中的讨论热度，给数以万计的社群打分，讨论热度越高的社群可以从项目奖池中瓜分更多奖励，为项目方/庄家提供有效的营销工具。

# CryptoBird核心功能
对于加密玩家：
- 社群排行榜，社群喊单胜率最高和喊单信号数最多的社群进行展示；
- token详情页，展示token的K线，最新价格，24小时成交量，社群发车信号，社群跟车订单，社群围绕该Meme币的总结，快速买卖Meme币；

对于群主来说：
- campaign活动：可以查看进行中和已结束的campaign活动，可以报名活动，开启社群嘴撸，在活动结束后领取奖励；
- 佣金数据看板：可以查看社群的佣金数据，社群的信号胜率，可以提现全部佣金；
- AI-chat: 可以将社群消息导出发给AI助手，AI会进行总结。

## 详细功能结构
- 顶部导航与页面切换（`src/App.tsx`）
  - Home：欢迎页与导航提示
  - Leaderboard：社区排行榜（`src/pages/CommunityLeaderboard.tsx`）
  - Token：Meme Token 详情（`src/pages/MemeTokenDetail.tsx`）
  - Campaign：活动详情（`src/pages/CampaignDetail.tsx`）
  - Dashboard：群主控制台（`src/pages/GroupOwnerDashboard.tsx`）

- 社区排行榜（CommunityLeaderboard）
  - Mock 数据驱动，展示成员数、胜率、24h 信号数、交易量等指标
  - Treemap 网格卡片展示社区与指标值，卡片渐变与封面图可定制

- Token 详情（MemeTokenDetail）
  - 基本信息：市值、价格、流动性、24h 成交量等
  - 群信号流（Group Signals）：支持“Leader Call”与跟随订单的时间线展示，可替换群头像与发起人
  - AI Summary：静态 AI 文案折叠展示
  - 快速交易面板：买卖页签与模板按钮（演示态，不进行链上交易）

- 活动详情（CampaignDetail）
  - 社区参赛列表与指标（Mindshare、胜率等）
  - 讨论 Feed：AI 摘要、参与度分数与时间

- 群主控制台（GroupOwnerDashboard）
  - 登录模拟：Telegram 登录状态流转（3 秒模拟）
  - Commission：佣金余额、历史提现弹窗、趋势图（佣金与信号量）
  - Campaigns：进行中与已结束活动卡片，查看/报名操作入口
  - Add Bot Guide：两步引导（添加 Bot 与授予权限），一键复制 Bot 名称
  - AI Chat：懒加载 `chat-snail-sdk`，失败回退 `ai-chat-widget-sdk`，右下角悬浮聊天入口

## 使用到的技术
- 前端框架：React 18、TypeScript、Vite 5
- 样式与 UI：Tailwind CSS、Lucide Icons
- 图表与可视化：Recharts（Treemap、ComposedChart 等）
- 钱包与链：RainbowKit、wagmi、viem（默认 Base 链）
- 状态与数据：React Hooks、TanStack Query（全局注入，后续可用于数据缓存与并发管理）
- AI：openai大模型，知识库，向量数据库，用于社群消息的总结与分析。


## 环境变量与配置
- `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`：Supabase 接入配置
  - 未设置时，前端自动使用 Mock 客户端，避免请求错误（见 `src/lib/supabase.ts`）
- `VITE_WC_PROJECT_ID`：WalletConnect 项目 ID（RainbowKit 默认连接器），未设置时仅支持浏览器注入钱包

## 本地开发
- 安装依赖：
  ```bash
  npm install
  ```
- 启动开发：
  ```bash
  npm run dev
  # 默认 Vite 开发端口 5173（实际端口取决于 IDE）
  ```
- 代码检查与类型校验：
  ```bash
  npm run lint
  npm run typecheck
  ```

## 构建与预览
```bash
npm run build
npm run preview
# 以本地静态服务预览 dist 目录
```

## 部署方式
- 静态托管（推荐）：将 `dist` 目录上传至任意静态站点（如 Vercel/Netlify/Cloudflare Pages）
- 环境变量：在托管平台配置 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY` 与（可选）`VITE_WC_PROJECT_ID`
- Supabase 数据库：使用 Supabase Dashboard 或 CLI 应用迁移脚本，创建表与策略
