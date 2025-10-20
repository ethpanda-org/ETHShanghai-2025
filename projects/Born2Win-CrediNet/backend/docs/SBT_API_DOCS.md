# SBT发放模块 API文档

## 📋 概述

SBT（Soulbound Token，灵魂绑定代币）发放模块负责根据用户的信用画像和行为数据，自动判断并发放相应的SBT。

**基础URL**: `http://127.0.0.1:8080`

## 🎯 核心功能

- 自动/手动SBT发放
- 基于信用评分的智能判断
- 区块链交易管理
- SBT状态追踪
- 发放统计和分析

## 📡 API端点

### 1. SBT发放

#### 1.1 自动发放SBT

根据用户画像自动判断并发放所有符合条件的SBT。

```http
POST /sbt/auto_issue
Authorization: Bearer {token}
```

**响应示例**:
```json
{
  "success": true,
  "issued_sbts": [
    {
      "sbt_type": "early_adopter",
      "user_id": "user_123",
      "status": "pending",
      "tx_hash": "0xabc123...",
      "issued_at": "2025-10-12T10:00:00Z"
    }
  ],
  "message": "成功发放 1 个SBT"
}
```

#### 1.2 手动发放指定类型SBT

```http
POST /sbt/issue/{sbt_type}
Authorization: Bearer {token}
```

**路径参数**:
- `sbt_type`: SBT类型（如：early_adopter, high_credit, active_user等）

**响应示例**:
```json
{
  "success": true,
  "issued_sbts": [
    {
      "sbt_type": "high_credit",
      "user_id": "user_123",
      "status": "confirmed",
      "token_id": "1001",
      "tx_hash": "0xdef456...",
      "issued_at": "2025-10-12T10:00:00Z"
    }
  ],
  "message": "SBT发放成功"
}
```

#### 1.3 管理员为指定用户发放SBT

```http
POST /sbt/admin/issue/{user_id}/{sbt_type}
```

**路径参数**:
- `user_id`: 用户ID
- `sbt_type`: SBT类型

**响应示例**:
```json
{
  "success": true,
  "issued_sbts": [
    {
      "sbt_type": "special_contributor",
      "user_id": "user_456",
      "status": "pending",
      "issued_at": "2025-10-12T10:00:00Z"
    }
  ],
  "message": "SBT发放成功"
}
```

### 2. SBT查询

#### 2.1 获取我的SBT列表

```http
GET /sbt/my
Authorization: Bearer {token}
```

**响应示例**:
```json
{
  "user_id": "user_123",
  "count": 3,
  "sbts": [
    {
      "sbt_type": "early_adopter",
      "status": "confirmed",
      "token_id": "1001",
      "tx_hash": "0xabc123...",
      "issued_at": "2025-10-01T10:00:00Z"
    },
    {
      "sbt_type": "high_credit",
      "status": "confirmed",
      "token_id": "1002",
      "tx_hash": "0xdef456...",
      "issued_at": "2025-10-05T10:00:00Z"
    },
    {
      "sbt_type": "active_user",
      "status": "pending",
      "tx_hash": "0xghi789...",
      "issued_at": "2025-10-12T10:00:00Z"
    }
  ]
}
```

#### 2.2 获取指定用户的SBT列表

```http
GET /sbt/user/{user_id}
```

**路径参数**:
- `user_id`: 用户ID

**响应示例**: 同上

#### 2.3 获取特定SBT的状态

```http
GET /sbt/status/{sbt_type}
Authorization: Bearer {token}
```

**路径参数**:
- `sbt_type`: SBT类型

**响应示例**:
```json
{
  "sbt_type": "high_credit",
  "user_id": "user_123",
  "status": "confirmed",
  "token_id": "1002",
  "tx_hash": "0xdef456...",
  "issued_at": "2025-10-05T10:00:00Z",
  "confirmed_at": "2025-10-05T10:05:00Z"
}
```

### 3. SBT类型和条件

#### 3.1 获取所有SBT类型列表

```http
GET /sbt/types
```

**响应示例**:
```json
{
  "types": [
    {
      "type": "early_adopter",
      "name": "早期采用者",
      "description": "项目早期注册用户",
      "requirements": "注册时间 < 2025-12-31"
    },
    {
      "type": "high_credit",
      "name": "高信用用户",
      "description": "信用评分达到700分以上",
      "requirements": "信用评分 >= 700"
    },
    {
      "type": "active_user",
      "name": "活跃用户",
      "description": "活跃度达到标准",
      "requirements": "活跃天数 >= 30"
    },
    {
      "type": "verified_identity",
      "name": "身份验证用户",
      "description": "完成World ID验证",
      "requirements": "World ID验证通过"
    },
    {
      "type": "github_contributor",
      "name": "GitHub贡献者",
      "description": "GitHub活跃贡献者",
      "requirements": "GitHub贡献 >= 100"
    }
  ]
}
```

#### 3.2 获取当前用户符合条件的SBT

```http
GET /sbt/eligible
Authorization: Bearer {token}
```

