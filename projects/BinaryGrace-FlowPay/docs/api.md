# FlowPay API 文档

本文档详细介绍了FlowPay平台的所有API接口，包括请求格式、响应结构和错误处理。

## 基础信息

### 基础URL
```
本地开发: http://localhost:8000
测试网: https://your-domain.com
```

### 认证方式
- **钱包连接**: 通过MetaMask进行身份验证
- **签名验证**: 使用私钥签名验证交易
- **无状态设计**: 不依赖服务器端会话

### 响应格式
所有API响应都遵循统一的JSON格式：
```json
{
  "status": "success|error|pending",
  "message": "描述信息",
  "data": {}, // 响应数据（可选）
  "timestamp": 1234567890
}
```

## 任务管理API

### 获取所有任务
```http
GET /api/tasks
```

**查询参数**:
- `lang`: 语言代码 (默认: zh)

**响应示例**:
```json
{
  "tasks": [
    {
      "id": 1,
      "title": "编写Python数据分析脚本",
      "description": "分析销售数据，生成可视化图表",
      "reward": 100000000000000000,
      "task_type": "编程开发",
      "requirements": "使用pandas和matplotlib",
      "deadline": 1704067200,
      "publisher": "0x1234...5678",
      "is_claimed": false,
      "is_completed": false,
      "executions": []
    }
  ]
}
```

### 获取特定任务详情
```http
GET /api/tasks/{task_id}
```

**路径参数**:
- `task_id`: 任务ID (整数)

**响应示例**:
```json
{
  "id": 1,
  "title": "编写Python数据分析脚本",
  "description": "分析销售数据，生成可视化图表",
  "reward": 100000000000000000,
  "task_type": "编程开发",
  "requirements": "使用pandas和matplotlib",
  "deadline": 1704067200,
  "publisher": "0x1234...5678",
  "is_claimed": false,
  "is_completed": false,
  "executions": [
    {
      "executor": "0xabcd...efgh",
      "result": "import pandas as pd\nimport matplotlib.pyplot as plt\n...",
      "executedAt": 1704060000,
      "isWinner": false
    }
  ]
}
```

### 发布新任务
```http
POST /api/tasks/publish
```

**请求体**:
```json
{
  "title": "任务标题",
  "description": "任务描述",
  "task_type": "编程开发",
  "requirements": "具体要求",
  "reward": 0.1,
  "deadline": "2024-01-15T23:59:00",
  "publisher_address": "0x1234...5678",
  "submission_link": "https://example.com/submit",
  "gas_limit": 500000,
  "gas_price": 20000000000
}
```

**响应示例**:
```json
// 成功响应
{
  "status": "success",
  "message": "任务发布成功"
}

// 需要签名响应
{
  "status": "pending_signature",
  "message": "需要前端签名交易",
  "transaction": {
    "from": "0x1234...5678",
    "to": "0xContract...Address",
    "data": "0x...",
    "gas": "0x7a120",
    "gasPrice": "0x4a817c800",
    "value": "0x0"
  },
  "sender_address": "0x1234...5678"
}
```

### 认领任务
```http
POST /api/tasks/{task_id}/claim
```

**请求体**:
```json
{
  "user_address": "0x1234...5678"
}
```

**响应示例**:
```json
{
  "status": "success",
  "message": "任务认领成功"
}
```

### 选择获胜者
```http
POST /api/tasks/{task_id}/select-winner
```

**请求体**:
```json
{
  "execution_index": 0,
  "publisher_address": "0x1234...5678",
  "gas_limit": 400000,
  "gas_price": 20000000000
}
```

