# CrediNet 前端开发者API完整指南

> 📚 本文档为前端开发者提供CrediNet系统的完整API接口说明和使用示例

## 📋 目录

- [快速开始](#快速开始)
- [认证机制](#认证机制)
- [API端点总览](#api端点总览)
- [模块详解](#模块详解)
  - [1. 身份认证](#1-身份认证模块)
  - [2. DID管理](#2-did管理模块)
  - [3. 身份验证](#3-身份验证模块)
  - [4. 用户授权](#4-用户授权模块)
  - [5. 信用评分](#5-信用评分模块)
  - [6. SBT发放](#6-sbt发放模块)
- [错误处理](#错误处理)
- [完整示例](#完整示例)

---

## 🚀 快速开始

### 基础配置

```javascript
// API基础配置
const API_BASE_URL = 'http://127.0.0.1:8080';
const API_PREFIX = '/api';

// Axios配置示例
import axios from 'axios';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：自动添加JWT Token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：处理Token过期
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token过期，尝试刷新
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${API_BASE_URL}${API_PREFIX}/auth/refresh`,
            { refresh_token: refreshToken }
          );
          localStorage.setItem('access_token', data.access_token);
          // 重试原请求
          error.config.headers.Authorization = `Bearer ${data.access_token}`;
          return axios(error.config);
        } catch (refreshError) {
          // 刷新失败，跳转登录
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
```

### 5分钟快速集成

```javascript
// 1. 用户登录
async function login(email) {
  // 发送验证码
  await apiClient.post('/auth/send_code', { contact: email });
  
  // 用户输入验证码后
  const code = '123456'; // 从用户输入获取
  const { data } = await apiClient.post('/auth/login', {
    contact: email,
    code: code,
  });
  
  // 保存Token
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  localStorage.setItem('user_id', data.user_id);
  
  return data;
}

// 2. 获取用户信息
async function getUserProfile() {
  const { data } = await apiClient.get('/user/profile');
  return data;
}

// 3. 获取信用评分
async function getCreditScore() {
  const { data } = await apiClient.get('/score');
  return data;
}
```

---

## 🔐 认证机制

### JWT Token认证流程

```
┌─────────────┐
│  发送验证码  │
│ /auth/send_code │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  验证码登录  │
│ /auth/login  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ 获取Access & Refresh │
│      Tokens          │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  携带Token访问API    │
│ Authorization: Bearer│
└─────────────────────┘
```

### Token说明

| Token类型 | 有效期 | 用途 | 存储位置 |
|-----------|--------|------|----------|
| Access Token | 1小时 | API访问 | `localStorage.access_token` |
| Refresh Token | 7天 | 刷新Access Token | `localStorage.refresh_token` |

### Token使用示例

```javascript
// 所有需要认证的API请求
const headers = {
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': 'application/json',
};

// 示例：获取用户资料
fetch(`${API_BASE_URL}/api/user/profile`, {
  method: 'GET',
  headers: headers,
})
.then(res => res.json())
.then(data => console.log(data));
```

---

## 📊 API端点总览

### 完整端点列表（55+个）

| 模块 | 端点数 | 前缀 | 需要认证 |
|------|--------|------|----------|
| 身份认证 | 6个 | `/api/auth` | 部分 |
| DID管理 | 8个 | `/api/did` | ✅ |
| 身份验证 | 12个 | `/api/user` | ✅ |
| 用户授权 | 10个 | `/api/authorization` | ✅ |
| 信用评分 | 9个 | `/api/credit` | ✅ |
| SBT发放 | 12个 | `/api/sbt` | ✅ |

### 统一响应格式

#### 成功响应
```json
{
  "code": 0,
  "message": "success",
  "data": { /* 具体数据 */ }
}
```

#### 错误响应
```json
{
  "code": 1001,
  "message": "Invalid credentials",
  "data": null
}
```

---

## 📦 模块详解

## 1. 身份认证模块

### 1.1 发送验证码

**接口**: `POST /api/auth/send_code`

**说明**: 向用户邮箱/手机发送验证码

**请求参数**:
```json
{
  "contact": "user@example.com",  // 邮箱或手机号
  "captcha_token": "optional_captcha"  // 可选：CAPTCHA验证
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "code sent"
}
```

**前端示例**:
```javascript
async function sendVerificationCode(email) {
  try {
    const response = await apiClient.post('/auth/send_code', {
      contact: email,
    });
    console.log('验证码已发送');
    return response.data;
  } catch (error) {
    console.error('发送失败:', error.response?.data?.message);
    throw error;
  }
}
```

### 1.2 验证码登录

**接口**: `POST /api/auth/login`

**说明**: 使用验证码登录获取JWT Token

**请求参数**:
```json
{
  "contact": "user@example.com",
  "code": "123456"
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user_id": "user_12345",
    "expires_in": 3600
  }
}
```

**前端示例**:
```javascript
async function loginWithCode(email, code) {
  const { data } = await apiClient.post('/auth/login', {
    contact: email,
    code: code,
  });
  
  // 保存Token
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  localStorage.setItem('user_id', data.user_id);
  
  return data;
}
```

### 1.3 刷新Token

**接口**: `POST /api/auth/refresh`

**说明**: 使用Refresh Token获取新的Access Token

**请求参数**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  }
}
```

### 1.4 登出

**接口**: `POST /api/auth/logout`

**说明**: 撤销Refresh Token，退出登录

**请求头**: `Authorization: Bearer <access_token>`

**请求参数**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**前端示例**:
```javascript
async function logout() {
  const refreshToken = localStorage.getItem('refresh_token');
  
  try {
    await apiClient.post('/auth/logout', {
      refresh_token: refreshToken,
    });
  } finally {
    // 清除本地存储
    localStorage.clear();
    window.location.href = '/login';
  }
}
```

### 1.5 获取CAPTCHA（可选）

**接口**: `GET /api/auth/captcha`

**说明**: 获取图形验证码（用于防止滥用）

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "captcha_id": "abc123",
    "captcha_image": "data:image/png;base64,iVBORw0KGgo...",
    "expires_at": "2025-10-12T18:50:00Z"
  }
}
```

---

## 2. DID管理模块

### 2.1 创建DID

**接口**: `POST /api/did/create`

**说明**: 为当前用户创建W3C标准DID

**请求头**: `Authorization: Bearer <access_token>`

**请求参数**: 无

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "did": "did:credinet:user_12345_abc123",
    "document": {
      "@context": "https://www.w3.org/ns/did/v1",
      "id": "did:credinet:user_12345_abc123",
      "verificationMethod": [],
      "authentication": [],
      "service": []
    }
  }
}
```

**前端示例**:
```javascript
async function createDID() {
  const { data } = await apiClient.post('/did/create');
  console.log('DID创建成功:', data.did);
  return data;
}
```

### 2.2 获取DID信息

**接口**: `GET /api/did/:did`

**说明**: 查询指定DID的信息

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "did": "did:credinet:user_12345_abc123",
    "method": "credinet",
    "on_chain_registered": false,
    "created_at": "2025-10-12T10:00:00Z"
  }
}
```

### 2.3 获取DID Document

**接口**: `GET /api/did/:did/document`

**说明**: 获取DID的完整Document

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "@context": "https://www.w3.org/ns/did/v1",
    "id": "did:credinet:user_12345_abc123",
    "verificationMethod": [
      {
        "id": "did:credinet:user_12345_abc123#key-1",
        "type": "EcdsaSecp256k1VerificationKey2019",
        "controller": "did:credinet:user_12345_abc123",
        "publicKeyHex": "02b97c30..."
      }
    ],
    "authentication": ["did:credinet:user_12345_abc123#key-1"],
    "service": []
  }
}
```

### 2.4 更新DID Document

**接口**: `PUT /api/did/:did/document`

**说明**: 更新DID Document（会创建新版本）

**请求参数**:
```json
{
  "document": {
    "@context": "https://www.w3.org/ns/did/v1",
    "id": "did:credinet:user_12345_abc123",
    "verificationMethod": [],
    "service": [
      {
        "id": "did:credinet:user_12345_abc123#service-1",
        "type": "LinkedDomains",
        "serviceEndpoint": "https://example.com"
      }
    ]
  }
}
```

### 2.5 链上注册DID

**接口**: `POST /api/did/:did/register`

**说明**: 将DID注册到区块链

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "tx_hash": "0xabc123...",
    "status": "pending",
    "message": "DID registration submitted to blockchain"
  }
}
```

---

## 3. 身份验证模块

### 3.1 World ID验证

**接口**: `POST /api/user/verify/worldcoin`

**说明**: 验证Worldcoin World ID证明

**请求头**: `Authorization: Bearer <access_token>`

**请求参数**:
```json
{
  "proof": "0x1234567890abcdef...",
  "merkle_root": "0xabcdef...",
  "nullifier_hash": "0x987654..."
}
```

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "verified": true,
    "message": "World ID verification successful"
  }
}
```

**前端示例（配合Worldcoin SDK）**:
```javascript
import { IDKit, VerificationLevel } from '@worldcoin/idkit';

async function verifyWorldID() {
  // 使用Worldcoin IDKit获取证明
  const { proof, merkle_root, nullifier_hash } = await IDKit.verify({
    app_id: 'your_app_id',
    action: 'verify-human',
    verification_level: VerificationLevel.Orb,
  });
  
  // 提交到后端验证
  const { data } = await apiClient.post('/user/verify/worldcoin', {
    proof,
    merkle_root,
    nullifier_hash,
  });
  
  return data.verified;
}
```

### 3.2 OAuth社交平台绑定

**接口**: `POST /api/user/bind/social`

**说明**: 绑定社交平台账号（GitHub、Twitter等）

**请求参数**:
```json
{
  "provider": "github",  // github, twitter, facebook, wechat
  "code": "oauth_authorization_code",
  "redirect_uri": "https://yourapp.com/callback"
}
```

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "provider": "github",
    "username": "johndoe",
    "external_id": "github_12345",
    "profile_data": {
      "followers": 100,
      "public_repos": 50
    }
  }
}
```

**前端OAuth流程示例**:
```javascript
// 1. 跳转到OAuth授权页面
function initiateOAuth(provider) {
  const redirectUri = encodeURIComponent('https://yourapp.com/oauth/callback');
  const clientId = 'your_client_id';
  
  const authUrls = {
    github: `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}`,
    twitter: `https://twitter.com/i/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}`,
  };
  
  window.location.href = authUrls[provider];
}

// 2. 回调页面处理授权码
async function handleOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const provider = urlParams.get('state'); // 通过state参数传递provider
  
  const { data } = await apiClient.post('/user/bind/social', {
    provider: provider,
    code: code,
    redirect_uri: 'https://yourapp.com/oauth/callback',
  });
  
  console.log('绑定成功:', data);
  return data;
}
```

### 3.3 钱包地址关联

**接口**: `POST /api/user/wallet/connect`

**说明**: 关联区块链钱包地址

**请求参数**:
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
  "chain_type": "ethereum",  // ethereum, polygon, bsc, solana
  "signature": "0xabc123...",  // 可选：钱包签名
  "message": "Sign to verify ownership"  // 可选：签名消息
}
```

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
    "chain_type": "ethereum",
    "verified": true,
    "is_primary": false
  }
}
```

**前端示例（使用ethers.js）**:
```javascript
import { ethers } from 'ethers';

