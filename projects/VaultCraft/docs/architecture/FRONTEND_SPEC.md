# VaultCraft 前端产品与交互规范（UI/UX & FE Spec）

目标受众：UI/工业设计、前端工程、评审演示。覆盖信息架构、页面与组件、状态与交互、接口契约、样式系统与无障碍、数据流与错误处理。以 v0 为核心（Public 透明 + Private 不公开持仓），并预留 v1（perps、批量窗口、容量函数等）。

---

## 1. 信息架构（IA）

- 发现（Discover）
  - 金库列表（Public/Private 混排、默认隐藏小金库、筛选/排序）
  - KPI：AUM、年化收益、年化波动、Sharpe、最大回撤、拥挤占位（v1）、是否私募
- 金库详情（Vault Detail）
  - 公募：持仓/交易明细 + NAV/PnL 曲线 + KPI + 申购/赎回
  - 私募：不公开持仓，仅显示 NAV/PnL 曲线 + KPI + 申购/赎回；投前仅摘要、投后显示 NAV 曲线
- 我的（Portfolio）
  - 我持有的金库份额、成本、浮盈亏、解锁时间、最近事件
- 管理（Manager Console，v1）
  - 创建金库、白名单管理、参数调整（锁定/费率）、适配器开关、承诺/披露计划
- 事件中心（Events/Alerts，v1）
  - 净值/风控/锁期等事件时间线与订阅

---

## 2. 页面与组件

### 2.1 发现页（/）
- 列表卡片（VaultCard）
  - 名称、地址缩写、类型（public/private）、AUM、Sharpe、MDD、标签（新建/小型/热门）
  - 操作：查看详情
- 顶部筛选/排序
  - 类型（public/private/all）、排序（Sharpe/回撤/年化/AUM）、隐藏小金库开关
- 空态/骨架屏

### 2.2 金库详情（/vault/[address]）
- 顶部信息区（Header）
  - 名称、地址、类型、AUM、Perf Fee、Lock、Unit NAV、Supply
- KPI 区
  - 年化收益、波动、Sharpe、最大回撤、回撤恢复期（后端指标 API）
- 图表区
  - NAV/PnL 曲线（支持区间切换：7d/30d/90d/All）
  - 公募：附“持仓构成（饼/条）与最近交易列表”
  - 私募：隐藏持仓，提示“私募：仅显示 NAV/PnL；持仓不公开”
- 交互区
  - 连接钱包（WalletConnect）
  - 申购（DepositModal）：输入资产金额、预估份额、锁定说明、确认
  - 赎回（RedeemModal）：输入份额、解锁倒计时提示、确认
  - 白名单状态提示（私募）
- 事件区
  - 最近事件：Deposit、Withdraw、PerformanceFeeMinted、参数变更

### 2.3 我的（/portfolio）
- 持仓表格：金库、份额、持仓成本、当前市值、浮盈亏、解锁时间、操作（赎回）
- 事件时间线：与我相关

### 2.4 通用组件（设计系统）
- AppShell/Header/Footer、页签（Tabs）、卡片（Card）、KPI、表格（Table）、图表组件（Chart）
- 表单（Form）、输入（Input）、下拉（Select）、开关（Switch）、按钮（Button）
- 状态（Skeleton/Spinner）、结果页（Empty/Success/Failure）
- Toast/通知（成功、警告、错误、信息）
- 模态框（Modal）、Drawers
- Tag/Badge（public/private/new/small/hot）

---

## 3. 样式与动效

- 主题：深色为主，品牌色青绿（Tailwind 示例：brand-500/600），禁用态低饱和
- 版式：12 列栅格，最大宽度 1200px
- 自适应：mobile-first，断点 sm/md/lg/xl，对图表与表格做自适应折叠
- 无障碍：语义化、可聚焦、对比度 AA、键盘可达、ARIA 标签
- 状态动效：微动效 150ms 内（hover/active/入场），图表平滑

---

