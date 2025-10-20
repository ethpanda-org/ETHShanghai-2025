# RWA Studio 开发计划

## 1. 目标与范围
- 基于 PRD 实现合规文件、合约生成与部署、Dashboard 三大核心页面，提供从资料上传到合约监控的闭环体验。
- 前端采用 **Next.js App Router + TypeScript + Tailwind + shadcn/ui**，确保与设计稿一致并支持响应式体验。
- 智能合约交互使用 **viem** 管理链上读写，配合 **wagmi** 实现用户钱包连接和签名部署；合约模版使用 Solidity（Foundry 工具链）。
- 后端服务采用 Next.js API Route（Edge/Node runtime）与 serverless 函数，持久化层使用 **Neon Postgres**；文件存储使用对象存储（示例 AWS S3）并进行加密。
- AI 能力使用可扩展的 LLM 接口（如 OpenAI API），初期可通过 mock 或 Langchain/自建服务封装。

## 2. 系统架构概览
- **前端层**：Next.js + shadcn/ui 组件库，用 Zustand/React Query 管理状态；与 API、LLM、合约交互通过 typed hooks。
- **后端层**：Next.js Route Handlers 提供 RESTful API (`/api/files`, `/api/ai/*`, `/api/contract/*`, `/api/dashboard/*`)，部署在 Vercel 或类似平台；利用 Neon 作为托管 Postgres，Prisma 作为 ORM。
- **AI 服务**：独立 service（可在 `/app/api/ai` 中封装），负责调用文档解析、要素提取、草案生成；初期可用 mock，后续对接真实模型。
- **文件处理**：上传到对象存储，使用后台 worker（如 serverless queue 或 cron job）进行 OCR/解析；短期可直接在 API route 中调用 OCR SDK。
- **智能合约**：Foundry 项目维护 `ERC-7943` 模板，Next.js 前端通过 viem 生成代码片段、执行部署；部署流程集成 wagmi signer。
- **监控与链上数据**：使用 viem 订阅/拉取事件；后台 cron（Next.js scheduled functions 或外部 worker）同步链上数据至 Neon。

## 3. 模块拆解与任务列表
### 3.1 基础设施与环境
1. 初始化 Next.js + TypeScript + Tailwind 项目，配置 shadcn/ui 主题与设计 Tokens。
2. 配置 ESLint/Prettier、Husky、lint-staged，确保统一代码风格。
3. 搭建 Prisma + Neon 连接，创建 `.env` 模板并配置数据库迁移流程。
4. 初始化 Foundry 子项目，定义基础 `ERC-7943` 模板与测试样例。
5. 搭建 viem + wagmi + RainbowKit/自定义钱包连接组件。

### 3.2 页面实现
1. **合规文件页**
   - 实现三栏布局：左侧上传管理（文件列表、状态）、中部 AI 对话（消息流、输入控件）、右侧草案预览（Markdown 编辑/预览切换）。
   - 集成文件上传组件（支持 PDF/DOCX/图片），调用 `/api/files` 返回 `fileId`。
   - 对接 AI 解析接口：初次上传触发 `parse`，渲染要素摘要与追问列表。
   - 文档生成器：使用模板生成 Markdown，支持导出（客户端生成 PDF/MD）。
   - 状态管理：以 Project 作为上下文，保存要素 JSON 与对话记录。

2. **合约生成与部署页**
   - 左侧配置面板：表单控件（shadcn Form、Select、Switch、Slider）收集网络、白名单策略、供应量、分配策略等参数。
   - 右侧代码预览：根据配置渲染 Solidity 模板（可使用 Mustache/Handlebars 或自定义函数），并提供复制/下载按钮。
   - 部署流程：使用 viem/wagmi 获取 signer，调用合约部署脚本；展示部署状态、txHash、链接。
   - 模拟交互：集成测试网调用（transfer + attestation 参数），展示成功/失败信息。
   - Chainlink External Adapter 示例：前端触发 mock API，展示 attestation 签名流程。

3. **Dashboard 页**
   - 列表视图：显示所有 Deployment（网络、状态、部署时间、txHash）。
   - 详情抽屉/页面：展示供应量、持有人数、最近事件、Oracle 回调时间线。
   - 链上事件拉取：使用后台任务写入 Neon，再由前端 React Query 拉取；短期可直接从链上读取。
   - 图表组件：使用 Recharts 或 Tremor 展示交易量、事件频次。

### 3.3 后端 API 与服务
1. `/api/files`：处理上传、返回存储地址 + fileId，启动解析任务。
2. `/api/ai/parse`：调用 LLM/OCR 服务，返回要素 JSON 与初始对话。
3. `/api/ai/generate-doc`：根据要素渲染 Markdown 模板。
4. `/api/contract/generate`：根据参数输出 Solidity 代码，并在 Neon 记录模板。
5. `/api/contract/deploy`：接受用户签名数据，触发链上部署（serverless 代理或直接在前端完成、再回写 Neon）。
6. `/api/contracts/:addr/status` 与 `/api/contracts/:addr/events`：查询部署状态与事件。
7. `/api/dashboard/*`：提供 Dashboard 所需数据（指标聚合、日志导出）。

### 3.4 数据层
- 设计 Prisma Schema：User, Project, File, Draft, ContractTemplate, Deployment, OracleAttestation。
- 实现迁移与种子数据脚本。
- 开发 Repository/Service 层封装 Neon 操作，保证 API 层干净。

### 3.5 DevOps 与安全
- 配置 `.env` 模板及环境变量管理（LLM key、Neon URL、S3 凭证）。
- 文件加密：上传前使用 server-side encryption（SSE-S3 或自定义 KMS）。
- 接入 CI（GitHub Actions）：lint、测试、Foundry `forge test`、合约静态分析（slither）。
- 日志与监控：集成 Sentry/Logtail 记录错误；计划 Cron 监控链上事件。

## 4. 里程碑规划
- **Sprint 0 (1 周)**：环境搭建、设计还原规范、基础项目结构、钱包连接 POC。
- **Sprint 1 (2 周)**：合规文件页（含文件上传、AI Mock、草案生成）、Neon 数据表初步建模。
- **Sprint 2 (2 周)**：合约生成页（参数化模板、代码预览、viem 部署 POC）、Foundry 模板完善。
- **Sprint 3 (2 周)**：部署流程串联（测试网部署、Chainlink mock、Dashboard 基础）、事件抓取服务。
- **Sprint 4 (1 周)**：Dashboard 完成、链上数据可视化、QA 与安全加固、文档交付。

## 5. 风险与缓解
- **AI 接口延迟/稳定性**：初期使用 mock + 队列式处理；引入重试与异步通知。
- **链上部署复杂度**：提前准备测试网 RPC、私钥管理方案；提供 fallback（后端代理部署）。
- **文件解析准确度**：选择成熟 OCR/LLM 模型，提供人工编辑界面纠错；记录解析结果变更历史。
- **安全合规**：全程 HTTPS、上传文件加密、敏感数据脱敏；在 UI 添加免责声明和主网部署限制。

## 6. 成功标准
- 用户能完成从文件上传到草案导出的流程，响应时间满足 PRD 要求。
- 合约参数调整 1s 内更新代码预览，成功部署到至少一个测试网并返回 txHash。
- Dashboard 能展示部署记录、实时事件与指标，并支持导出日志。
- CI/CD 流程涵盖前端构建、单元测试、合约测试与静态分析，通过才允许合并。