async function connectWallet() {
  // 1. 连接钱包
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  
  // 2. 签名验证（可选但推荐）
  const message = `Sign to verify ownership of ${address}`;
  const signature = await signer.signMessage(message);
  
  // 3. 提交到后端
  const { data } = await apiClient.post('/user/wallet/connect', {
    address: address,
    chain_type: 'ethereum',
    signature: signature,
    message: message,
  });
  
  console.log('钱包绑定成功:', data);
  return data;
}
```

### 3.4 设置主钱包

**接口**: `PUT /api/user/wallet/primary`

**说明**: 设置主钱包地址（用于SBT发放等）

**请求参数**:
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
}
```

### 3.5 获取已绑定账户

**接口**: `GET /api/user/bindings`

**说明**: 获取用户所有绑定的外部账户

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "wallets": [
      {
        "address": "0x742d35Cc...",
        "chain_type": "ethereum",
        "is_primary": true,
        "verified": true
      }
    ],
    "social": [
      {
        "provider": "github",
        "username": "johndoe",
        "external_id": "github_12345"
      }
    ],
    "worldcoin_verified": true
  }
}
```

---

## 4. 用户授权模块

### 4.1 设置数据源授权

**接口**: `POST /api/authorization/grant`

**说明**: 授权特定数据源用于信用评分

**请求参数**:
```json
{
  "data_sources": ["github", "wallet", "twitter"]
}
```

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "authorized_sources": ["github", "wallet", "twitter"],
    "updated_at": "2025-10-12T10:00:00Z"
  }
}
```