## 4. 钱包与链

- 钱包：MetaMask / Rabby / OKX / WalletConnect（wagmi/viem）
- 链 ID 与网络：
  - v0：Base Sepolia（演示链）或 Hyper Testnet（拟采用）
  - 顶部网络提示，网络不匹配时引导切换
- 合约交互：deposit/redeem 调用 Vault，余额/份额/ps 读链
- 私募门控：仅 UI 控制可见性；链上真正拦截在 deposit（whitelist）

---

## 5. 后端接口契约（v0→v1）

说明：v0 前端允许“直接读链 + 静态/轻量后端”，v1 提供完整指标/事件/告警服务。

- GET /api/v1/vaults
  - 响应：[{ address, name, type, aum, sharpe, mdd, perfFeeBps, lockDays, isPrivate }]
  - 说明：v0 可静态拼装；v1 由后端聚合链上数据与指标
- GET /api/v1/vaults/:address
  - 响应：{ address, meta, metrics, navSeries, positions? (public only), recentEvents }
- GET /api/v1/metrics/:address
  - 响应：{ ann_return, ann_vol, sharpe, mdd, recovery_days }
- GET /api/v1/events/:address?cursor=
  - 响应：分页事件（Deposit/Withdraw/Fee/ParamChange）
- WS /ws/v1/stream
  - 推送：NAV 快照、事件、告警
- v1 Perps 执行（服务器）
  - POST /api/v1/exec/open|close （仅经理/服务账号；携带签名/限权）
  - 后端对接 Hyperliquid API；前端仅查看状态，不直接控制

---

## 6. 状态与错误

- 全局错误：网络断开、RPC 超时、签名拒绝、余额不足、白名单受限
- 表单校验：金额>0、余额足够、赎回解锁到期
- 交易反馈：Pending→Confirmed→Finalized；失败重试与错误消息（合约revert原因）
- 图表数据：空/短数据集时显示说明；加载骨架

---

## 7. 文案与本地化

- 界面语言：简体中文为主；抽离文案 JSON 便于后续 i18n
- 公募/私募说明：公募透明、私募不公开持仓，投前仅摘要，投后显示 NAV/PnL

---

## 8. 安全与权限

- 私募白名单：非白名单禁用申购按钮并提示
- 仅经理可见的“管理入口”（v1）：受链上角色 gating
- 重要操作二次确认（模态 + 风险提示）

---

## 9. 指标与图表（后端配合）

- NAV/PnL 时间序列（日级）
- KPI：年化收益、年化波动、Sharpe、最大回撤、恢复期
- 公募持仓饼图 + 最近交易列表（从链上/后端事件）

---

## 10. 性能与监控

- 代码拆分与懒加载；列表虚拟滚动（大数据时）
- Sentry/日志埋点（v1）：链上错误、API 错误、UI 异常

---

## 11. v1 补充（预留）

- 容量/拥挤折扣可视化、批量窗口的队列 UI、策略参数页
- AA/批量路由、私有路由的偏好设置 UI
- Perps 执行状态面板（仅经理/服务）
- 跨链资产列表与桥接状态（只读/演示）

---

## 12. 开发清单（优先级建议）

- P0（演示版必须）
  - 发现页（卡片 + 筛选/排序 + 隐藏小金库）
  - 详情页（公募：持仓 + NAV 图；私募：仅 NAV 图）
  - 申购/赎回 Modal（链上调用）
  - KPI 面板（年化/波动/Sharpe/回撤/恢复期：后端接口）
  - 事件时间线（Deposit/Withdraw/Fee/ParamChange：可后端/
    只读链上）
- P1（演示加分项）
  - 我的持仓页（Portfolio）
  - 白名单状态提示（私募）
  - 锁定倒计时 UI
  - Toast/错误提示统一
- P2（v1 后续）
  - 容量/拥挤可视化
  - 批量窗口与队列 UI
  - Perps 执行状态（仅经理/服务查看）
