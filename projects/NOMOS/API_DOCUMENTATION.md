# 🎯 前端API文档 - Guild Score系统

## 📋 概述

本文档提供了Guild Score系统的完整API接口，用于前端展示用户分数、排行榜、历史记录等功能。

**基础URL**: `http://localhost:8080`  
**API版本**: v1  
**数据格式**: JSON  

---

## 🏆 Guild Score API (推荐使用)

### 1. 获取用户Guild分数
**接口**: `GET /api/v1/guild/score/{address}`

**描述**: 获取指定用户的Guild分数，如果不存在会自动计算并保存

**参数**:
- `address` (path): 用户钱包地址

**响应示例**:
```json
{
  "user_id": 1,
  "address": "0x14dc79964da2c08b23698b3d3cc7ca32193d9955",
  "total_score": 56.61,
  "raw_score": 58.5,
  "task_creation_score": 20.0,
  "task_completion_score": 20.0,
  "bidding_score": 10.0,
  "dispute_score": 100.0,
  "quality_score": 100.0,
  "reliability_score": 100.0,
  "collaboration_score": 100.0,
  "communication_score": 100.0,
  "activity_score": 100.0,
  "rank": 2,
  "rank_title": "Good",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### 2. 获取Guild排行榜
**接口**: `GET /api/v1/guild/leaderboard`

**描述**: 获取Guild分数排行榜

**查询参数**:
- `limit` (optional): 返回数量，默认100，最大1000
- `offset` (optional): 偏移量，默认0

**响应示例**:
```json
{
  "data": [
    {
      "user_id": 3,
      "address": "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65",
      "total_score": 74.02,
      "rank": 1,
      "rank_title": "Excellent"
    },
    {
      "user_id": 5,
      "address": "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
      "total_score": 61.46,
      "rank": 2,
      "rank_title": "Excellent"
    }
  ],
  "meta": {
    "limit": 100,
    "offset": 0,
    "total": 11
  }
}
```

### 3. 获取用户Guild分数历史
**接口**: `GET /api/v1/guild/history/{address}`

**描述**: 获取用户Guild分数的历史记录

**参数**:
- `address` (path): 用户钱包地址
- `limit` (query, optional): 返回数量，默认30

**响应示例**:
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "old_score": 50.0,
      "new_score": 56.61,
      "change_reason": "task_completion",
      "change_details": "完成任务获得分数提升",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## 👤 用户相关API

### 4. 获取用户资料
**接口**: `GET /api/v1/users/{address}`

**描述**: 获取用户完整资料信息

**响应示例**:
```json
{
  "data": {
    "id": 2,
    "address": "0x14dc79964da2c08b23698b3d3cc7ca32193d9955",
    "created_at": "2025-10-20T15:00:54.300246+08:00",
    "updated_at": "2025-10-20T15:00:54.300246+08:00"
  }
}
```

---

## 🔄 数据同步API

### 5. 同步所有用户数据
**接口**: `POST /api/v1/sync/users`

**描述**: 手动触发全量用户数据同步

**响应示例**:
```json
{
  "message": "全量用户数据同步已启动",
  "status": "started"
}
```

### 6. 同步特定用户数据
**接口**: `POST /api/v1/sync/users/{address}`

**描述**: 同步指定用户的数据

**响应示例**:
```json
{
  "address": "0x14dc79964da2c08b23698b3d3cc7ca32193d9955",
  "message": "用户数据同步完成",
  "status": "completed"
}
```

### 7. 批量同步用户数据
**接口**: `POST /api/v1/sync/users/batch`

**请求体**:
```json
{
  "addresses": [
    "0x14dc79964da2c08b23698b3d3cc7ca32193d9955",
    "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65"
  ]
}
```

**响应示例**:
```json
{
  "failure_count": 0,
  "message": "批量同步完成",
  "results": [
    {
      "address": "0x14dc79964da2c08b23698b3d3cc7ca32193d9955",
      "status": "success"
    },
    {
      "address": "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65",
      "status": "success"
    }
  ],
  "success_count": 2,
  "total": 2
}
```

### 8. 获取同步状态
**接口**: `GET /api/v1/sync/status`

**描述**: 获取当前数据同步状态

**响应示例**:
```json
{
  "dev_mode": true,
  "last_sync_time": "2025-10-20T16:23:10+08:00",
  "status": "running",
  "sync_interval": "1 minute (dev mode)"
}
```

---

## 🛠️ 管理API

### 9. 触发周更新
**接口**: `POST /api/v1/admin/trigger-weekly-update`

**描述**: 手动触发周更新

**响应示例**:
```json
{
  "message": "Weekly update triggered"
}
```

### 10. 触发月更新
**接口**: `POST /api/v1/admin/trigger-monthly-update`

**描述**: 手动触发月更新

**响应示例**:
```json
{
  "message": "Monthly update triggered"
}
```

---

## 📊 等级系统说明

### Guild Score等级 (推荐使用)
- **Excellent** (优秀): 分数 ≥ 60
- **Good** (良好): 分数 ≥ 30
- **Poor** (较差): 分数 < 30

---

## 🎨 前端展示建议

### 主要页面组件
1. **用户个人页面**
   - 使用: `/api/v1/guild/score/{address}`
   - 显示: 总分、各维度分数、等级、排名

2. **排行榜页面**
   - 使用: `/api/v1/guild/leaderboard`
   - 显示: 前N名用户、分数、等级

3. **用户历史页面**
   - 使用: `/api/v1/guild/history/{address}`
   - 显示: 分数变化历史、变化原因

4. **用户对比页面**
   - 使用: 多个 `/api/v1/guild/score/{address}` 调用
   - 显示: 多用户分数对比

5. **数据同步管理页面**
   - 使用: `/api/v1/sync/*` 系列接口
   - 显示: 同步状态、批量操作

### 数据刷新策略
- **实时数据**: 用户个人分数 (每次访问重新计算)
- **缓存数据**: 排行榜 (建议5-10分钟刷新)
- **历史数据**: 分数历史 (建议1小时刷新)
- **同步数据**: 数据同步状态 (建议30秒刷新)

---

## 🔧 错误处理

### 常见错误码
- `400`: 请求参数错误
- `404`: 用户不存在
- `500`: 服务器内部错误

### 错误响应格式
```json
{
  "error": "错误描述信息"
}
```

---

## 🚀 快速开始

### 1. 启动后端服务
```bash
cd /home/firfly/crowdsourcing-update/packages/backend
make run
```

### 2. 测试API
```bash
# 健康检查
curl http://localhost:8080/health

# 获取用户分数
curl http://localhost:8080/api/v1/guild/score/0x14dc79964da2c08b23698b3d3cc7ca32193d9955

# 获取排行榜
curl http://localhost:8080/api/v1/guild/leaderboard?limit=10
```

### 3. 前端集成示例
```javascript
// 获取用户分数
const getUserScore = async (address) => {
  const response = await fetch(`/api/v1/guild/score/${address}`);
  return await response.json();
};

// 获取排行榜
const getLeaderboard = async (limit = 100, offset = 0) => {
  const response = await fetch(`/api/v1/guild/leaderboard?limit=${limit}&offset=${offset}`);
  return await response.json();
};

// 获取用户历史
const getUserHistory = async (address, limit = 30) => {
  const response = await fetch(`/api/v1/guild/history/${address}?limit=${limit}`);
  return await response.json();
};

// 获取用户资料
const getUserProfile = async (address) => {
  const response = await fetch(`/api/v1/users/${address}`);
  return await response.json();
};

// 同步用户数据
const syncUserData = async (address) => {
  const response = await fetch(`/api/v1/sync/users/${address}`, {
    method: 'POST'
  });
  return await response.json();
};

// 批量同步用户数据
const batchSyncUsers = async (addresses) => {
  const response = await fetch('/api/v1/sync/users/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ addresses })
  });
  return await response.json();
};

// 获取同步状态
const getSyncStatus = async () => {
  const response = await fetch('/api/v1/sync/status');
  return await response.json();
};
```

---

## 📝 注意事项

1. **CORS配置**: 已配置允许 `http://localhost:3000` 访问
2. **数据格式**: 所有时间字段使用ISO 8601格式
3. **分数精度**: 分数保留2位小数
4. **地址格式**: 使用小写地址格式
5. **分页限制**: 单次请求最多返回1000条记录
6. **API状态**: 所有列出的API接口均已测试通过，可正常使用
7. **推荐使用**: Guild Score API作为主要功能，传统声誉系统API暂时不可用

---

## 🔗 相关链接

- 后端服务: `http://localhost:8080`
- 健康检查: `http://localhost:8080/health`
- 数据库: PostgreSQL (Docker容器)
- 子图服务: GraphQL端点

---

*最后更新: 2025年10月20日*