**前端示例**:
```javascript
async function updateAuthorizations(sources) {
  const { data } = await apiClient.post('/authorization/grant', {
    data_sources: sources,
  });
  return data;
}

// 使用示例
const authorizedSources = ['github', 'wallet', 'twitter'];
await updateAuthorizations(authorizedSources);
```

### 4.2 撤销数据源授权

**接口**: `POST /api/authorization/revoke`

**说明**: 撤销特定数据源的授权

**请求参数**:
```json
{
  "data_source": "github"
}
```

### 4.3 获取授权状态

**接口**: `GET /api/authorization/status`

**说明**: 获取所有数据源的授权状态

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "github": {
      "authorized": true,
      "updated_at": "2025-10-12T10:00:00Z"
    },
    "wallet": {
      "authorized": true,
      "updated_at": "2025-10-12T10:00:00Z"
    },
    "twitter": {
      "authorized": false,
      "updated_at": null
    }
  }
}
```

### 4.4 获取授权日志

**接口**: `GET /api/authorization/logs`

**说明**: 查看授权变更历史

**查询参数**: `?limit=20&offset=0`

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "total": 15,
    "logs": [
      {
        "action": "grant",
        "data_source": "github",
        "timestamp": "2025-10-12T10:00:00Z"
      },
      {
        "action": "revoke",
        "data_source": "twitter",
        "timestamp": "2025-10-11T15:30:00Z"
      }
    ]
  }
}
```

