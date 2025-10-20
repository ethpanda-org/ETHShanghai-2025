# RWA代币发行说明书Chatbot API

基于LangGraph的智能交互Agent系统，用于生成RWA代币发行说明书的FastAPI服务。

## 🚀 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 启动服务

```bash
python app.py
```

或者使用uvicorn：

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

服务将在 `http://localhost:8000` 启动。

### 3. 查看API文档

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 📋 功能特性

- ✅ **会话管理**: 支持多会话并发，每个会话独立状态
- ✅ **智能交互**: 基于LangGraph的多工具Agent系统
- ✅ **文档生成**: 12个章节的RWA代币发行说明书生成
- ✅ **状态持久化**: 完整的会话状态跟踪
- ✅ **文档导出**: 支持Markdown和JSON格式导出
- ✅ **异步处理**: 高性能异步API接口

## 🔧 API接口

### 系统接口

#### GET `/`
获取API基本信息

**响应示例:**
```json
{
  "message": "RWA代币发行说明书Chatbot API",
  "version": "1.0.0",
  "status": "running",
  "sections_count": 12,
  "available_sections": [
    "执行摘要（Executive Summary）",
    "发行主体与治理（Issuer & Governance）",
    "代币概览与分类（Token Overview & Classification）",
    "..."
  ]
}
```

#### GET `/health`
健康检查接口

**响应示例:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00",
  "active_sessions": 3,
  "system": "RWA Chatbot Service"
}
```

### 会话管理

#### POST `/session/create`
创建新的聊天会话

**请求体:**
```json
{
  "user_name": "张三",
  "project_name": "CloudComputer RWA项目"
}
```

**响应示例:**
```json
{
  "session_id": "123e4567-e89b-12d3-a456-426614174000",
  "message": "会话创建成功",
  "current_section": "0",
  "section_title": "执行摘要（Executive Summary）",
  "user_name": "张三",
  "project_name": "CloudComputer RWA项目"
}
```

#### GET `/session/list`
获取所有会话列表

#### GET `/session/{session_id}`
获取指定会话信息

#### DELETE `/session/{session_id}`
删除指定会话

### 聊天交互

#### POST `/chat`
与聊天机器人交互

**请求体:**
```json
{
  "content": "我想创建一个名为CCT的代币，用于云计算服务",
  "session_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

**响应示例:**
```json
{
  "session_id": "123e4567-e89b-12d3-a456-426614174000",
  "message": "好的！我来帮您设计CCT代币的基本信息...",
  "current_section": 0,
  "section_title": "执行摘要（Executive Summary）",
  "section_complete": false,
  "conversation_history": [
    {
      "role": "user",
      "content": "我想创建一个名为CCT的代币",
      "section": 0,
      "timestamp": "2024-01-20T10:30:00"
    },
    {
      "role": "assistant",
      "content": "好的！我来帮您设计...",
      "section": 0,
      "timestamp": "2024-01-20T10:30:05"
    }
  ],
  "document_state": {
    "current_section": 0,
    "interaction_mode": "fill",
    "section_complete": false
  }
}
```

#### GET `/session/{session_id}/state`
获取会话的完整状态

### 文档导出

#### POST `/session/{session_id}/export`
导出文档

**请求体:**
```json
{
  "format": "markdown",
  "include_history": true
}
```

**响应示例:**
```json
{
  "format": "markdown",
  "content": "# CloudComputer RWA代币发行说明书\n\n...",
  "filename": "RWA_memo_123e4567.md"
}
```

## 🎯 使用流程

### 1. 创建会话
```bash
curl -X POST "http://localhost:8000/session/create" \
  -H "Content-Type: application/json" \
  -d '{
    "user_name": "张三",
    "project_name": "我的RWA项目"
  }'
```

### 2. 开始聊天
```bash
curl -X POST "http://localhost:8000/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "我想发行一个RWA代币",
    "session_id": "你的会话ID"
  }'
```

### 3. 导出文档
```bash
curl -X POST "http://localhost:8000/session/{session_id}/export" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "markdown",
    "include_history": true
  }'
```

## 📝 支持的章节

1. 执行摘要（Executive Summary）
2. 发行主体与治理（Issuer & Governance）
3. 代币概览与分类（Token Overview & Classification）
4. 法律与合规（Legal & Regulatory）
5. Tokenomics（供给、分配、解锁、金库）
6. 募集历史与资金用途（Fundraising & Use of Proceeds）
7. 技术与安全（Technology & Security）
8. 上市与交易安排（Listing & Trading）
9. 市场诚信与信息披露（Market Integrity & Disclosures）
10. 主要风险（Key Risks）
11. 事件响应与下架（Incident & Delisting）
12. 声明与签署（Declarations）

## 🤖 智能功能

- **自动填写**: 输入"那你决定吧"让AI自动填写内容
- **智能建议**: 基于RWA行业最佳实践提供建议
- **结构化提取**: 自动提取代币名称、总量、法域等关键信息
- **章节导航**: 智能引导完成每个章节

## ⚠️ 注意事项

1. **API密钥配置**: 确保在`chatbot.py`中正确配置了OpenAI API密钥
2. **并发限制**: 服务支持多会话并发，但建议控制同时活跃会话数量
3. **数据持久化**: 当前采用内存存储，重启服务会丢失会话数据
4. **生产环境**: 建议添加Redis等外部存储来持久化会话状态

## 🔍 错误处理

常见的HTTP状态码：

- `200`: 成功
- `400`: 请求参数错误
- `404`: 会话不存在
- `500`: 服务器内部错误

错误响应格式：
```json
{
  "detail": "错误描述信息"
}
```

## 🛠️ 开发和调试

### 启用调试模式
```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload --log-level debug
```

### 查看日志
服务启动后会输出详细的运行日志，包括：
- 请求处理信息
- Agent执行过程
- 错误详情

## 📞 技术支持

如有问题，请检查：
1. 依赖是否正确安装
2. API密钥是否配置正确
3. 网络连接是否正常
4. 端口是否被占用

---

**🎉 祝您使用愉快！**