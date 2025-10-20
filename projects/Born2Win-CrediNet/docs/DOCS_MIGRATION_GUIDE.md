# CrediNet 文档迁移指南

本指南帮助你将 Word 文档内容迁移到 CrediNet 文档系统。

## 📋 概览

已创建的文档模板：

1. ✅ `frontend/public/docs/credinet-whitepaper-cn.md` - CrediNet 白皮书（中文版）
2. ✅ `frontend/public/docs/credinet-whitepaper-de.md` - CrediNet 白皮书（德语版）
3. ✅ `frontend/public/docs/worldid-integration.md` - World ID 集成说明书
4. ✅ `frontend/public/docs/self-protocol-integration.md` - Self.Protocol 集成介绍

## 🚀 快速开始

### 1. 启动前端服务

```bash
cd frontend
npm run dev
```

服务将在 `http://localhost:3001` 启动。

### 2. 访问文档页面

在浏览器中打开：`http://localhost:3001/docs`

你将看到：
- 📚 推荐文档列表
- 🔍 文档分类（白皮书、集成文档、技术文档）
- 🌐 外部资源链接
- 📊 技术栈信息

### 3. 点击文档卡片

点击任意文档卡片，将进入文档阅读模式：
- 左侧：文档导航栏
- 右侧：文档内容区域（Markdown 渲染）

## 📝 如何迁移 Word 文档

### 方法 1: 手动复制粘贴（推荐）

1. **打开 Word 文档**
   - 打开你的 Word 文档（如 `CrediNet白皮书（中文版）.docx`）

2. **选择对应的 Markdown 文件**
   ```
   CrediNet 白皮书（中文版）.docx 
     → frontend/public/docs/credinet-whitepaper-cn.md
   
   CrediNet: Dezentrales Kreditnetzwerk – Whitepaper.docx
     → frontend/public/docs/credinet-whitepaper-de.md
   
   CrediNet × World ID 集成说明书.docx
     → frontend/public/docs/worldid-integration.md
   
   CrediNet × Self.Protocol 说明书与集成介绍.docx
     → frontend/public/docs/self-protocol-integration.md
   ```

3. **转换格式规则**

   | Word 元素 | Markdown 语法 | 示例 |
   |----------|--------------|------|
   | 一级标题 | `# 标题` | `# CrediNet 白皮书` |
   | 二级标题 | `## 标题` | `## 项目背景` |
   | 三级标题 | `### 标题` | `### 核心功能` |
   | 粗体 | `**文字**` | `**重要**` |
   | 斜体 | `*文字*` | `*强调*` |
   | 无序列表 | `- 项目` | `- 第一项` |
   | 有序列表 | `1. 项目` | `1. 第一步` |
   | 代码 | `` `代码` `` | `` `const a = 1` `` |
   | 代码块 | ` ```语言\n代码\n``` ` | 见下方示例 |
   | 链接 | `[文字](URL)` | `[GitHub](https://...)` |
   | 引用 | `> 文字` | `> 这是引用` |

4. **代码块示例**

   Word 中的代码段，转换为：
   
   ````markdown
   ```typescript
   const example = "Hello World"
   console.log(example)
   ```
   ````

5. **表格转换**

   Word 表格转换为 Markdown 表格：
   
   ```markdown
   | 列1 | 列2 | 列3 |
   |-----|-----|-----|
   | 数据1 | 数据2 | 数据3 |
   ```

6. **图片处理**

   如果 Word 中有图片：
   - 将图片保存到 `frontend/public/images/docs/`
   - 使用相对路径引用：`![描述](/images/docs/image.png)`

### 方法 2: 使用转换工具

可以使用在线工具将 Word 转换为 Markdown：