---

## 5. 信用评分模块

### 5.1 计算信用评分

**接口**: `POST /api/credit/score/calculate`

**说明**: 计算用户的信用评分

**请求参数**:
```json
{
  "force_refresh": false  // 可选：强制重新计算
}
```

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "user_id": "user_12345",
    "total_score": 750,
    "level": "B",
    "breakdown": {
      "technical": {
        "score": 80,
        "weight": 0.3,
        "contribution": 24
      },
      "financial": {
        "score": 70,
        "weight": 0.3,
        "contribution": 21
      },
      "social": {
        "score": 60,
        "weight": 0.2,
        "contribution": 12
      },
      "identity": {
        "score": 90,
        "weight": 0.2,
        "contribution": 18
      }
    },
    "labels": [
      "code_contributor",
      "active_trader",
      "verified_identity"
    ],
    "version": "1.0",
    "calculated_at": "2025-10-12T10:00:00Z",
    "cached": false
  }
}
```

**前端示例**:
```javascript
async function calculateCreditScore(forceRefresh = false) {
  const { data } = await apiClient.post('/credit/score/calculate', {
    force_refresh: forceRefresh,
  });
  
  return {
    score: data.total_score,
    level: data.level,
    breakdown: data.breakdown,
    labels: data.labels,
  };
}

// 显示信用评分
const scoreData = await calculateCreditScore();
console.log(`信用评分: ${scoreData.score} (${scoreData.level}级)`);
```

### 5.2 获取信用评分

**接口**: `GET /api/credit/score`

**说明**: 获取用户最新的信用评分（不重新计算）

**响应示例**: 同上

### 5.3 获取评分历史

**接口**: `GET /api/credit/score/history`

**说明**: 查看信用评分变化历史

**查询参数**: `?limit=10`

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "history": [
      {
        "score": 750,
        "level": "B",
        "calculated_at": "2025-10-12T10:00:00Z"
      },
      {
        "score": 720,
        "level": "C",
        "calculated_at": "2025-10-05T10:00:00Z"
      }
    ]
  }
}
```

### 5.4 获取信用画像

**接口**: `GET /api/credit/profile`

