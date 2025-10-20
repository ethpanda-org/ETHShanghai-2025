# PubWiki - 让 AI 成为你的 Wiki 编辑助手

> 基于 MCP（Model Context Protocol）的智能 Wiki 协作平台

## 一、提交物清单 (Deliverables)

- [x] GitHub 仓库（公开或临时私有）：包含完整代码与本 README
- [ ] Demo 视频（≤ 3 分钟，中文）：展示核心功能与流程
- [x] 在线演示链接：https://pub.wiki
- [ ] 合约部署信息（如有）：网络、地址、验证链接、最小复现脚本
- [ ] 可选材料：Pitch Deck（不计入评分权重）

## 二、参赛队伍填写区 (Fill-in Template)

### 1) 项目概述 (Overview)

- **项目名称**：PubWiki - AI Powered Wiki Farm
- **一句话介绍**：让 AI 助手通过对话即可理解你的世界观设定，并自动生成和管理 MediaWiki 页面
- **目标用户**：
  - 内容创作者（小说、游戏、影视等世界观设定者）
  - 知识库管理者（企业文档、技术文档编辑者）
  - Wiki 站长和社区贡献者
  - AI 应用开发者（需要结构化内容管理的场景）

- **核心问题与动机（Pain Points）**：
  1. **编辑门槛高**：MediaWiki 的 Wikitext 语法复杂，学习成本高
  2. **协作效率低**：传统 Wiki 编辑需要手动创建大量相互关联的页面，耗时费力
  3. **世界观管理难**：对于复杂的世界观设定（如小说、游戏），人工维护大量条目容易遗漏或矛盾
  4. **AI 工具割裂**：现有 AI 助手无法直接操作 Wiki，需要手动复制粘贴内容
  5. **批量操作繁琐**：创建或更新多个相关页面需要重复劳动

- **解决方案（Solution）**：
  1. **MCP 协议桥接**：通过 Model Context Protocol 让 AI 模型直接调用 MediaWiki API
  2. **自然语言交互**：用户通过对话描述需求，AI 理解后自动生成精确的 Wiki 编辑操作
  3. **智能内容生成**：结合 AI 图像生成（ModelScope）和文本创作能力，自动生成图文并茂的 Wiki 页面
  4. **批量操作支持**：支持一次性创建/更新多个页面，自动维护页面间的关联关系
  5. **用户确认机制**：所有编辑操作都需经过用户审核确认，保证内容质量和安全性

### 2) 架构与实现 (Architecture & Implementation)

#### 系统架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                     用户 (User)                               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│          Wikihelper Chat (Next.js Frontend)                  │
│  - 对话界面 (Chat UI)                                         │
│  - 模型选择器 (Claude/Gemini/Qwen/OpenAI)                    │
│  - 图片上传 (Image Upload to S3)                             │
│  - UI 确认机制 (Edit Confirmation Dialog)                    │
└────────────┬──────────────────────┬─────────────────────────┘
             │                      │
             │                      ▼
             │           ┌──────────────────────┐
             │           │   PostgreSQL DB      │
             │           │  (Chat History)      │
             │           └──────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│        MCP Tools Layer (Model Context Protocol)              │
