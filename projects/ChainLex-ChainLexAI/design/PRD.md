# PRD: RWA Studio — AI 驱动的资产上链工作台

> **目标读者**：产品经理、工程师（前端/后端）、智能合约工程师、设计师、AI 工程师、合规/法务顾问

------

## 1. 产品概述（One-liner）

RWA Studio 是一个 AI 驱动的轻量型产品，帮助用户将现实世界资产（RWA）通过**上传参考资料 → 与 AI 对话生成合规草案 → 自动生成 ERC-7943 合约代码 → 一键部署 → 运行监控**的流程，一站式完成发行到上链的闭环体验。

## 2. 核心价值主张

- 将复杂的合规与合约生成流程抽象成几步式 AI 辅助体验，降低非专业用户门槛。
- 结合链下风控（KYC/AML）与 Chainlink 风控适配器，提供可配置的合规保护层。
- 提供从草案到部署再到监控的完整闭环产品，便于企业或项目快速试验代币化流程。

## 3. 三大页面（必看设计）

前端设计请参考 `design` 文件夹，仅需实现以下三页（UI 设计已放置）：

1. **合规文件（Compliance / Draft）** — 左侧文件区（上传参考资料）、中间 AI 对话、右侧实时文档与代码预览。AI 负责从文件提取要素并通过对话引导补全缺项。
2. **合约生成与部署（Contract & Deploy）** — 左侧参数配置（网络、KYC 供应商、白名单等）、右侧实时代码预览、底部一键部署与模拟测试区。
3. **Dashboard（Monitor）** — 已部署合约列表、单合约详情（供应量、持有人数、最近交易、Event Log、Oracle 回调状态）。

> 设计注：开发者请直接在 `design` 文件夹找这三页对应的原型/资源（icons, spacing, 样式指引）。

## 4. MVP 范围（Must-have）

- 文件上传与简单 OCR/解析（支持 PDF, DOCX, PNG/JPG）。
- AI 摘要与对话：读取参考资料，输出项目要素、自动生成合规草稿（可编辑）。
- ERC-7943 合约模板生成器（可选参数：totalSupply, divisible, whiteListPolicy, revenueDistribution）。
- 实时代码预览：任何参数变动即时反映代码片段（可复制/下载）。
- 一键部署到测试网（示例支持：Sepolia / Goerli / Polygon Mumbai / BSC Testnet）。
- 基础 Chainlink External Adapter 示例（签名 attestation 流程示例）。
- Dashboard：展示已部署合约的基本指标与 event logs（测试网数据）。
- 基本合规提示与免责声明（阻止未审的主网部署）。

## 5. 非功能需求

- 用户体验：响应式、页面交互延迟 < 200ms（常态操作）。
- 安全：所有敏感文件在服务器端加密存储（静态加密 + 最低权限访问）。
- 隐私：KYC/身份信息**绝不**写入链上。仅传输签名化的 attestation 信息。
- 可扩展性：合约模板、Oracle 供应商应支持插件化扩展。

## 6. 用户旅程（核心场景）

1. 用户登录 → 进入 **合规文件** 页。
2. 上传文件（白皮书、估值报告等）到左侧文件区。
3. AI 自动解析并在中间对话区给出摘要与缺失项。
4. 用户通过对话或直接填写缺失项 → 右侧自动生成合规草案（可下载 PDF/MD）。
5. 用户点击导航 Tab `合约生成与部署`。
6. 在合约页选择链、KYC 供应商、白名单策略，UI 右侧实时展示合约代码变化。
7. 点击 `一键部署`（测试网）→ 系统展示 tx hash、区块浏览器链接、部署状态。
8. 部署后，合约出现在 `Dashboard`，用户可查看指标与 event log，及触发模拟 transfer。

## 7. 功能详述（按页面）

### 7.1 合规文件页（Compliance）

**功能点**：