**说明**: 获取用户完整的信用画像

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "user_id": "user_12345",
    "score": 750,
    "level": "B",
    "labels": ["code_contributor", "active_trader"],
    "data_sources": {
      "github": {
        "status": "active",
        "last_updated": "2025-10-12T09:00:00Z",
        "metrics": {
          "public_repos": 50,
          "total_commits": 1000,
          "followers": 100
        }
      },
      "wallet": {
        "status": "active",
        "last_updated": "2025-10-12T09:00:00Z",
        "metrics": {
          "total_balance_usd": 5000,
          "transaction_count": 200
        }
      }
    },
    "updated_at": "2025-10-12T10:00:00Z"
  }
}
```

### 5.5 获取数据源状态

**接口**: `GET /api/credit/data-sources/status`

**说明**: 查看各数据源的状态

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "github": {
      "status": "active",
      "last_fetched": "2025-10-12T09:00:00Z",
      "error": null
    },
    "wallet": {
      "status": "active",
      "last_fetched": "2025-10-12T09:00:00Z",
      "error": null
    },
    "twitter": {
      "status": "error",
      "last_fetched": "2025-10-11T10:00:00Z",
      "error": "API rate limit exceeded"
    }
  }
}
```

---

## 6. SBT发放模块

### 6.1 自动发放SBT

**接口**: `POST /api/sbt/auto-issue`

**说明**: 根据信用画像自动判断并发放SBT

**请求参数**: 无（基于当前用户的信用评分）

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "eligible_sbts": [
      {
        "sbt_type": "HighCreditUser",
        "issued": true,
        "token_id": "123",
        "tx_hash": "0xabc123...",
        "status": "pending"
      },
      {
        "sbt_type": "CodeContributor",
        "issued": true,
        "token_id": "124",
        "tx_hash": "0xdef456...",
        "status": "pending"
      }
    ],
    "ineligible_sbts": [
      {
        "sbt_type": "DeFiExpert",
        "reason": "Insufficient DeFi activity"
      }
    ]
  }
}
```

**前端示例**:
```javascript
async function autoIssueSBT() {
  const { data } = await apiClient.post('/sbt/auto-issue');
  
  // 显示发放结果
  const issued = data.eligible_sbts.filter(s => s.issued);
  console.log(`成功发放 ${issued.length} 个SBT`);
  
  return data;
}
```

### 6.2 手动发放指定SBT

**接口**: `POST /api/sbt/issue`

**说明**: 手动请求发放特定类型的SBT

**请求参数**:
```json
{
  "sbt_type": "HighCreditUser",
  "wallet_address": "0x742d35Cc..."  // 可选，默认使用主钱包
}
```

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "sbt_type": "HighCreditUser",
    "token_id": "123",
    "wallet_address": "0x742d35Cc...",
    "tx_hash": "0xabc123...",
    "status": "pending",
    "issued_at": "2025-10-12T10:00:00Z"
  }
}
```

### 6.3 查询用户SBT

**接口**: `GET /api/sbt/my-sbts`

**说明**: 获取用户所有已发放的SBT

**查询参数**: `?status=confirmed` (可选：pending, confirmed, failed)

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "total": 5,
    "sbts": [
      {
        "id": 1,
        "sbt_type": "HighCreditUser",
        "token_id": "123",
        "wallet_address": "0x742d35Cc...",
        "tx_hash": "0xabc123...",
        "status": "confirmed",
        "issued_at": "2025-10-12T10:00:00Z",
        "confirmed_at": "2025-10-12T10:05:00Z"
      },
      {
        "id": 2,
        "sbt_type": "CodeContributor",
        "token_id": "124",
        "status": "pending",
        "issued_at": "2025-10-12T11:00:00Z"
      }
    ]
  }
}
```

**前端展示示例**:
```javascript
async function displayUserSBTs() {
  const { data } = await apiClient.get('/sbt/my-sbts', {
    params: { status: 'confirmed' }
  });
  
  // 渲染SBT列表
  return data.sbts.map(sbt => ({
    type: sbt.sbt_type,
    tokenId: sbt.token_id,
    issuedDate: new Date(sbt.issued_at).toLocaleDateString(),
    status: sbt.status,
  }));
}
```

### 6.4 查询SBT详情

**接口**: `GET /api/sbt/:id`

**说明**: 获取特定SBT的详细信息

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "sbt_type": "HighCreditUser",
    "token_id": "123",
    "wallet_address": "0x742d35Cc...",
    "tx_hash": "0xabc123...",
    "status": "confirmed",
    "metadata": {
      "name": "High Credit User Badge",
      "description": "Awarded to users with credit score > 750",
      "image": "ipfs://...",
      "attributes": [
        { "trait_type": "Credit Score", "value": 750 },
        { "trait_type": "Level", "value": "B" }
      ]
    },
    "issued_at": "2025-10-12T10:00:00Z",
    "confirmed_at": "2025-10-12T10:05:00Z"
  }
}
```