│  - Built-in Wiki Tools (create/update/search pages)          │
│  - External MCP Servers (via HTTP transport)                 │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│      MediaWiki MCP Server (HTTP Transport)                   │
│  - 会话认证 (Cookie-based Auth)                              │
│  - Wiki API 封装 (MediaWiki REST/Action API)                 │
│  - AI 图像生成 (ModelScope API Integration)                  │
│  - S3 文件上传 (DigitalOcean Spaces / S3 Compatible)         │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│              MediaWiki Farm (Traefik + Nginx)                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  WikiFarm Extension (Vue 3 + PHP)                     │  │
│  │  - 可视化管理界面 (Special:WikiFarm)                   │  │
│  │  - REST API 代理                                       │  │
│  │  - 共享用户系统                                        │  │
│  └────────────────┬──────────────────────────────────────┘  │
│                   │                                          │
│                   ▼                                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Provisioner Service (Rust/Axum)                      │  │
│  │  - 异步 Wiki 创建服务                                  │  │
│  │  - 任务调度和进度追踪                                  │  │
│  │  - SSE 实时事件推送                                    │  │
│  └────────────────┬──────────────────────────────────────┘  │
└───────────────────┼──────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│              MariaDB (共享数据库 + Wiki 实例数据库)            │
│  - 共享用户表 (user, user_properties, actor)                │
│  - WikiFarm 元数据表 (wikifarm_wikis, wikifarm_tasks)       │
│  - 各 Wiki 独立数据库                                        │
└─────────────────────────────────────────────────────────────┘
```

#### 关键模块

**1. Wikihelper Chat (前端对话界面)**
- **技术栈**：Next.js 14 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **核心功能**：
  - 支持多 AI 模型（Claude, Gemini, Qwen, OpenAI, DeepSeek）
  - 图片上传和附件管理（S3 兼容存储）
  - 聊天历史持久化（PostgreSQL）
  - UI 工具回调机制（编辑确认对话框）
  - MCP 服务器管理界面

**2. MediaWiki MCP Server (MCP 工具服务)**
- **技术栈**：TypeScript, Express, MCP SDK, AWS SDK
- **核心功能**：
  - HTTP 传输协议实现（支持 MCP over HTTP）
  - MediaWiki API 完整封装（创建/更新/查询/搜索页面）
  - 批量操作支持（批量创建/更新页面）
  - AI 图像生成和上传（ModelScope + S3）
  - 会话认证管理（Cookie-based Authentication）

**3. PubWiki Backend (Wiki Farm 基础设施)**
- **技术栈**：MediaWiki 1.44+, PHP 8.1+, Rust, MariaDB, Traefik, Nginx
- **核心功能**：
  - **多租户 Wiki 农场**：
    - 共享用户系统（跨 Wiki 统一认证）
    - 独立数据库隔离（每个 Wiki 有独立的数据库）
    - 自动化 Wiki 创建流程
  - **WikiFarm 扩展**（Vue 3 + Codex）：
    - `Special:WikiFarm` 可视化管理页面
    - 精选 Wiki 展示和我的 Wiki 列表
    - 创建新 Wiki 向导界面
    - REST API 代理层
  - **Provisioner 服务**（Rust + Axum）：
    - 异步任务处理（后台创建 Wiki 不阻塞）
    - 实时进度推送（SSE 事件流）
    - 数据库自动创建和配置
    - OAuth 密钥自动生成
  - **基础设施**：
    - Traefik 反向代理和 TLS 终止
    - Docker Compose 容器编排
    - 自动域名路由和负载均衡

#### 依赖与技术栈

**前端 (wikihelper-chat)**
- Next.js 14+ (App Router)
- React 19, TypeScript
- Vercel AI SDK (流式响应和工具调用)
- Tailwind CSS + shadcn/ui
- Drizzle ORM (PostgreSQL)
- @aws-sdk/client-s3 (对象存储)

**后端 (mediawiki-mcp)**
- Node.js 18+, TypeScript
- Express 5 (HTTP 服务器)
- @modelcontextprotocol/sdk
- node-fetch (HTTP 客户端)
- AWS SDK (S3 兼容存储)
- ModelScope API (AI 图像生成)

**基础设施 (pubwiki)**
- MediaWiki 1.44+
- PHP 8.1+
- MariaDB/MySQL
- Redis (缓存)
- Nginx (Web 服务器 & 反向代理)
- Traefik (反向代理 & 负载均衡 & TLS 终止)
- Docker & Docker Compose

**Provisioner 服务 (Rust 微服务)**
- Rust 1.70+
- Axum (异步 Web 框架)
- Tokio (异步运行时)
- SQLx (数据库访问)
- Tower (中间件)

### 3) 部署与配置 (Deployment & Configuration)

本项目采用微服务架构，需要分别部署和配置各个组件。

#### 部署架构

- **在线演示**：https://pub.wiki
- **MCP 服务地址**：https://mcp.pub.wiki/mcp
- **前端应用**：HTTPS (需要本地证书或云端 SSL)
- **数据库**：PostgreSQL (推荐 Neon 或其他托管服务)
- **对象存储**：DigitalOcean Spaces / S3 兼容服务

#### 组件说明

| 组件 | 目录 | 端口 | 说明 |
|------|------|------|------|
| MediaWiki MCP Server | `mediawiki-mcp/` | 8080 | MCP 工具服务（HTTP） |
| Wikihelper Chat | `wikihelper-chat/` | 3000 | 对话界面（HTTPS） |
| PubWiki Backend | `pubwiki/` | 80/443 | MediaWiki 实例 |

### 4) 运行与复现 (Run & Reproduce)

#### 前置要求

- Node.js 18+ 和 pnpm
- PostgreSQL 数据库（推荐使用 Neon 或其他托管服务）
- DigitalOcean Spaces 或任何 S3 兼容存储桶
- HTTPS 证书（开发环境可使用 mkcert 生成自签名证书）

#### 环境变量配置(可以联系团队获取)

**1. MediaWiki MCP Server (.mcp.env)**

在 `mediawiki-mcp/` 目录下创建 `.mcp.env` 文件：

```bash
# ModelScope API 密钥（用于 AI 图像生成）
MODELSCOPE_API_KEY=sk-your-modelscope-api-key