**响应示例**:
```json
// 成功响应
{
  "status": "success",
  "message": "获胜者已选定，奖金已支付（AI审核通过）",
  "winner": "0xabcd...efgh",
  "reward": 100000000000000000,
  "audit_result": {
    "is_fair": true,
    "confidence": 0.95,
    "reason": "选择基于结果质量，公平合理"
  }
}

// AI审核失败响应
{
  "status": "audit_failed",
  "message": "AI审核不通过，选择可能不公平",
  "audit_result": {
    "is_fair": false,
    "confidence": 0.85,
    "reason": "存在明显的质量偏差",
    "risk_factors": ["选择了质量较低的结果"],
    "recommendations": ["建议选择质量更高的执行结果"]
  }
}

// 需要签名响应
{
  "status": "pending_signature",
  "pending_signature": {
    "transaction": {
      "from": "0x1234...5678",
      "to": "0xContract...Address",
      "data": "0x...",
      "gas": "0x61a80",
      "gasPrice": "0x4a817c800",
      "value": "0x16345785d8a0000"
    },
    "sender_address": "0x1234...5678"
  },
  "message": "需要 MetaMask 签名选择获胜者并支付奖金",
  "audit_result": {
    "is_fair": true,
    "confidence": 0.95,
    "reason": "选择基于结果质量，公平合理"
  }
}
```

## AI Agent API

### 启动AI Agent
```http
POST /api/agent/work/start
```

**响应示例**:
```json
{
  "status": "success",
  "message": "AI Agent工作已启动"
}
```

### 执行工作周期
```http
POST /api/agent/work/sync
```

**请求体**:
```json
{
  "claimed_task_ids": [1, 2, 3],
  "execution_order": "ai",
  "completed_task_ids": [4, 5],
  "is_manual_execution": false,
  "executor_address": "0x1234...5678",
  "gas_limit": 200000,
  "gas_price": 20000000000
}
```

**响应示例**:
```json
// 有任务执行
{
  "status": "pending_submission",
  "message": "任务执行完成，等待提交",
  "execution_completed": true,
  "pending_submission": {
    "taskId": 1,
    "executor": "0x1234...5678",
    "result": "执行结果内容",
    "gasLimit": 200000,
    "gasPrice": 20000000000
  }
}

// 无任务执行
{
  "status": "no_tasks",
  "message": "没有可用任务",
  "execution_completed": false,
  "pending_submission": null
}
```

### 提交执行结果
```http
POST /api/agent/work/submit-execution
```

**请求体**:
```json
{
  "task_id": 1,
  "executor_address": "0x1234...5678",
  "result": "执行结果内容",
  "gas_limit": 300000,
  "gas_price": 20000000000
}
```

**响应示例**:
```json
// 成功响应
{
  "status": "success",
  "message": "执行记录提交成功"
}

// 需要签名响应
{
  "status": "pending_signature",
  "pending_signature": {
    "transaction": {
      "from": "0x1234...5678",
      "to": "0xContract...Address",
      "data": "0x...",
      "gas": "0x493e0",
      "gasPrice": "0x4a817c800",
      "value": "0x0"
    },
    "sender_address": "0x1234...5678"
  }
}
```

## 区块链API

### 获取账户余额
```http
GET /api/blockchain/balance/{address}
```

**路径参数**:
- `address`: 以太坊地址

**响应示例**:
```json
{
  "address": "0x1234...5678",
  "balance": 1000000000000000000
}
```

### 估算Gas消耗
```http
GET /api/blockchain/estimate-gas/publish
GET /api/blockchain/estimate-gas/execution
GET /api/blockchain/estimate-gas/payment
```

**响应示例**:
```json
{
  "gas_estimate": 500000
}
```

### 获取网络信息
```http
GET /api/network/info
```

**响应示例**:
```json
{
  "network_type": "testnet",
  "supports_metamask": true,
  "description": "当前网络: testnet"
}
```

## 审核API

### 获取任务审核摘要
```http
GET /api/tasks/{task_id}/audit-summary
```

**响应示例**:
```json
{
  "task_id": 1,
  "total_executions": 3,
  "audit_status": "ready",
  "message": "任务有 3 条执行记录，可以进行审核"
}
```

## 统计API

### 获取工作统计
```http
GET /api/worker/stats
```

**响应示例**:
```json
{
  "total_tasks": 15,
  "active_workers": 8
}
```

### 获取用户认领任务
```http
POST /api/user/claimed-tasks
```

**请求体**:
```json
{
  "user_address": "0x1234...5678"
}
```