### 6.5 获取可发放SBT列表

**接口**: `GET /api/sbt/eligible`

**说明**: 查看用户符合条件的SBT类型

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "eligible": [
      {
        "sbt_type": "HighCreditUser",
        "name": "高信用用户徽章",
        "description": "信用评分达到750+",
        "already_issued": false
      },
      {
        "sbt_type": "CodeContributor",
        "name": "代码贡献者",
        "description": "GitHub提交数达到500+",
        "already_issued": true,
        "issued_at": "2025-10-12T10:00:00Z"
      }
    ],
    "ineligible": [
      {
        "sbt_type": "DeFiExpert",
        "name": "DeFi专家",
        "reason": "DeFi交易次数不足100次"
      }
    ]
  }
}
```

### 6.6 SBT统计

**接口**: `GET /api/sbt/statistics`

**说明**: 获取用户SBT统计信息

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "total_issued": 5,
    "confirmed": 3,
    "pending": 2,
    "failed": 0,
    "by_type": {
      "HighCreditUser": 1,
      "CodeContributor": 1,
      "ActiveTrader": 1
    },
    "latest_issued": "2025-10-12T11:00:00Z"
  }
}
```

---

## ❌ 错误处理

### 错误码规范

| 错误码范围 | 类型 | 说明 |
|-----------|------|------|
| 0 | 成功 | 请求成功 |
| 1001-1999 | 认证错误 | 未授权、凭证无效、Token过期 |
| 2001-2999 | 系统错误 | 数据库错误、权限不足、请求过多 |
| 3001-3999 | 业务错误 | 数据不存在、已存在、SBT发放失败 |
| 4001-4999 | 外部服务错误 | API错误、区块链错误、合约错误 |

### 常见错误码

```javascript
const ERROR_CODES = {
  // 认证错误
  1001: '未授权访问',
  1002: '凭证无效',
  1003: 'Token已过期',
  1004: '无效的验证码',
  
  // 系统错误
  2001: '数据库错误',
  2002: '无效的输入',
  2003: '权限不足',
  2009: '请求过于频繁',
  
  // 业务错误
  3001: '数据不存在',
  3002: '数据已存在',
  3003: 'SBT发放失败',
  3004: '数据不足',
  
  // 外部服务错误
  4001: '外部API错误',
  4002: '区块链错误',
  4003: '合约调用失败',
};
```

### 错误处理最佳实践

```javascript
// 统一错误处理函数
function handleApiError(error) {
  if (error.response) {
    const { code, message } = error.response.data;
    
    switch (code) {
      case 1001:
      case 1003:
        // Token过期，尝试刷新或跳转登录
        return refreshTokenOrRedirect();
        
      case 2009:
        // 请求过于频繁
        showToast('请求过于频繁，请稍后再试', 'warning');
        break;
        
      case 3001:
        // 数据不存在
        showToast('数据不存在', 'error');
        break;
        
      default:
        showToast(message || '请求失败', 'error');
    }
  } else {
    showToast('网络错误，请检查连接', 'error');
  }
}

// 使用示例
async function fetchData() {
  try {
    const { data } = await apiClient.get('/api/user/profile');
    return data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}
```

---

## 🎯 完整示例

### 完整用户流程示例