# S3 兼容存储配置（用于图像上传）
DO_SPACE_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACE_KEY=your-access-key
DO_SPACE_SECRET=your-secret-key
DO_SPACE_BUCKET=your-bucket-name

# 服务端口
PORT=8080

# MCP 传输协议
MCP_TRANSPORT=http
```

**2. Wikihelper Chat (.app.env)**

在 `wikihelper-chat/` 目录下创建 `.app.env` 文件：

```bash
# 数据库配置
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# AI 模型提供商（至少配置一个）
DASHSCOPE_API_KEY="sk-your-dashscope-api-key"           # 阿里云 Qwen
CLAUDE_API_KEY="sk-or-v1-your-claude-api-key"           # Claude (OpenRouter)
GEMINI_API_KEY="sk-or-v1-your-gemini-api-key"           # Gemini (OpenRouter)
OPENAI_API_KEY="sk-your-openai-api-key"                 # OpenAI (可选)

# 对象存储配置
DO_SPACE_ENDPOINT="https://nyc3.digitaloceanspaces.com"
DO_SPACE_KEY="your-access-key"
DO_SPACE_SECRET="your-secret-key"
DO_SPACE_BUCKET="your-bucket-name"

# Wiki MCP 服务配置
WIKI_MCP_URL="http://localhost:8080/mcp"                # 本地开发使用
NEXT_PUBLIC_WIKI_MCP_URL="http://localhost:8080/mcp"    # 前端调用地址
NEXT_PUBLIC_HOST="pub.wiki"                              # Wiki 主机域名
```

#### 一键启动（本地示例）

**步骤 1: 启动 MediaWiki MCP Server**

```powershell
# 进入 MCP 服务目录
cd mediawiki-mcp

# 安装依赖
pnpm install

# 编译 TypeScript
pnpm run build

# 启动 MCP 服务（HTTP 模式）
pnpm run start
# 服务将在 http://localhost:8080 启动
```

**步骤 2: 配置前端 MCP 连接**

MCP 服务启动后，获取服务地址（如 `http://localhost:8080/mcp`），并在 `wikihelper-chat/.app.env` 中配置：

```bash
WIKI_MCP_URL="http://localhost:8080/mcp"
NEXT_PUBLIC_WIKI_MCP_URL="http://localhost:8080/mcp"
```

**步骤 3: 生成本地 HTTPS 证书**

前端需要 HTTPS 才能正常工作。在 `wikihelper-chat/` 目录下创建证书：

```powershell
# 创建证书目录
mkdir cert
cd cert

# 方案一：使用 mkcert（推荐）
# 首先安装 mkcert: https://github.com/FiloSottile/mkcert
# Windows: choco install mkcert

# 安装本地 CA
mkcert -install

# 生成证书
mkcert localhost 127.0.0.1 ::1

# 重命名证书文件
ren localhost+2-key.pem cert/key.pem
ren localhost+2.pem cert/cert.pem

# 方案二：使用 OpenSSL
# openssl req -x509 -newkey rsa:4096 -keyout cert/key.pem -out cert/cert.pem -days 365 -nodes -subj "/CN=localhost"
```

**步骤 4: 启动 Wikihelper Chat**

```powershell
# 回到 wikihelper-chat 目录
cd ..

# 安装依赖
pnpm install

# 运行数据库迁移（首次运行）
pnpm db:push

# 启动开发服务器（HTTPS）
pnpm dev

# 服务将在 https://localhost:3000 启动
```

**步骤 5: 访问应用**

打开浏览器访问 `https://localhost:3000`，开始使用 PubWiki！

#### 使用 Docker 启动

**启动 MCP 服务**

```powershell
cd mediawiki-mcp
docker compose build
docker compose up
```

**启动前端应用**

```powershell
cd wikihelper-chat
docker compose build
docker compose up
```

#### 在线 Demo

- **在线演示**：https://pub.wiki
- **测试账号和环境变量配置**：请联系项目团队获取