- 文件上传支持：PDF, DOCX, PNG, JPG（多文件批量上传）。
- 自动解析模块：从文件中提取要素（项目名、资产类型、估值、持有人、收益分配、到期日）。
- AI 对话接口（Conversation UI）：
  - 初始自动摘要：`AI: 我已分析，检测到 X, Y, Z`。
  - 缺项质询：针对缺失信息生成问题（多选/单选/输入控件）。
  - 用户回答直接回写要素并更新右侧文档。
- 文档生成器：基于模板渲染（占位符替换），生成：上市说明书草案、风险披露、收益分配表（markdown + 导出为 PDF）。

**接口**：

- `POST /api/files` 上传文件（返回 fileId）
- `POST /api/ai/parse` 传 fileId 调用 AI 提取要素（返回要素 JSON + 对话初始提示）
- `POST /api/ai/generate-doc` 提交要素，生成文档草案（返回 markdown/html）

**Acceptance Criteria**：

- 上传文件后 60 秒内返回初步提取结果（在负载正常的情况下）。
- AI 能识别至少 8 类常见要素（资产类型、估值、所有权、收益、到期、风险、文件列表、条款）。

### 7.2 合约生成与部署页（Contract & Deploy）

**功能点**：

- 参数化配置面板（网络、白名单策略、总供应、是否可分割、收益分配策略、Oracle 模式）。
- 实时代码预览（右侧）：根据选项渲染合约模板（以 Solidity 为主，遵循 ERC-7943 约定）。
- 模拟交互：在 testnet 上执行模拟 transfer 并展示 oracle attestation 流程（签名或 async）。
- 一键部署流程：
  - 本地编译（CI） → 部署到选定测试网 → 返回 txHash。
  - 展示部署记录、合约 address 与 etherscan link（或链上浏览器）。

**接口**：

- `POST /api/contract/generate` 提交配置，返回合约源代码。
- `POST /api/contract/deploy` 执行部署（需要钱包签名或平台账户），返回 txHash。
- `GET /api/contract/:addr/status` 获取部署状态与事件。

**Acceptance Criteria**：

- 参数调整应在 1s 内更新代码预览（前端模板渲染）。
- 成功部署后能获取合约 address 和至少 3 个相关事件（在测试网跑完后）。

### 7.3 Dashboard（Monitor）

**功能点**：

- 合约列表：展示已部署合约，状态（Active / Error / Pending），网络信息。
- 合约详情：总供应、持有人数、最近 20 笔事件、Oracle 回调历史（时间戳 + 返回结果）。
- 日志导出：导出事件 csv / JSON。
- 简易图表：交易数随时间、代币流动量。

**接口**：

- `GET /api/projects/:id/contracts`
- `GET /api/contracts/:contractAddress/events?limit=50`

**Acceptance Criteria**：

- Dashboard 能展示最近 5 分钟内的链上事件（测试网数据），如果链上没有新事件，显示缓存时间提示。

## 8. 数据模型（简要）

- `User` { id, name, email, walletAddress, role }
- `Project` { id, ownerId, name, jurisdiction, status }
- `File` { id, projectId, filename, storagePath, hash, parsedData }
- `Draft` { id, projectId, markdown, status, lastEditedBy }
- `ContractTemplate` { id, projectId, options, sourceCode }
- `Deployment` { id, contractAddress, network, txHash, status }
- `OracleAttestation` { id, deploymentId, provider, requestId, result, signature, timestamp }

## 9. 智能合约与 Oracle 集成说明（工程备注）

- 合约采用 ERC-7943 基础实现，加入 `transferHook` 或 `beforeTransfer` 检查。该检查可读取链上白名单或验证 Chainlink/External Adapter 签名 attestation。
- 推荐流程（签名 attestation）：
  1. 前端/后端向 Chainlink 节点请求风控结果。Node 调用第三方 KYC/AML API 得出 allow/deny + risk_score。
  2. Node 生成受链上合约可验证的签名数据（包含 requestId, allow, expiresAt）。
  3. 用户在提交 transfer 时携带该 attestation。合约验证签名并执行或 revert。