```javascript
// ==================== 用户注册登录流程 ====================

// 1. 发送验证码
async function startLogin(email) {
  await apiClient.post('/auth/send_code', { contact: email });
  console.log('验证码已发送到', email);
}

// 2. 验证码登录
async function completeLogin(email, code) {
  const { data } = await apiClient.post('/auth/login', {
    contact: email,
    code: code,
  });
  
  // 保存Token
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  localStorage.setItem('user_id', data.user_id);
  
  return data;
}

// ==================== 身份设置流程 ====================

// 3. 创建DID
async function setupIdentity() {
  const { data: didData } = await apiClient.post('/did/create');
  console.log('DID创建成功:', didData.did);
  
  return didData;
}

// 4. World ID验证（使用Worldcoin SDK）
async function verifyHumanity() {
  // 前端调用Worldcoin SDK获取证明
  const proof = await getWorldIDProof(); // 假设已实现
  
  const { data } = await apiClient.post('/user/verify/worldcoin', proof);
  console.log('World ID验证:', data.verified);
  
  return data;
}

// 5. 绑定GitHub
async function bindGitHub(authCode) {
  const { data } = await apiClient.post('/user/bind/social', {
    provider: 'github',
    code: authCode,
    redirect_uri: 'https://yourapp.com/callback',
  });
  
  console.log('GitHub绑定成功:', data.username);
  return data;
}

// 6. 连接钱包
async function connectEthereumWallet() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const message = `Verify ${address}`;
  const signature = await signer.signMessage(message);
  
  const { data } = await apiClient.post('/user/wallet/connect', {
    address,
    chain_type: 'ethereum',
    signature,
    message,
  });
  
  return data;
}

// ==================== 授权管理流程 ====================

// 7. 设置数据授权
async function setupAuthorizations() {
  const sources = ['github', 'wallet', 'worldcoin'];
  
  const { data } = await apiClient.post('/authorization/grant', {
    data_sources: sources,
  });
  
  console.log('已授权数据源:', data.authorized_sources);
  return data;
}

// ==================== 信用评分流程 ====================

// 8. 计算信用评分
async function calculateCredit() {
  const { data } = await apiClient.post('/credit/score/calculate', {
    force_refresh: true,
  });
  
  console.log('信用评分:', data.total_score, '等级:', data.level);
  console.log('评分明细:', data.breakdown);
  console.log('用户标签:', data.labels);
  
  return data;
}

// 9. 获取信用画像
async function getCreditProfile() {
  const { data } = await apiClient.get('/credit/profile');
  return data;
}

// ==================== SBT发放流程 ====================

// 10. 自动发放SBT
async function claimSBTs() {
  const { data } = await apiClient.post('/sbt/auto-issue');
  
  const issued = data.eligible_sbts.filter(s => s.issued);
  console.log(`成功发放 ${issued.length} 个SBT`);
  
  // 监控交易状态
  for (const sbt of issued) {
    await monitorTransaction(sbt.tx_hash);
  }
  
  return data;
}

// 11. 查看我的SBT
async function getMyBadges() {
  const { data } = await apiClient.get('/sbt/my-sbts');
  return data.sbts;
}

// ==================== 完整初始化流程 ====================

async function initializeUser(email, verificationCode) {
  try {
    // 1. 登录
    console.log('Step 1: 登录...');
    await completeLogin(email, verificationCode);
    
    // 2. 创建DID
    console.log('Step 2: 创建DID...');
    await setupIdentity();
    
    // 3. World ID验证（如果用户完成）
    console.log('Step 3: World ID验证...');
    await verifyHumanity();
    
    // 4. 绑定外部账户（如果用户授权）
    console.log('Step 4: 绑定GitHub...');
    // await bindGitHub(githubCode);
    
    // 5. 连接钱包
    console.log('Step 5: 连接钱包...');
    await connectEthereumWallet();
    
    // 6. 设置授权
    console.log('Step 6: 设置数据授权...');
    await setupAuthorizations();
    
    // 7. 计算信用评分
    console.log('Step 7: 计算信用评分...');
    const scoreData = await calculateCredit();
    
    // 8. 发放SBT
    console.log('Step 8: 发放SBT...');
    await claimSBTs();
    
    // 9. 获取最终状态
    const profile = await getCreditProfile();
    const badges = await getMyBadges();
    
    console.log('用户初始化完成！');
    return {
      score: scoreData,
      profile: profile,
      badges: badges,
    };
    
  } catch (error) {
    console.error('初始化失败:', error);
    handleApiError(error);
    throw error;
  }
}
```

### React组件示例