### 5) Demo 与关键用例 (Demo & Key Flows)

- **视频链接（≤3 分钟，中文）**：[待上传]

#### 关键用例演示

**用例 1: AI 辅助创建世界观 Wiki 页面**

1. 用户在对话框中描述世界观设定：
   ```
   "我想创建一个科幻世界，主角是一名赛博朋克侦探，生活在2077年的新东京。
   请帮我创建主角'凯尔·陈'的人物页面，包括背景、能力和主要装备。"
   ```

2. AI 助手理解需求并调用 MCP 工具，生成页面预览

3. 用户确认后，AI 自动创建 Wiki 页面，包含：
   - 结构化的人物信息模板
   - 自动生成的人物插图（通过 ModelScope API）
   - 关联的世界观设定链接

**用例 2: 批量更新相关页面**

1. 用户请求：
   ```
   "将所有与'新东京'相关的页面中的'2077年'更新为'2078年'，
   并在每个页面添加'时间线更新'的说明。"
   ```

2. AI 助手调用 `search-page` 工具找到相关页面

3. 使用 `batch-update-page` 工具生成批量更新计划

4. 用户确认后执行批量更新，自动维护页面历史记录

**用例 3: 智能图像生成与上传**

1. 用户请求：
   ```
   "为'凯尔·陈'生成一张赛博朋克风格的肖像画，
   穿着黑色风衣，背景是霓虹灯闪烁的街道。"
   ```

2. AI 调用 `create-image-and-upload` 工具：
   - 通过 ModelScope API 生成图像
   - 自动上传到 S3 存储
   - 获取公开访问 URL
   - 插入到 Wiki 页面

3. 图像自动添加到对应页面的信息框

**用例 4: 自然语言搜索与查询**

1. 用户询问：
   ```
   "新东京有哪些重要地标？帮我列出来并创建一个汇总页面。"
   ```

2. AI 调用 `search-page` 和 `list-all-pages-titles` 工具查找相关内容

3. 自动生成"新东京地标汇总"页面，包含：
   - 自动提取的地标列表
   - 每个地标的简介和链接
   - 分类索引（商业区、居住区、工业区等）

### 6) 可验证边界 (Verifiable Scope)

#### 完全开源部分

以下组件已完全开源，可在本地完整复现：

- ✅ **MediaWiki MCP Server** (`mediawiki-mcp/`)
  - 完整的 MCP 工具实现
  - HTTP 传输协议支持
  - AI 图像生成和上传功能
  - 可独立部署和使用

- ✅ **Wikihelper Chat** (`wikihelper-chat/`)
  - 完整的前端对话界面
  - 多 AI 模型集成
  - UI 确认机制和工具调用
  - 可本地一键启动

#### 部分开源部分

- ⚠️ **PubWiki Backend** (`pubwiki/`)
  - **MediaWiki 核心**：使用官方开源版本（MediaWiki 1.44+）
  - **WikiFarm 扩展**（完全开源）：
    - 多租户 Wiki 农场管理
    - Vue 3 + Codex 的可视化管理界面
    - REST API 代理和 SSE 实时进度推送
    - 共享用户系统支持
  - **Provisioner 服务**（完全开源，Rust 编写）：
    - 异步 Wiki 创建和管理服务
    - 基于 Axum 的高性能 HTTP 服务
    - 任务调度和进度追踪
    - 完整的 REST API 支持
  - **WikiManage 扩展**：提供 Wiki 管理功能
  - **部署模板**：完整的 Docker 化部署方案
  
  **本地复现说明**：
  - 所有代码已完全开源，可使用 Docker Compose 一键启动
  - 详细部署文档见 `pubwiki/deploy/README.md`
  - 可以使用标准 MediaWiki 实例测试 MCP 功能（不依赖 WikiFarm）

#### 外部依赖服务

以下服务需要第三方 API 密钥，但可使用替代方案：

- 🔑 **ModelScope API**（AI 图像生成）
  - 需要注册 ModelScope 账号获取 API 密钥
  - 可替换为其他图像生成服务（Stable Diffusion API、DALL-E 等）

- 🔑 **AI 模型提供商**
  - 支持多个提供商，至少配置一个即可
  - 免费方案：Qwen (DashScope)、Gemini (通过 OpenRouter)

- 🔑 **对象存储服务**
  - 使用任何 S3 兼容服务即可
  - 免费方案：MinIO (自托管)、Cloudflare R2

#### 本地最小复现环境

仅需以下配置即可在本地完整运行：

