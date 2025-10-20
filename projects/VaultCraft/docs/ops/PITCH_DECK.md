# VaultCraft Pitch Deck Outline (Hyper Testnet Demo)

> 用于制作黑客松/路演 PPT 的完整文字稿。每一页保留 3–5 个 bullet，并对关键图示/演示做补充说明，可直接转换成幻灯片内容。

---

## Slide 1 · Title
- **VaultCraft** — 可验证的人类交易员金库平台
- “比 Hyper 多私域流量，比带单更规范更安全”
- Hyper Testnet（Chain 998）实盘演示
- 团队 & 联系方式（Logo + Telegram/Email）

视觉建议：背景放渐变图或 Hyper Testnet 截图；右侧放钱包连接 UI。

---

## Slide 2 · Problem & Opportunity
- DeFi “带单”体验碎片化，风险不可见；成熟交易员缺乏合规私域工具
- HyperVault 解决了公募透明，但私募/KOL 仍缺少产品化流程
- 投资者希望份额化会计、实时 NAV、可一键赎回；经理希望保留策略隐私
- 市场机会：多链/多市场人类交易策略（Perps、RWA、预测市场）的可验证发行平台

---

## Slide 3 · Solution Snapshot
- 单一金库内核：ERC4626 shares + 最短锁定 + HWM 绩效费 + 白名单适配器
- Public Vault：持仓/交易事件透明，像 Hyper 一样易用
- Private Vault：投前仅摘要，投后仅 NAV & KPI，持仓不公开（WhisperFi 可插拔）
- Off-chain Exec Service：Hyper SDK 风控制控制、dry-run ↔ live 切换、减少 Only fallback
- 完整前后端链上闭环：Manager 创建 → 调仓 → 投资者申赎 → NAV/告警实时回写

图示：引用 README 中的 Mermeid 架构，或单独画前端-后端-链上-超液 SDK 流程。

---

## Slide 4 · Product Highlights (Demo Screenshots)
1. Discover / Browse：按 Sharpe/AUM 筛选公募/私募，突出演示 vault 卡片
2. Vault Detail：NAV 曲线、events feed（`source: ack/ws` badge）、持仓/指标
3. Manager Console：Launch Checklist、创建/执行/高级设置 标签页
4. Portfolio：投资者份额、锁定期、估算 PnL

建议：每个截图用简注说明数据来源（链上读数、后端 API）。

---

## Slide 5 · How It Works (Flow)
1. Manager 在 Hyper Testnet 存入自投（≥5% 推荐），创建 Public 或 Private Vault
2. Exec Service 受限下单（Hyper SDK），事件 + NAV 回写到 FastAPI
3. 投资者按实时 NAV 申购/赎回，锁定期/白名单由合约 enforce
4. Listener + Snapshot → 前端 NAV 曲线、告警 webhook → 电话/短信提醒

附加说明：资金始终在 Vault 合约；后端仅提供下单/估值；Router/Adapter 白名单限制风险。

---

## Slide 6 · Risk & Controls
- 白名单适配器 + Manager 无提币权 → 资产安全
- 风险参数可视化：allowed symbols / leverage / notional caps / reduce-only fallback
- Drawdown 告警链路（fwalert 电话演示链接）
- Dry-run 默认、显式 `ENABLE_LIVE_EXEC=1` 后才允许实单；日志、事件、状态 API 全公开
- 私募流程：链上 whitelist，前端邀请码（后续 WhisperFi + 零知识证明）

---

## Slide 7 · Demo Script (Expose judges to UX)
1. 连接钱包 → StatusBar 显示 Hyper Testnet
2. Manager Checklist → 填入 Hyper USDC → 部署新 Vault
3. 通过仓位执行面板下单 ETH 0.01、多次尝试展示风险提示 & fallback
4. 投资者在 Vault 页 deposit → Portfolio 显示份额 & 锁定
5. Shock 按钮 → Drawdown banner + phone call 告警（展示链接）
6. Events feed：Ack badge & 等待 `source:"ws"`（解释 Testnet 可能延迟）

建议：在 PPT 上列出 6 步，并配 demo 截图。

---

## Slide 8 · Traction & Status
- 合约 & 后端测试覆盖率：Hardhat 6/6，pytest 44 绿色；Next.js 构建通过
- Hyper Testnet 实单演示：0.01 ETH 开/平仓，多次 reduce-only fallback 验证
- docs/PRD.md、TECH_DESIGN.md、PLAN_V1.md、DEMO_PLAN.md 全面记录
- 待办：Listener `source:"ws"` 真实回写（受限于测试网流动性，已准备 ack fallback）

---

## Slide 9 · Roadmap (v2 & v2.5)
- v2：手续费率曲线、WhisperFi 隐私增强、指标/风控扩展、Vault Composer、Merklized NAV 承诺
- v2.5：多市场适配器（Polymarket、美股、贵金属、期权）、策略组合 vault、中文界面
- 平台角色：投资者 deposit() 铸份额；经理绑定 API 钱包或平台子账户；执行通道 on-chain / off-venue；平台监听事件并做风险黄条/RO/告警

---

## Slide 10 · Ask & Call to Action
- 正在寻找：生态方（Hyperliquid / 流动性伙伴）、策略经理 Beta、黑客松持续支持
- 需要的资源：更多测试网流动性、WhisperFi 集成顾问、多市场数据授权
- 联系方式 & 下一步：部署脚本、Demo 站点、Github 链接

附：列出演示链接（本地运行命令 or 预部署网址）、GitHub 仓库、Docs 索引。

---

## 附录（可选加页）
- 竞品对比：HyperVault / GMX leaderboards / Copy Trading 平台
- 技术栈：Solidity、Hardhat、FastAPI、uv、Next.js、Tailwind、Hyper SDK
- 团队介绍：核心成员背景、过去项目（WhisperFi 等）

---

制作建议：
- 字体层级：标题 36pt、副标题 24pt、正文 18pt
- 每页不超过 4–5 bullet，保留充足留白，搭配产品截图/Mermaid 图/流程箭头
- 建议合并 README 的 Feature、Quickstart、Roadmap 等内容到 appendix 供评委查阅