```jsx
import React, { useState, useEffect } from 'react';
import { apiClient } from './api';

// 信用评分展示组件
function CreditScoreCard() {
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadCreditScore();
  }, []);
  
  async function loadCreditScore() {
    try {
      const { data } = await apiClient.get('/credit/score');
      setScoreData(data);
    } catch (error) {
      console.error('获取评分失败:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function refreshScore() {
    setLoading(true);
    try {
      const { data } = await apiClient.post('/credit/score/calculate', {
        force_refresh: true,
      });
      setScoreData(data);
    } catch (error) {
      console.error('刷新评分失败:', error);
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) return <div>加载中...</div>;
  if (!scoreData) return <div>暂无评分</div>;
  
  return (
    <div className="credit-score-card">
      <h2>信用评分</h2>
      <div className="score-display">
        <span className="score">{scoreData.total_score}</span>
        <span className="level">等级: {scoreData.level}</span>
      </div>
      
      <div className="breakdown">
        <h3>评分明细</h3>
        {Object.entries(scoreData.breakdown).map(([key, value]) => (
          <div key={key} className="breakdown-item">
            <span>{key}:</span>
            <span>{value.score}</span>
            <div className="progress-bar" style={{width: `${value.score}%`}} />
          </div>
        ))}
      </div>
      
      <div className="labels">
        {scoreData.labels.map(label => (
          <span key={label} className="label-badge">{label}</span>
        ))}
      </div>
      
      <button onClick={refreshScore}>刷新评分</button>
    </div>
  );
}

// SBT展示组件
function SBTGallery() {
  const [sbts, setSbts] = useState([]);
  
  useEffect(() => {
    loadSBTs();
  }, []);
  
  async function loadSBTs() {
    const { data } = await apiClient.get('/sbt/my-sbts');
    setSbts(data.sbts);
  }
  
  async function claimNewSBTs() {
    try {
      const { data } = await apiClient.post('/sbt/auto-issue');
      alert(`成功发放 ${data.eligible_sbts.filter(s => s.issued).length} 个SBT`);
      await loadSBTs(); // 刷新列表
    } catch (error) {
      console.error('发放失败:', error);
    }
  }
  
  return (
    <div className="sbt-gallery">
      <h2>我的成就徽章</h2>
      <button onClick={claimNewSBTs}>领取新徽章</button>
      
      <div className="sbt-grid">
        {sbts.map(sbt => (
          <div key={sbt.id} className="sbt-card">
            <h3>{sbt.sbt_type}</h3>
            <p>Token ID: {sbt.token_id}</p>
            <p>状态: {sbt.status}</p>
            <p>发放时间: {new Date(sbt.issued_at).toLocaleDateString()}</p>
            {sbt.tx_hash && (
              <a href={`https://etherscan.io/tx/${sbt.tx_hash}`} target="_blank">
                查看交易
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export { CreditScoreCard, SBTGallery };
```

---

## 📝 附录

### OpenAPI规范

完整的OpenAPI 3.0规范可通过以下端点获取：

```
GET /api/openapi.json
```

### 环境配置

```bash
# 开发环境
API_BASE_URL=http://127.0.0.1:8080

# 生产环境
API_BASE_URL=https://api.credinet.io
```

### 安全建议

1. **Token存储**: 使用`localStorage`存储Token，但注意XSS风险
2. **HTTPS**: 生产环境必须使用HTTPS
3. **Token刷新**: Access Token过期时自动使用Refresh Token刷新
4. **敏感操作**: 钱包签名等敏感操作需要用户确认
5. **错误处理**: 统一处理401错误，自动跳转登录

### 常见问题

**Q: Token过期了怎么办？**
A: 使用Refresh Token调用`/api/auth/refresh`获取新的Access Token

**Q: 如何验证钱包地址归属？**
A: 连接钱包时提供签名参数，后端会验证签名有效性

**Q: 信用评分多久更新一次？**
A: 默认使用缓存（1小时），可传`force_refresh: true`强制刷新

**Q: SBT发放失败怎么办？**
A: 检查钱包地址是否正确，余额是否足够Gas费，可查看`/api/sbt/my-sbts`的status字段

---

## 📞 联系支持

- 📖 完整文档: [docs/README.md](README.md)
- 🐛 问题反馈: GitHub Issues
- 💬 技术支持: support@credinet.io

---

**最后更新**: 2025-10-12  
**API版本**: v2.0  
**文档版本**: 1.0

