# VaultCraft v1 里程碑规划（Hackathon 版本）

本规划统一黑客松演示范围为 v1 的 P0 / P1 / P2 / P3 四阶段；“集中仓位（订单聚合/成交分摊/对账/承诺）”整体移至 v2，不纳入演示流程。

---

## v1 P0（必需，链上闭环）

目标：链上申赎/锁定/HWM/白名单/可暂停 + 展示闭环可演示。

任务清单：
- 合约：Vault（ERC20 份额、最短锁定、HWM 绩效费、私募白名单、Adapter 白名单、可暂停）
- 前端：
  - 钱包连接（HyperEVM 998）与网络切换
  - Deposit/Withdraw（approve+deposit / redeem）
  - Browse（搜索/排序）、Vault 详情（KPI/NAV/事件/公募持仓历史）、Portfolio（余额/锁定/提现）、Manager（部署与参数管理）
- 后端：/status、/nav、/nav_series、/events、/metrics；价格源（SDK mids 优先、REST 回落、缓存）

验收条款：
- 真实链上地址下 Deposit/Withdraw 成功，锁定约束有效
- Vault 详情展示 NAV 曲线、事件流与（公募）持仓历史；Drawdown 警示条可触发（Shock 按钮）
- Manager 完成一键部署与参数管理（白名单/锁期/绩效费/暂停）

---

## v1 P1（短期加分，链上/后端配合）

目标：增强可观测性与体验。

任务清单：
- Listener（WS）回写 e2e；前端事件流显示 "ws" 标注
- UI 打磨：空态/骨架、图表与事件时间对齐、错误提示一致性
- Manager 扩展：Adapter 管理、Guardian/Manager 变更、部署记录回写

验收条款：
- Listener 正常回写，事件流可区分 ack/ws；时间轴对齐自然；空态/错误提示完整
- Manager 页面完成 Adapter/Guardian/Manager 的最小流程

---

## v1 P2（Hyper Testnet 真实下单，最小路径）

目标：打通真实 Hyperliquid BTC/ETH 合约最小下单路径（不引入订单聚合/分摊/对账）。

任务清单：
- 后端 Exec Service：启用 Hyper SDK 直连下单（受限金额/市场/杠杆），保留 dry‑run；事件流显示 ack；可选 Listener 显示 ws
- 价格与 NAV：SDK mids 优先，ack 应用到 per‑vault 头寸，指数价计算 NAV，定时快照供曲线
- 前端：Manager Exec 面板（绑定 vaultId）直接触发；事件/NAV 联动；风险与降级提示（reduce‑only 黄条）
- 文档：HYPER_DEPLOYMENT 增补“最小真实下单”注意事项（小额、限权）

验收条款：
- 在 Hyper Testnet 上完成 ETH/BTC 最小开/平仓，事件可见，NAV/曲线联动
- dry‑run/启停开关有效；超限杠杆/名义拒单并有友好错误提示
 - 提示：Hyper 最小下单金额约 $10（建议 ETH 使用 `0.01` 作为演示尺寸）

---

## v1 P3（打磨与验收）

目标：演示脚本稳定、误差与降级提示清晰、用户流程顺滑。

任务清单：
- Demo 脚本：创建 → 申赎 → 执行 → 事件 → NAV → 降级提示；说明标签“资金留在 Vault，执行在 Hyper 服务账户”
- 前端：状态骨架、空态、交互一致性；Manager 与详情联动完善
- 测试：后端超时/回退/异常/SDK 不可用回退的 pytest 覆盖；端到端自查

验收条款：
- 按脚本演示全链路无卡点；错误与降级提示到位；UI 表达一致

---

## v2（多资产与私募增强，集中仓位延后评估）

范围与目标：
- 会计与申赎：延续 `deposit() -> mint shares` 机制，默认无锁期，改以手续费率曲线管理早退；单位净值（PS）不受申赎影响。
- 多品种接入：Router/Adapter 扩展至 Polymarket、主要美股、贵金属（XAU 等）、期权等市场，按 `venue_whitelist`、`risk_envelope` 暴露敞口限制。
- WhisperFi 集成：为私募 Vault 引入 WhisperFi（或等效模块）以保护执行隐私，投前仅摘要，投后仅 NAV/PnL；保留审计用凭证与稽核接口。
- 执行模式：经理绑定 API 钱包或由平台生成子账户；前端票据经 `execute` 触发，`execution_channel=onchain` 时链上成交，`off_venue` 时后端 SDK 执行、回链写入 Ack/Fills；平台不做集中仓位，只负责限权与路由。
- 指标与风控：平台监听事件生成 NAV/Merkle 承诺，监控延迟、对账漂移触发 reduce-only、排队/拒单、电话告警与黄条提示（无强平）。
- Vault 组合器：创建新 Vault 时可引用既有 Vault 作为按比例建仓模板，实现“策略组合/跟单”与自动化策略拼装。
- 体验优化：前端提供跨市场筛选、对冲推荐、告警订阅，多语言支持（含中文）；后端开放更多指标 API。
- 运维文档：补充多市场部署、WhisperFi 接入、风控口径、TDD 模板。

---

## 开发者交接提示（v1）

- 环境：统一根 `.env`；钱包链 998；Hyper SDK 仅在需要真实下单时启用（ENABLE_LIVE_EXEC=1，小额）
- 安全：资金始终在 Vault；后端仅代为下单与估值；Adapter 与执行市场均有白名单与限权
- 常见坑：
  - 无效地址导致 ENS 查询报错 → 已在前端做地址校验并禁用按钮
  - 私募未白名单导致 deposit 失败 → 先在 Manager 白名单
  - RPC 断流或 SDK 不可用 → 价格回退 REST，Exec 走 dry‑run，UI 黄条提示
- 文档入口：PRD（PRD.md）、Tech Design（../architecture/TECH_DESIGN.md）、架构解析（../architecture/ARCHITECTURE.md）、Hyper 部署（../ops/HYPER_DEPLOYMENT.md）；计划清单见本文件