- 注意：**禁止**直接把用户 KYC 原始数据写入链上。

## 10. 合规与法务要求（必须）

- 明确文档页写明“自动生成草案仅供参考，正式发行前必须经律师/合规团队审核”。
- 在“部署到主网”操作前，要求法律确认，否则仅允许 testnet 部署。
- 数据保留与隐私：遵守 GDPR / PDPO（适用时），并在用户上传时展示隐私政策与数据保留期。

## 11. 安全与 QA

- CI 集成 Slither、MythX、Foundry 测试（unit + integration）。
- 默认在 PRD 阶段引入自动化静态分析，构建失败时阻止部署到主网分支。
- 对合约重要函数（mint/burn/transfer）增加多重签名（multi-sig）或 timelock（可选）。

## 12. 技术栈建议

- **前端**：Next.js + React + Tailwind CSS（可复用 design 资源） + wagmi/viem
- **后端**：Node.js (NestJS/Express) 或 serverless（Vercel/AWS Lambda）
- **智能合约**：Solidity + Foundry (forge) 或 Hardhat 测试/部署脚本
- **Oracle**：Chainlink 节点 + External Adapter（Node.js）示例
- **数据库/存储**：Postgres + S3（文件加密存储）

## 13. 开发里程碑（建议）

**Sprint 0 (1 周)**：项目启动、设计对齐、环境搭建（Foundry、Next.js）、设计资源确认（`design` 文件夹）
 **Sprint 1 (2 周)**：文件上传、AI 解析接口（mock）、合规草案生成器（markdown 模板）
 **Sprint 2 (2 周)**：合约模板生成器（前端参数化 & 代码预览）、本地编译测试
 **Sprint 3 (2 周)**：一键部署到测试网、Chainlink External Adapter 示例
 **Sprint 4 (1 周)**：Dashboard 与监控、集成测试、文档与验收

## 14. 验收标准（Release Criteria）

- 用户能从上传资料完成合规草案，并能导出 PDF/MD。
- 用户能在合约页调整参数并看到实时代码预览。
- 用户能成功把合约部署到至少一个测试网并查看 txHash。
- Dashboard 能正确显示已部署合约的基础指标与 recent events。

## 15. 交付物清单（为 AI / 工程团队准备）

- `PRD`（本文件）
- `design` 文件夹（三页 UI 源文件） — *AI 请参考这三个页面的设计实现*。
- 合约模板（Solidity）示例（基础 ERC-7943 scaffold）
- Chainlink External Adapter 示例（Node.js）
- API 文档草稿（上传/解析/生成/部署/查询）

## 16. 给执行AI / 自动化构建的说明（简短）

- 任务：根据 `design` 文件夹中的三个页面原型，生成可运行的 Next.js + Tailwind 前端（包含占位 API 调用）。后端提供 mock endpoints，合约使用本地 Foundry 项目并能部署到指定测试网。
- 约束：不要把真实 KYC 数据写入链上；在主网部署前必须由人类核准；所有默认密钥/凭证请使用开发假数据与环境变量管理。

------

### 附录 A — 简短 JSON Schema（合规要素示例）

```json
{
  "projectName": "string",
  "assetType": "enum",
  "valuation": { "amount": "number", "currency": "string", "date": "string" },
  "owner": { "type": "enum", "name": "string", "id": "string" },
  "revenueModel": { "type": "enum", "rate": "number" },
  "riskItems": ["string"],
  "jurisdiction": "string"
}
```

------

如果你希望我把这份 PRD 导出成仓库内的 `PRD.md`（并在项目根目录写入），或者把它转换成更细化的 Jira/Notion 任务清单，我可以继续生成（并把实现步骤拆成 ticket 级别）。

（提示：开发者请先去 `design` 文件夹拿三页原型，所有 UI/文案/间距按设计稿实现。）