```bash
# 必需配置
DATABASE_URL=postgresql://localhost/pubwiki
DASHSCOPE_API_KEY=your-free-api-key

# 可选配置（使用本地服务替代）
# 使用 MinIO 替代 DigitalOcean Spaces
DO_SPACE_ENDPOINT=http://localhost:9000
DO_SPACE_KEY=minioadmin
DO_SPACE_SECRET=minioadmin
DO_SPACE_BUCKET=pubwiki
```

#### 验证方式

1. **功能验证**：
   ```powershell
   # 测试 MCP 服务是否正常
   curl http://localhost:8080/mcp

   # 测试前端是否正常
   # 访问 https://localhost:3000
   ```

2. **工具调用验证**：
   - 在对话界面中发送测试消息
   - 观察 AI 工具调用日志
   - 检查 Wiki 页面是否正确创建/更新

3. **批量操作验证**：
   - 测试批量创建 10 个页面
   - 测试批量更新现有页面
   - 验证页面历史记录完整性

### 7) 路线图与影响 (Roadmap & Impact)

#### 短期计划（赛后 1-3 周）

- 🎬 完善 Demo 视频和使用文档
- 🐛 修复已知 Bug，提升稳定性
- 📝 补充更多使用示例和最佳实践
- 🌐 优化在线演示环境性能

#### 中期计划（赛后 1-3 个月）

- 🔧 完善 Wiki Farm 多租户功能
- 🎨 开发可视化的世界观关系图谱
- 📱 开发移动端应用
- 🤝 与更多 AI 模型和工具集成
- 🌍 支持更多 Wiki 引擎（Notion、Confluence 等）

#### 长期愿景

- 🌟 **降低内容创作门槛**：让任何人都能通过对话轻松管理结构化知识
- 🤖 **推动 AI × 内容管理标准化**：通过 MCP 协议建立行业标准
- 🌐 **服务 Web3 社区**：为 DAO、NFT 项目等提供去中心化的知识管理方案
- 📚 **赋能知识共享**：让 AI 成为人类知识传播的加速器

#### 对以太坊生态的价值

1. **DAO 治理文档管理**：为 DAO 组织提供 AI 辅助的提案编写和知识库管理
2. **NFT 项目世界观构建**：帮助 NFT 项目快速搭建完整的世界观和社区文档
3. **开发者文档协作**：降低以太坊生态项目文档维护成本
4. **去中心化知识图谱**：探索将 Wiki 内容上链，构建可验证的知识网络

### 8) 团队与联系 (Team & Contacts)

#### 团队信息

- **团队名称**：PubWiki Team
- **成员与分工**：
  - [待填写姓名] - 项目负责人 & 全栈开发 - 负责架构设计和核心功能开发
  - [待填写姓名] - 后端开发 - 负责 MCP 服务器和 MediaWiki 集成
  - [待填写姓名] - 前端开发 - 负责对话界面和用户体验设计

#### 联系方式

- **Email**：[待填写]
- **Telegram**：[待填写]
- **Discord**：[待填写]
- **Twitter/X**：[待填写]
- **GitHub**：https://github.com/pubwiki

#### 可演示时段

- **工作日**：10:00 - 22:00（北京时间）
- **周末**：全天可安排
- **说明**：支持远程演示和技术答疑，提前 1 天预约即可

---

## 三、快速自检清单 (Submission Checklist)

- [x] README 按模板填写完整（概述、架构、复现、Demo、边界）
- [x] 本地可一键运行，关键用例可复现
- [ ] Demo 视频（≤3 分钟，中文）链接可访问
- [x] 如未完全开源，已在"可验证边界"清晰说明
- [x] 联系方式与可演示时段已填写

---

## 四、技术亮点与创新 (Highlights & Innovation)

### 🎯 核心创新

1. **MCP 协议在 Wiki 领域的首次应用**
   - 业界首个基于 Model Context Protocol 的 MediaWiki 集成方案
   - 将 AI 助手能力标准化，支持任意 MCP 兼容客户端接入

2. **AI × 内容创作的深度融合**
   - 不仅是"AI 写内容"，而是"AI 理解结构化知识管理"
   - 支持世界观设定的自动关联和一致性检查

3. **用户确认机制的安全设计**
   - 所有写操作都需要用户明确确认
   - UI 层面的工具调用回调，保证内容质量

4. **批量操作的智能化**
   - AI 自动分析页面关联关系
   - 一次性完成复杂的多页面创建/更新任务

