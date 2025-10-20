# 信用评分引擎 API 文档

## 📋 概述

信用评分引擎提供多维度的用户信用评分功能，基于用户授权的数据源进行综合评估。

**Base URL:** `http://localhost:8080`

---

## 🔐 认证

大部分API需要JWT认证。在请求头中包含：

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## 📊 评分计算

### 1. 计算当前用户信用评分

**端点：** `POST /credit/calculate`

**需要认证：** 是

**Query参数：**
- `force_refresh` (可选, boolean) - 是否强制刷新，默认false（使用缓存）

**请求示例：**
```bash
POST /credit/calculate?force_refresh=true
Authorization: Bearer eyJhbGc...
```

**响应示例：**
```json
{
  "success": true,
  "score": {
    "user_id": "12345",
    "total_score": 750,
    "level": "B",
    "breakdown": {
      "technical": 800,
      "financial": 700,
      "social": 600,
      "identity": 900
    },
    "labels": [
      "code_contributor",
      "verified_identity",
      "long_term_user"
    ],
    "version": "1.0",
    "generated_at": "2025-10-12T10:00:00Z"
  },
  "message": "信用评分计算成功"
}
```

**说明：**
- 计算过程会自动抓取用户已授权的所有数据源
- 使用缓存机制，默认1小时内返回缓存结果
- `force_refresh=true` 强制重新抓取数据并计算

---

### 2. 计算指定用户信用评分

**端点：** `POST /credit/calculate/:user_id`

**需要认证：** 否（或管理员权限）

**Path参数：**
- `user_id` (string) - 用户ID

**Query参数：**
- `force_refresh` (可选, boolean)

**请求示例：**
```bash
POST /credit/calculate/user123?force_refresh=false
```

**响应：** 同上

---

## 📈 评分查询

### 3. 查询当前用户评分

**端点：** `GET /credit/score`

**需要认证：** 是

**请求示例：**
```bash
GET /credit/score
Authorization: Bearer eyJhbGc...
```

**响应示例：**
```json
{
  "user_id": "12345",
  "score": {
    "user_id": "12345",
    "total_score": 750,
    "level": "B",
    "breakdown": {
      "technical": 800,
      "financial": 700,
      "social": 600,
      "identity": 900
    },
    "labels": [
      "code_contributor",
      "verified_identity"
    ],
    "version": "1.0",
    "generated_at": "2025-10-12T10:00:00Z"
  }
}
```

**说明：**
- 返回最近一次计算的评分结果
- 如果没有评分记录，score字段为null

---

### 4. 查询指定用户评分

**端点：** `GET /credit/score/:user_id`

**需要认证：** 否（公开查询）

**Path参数：**
- `user_id` (string) - 用户ID

**请求示例：**
```bash
GET /credit/score/user123
```

**响应：** 同上

---

## 👤 信用画像

### 5. 获取当前用户信用画像

**端点：** `GET /credit/profile`

**需要认证：** 是

**请求示例：**
```bash
GET /credit/profile
Authorization: Bearer eyJhbGc...
```

**响应示例：**
```json
{
  "user_id": "12345",
  "score": 750,
  "level": "B",
  "technical_dimension": {
    "github_activity": {
      "value": 85.5,
      "original_value": 220.0,
      "weight": 0.40
    },
    "code_quality": {
      "value": 75.0,
      "original_value": 50.0,
      "weight": 0.30
    },
    "community_impact": {
      "value": 80.0,
      "original_value": 100.0,
      "weight": 0.30
    },
    "total_score": 80.0
  },
  "financial_dimension": {
    "asset_value": {
      "value": 70.0,
      "original_value": 1.5,
      "weight": 0.40
    },
    "transaction_history": {
      "value": 75.0,
      "original_value": 150.0,
      "weight": 0.35
    },
    "account_longevity": {
      "value": 65.0,
      "original_value": 180.0,
      "weight": 0.25
    },
    "total_score": 70.0
  },
  "social_dimension": {
    "influence_score": {
      "value": 60.0,
      "original_value": 500.0,
      "weight": 0.50
    },
    "engagement_rate": {
      "value": 55.0,
      "original_value": 200.0,
      "weight": 0.30
    },
    "account_credibility": {
      "value": 100.0,
      "original_value": 100.0,
      "weight": 0.20
    },
    "total_score": 60.0
  },
  "identity_dimension": {
    "verification_level": {
      "value": 100.0,
      "original_value": 1.0,
      "weight": 0.50
    },
    "credential_count": {
      "value": 60.0,
      "original_value": 3.0,
      "weight": 0.30
    },
    "did_presence": {
      "value": 66.7,
      "original_value": 2.0,
      "weight": 0.20
    },
    "total_score": 90.0
  },
  "labels": [
    "code_contributor",
    "verified_identity",
    "long_term_user"
  ],
  "score_details": "{...完整JSON...}",
  "version": "1.0",
  "updated_at": "2025-10-12T10:00:00Z"
}
```

