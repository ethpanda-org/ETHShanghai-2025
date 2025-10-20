# OpenPick 桌面应用二次开发文档

## 1. 项目概述

OpenPick 是一款基于 Tauri 和 React 开发的桌面应用程序，提供任务管理、工具市场、用户个人资料和 AI 助手等功能。本文档旨在帮助开发者理解当前前端实现，并基于修改模拟数据进行二次开发。

## 2. 目录结构

前端项目的核心代码位于 `/opt/rust/project/picker/desktop/src/` 目录下，主要结构如下：

```
src/
├── App.tsx              # 应用主入口和布局
├── App.css              # 全局样式定义
├── components/          # React 组件目录
│   ├── MarketplaceContent.tsx    # 市场内容组件
│   ├── ProfileContent.tsx        # 用户资料组件
│   ├── ChatbotContent.tsx        # 聊天机器人组件
│   ├── LogStream.tsx             # 日志流组件
│   ├── PickerCard.tsx           # 选择器卡片组件
│   └── *.css                     # 组件样式文件
└── types/
    └── index.ts        # TypeScript 类型定义
```

## 3. 核心功能模块分析

### 3.1 应用主框架 (App.tsx)

App.tsx 是整个应用的入口点，负责：
- 整体布局结构（顶部导航栏、侧边栏、主内容区、底部日志栏）
- 页面路由管理（首页、市场、聊天机器人、个人资料）
- 全局状态管理（用户登录状态、活动筛选等）
- 用户认证流程（登录、注册、邮箱验证）

**关键模拟数据结构**：
- `mockTasks`: 模拟任务数据数组
- `mockPickers`: 模拟市场选择器数据数组
- `User` 接口: 用户数据结构定义
- `Task` 接口: 任务数据结构定义

### 3.2 市场模块 (MarketplaceContent.tsx)

市场模块负责展示可供用户浏览和获取的工具选择器，包含：
- 选择器分类筛选功能
- 选择器搜索功能
- 选择器网格布局展示
- 分页控制

**关键数据结构**：
- `Picker` 接口: 市场选择器数据结构
- `Category` 类型: 选择器分类定义
- `PickerRating` 接口: 选择器评分数据结构

### 3.3 用户资料模块 (ProfileContent.tsx)

用户资料模块展示用户的个人信息和使用统计，包含：
- 用户基本信息展示
- 最近活动记录
- 已安装工具列表
- 账户统计数据

**关键模拟数据结构**：
- `userData`: 模拟用户基本信息
- `recentActivities`: 模拟用户活动记录数组
- `installedTools`: 模拟已安装工具数组
- `profileStats`: 模拟账户统计数据

### 3.4 聊天机器人模块 (ChatbotContent.tsx)

聊天机器人模块提供 AI 助手功能，帮助用户解决问题和获取信息，包含：
- 会话管理（创建、切换、删除会话）
- 消息交互（发送、接收消息）
- 快速回复按钮
- 输入框和发送功能

**关键模拟数据结构**：
- `sessions`: 模拟会话列表
- `messages`: 模拟消息列表
- `generateBotResponse()`: 模拟 AI 响应生成函数

### 3.5 日志流模块 (LogStream.tsx)

日志流模块展示系统运行日志，提供调试和监控功能，包含：
- 可展开/折叠的日志面板
- 日志类型筛选（错误、警告、信息）
- 日志复制功能
- 可调整面板高度

**关键模拟数据结构**：
- `logs`: 模拟日志条目数组

## 4. 模拟数据修改指南

### 4.1 修改任务数据

任务数据位于 App.tsx 文件中的 `mockTasks` 数组，可通过以下方式修改：

```javascript
const mockTasks: Task[] = [
  {
    id: '1',  // 唯一标识符
    name: '数据自动化管道',  // 任务名称
    status: 'running',  // 任务状态：'running'|'idle'|'error'
    installed: '240128',  // 安装日期（格式：YYMMDD）
    runs: 128,  // 运行次数
    last_run: '240301'  // 最后运行日期（格式：YYMMDD）
    picker_path: 'entry.py' // 选择器路径
  },
  // 更多任务...
]
```

### 4.2 修改市场 Picker 产品数据

市场选择器数据位于 App.tsx 文件中的 `mockPickers` 数组：

```javascript
const mockPickers: Picker[] = [
  {
    id: '1',  // 唯一标识符
    name: '数据处理工具',  // 选择器名称
    description: 'ETL工具。轻松转换、验证和加载数据。',  // 选择器描述
    category: 'Tools',  // 选择器分类
    developer: 'DataTeam Inc.',  // 开发者名称
    rating: { score: 4.5, count: 128 },  // 选择器评分信息
    installs: 3450,  // 安装次数
    actionText: '获取'  // 操作按钮文本
  },
  // 更多选择器...
]
```

### 4.3 修改用户资料数据

用户资料数据位于 ProfileContent.tsx 文件中，包含多个模拟数据对象：

