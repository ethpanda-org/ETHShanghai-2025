# CrediNet 文档中心

欢迎来到 CrediNet 文档中心！这里包含了所有关于 CrediNet 项目的技术文档、白皮书和集成指南。

## 📚 文档列表

### 白皮书

- **CrediNet 白皮书（中文版）** - `credinet-whitepaper-cn.md`
  - 了解 CrediNet 的核心理念、技术架构和经济模型
  
- **CrediNet Whitepaper (English)** - 即将推出
  - Learn about CrediNet's vision, architecture, and tokenomics

- **CrediNet Whitepaper (Deutsch)** - `credinet-whitepaper-de.md`
  - Erfahren Sie mehr über das CrediNet-Projekt

### 集成指南

- **CrediNet × World ID 集成说明书** - `worldid-integration.md`
  - 基于 World ID 的去中心化身份验证集成完整指南
  - 包含代码示例、API 文档和最佳实践

- **CrediNet × Self.Protocol 集成介绍** - `self-protocol-integration.md`
  - 基于 Self.Protocol 的链上身份和信用数据集成
  - 数据同步、隐私保护和跨链聚合

## 📝 如何添加新文档

### 1. 创建 Markdown 文件

在 `frontend/public/docs/` 目录下创建新的 `.md` 文件：

```bash
touch frontend/public/docs/your-document.md
```

### 2. 编写文档内容

使用标准 Markdown 语法编写文档，支持：

- 标题（H1-H6）
- 列表（有序/无序）
- 代码块（支持语法高亮）
- 表格
- 引用块
- 图片
- 链接

示例：

```markdown
# 文档标题

## 章节标题

这是一段文字。

### 代码示例

\`\`\`typescript
const example = "Hello, CrediNet!"
console.log(example)
\`\`\`

### 表格

| 功能 | 描述 |
|-----|------|
| DID | 去中心化身份 |
| SBT | 灵魂绑定代币 |
```

### 3. 更新文档配置

在 `frontend/src/config/docs.ts` 中添加新文档的配置：

```typescript
{
  id: 'your-document-id',
  title: '你的文档标题',
  description: '文档描述',
  category: 'whitepaper' | 'integration' | 'technical',
  language: 'zh' | 'en' | 'de',
  path: '/docs/your-document.md',
  icon: '📄',
  featured: true
}
```

### 4. 测试文档显示

启动开发服务器并访问 `/docs` 页面：

```bash
npm run dev
```

## 🎨 文档样式指南

### 标题层级

- **H1**: 文档主标题（每个文档只用一次）
- **H2**: 主要章节
- **H3**: 次级章节
- **H4**: 小节标题

### 代码块

使用语言标识符启用语法高亮：

```typescript
// TypeScript 代码
```

```rust
// Rust 代码
```

```solidity
// Solidity 代码
```

### 提示框

使用引用块创建提示：

```markdown
> **提示**: 这是一个重要的提示信息
```

### 表格

使用标准 Markdown 表格语法：

```markdown
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 数据1 | 数据2 | 数据3 |
```

## 🔧 技术实现

文档系统基于以下技术：

- **react-markdown**: Markdown 渲染
- **remark-gfm**: GitHub Flavored Markdown 支持
- **rehype-highlight**: 代码语法高亮
- **rehype-raw**: HTML 标签支持

## 📱 功能特性

### 文档阅读器

- ✅ Markdown 实时渲染
- ✅ 代码语法高亮
- ✅ 响应式设计
- ✅ 深色主题优化
- ✅ 表格支持
- ✅ 图片展示

### 文档导航

- ✅ 分类浏览
- ✅ 侧边栏导航
- ✅ 快速切换
- ✅ 视图模式切换（网格/列表）

### 搜索和过滤

- 🚧 按分类过滤（即将推出）
- 🚧 关键词搜索（即将推出）
- 🚧 标签系统（即将推出）

## 🌐 多语言支持

文档系统支持多语言文档：

- 🇨🇳 中文 (zh)
- 🇬🇧 英文 (en)
- 🇩🇪 德语 (de)

## 📄 文档模板

### 白皮书模板

```markdown
# 项目名称

> 简短的项目描述

## 目录

1. [摘要](#摘要)
2. [背景](#背景)
3. [技术架构](#技术架构)
4. [经济模型](#经济模型)

## 摘要

项目摘要...

## 背景

项目背景...
```

### 集成指南模板

```markdown
# 项目名称 × 集成方

> 集成说明

## 集成概述

### 什么是 XXX？

介绍...

## 技术方案

### 集成架构

架构说明...

## 集成步骤

### Step 1: 安装依赖

步骤说明...
```

## 🤝 贡献指南

欢迎为文档做出贡献！请遵循以下步骤：

1. Fork 项目仓库
2. 创建新的文档或编辑现有文档
3. 提交 Pull Request
4. 等待审核和合并

## 📞 联系我们

如有文档相关问题，请联系：

- Email: docs@credinet.xyz
- GitHub Issues: [创建 Issue](https://github.com/credinet/credinet/issues)

---

*最后更新: 2024*