1. [Word to Markdown Converter](https://word2md.com/)
2. [Pandoc](https://pandoc.org/) - 命令行工具

   ```bash
   pandoc document.docx -o document.md
   ```

3. 然后复制转换后的内容到对应的 `.md` 文件

### 方法 3: 使用 VS Code 扩展

1. 安装 VS Code 的 "Docs Markdown" 扩展
2. 打开 Word 文档内容
3. 使用扩展功能转换格式
4. 粘贴到 `.md` 文件

## 🎨 Markdown 样式最佳实践

### 文档结构

```markdown
# 主标题（只用一次）

> **简短描述或引用**

## 目录

1. [章节一](#章节一)
2. [章节二](#章节二)

---

## 章节一

### 小节 1.1

内容...

### 小节 1.2

内容...

## 章节二

内容...

---

## 联系我们

底部信息...
```

### 强调和提示

```markdown
> **提示**: 这是一个重要提示

> **注意**: 这是需要注意的内容

> **警告**: 这是警告信息
```

### 特性列表

```markdown
- ✅ **已完成**: 功能描述
- 🚧 **进行中**: 功能描述
- 📋 **计划中**: 功能描述
- ❌ **已取消**: 功能描述
```

### 流程图（使用代码块）

```markdown
\`\`\`
用户 → CrediNet → World ID → 验证 → 更新信用分
\`\`\`
```

## 🔧 文档系统功能

### 已实现功能

- ✅ Markdown 实时渲染
- ✅ 代码语法高亮（支持 TypeScript、Rust、Solidity 等）
- ✅ 响应式设计（手机、平板、桌面）
- ✅ 深色主题优化
- ✅ 表格支持
- ✅ 分类导航
- ✅ 网格/列表视图切换
- ✅ 文档侧边栏导航
- ✅ 平滑动画效果

### 支持的 Markdown 特性

- ✅ GitHub Flavored Markdown (GFM)
- ✅ 表格
- ✅ 任务列表
- ✅ 删除线 `~~删除~~`
- ✅ 自动链接
- ✅ HTML 标签（部分）

## 📂 文件结构

```
frontend/
├── public/
│   └── docs/                    # 文档存储目录
│       ├── README.md
│       ├── credinet-whitepaper-cn.md
│       ├── credinet-whitepaper-de.md
│       ├── worldid-integration.md
│       └── self-protocol-integration.md
├── src/
│   ├── components/
│   │   └── docs/                # 文档组件
│   │       ├── DocViewer.tsx    # 文档阅读器
│   │       ├── DocNav.tsx       # 文档导航
│   │       └── DocCard.tsx      # 文档卡片
│   ├── config/
│   │   └── docs.ts              # 文档配置
│   └── pages/
│       └── Docs.tsx             # 文档页面
```

## 🎯 迁移步骤总结

### 对于每个 Word 文档：

1. ✅ **打开** Word 文档
2. ✅ **复制** 内容
3. ✅ **转换** 格式（标题、列表、代码等）
4. ✅ **粘贴** 到对应的 `.md` 文件
5. ✅ **调整** 格式（检查是否渲染正确）
6. ✅ **保存** 文件
7. ✅ **刷新** 浏览器查看效果

### 检查清单

- [ ] 标题层级正确（H1、H2、H3...）
- [ ] 代码块有语言标识符
- [ ] 表格格式正确
- [ ] 链接可点击
- [ ] 图片能显示（如果有）
- [ ] 列表格式正确
- [ ] 特殊字符正确显示

## 🌟 样式预览

访问 `http://localhost:3001/docs` 并点击任意文档查看：

1. **标题** - 渐变色效果，自动分割线
2. **代码块** - 语法高亮，深色背景
3. **表格** - 带边框，悬停效果
4. **链接** - 青色，下划线
5. **引用** - 左侧青色边框
6. **列表** - 合适的间距和缩进

## 💡 提示和技巧

### 1. 快速格式化

使用 VS Code 的 Markdown 预览：
- 按 `Ctrl+Shift+V`（Windows/Linux）
- 按 `Cmd+Shift+V`（Mac）

### 2. 实时预览

保存 `.md` 文件后，浏览器会自动刷新（Vite HMR）

### 3. 复制粘贴优化

从 Word 复制时：
- 使用"纯文本粘贴"（Ctrl+Shift+V）
- 避免带格式粘贴，手动添加 Markdown 语法

### 4. 图片优化

- 使用相对路径
- 压缩图片大小
- 推荐格式：PNG、WebP、SVG

## 🐛 常见问题

### Q1: 文档不显示？

**A**: 检查文件路径是否正确：
- 文件必须在 `frontend/public/docs/` 目录
- 配置文件中的路径格式：`/docs/filename.md`

### Q2: 代码没有高亮？

**A**: 确保代码块有语言标识符：
````markdown
```typescript
// 代码
```
````

### Q3: 表格显示不正确？

**A**: 检查表格语法：
```markdown
| 列1 | 列2 |
|-----|-----|
| 数据1 | 数据2 |
```
注意：`|` 必须对齐，`-----` 至少3个破折号

### Q4: 中文显示乱码？

**A**: 确保文件编码为 UTF-8
- VS Code: 右下角选择 UTF-8
- 保存时选择 UTF-8 编码

## 📞 需要帮助？

如有问题，请：
1. 查看 `frontend/public/docs/README.md`
2. 参考现有模板文件
3. 查看浏览器控制台错误信息

## ✅ 完成后

所有文档迁移完成后：
1. 测试每个文档的显示效果
2. 检查所有链接是否可用
3. 确认图片正常加载
4. 验证移动端显示效果

---

**祝你迁移顺利！如有问题随时询问。** 🚀