```javascript
// 用户基本信息
const userData = {
  name: '开发者名称',
  role: 'DEV',
  bio: '全栈开发者，擅长云架构和DevOps',
  location: '城市，国家',
  email: 'example@mail.com',
  memberSince: '2022年1月',
  position: '高级开发者',
  skills: ['React', 'Node.js', 'Python', 'AWS']  // 技能标签数组
}

// 最近活动记录
const recentActivities: Activity[] = [
  {
    id: '1',
    type: 'installation',  // 活动类型
    title: '已安装服务器监控',
    description: '工具 服务器监控',
    timestamp: '2024-05-01 01:32 AM'
  },
  // 更多活动...
]

// 已安装工具
const installedTools: InstalledTool[] = [
  {
    id: '1',
    name: '服务器监控',
    type: 'performance',  // 工具类型
    installedDate: '2024-04-01'
  },
  // 更多工具...
]

// 账户统计
const profileStats: ProfileStats = {
  toolsUsed: 12,
  contributions: 5,
  tasksCompleted: 87,
  monthsActive: 8,
  storageUsed: 1.2,
  storageTotal: 5,
  walletBalance: 10,
  premiumCredits: 50
}
```

### 4.4 修改聊天机器人数据

聊天机器人数据位于 ChatbotContent.tsx 文件中：

```javascript
// 初始会话列表
const [sessions, setSessions] = useState<ChatbotSession[]>([
  {
    id: '1',
    title: '当前对话',
    createdAt: new Date().toISOString(),
    lastMessage: '你好！今天我能帮你做什么？'
  }
])

// 初始消息列表
const [messages, setMessages] = useState<ChatMessage[]>([
  {
    id: '1',
    content: '你好！我是你的AI助手。今天我能帮你做什么？',
    sender: 'bot',
    timestamp: new Date().toISOString(),
    type: 'text',
    buttons: [
      { id: 'btn1', text: '显示可用工具', action: 'show_tools' },
      { id: 'btn2', text: '帮助完成任务', action: 'help_task' },
      { id: 'btn3', text: '解释功能', action: 'explain_features' }
    ]
  }
])
```

### 4.5 修改日志数据

日志数据位于 LogStream.tsx 文件中的 `logs` 数组：

```javascript
const [logs] = useState<LogEntry[]>([
  {
    id: '1',
    message: '开始任务 "数据自动化管道"...',
    type: 'info'  // 日志类型：'success'|'error'|'warning'|'info'
  },
  // 更多日志...
])
```

## 5. 样式定制指南

### 5.1 全局主题变量

应用的颜色主题通过 App.css 文件中的 CSS 变量定义，可通过修改这些变量来更改整体主题：

```css
:root {
  --bg-primary: #1a1a1a;  // 主背景色
  --bg-secondary: #2d2d2d;  // 次要背景色
  --bg-tertiary: #3a3a3a;  // 第三级背景色
  --text-primary: #ffffff;  // 主文本色
  --text-secondary: #b3b3b3;  // 次要文本色
  --text-muted: #666666;  // 暗淡文本色
  --accent-primary: #8b5cf6;  // 主强调色（紫色）
  --accent-secondary: #a78bfa;  // 次要强调色
  --success: #10b981;  // 成功色（绿色）
  --warning: #f59e0b;  // 警告色（橙色）
  --error: #ef4444;  // 错误色（红色）
  --info: #3b82f6;  // 信息色（蓝色）
  --border: #404040;  // 边框色
  --shadow: rgba(0, 0, 0, 0.3);  // 阴影色
}
```

### 5.2 组件样式修改

各组件的样式位于对应的 `.css` 文件中，例如：
- MarketplaceContent.css: 市场组件样式
- ProfileContent.css: 个人资料组件样式
- ChatbotContent.css: 聊天机器人组件样式
- LogStream.css: 日志流组件样式
- PickerCard.css: 选择器卡片组件样式

## 6. 类型定义扩展

应用中使用的所有 TypeScript 类型定义都位于 `/src/types/index.ts` 文件中。如需扩展数据结构，可以在此文件中添加或修改类型定义：

```typescript
// 示例：添加新的接口定义
interface NewDataType {
  id: string;
  name: string;
  value: number;
  timestamp: string;
}
```

## 7. 与 Tauri 后端集成

当前应用使用 fetch API 模拟与后端的通信。在实际集成 Tauri 后端时，需要：

1. 移除或替换模拟的 API 调用函数（如 `handleLogin`, `handleRegister` 等）
2. 使用 Tauri 的 `invoke` API 调用后端命令：
   
   ```javascript
   import { invoke } from '@tauri-apps/api'
   
   const handleLogin = async (email: string, password: string) => {
     try {
       const response = await invoke('login', {
         email,
         userPassword: password
       })zhe
       // 处理响应...
     } catch (error) {
       console.error('Login error:', error)
     }
   }
   ```

3. 确保后端命令与前端调用参数匹配

## 8. 开发注意事项

1. **代码规范**：遵循现有的代码风格和命名约定
2. **类型安全**：充分利用 TypeScript 进行类型检查，避免运行时错误
3. **组件复用**：尽可能复用现有组件，保持代码一致性
4. **模拟数据**：在没有后端接口的情况下，继续使用模拟数据进行开发
5. **性能优化**：避免不必要的重渲染，优化大型列表的渲染性能

## 9. 调试技巧

1. **浏览器开发工具**：在开发模式下，可以使用浏览器的开发者工具进行调试
2. **Tauri 前端 UI 开发工具**：使用 `npm run dev` 命令启动开发服务器，并利用 Tauri 前端 UI的调试功能