**响应示例**:
```json
{
  "claimed_tasks": [
    {
      "task_id": 1,
      "title": "编写Python数据分析脚本",
      "description": "分析销售数据，生成可视化图表",
      "reward": 100000000000000000,
      "deadline": 1704067200,
      "publisher": "0xabcd...efgh"
    }
  ]
}
```

## 错误处理

### 错误响应格式
```json
{
  "status": "error",
  "message": "错误描述",
  "detail": "详细错误信息",
  "code": "ERROR_CODE"
}
```

### 常见错误代码

#### 400 Bad Request
```json
{
  "status": "error",
  "message": "请求参数错误",
  "detail": "缺少必要参数: user_address",
  "code": "MISSING_PARAMETER"
}
```

#### 404 Not Found
```json
{
  "status": "error",
  "message": "资源不存在",
  "detail": "任务不存在",
  "code": "TASK_NOT_FOUND"
}
```

#### 500 Internal Server Error
```json
{
  "status": "error",
  "message": "服务器内部错误",
  "detail": "区块链连接失败",
  "code": "BLOCKCHAIN_ERROR"
}
```

### 业务逻辑错误

#### 任务已完成
```json
{
  "status": "error",
  "message": "任务已完成",
  "detail": "无法对已完成的任务进行操作",
  "code": "TASK_COMPLETED"
}
```

#### 任务已认领
```json
{
  "status": "error",
  "message": "任务已认领",
  "detail": "该任务已被其他用户认领",
  "code": "TASK_CLAIMED"
}
```

#### 权限不足
```json
{
  "status": "error",
  "message": "权限不足",
  "detail": "只有任务发布者可以选择获胜者",
  "code": "INSUFFICIENT_PERMISSION"
}
```

## 请求示例

### 使用curl
```bash
# 获取所有任务
curl -X GET "http://localhost:8000/api/tasks" \
  -H "Content-Type: application/json"

# 发布任务
curl -X POST "http://localhost:8000/api/tasks/publish" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试任务",
    "description": "这是一个测试任务",
    "task_type": "编程开发",
    "requirements": "无特殊要求",
    "reward": 0.1,
    "deadline": "2024-01-15T23:59:00",
    "publisher_address": "0x1234567890123456789012345678901234567890"
  }'
```

### 使用JavaScript
```javascript
// 获取任务列表
const response = await fetch('/api/tasks');
const data = await response.json();
console.log(data.tasks);

// 发布任务
const publishResponse = await fetch('/api/tasks/publish', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: '测试任务',
    description: '这是一个测试任务',
    task_type: '编程开发',
    requirements: '无特殊要求',
    reward: 0.1,
    deadline: '2024-01-15T23:59:00',
    publisher_address: '0x1234567890123456789012345678901234567890'
  })
});
const publishData = await publishResponse.json();
console.log(publishData);
```

### 使用Python
```python
import requests

# 获取任务列表
response = requests.get('http://localhost:8000/api/tasks')
data = response.json()
print(data['tasks'])

# 发布任务
publish_data = {
    'title': '测试任务',
    'description': '这是一个测试任务',
    'task_type': '编程开发',
    'requirements': '无特殊要求',
    'reward': 0.1,
    'deadline': '2024-01-15T23:59:00',
    'publisher_address': '0x1234567890123456789012345678901234567890'
}
response = requests.post('http://localhost:8000/api/tasks/publish', json=publish_data)
data = response.json()
print(data)
```

## 速率限制

### 限制规则
- **API调用**: 每分钟最多100次请求
- **任务发布**: 每小时最多10个任务
- **AI Agent**: 每分钟最多5次工作周期

### 限制响应
```json
{
  "status": "error",
  "message": "请求过于频繁",
  "detail": "请稍后再试",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 60
}
```

## 版本控制

### API版本
- **当前版本**: v1.0.0
- **版本路径**: `/api/v1/` (可选)
- **向后兼容**: 支持旧版本API

### 版本更新
- **主要版本**: 不兼容的API更改
- **次要版本**: 向后兼容的功能添加
- **补丁版本**: 向后兼容的错误修复

---

**FlowPay API文档** - 构建强大的去中心化应用 🚀