### 🚀 技术优势

- **可扩展性**：基于 MCP 协议，轻松扩展新的 AI 工具
- **多模型支持**：兼容 Claude、Gemini、Qwen 等主流 AI 模型
- **高性能**：HTTP 传输 + 流式响应，实时反馈 AI 思考过程
- **易部署**：Docker 一键部署，支持私有化部署
- **开放标准**：遵循 MCP 规范，未来可与更多 AI 工具链集成

### 📊 应用场景

- 📖 **小说/游戏世界观管理**：自动生成人物、地点、事件关系网
- 📚 **企业知识库**：将非结构化文档转化为结构化 Wiki
- 🎮 **游戏资料站**：快速搭建游戏攻略和数据库 Wiki
- 🏢 **团队协作**：通过对话式交互降低 Wiki 编辑门槛
- 🌍 **开源社区**：让 AI 成为社区文档的编辑助手
- 🏛️ **DAO 治理**：为去中心化组织提供知识管理和文档协作

---

## 五、开发进度与里程碑 (Progress & Milestones)

- ✅ **MVP 阶段**（已完成）
  - MCP 服务器基础架构搭建
  - 前端对话界面实现
  - 基础 Wiki 操作工具（创建/更新/查询）

- ✅ **功能增强阶段**（已完成）
  - AI 图像生成与上传
  - 批量操作支持
  - 多 AI 模型集成
  - UI 确认机制

- 🚧 **当前进展**（进行中）
  - Wiki Farm 多租户支持优化
  - 性能优化和缓存机制
  - 更多 MCP 工具扩展（模板管理、分类系统等）

- 📅 **未来规划**
  - 支持更多 Wiki 引擎（Notion、Confluence 等）
  - AI 辅助的页面质量检查和优化建议
  - 可视化的世界观关系图谱
  - 移动端 App 开发
  - 探索与以太坊生态的深度集成

---

## 六、致谢与参考 (Acknowledgments)

- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP 协议规范
- [MediaWiki](https://www.mediawiki.org/) - 强大的 Wiki 引擎
- [Vercel AI SDK](https://sdk.vercel.ai/) - 优秀的 AI 应用开发框架
- [shadcn/ui](https://ui.shadcn.com/) - 美观的 React UI 组件库
- [ETHShanghai 2025](https://ethshanghai.org) - 感谢组委会提供的平台

---

## 七、许可证说明 (License)

本项目采用多许可证模式，各子项目遵循其各自的开源许可证：

### 子项目许可证

| 子项目 | 许可证 | 说明 |
|--------|--------|------|
| **mediawiki-mcp** | [MIT License](mediawiki-mcp/LICENSE) | MCP 服务器组件，允许商业使用和自由修改 |
| **wikihelper-chat** | [Apache License 2.0](wikihelper-chat/LICENSE) | 前端对话界面，包含专利授权保护 |
| **pubwiki** | [GPL-2.0](pubwiki/LICENSE) | MediaWiki 后端，遵循 MediaWiki 的 GPL 协议 |

### 许可证兼容性说明

- **MediaWiki MCP Server (MIT)**：最宽松的许可证，可以集成到任何项目中
- **Wikihelper Chat (Apache 2.0)**：与 MIT 兼容，提供额外的专利保护
- **PubWiki Backend (GPL-2.0)**：由于基于 MediaWiki，必须遵循 GPL-2.0 协议

### 使用建议

- 如果您只想使用 **MCP 服务器** 和 **前端界面**，可以遵循 MIT/Apache 2.0 的宽松许可
- 如果您需要使用完整的 **Wiki Farm 后端**，则需要遵循 GPL-2.0 的要求
- 各组件可以**独立使用**，互不影响彼此的许可证约束

### 第三方依赖

本项目使用了以下主要开源项目：

- [MediaWiki](https://www.mediawiki.org/) - GPL-2.0-or-later
- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk) - MIT
- [Vercel AI SDK](https://github.com/vercel/ai) - Apache-2.0
- [Next.js](https://nextjs.org/) - MIT
- [Vue 3](https://vuejs.org/) - MIT
- [Axum](https://github.com/tokio-rs/axum) - MIT

所有第三方依赖的许可证声明请参见各子项目的 `package.json`、`Cargo.toml` 或相关文件。

---

**感谢 ETHShanghai 2025 组委会提供的平台，期待与更多开发者交流！** 🚀

**让 AI 成为每个人的 Wiki 编辑助手！** ✨