**响应示例**:
```json
{
  "types": [
    {
      "type": "high_credit",
      "name": "高信用用户",
      "description": "信用评分达到700分以上",
      "eligible": true,
      "reason": "信用评分: 750"
    },
    {
      "type": "active_user",
      "name": "活跃用户",
      "description": "活跃度达到标准",
      "eligible": false,
      "reason": "活跃天数不足: 15/30"
    }
  ]
}
```

### 4. SBT管理

#### 4.1 重试失败的SBT发放

```http
POST /sbt/retry/{sbt_type}
Authorization: Bearer {token}
```

**路径参数**:
- `sbt_type`: SBT类型

**响应示例**:
```json
{
  "success": true,
  "issued_sbts": [
    {
      "sbt_type": "high_credit",
      "status": "pending",
      "tx_hash": "0xnew123...",
      "issued_at": "2025-10-12T10:30:00Z"
    }
  ],
  "message": "SBT重新发放成功"
}
```

#### 4.2 撤销SBT发放

```http
POST /sbt/cancel/{sbt_type}
Authorization: Bearer {token}
```

**路径参数**:
- `sbt_type`: SBT类型

**响应示例**:
```json
{
  "success": true,
  "message": "SBT发放已撤销"
}
```

#### 4.3 同步待确认交易

批量同步所有待确认的区块链交易状态。

```http
POST /sbt/sync_pending
```

**响应示例**:
```json
{
  "success": true,
  "synced_count": 5,
  "message": "已同步 5 个待确认交易"
}
```

### 5. 统计和分析

#### 5.1 获取发放统计

```http
GET /sbt/stats
Authorization: Bearer {token}
```

**响应示例**:
```json
{
  "user_id": "user_123",
  "total_sbts": 3,
  "by_status": {
    "confirmed": 2,
    "pending": 1,
    "failed": 0
  },
  "by_type": {
    "early_adopter": 1,
    "high_credit": 1,
    "active_user": 1
  },
  "latest_issued": "2025-10-12T10:00:00Z"
}
```

## 📊 SBT类型说明

### 基础类型

| 类型 | 名称 | 条件 | 说明 |
|------|------|------|------|
| `early_adopter` | 早期采用者 | 注册时间 < 2025-12-31 | 项目早期用户奖励 |
| `verified_identity` | 身份验证用户 | World ID验证通过 | 完成人类验证 |
| `high_credit` | 高信用用户 | 信用评分 >= 700 | 信用良好用户 |
| `excellent_credit` | 卓越信用用户 | 信用评分 >= 800 | 信用优秀用户 |

### 活跃类型

| 类型 | 名称 | 条件 | 说明 |
|------|------|------|------|
| `active_user` | 活跃用户 | 活跃天数 >= 30 | 持续活跃用户 |
| `super_active` | 超级活跃用户 | 活跃天数 >= 90 | 长期活跃用户 |

### 贡献类型

| 类型 | 名称 | 条件 | 说明 |
|------|------|------|------|
| `github_contributor` | GitHub贡献者 | GitHub贡献 >= 100 | 活跃开发者 |
| `github_star` | GitHub明星 | GitHub Stars >= 1000 | 知名开发者 |

### 社交类型

| 类型 | 名称 | 条件 | 说明 |
|------|------|------|------|
| `social_influencer` | 社交影响者 | 社交活跃度 >= 80 | 社交活跃用户 |
| `community_leader` | 社区领袖 | 社区贡献度 >= 90 | 社区积极分子 |

## 🔄 SBT状态流转

```
pending (待确认)
    ↓
confirming (确认中)
    ↓
confirmed (已确认) ✅
    
或

pending (待确认)
    ↓
failed (失败) ❌
    ↓
retry (重试) → pending
```

## 💡 使用建议

### 1. 自动发放流程

```bash
# 步骤1: 查看符合条件的SBT
GET /sbt/eligible

# 步骤2: 自动发放所有符合条件的SBT
POST /sbt/auto_issue

# 步骤3: 查看发放结果
GET /sbt/my
```

### 2. 手动发放流程

```bash
# 步骤1: 查看所有SBT类型
GET /sbt/types

# 步骤2: 手动发放指定类型
POST /sbt/issue/high_credit

# 步骤3: 查看状态
GET /sbt/status/high_credit
```

### 3. 管理和维护

```bash
# 定期同步待确认交易
POST /sbt/sync_pending

# 重试失败的发放
POST /sbt/retry/{sbt_type}

# 查看统计信息
GET /sbt/stats
```

## ⚠️ 注意事项

1. **幂等性**: 同一类型的SBT不会重复发放
2. **条件检查**: 自动发放前会严格检查条件
3. **交易确认**: 区块链交易可能需要时间确认
4. **失败重试**: 失败的发放可以重试，系统会生成新交易
5. **撤销限制**: 只能撤销pending状态的SBT

## 🔧 测试

```bash
# 运行SBT模块测试
./run_tests.sh sbt

# 或直接运行Python测试
python3 tests/sbt/test_sbt.py
```

## 📚 相关文档

- [信用评分API文档](CREDIT_API_DOCS.md) - SBT发放依赖信用评分
- [测试指南](../tests/README.md) - 完整测试说明
- [快速开始](QUICK_START.md) - 快速上手指南

---

**最后更新**: 2025-10-12  
**API版本**: v1.0  
**维护状态**: ✅ 活跃维护

