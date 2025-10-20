# CrediNet 用户授权系统 API 文档

## 📋 概述

用户授权系统允许用户自主控制哪些数据源可用于信用评估，提供完整的授权管理、日志记录和权限范围限定功能。

## 🚀 快速开始

所有授权相关的API端点都以 `/authorization` 开头。

## 📚 API 接口

### 1. 设置数据源授权

**接口:** `POST /authorization/set`

**请求体:**
```json
{
  "user_id": "user_12345",
  "data_source": "github",
  "authorized": true,
  "purpose": "用于信用评分"
}
```

**响应:**
```json
{
  "success": true,
  "data_source": "github",
  "status": "authorized",
  "message": "数据源授权成功"
}
```

### 2. 批量设置授权

**接口:** `POST /authorization/batch`

**请求体:**
```json
{
  "user_id": "user_12345",
  "authorizations": [
    {"data_source": "github", "authorized": true},
    {"data_source": "twitter", "authorized": true},
    {"data_source": "ethereum_wallet", "authorized": false}
  ]
}
```

### 3. 获取用户所有授权

**接口:** `GET /authorization/:user_id`

### 4. 检查特定数据源授权

**接口:** `GET /authorization/:user_id/:data_source`

### 5. 获取已授权的数据源列表

**接口:** `GET /authorization/:user_id/authorized`

### 6. 撤销授权并清理数据

**接口:** `POST /authorization/:user_id/:data_source/revoke`

### 7. 获取授权日志

**接口:** `GET /authorization/:user_id/logs?limit=100`

### 8. 获取数据源权限范围

**接口:** `GET /authorization/scopes`

### 9. 获取授权统计

**接口:** `GET /authorization/:user_id/stats`

## 🔒 数据源类型

- `worldid` - World ID验证
- `verifiable_credential` - 可验证凭证
- `github` - GitHub账号
- `twitter` - Twitter账号
- `facebook` - Facebook账号
- `wechat` - 微信账号
- `ethereum_wallet` - 以太坊钱包
- `polygon_wallet` - Polygon钱包
- `solana_wallet` - Solana钱包
- `bitcoin_wallet` - Bitcoin钱包
- `did` - DID信息

## 📊 权限范围说明

每个数据源都有明确的权限范围限制，确保数据使用合规。

---

**文档版本**: v1.0.0