**说明：**
- 包含所有维度的详细分数
- 显示原始值和标准化值
- 显示各指标的权重
- 便于理解评分构成

---

### 6. 获取指定用户信用画像

**端点：** `GET /credit/profile/:user_id`

**需要认证：** 否（公开查询）

**Path参数：**
- `user_id` (string) - 用户ID

**请求示例：**
```bash
GET /credit/profile/user123
```

**响应：** 同上

---

## 📜 评分历史

### 7. 查询评分历史

**端点：** `GET /credit/history`

**需要认证：** 是

**Query参数：**
- `limit` (可选, integer) - 返回记录数，默认100

**请求示例：**
```bash
GET /credit/history?limit=10
Authorization: Bearer eyJhbGc...
```

**响应示例：**
```json
{
  "user_id": "12345",
  "history": [
    {
      "user_id": "12345",
      "total_score": 750,
      "level": "B",
      "breakdown": {...},
      "labels": [...],
      "version": "1.0",
      "generated_at": "2025-10-12T10:00:00Z"
    }
  ],
  "count": 1
}
```

---

## 🔍 数据源状态

### 8. 查询数据源状态

**端点：** `GET /credit/data_sources`

**需要认证：** 是

**请求示例：**
```bash
GET /credit/data_sources
Authorization: Bearer eyJhbGc...
```

**响应示例：**
```json
{
  "user_id": "12345",
  "sources": [
    {
      "data_source": "github",
      "available": true,
      "last_fetched": "2025-10-12T10:00:00Z",
      "error": null
    },
    {
      "data_source": "twitter",
      "available": true,
      "last_fetched": null,
      "error": null
    },
    {
      "data_source": "ethereum_wallet",
      "available": false,
      "last_fetched": null,
      "error": "未授权"
    }
  ]
}
```

**说明：**
- 显示各数据源的可用状态
- 显示最后抓取时间
- 显示错误信息（如未授权）

---

## 🔄 批量操作

### 9. 批量计算评分

**端点：** `POST /credit/batch_calculate`

**需要认证：** 是（建议管理员权限）

**请求体：**
```json
{
  "user_ids": [
    "user123",
    "user456",
    "user789"
  ]
}
```

**请求示例：**
```bash
POST /credit/batch_calculate
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "user_ids": ["user123", "user456"]
}
```

**响应示例：**
```json
{
  "success": true,
  "count": 2,
  "scores": [
    {
      "user_id": "user123",
      "total_score": 750,
      "level": "B",
      ...
    },
    {
      "user_id": "user456",
      "total_score": 820,
      "level": "A",
      ...
    }
  ]
}
```

---

## 📊 评分等级说明

| 等级 | 分数范围 | 描述 |
|------|----------|------|
| **S** | 900-1000 | 优秀 - 各维度表现卓越 |
| **A** | 800-899 | 良好 - 信用状况良好 |
| **B** | 700-799 | 中等 - 信用状况正常 |
| **C** | 600-699 | 一般 - 信用状况一般 |
| **D** | 500-599 | 较差 - 信用状况较差 |
| **E** | 0-499 | 很差 - 信用状况很差 |

---

## 🏷️ 用户标签说明

| 标签 | 触发条件 | 描述 |
|------|----------|------|
| `code_contributor` | 公开仓库≥10 或 年贡献≥100 | 代码贡献者 |
| `active_trader` | 交易次数≥100 | 活跃交易者 |
| `high_net_worth` | 总资产≥10 ETH | 高净值用户 |
| `social_influencer` | 粉丝数≥1000 | 社交影响力 |
| `verified_identity` | World ID验证 或 有VC | 已验证身份 |
| `long_term_user` | 账户历史≥1年 | 长期用户 |
| `early_adopter` | GitHub账号≥5年 | 早期采用者 |

---

## 🔧 错误代码

