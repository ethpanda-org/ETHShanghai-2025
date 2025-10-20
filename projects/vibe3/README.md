## 项目架构概览

Vibe3 基于 Next.js App Router 的全栈应用，定位为“对话式代码助手 / App 生成器”。前端提供对话、编辑与预览体验；服务端以 Next.js Route Handlers 暴露轻量 API；对外依赖与数据访问集中在 `services` 层实现解耦。

前端已开源，部分支持的后端服务暂未开源。

在线演示：

https://vibe3.me/

演示链接：

https://drive.google.com/file/d/1cZ-Yk8tSiFamWFSB4BeldjJYa0-d382G/view?usp=sharing


### 技术栈
- **框架**: Next.js (App Router), React 18, TypeScript
- **样式**: Tailwind（`src/app/globals.css`）+ 组件级样式
- **UI 组件**: `src/components/ui/*`（Button, Dialog, Input, Textarea 等）
- **以太坊/钱包**: wagmi（`providers/wagmi.tsx`）
- **本地运行/构建**: WebContainer（`providers/web-container.tsx`）
- **后端 API 封装**: `services/vibe3_api/*`, `services/instantdb_api/*`
- **工具与质量**: ESLint（`eslint.config.mjs`）, Bun/Node 包管理（`bun.lock`, `package.json`）

## 目录结构与职责

```
/ (项目根)
  bun.lock, package.json, tsconfig.json, next.config.ts
  public/                 # 静态资源
  src/
    app/                  # Next.js App Router 入口、页面与 API 路由
      (home)/             # 首页分组（登录、注册、OAuth 回调等）
      api/                # Route Handlers（后端 API）
      app/                # 运行指定 id 的应用页面
    components/           # UI 与业务组件（Chat、Editor、Dialogs、App 视图等）
    event_bus/            # 事件总线（跨组件通信）
    hooks/                # 通用 React hooks（如认证）
    lib/                  # 通用工具函数
    providers/            # 全局上下文（主题、文件树、WebContainer、wagmi、auth）
    services/             # 外部 API/SDK 的封装与工具
    uitls/                # 杂项工具函数（注意目录名为 uitls）
```

### src/app（页面与 API）
- `(home)/page.tsx`：首页与输入入口；`(home)/layout.tsx`：对应布局
- `(home)/login/page.tsx` 与 `(home)/register/page.tsx`：登录/注册
- `(home)/oauth/instant/redirect/page.tsx`：InstantDB OAuth 回调处理
- `app/[id]/page.tsx`：按应用 `id` 渲染运行视图；`app/layout.tsx`：运行区布局
- `api/chat/route.ts`：对话流 API，整合 MCP 工具（`mcp/vision.ts`, `mcp/web-search.ts`）
- `api/log_error/route.ts`：前端错误上报

### src/components（组件）
- Chat：`components/chat/*` 提供消息列表、消息项与分步执行 Part（读取、修改、安装、Lint、推理、搜索、图像分析等）
- Editor：`components/editor/*` 文件树与代码编辑器
- Dialogs & Forms：`dialog_app_setting/*`、`dialog-eth-signin.tsx`、`dialog-publish.tsx`
- App 视图与预览：`app-view.tsx`, `preview.tsx`
- 基础 UI：`components/ui/*`

### providers（全局上下文）
- `theme.tsx`：主题切换
- `file-tree.tsx`：编辑器文件树状态
- `web-container.tsx`：WebContainer 生命周期与状态
- `wagmi.tsx`：以太坊/wallet 连接
- `auth.tsx`：认证上下文

### services（服务封装）
- `vibe3_api/*`：与 Vibe3 后端交互（apps, auth, build, chats, envs, files, messages）
- `instantdb_api/*`：OAuth、模板、工具、类型
- `error_report.tsx`：错误上报客户端

### 其他关键模块
- `event_bus/emitter.tsx`：全局事件总线（发布/订阅、跨组件通信）
- `hooks/useAuth.ts`：认证逻辑 Hook
- `lib/utils.ts`：通用工具函数
- `uitls/*`：输出、文件等辅助函数（注意目录名为 `uitls`）

## 核心业务流程

### 1) 认证与会话
- 登录/注册位于 `(home)` 分组；`hooks/useAuth.ts` + `providers/auth.tsx` 维护认证态。
- InstantDB OAuth 通过 `(home)/oauth/instant/redirect/page.tsx` 完成回调与上下文写入。

### 2) 对话式生成与编辑
- 用户通过 `components/chat` 发起对话，服务端由 `api/chat/route.ts` 处理请求并调度 MCP 工具。
- 分步 Part 执行：
  - 读取/分析（`parts/read-action-part.tsx`, `parts/analyze-image.tsx`）
  - 修改/生成（`parts/modify-action-part.tsx`）
  - 依赖安装/命令执行（`parts/install-part.tsx`）
  - 质量校验（`parts/linting-part.tsx`）
  - 推理/搜索（`parts/reasoning-part.tsx`, `parts/web-search.tsx`）
- 编辑器与文件树：`components/editor/*` + `providers/file-tree.tsx`
- 即时预览：`components/preview.tsx` + `providers/web-container.tsx`

### 3) 应用运行与预览
- `app/[id]/page.tsx` 以应用 id 运行/渲染具体应用（结合 `components/app-view.tsx`）。
- WebContainer 提供浏览器端近似 Node 环境，支持即时构建与热刷新。

## API 层设计
- 采用 Next.js Route Handlers（`src/app/api/*`）运行在同一 Next 进程，无额外服务器。
- Chat API 下挂载 MCP 工具（Vision、Web Search 等）以服务端安全地访问外部能力。
- 前端错误统一上报到 `api/log_error`，`services/error_report.tsx` 封装上报。

## 服务层设计（services/*）
- 抽象外部系统（Vibe3 后端、InstantDB），避免 UI 组件感知底层网络细节。
- 典型对象：
  - `vibe3_api`：应用、构建、文件、消息、环境变量、聊天等 REST 客户端
  - `instantdb_api`：OAuth、模板、工具、类型

## 状态与通信
- 多 Provider 管理全局状态（主题、认证、文件树、WebContainer、wagmi）。
- `event_bus` 提供跨组件解耦通信（如构建状态、预览刷新通知）。

## 工程约定
- TypeScript 全量覆盖；命名语义化、可读性优先。
- 页面层仅编排 UI 流程与调用 `services`，避免直接耦合外部接口细节。
- 基础 UI 与业务组件解耦，暴露清晰 Props；避免横向依赖。
- 严格 ESLint；遵循最小影响面修改原则。

## 扩展点
- 增加 MCP 工具（代码质量、依赖分析、性能分析等）。
- 扩展 `services/vibe3_api`，完善云端构建与发布流水线。
- 引入标准化持久化接口，便于切换后端/多数据源支持。
- 引入工作区/角色权限模型，支持多租户与协作场景。

## 区块链集成
- 支持区块链钱包登录
- 支持 token 支付 credit
- 支持生成 Web3 的相关 SDK 集成代码


---
本概览聚焦职责边界、数据/控制流与工程约定，便于新成员快速理解并上手开发。

## 团队联系方式

- GitHub: [jiangplus](https://github.com/jiangplus)
- Team: Vibe3

*Built with ❤️ for ETHShanghai 2025 Hackathon*