| 错误码 | HTTP状态 | 说明 |
|--------|----------|------|
| 1001 | 401 | 未认证 |
| 2001 | 500 | 数据库错误 |
| 3001 | 400 | JSON格式错误 |
| 3004 | 404 | 资源不存在 |

---

## 💡 使用建议

### 1. 评分缓存策略

- 默认缓存1小时
- 用户主动请求时可使用缓存
- 数据源变更后建议强制刷新

### 2. 数据源授权

在计算评分前，确保用户已授权数据源：

```bash
# 查看授权状态
GET /authorization/user123/authorized

# 设置授权
POST /authorization/set
{
  "user_id": "user123",
  "data_source": "github",
  "authorized": true
}
```

### 3. 评分更新时机

建议在以下情况更新评分：
- 用户新绑定数据源
- 用户修改授权设置
- 定期更新（如每周）
- 用户主动请求

### 4. 性能优化

- 使用缓存机制避免频繁计算
- 批量计算适用于后台任务
- 异步处理避免阻塞

---

## 📖 完整流程示例

### 场景：新用户首次计算信用评分

```bash
# 步骤1：用户登录
POST /auth/login
{
  "contact": "user@example.com",
  "code": "123456"
}
# 响应：获得access_token

# 步骤2：绑定GitHub账号
POST /identity/oauth/bind
{
  "user_id": "user123",
  "provider": "github",
  "code": "github_auth_code",
  "redirect_uri": "https://credinet.com/callback"
}

# 步骤3：连接钱包
POST /identity/wallet/connect
{
  "user_id": "user123",
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "chain_type": "ethereum",
  "signature": "0x...",
  "message": "Sign to verify ownership"
}

# 步骤4：授权数据使用
POST /authorization/batch
{
  "user_id": "user123",
  "authorizations": [
    {"data_source": "github", "authorized": true},
    {"data_source": "ethereum_wallet", "authorized": true}
  ]
}

# 步骤5：计算信用评分
POST /credit/calculate
Authorization: Bearer ACCESS_TOKEN

# 步骤6：查看评分结果
GET /credit/score
Authorization: Bearer ACCESS_TOKEN

# 步骤7：查看详细画像
GET /credit/profile
Authorization: Bearer ACCESS_TOKEN
```

---

## 🧪 测试端点

### 测试数据源状态

```bash
GET /credit/data_sources
Authorization: Bearer ACCESS_TOKEN
```

查看哪些数据源可用，用于调试。

---

## 📝 评分模型详解

### 维度构成

#### 1. 技术贡献（30%权重）
- **GitHub活跃度** (40%) - 仓库数、贡献次数
- **代码质量** (30%) - Stars、Gists质量
- **社区影响** (30%) - Followers数量

#### 2. 财务信用（35%权重）
- **资产价值** (40%) - 钱包余额
- **交易历史** (35%) - 交易次数
- **账户时长** (25%) - 首次交易至今天数

#### 3. 社交信誉（20%权重）
- **影响力** (50%) - 粉丝数
- **参与度** (30%) - 发帖量
- **可信度** (20%) - 平台认证状态

#### 4. 身份可信（15%权重）
- **验证级别** (50%) - World ID验证
- **凭证数量** (30%) - 可验证凭证
- **DID** (20%) - DID拥有数量

### 计算公式

```
总分 = (技术 × 0.30 + 财务 × 0.35 + 社交 × 0.20 + 身份 × 0.15) × 10

范围：0-1000
```

---

## ✅ 最佳实践

1. **首次评分前**
   - 确保绑定至少一个数据源
   - 设置数据源授权

2. **定期更新**
   - 建议每周更新一次评分
   - 数据源变更后及时更新

3. **前端展示**
   - 显示总分和等级
   - 展示各维度细分
   - 显示用户标签
   - 提供评分解释

4. **隐私保护**
   - 仅在用户授权后计算评分
   - 尊重用户的授权设置
   - 明确告知数据使用范围

---

## 🔗 相关文档

- [身份认证 API](./AUTH_API_DOCS.md)
- [DID 管理 API](./DID_API_DOCS.md)
- [身份绑定 API](./IDENTITY_API_DOCS.md)
- [用户授权 API](./AUTHORIZATION_API_DOCS.md)
- [需求验证报告](./CREDIT_REQUIREMENTS_VERIFICATION.md)

---

**信用评分引擎 API 文档 v1.0**

