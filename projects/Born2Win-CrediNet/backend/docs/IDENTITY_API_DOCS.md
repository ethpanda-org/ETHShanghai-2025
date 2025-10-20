# CrediNet 身份验证与绑定模块 API 文档

## 📋 概述

CrediNet 身份验证与绑定模块提供了完整的第三方身份验证功能，包括World ID验证、去中心化凭证验证、社交平台OAuth绑定和钱包地址关联。

## 🚀 快速开始

### 启动服务
```bash
cargo run
```

服务将在 `http://127.0.0.1:8080` 启动

### 运行测试
```bash
# 身份验证模块测试
python3 tests/identity/test_identity.py

# 完整系统测试
python3 tests/integration/test_complete.py
```

## 📚 API 接口

## 🌍 World ID 验证

### 1. 验证 World ID 证明

**接口:** `POST /identity/worldid/verify`

**描述:** 验证用户的Worldcoin World ID零知识证明

**请求体:**
```json
{
  "user_id": "user_12345",
  "proof": {
    "merkle_root": "0x1234567890abcdef...",
    "nullifier_hash": "0xabcdef1234567890...",
    "proof": "0x...",
    "verification_level": "orb"
  },
  "action": "verify_humanity",
  "signal": "user_12345"
}
```

**参数说明:**
- `user_id` (string, 必需): 用户ID
- `proof` (object, 必需): World ID零知识证明对象
  - `merkle_root` (string): Merkle树根
  - `nullifier_hash` (string): 唯一性哈希
  - `proof` (string): 零知识证明数据
  - `verification_level` (string): 验证级别 (orb/device)
- `action` (string, 必需): 操作标识
- `signal` (string, 必需): 信号数据

**成功响应:**
```json
{
  "success": true,
  "verified": true,
  "message": "World ID verification successful"
}
```

**错误响应:**
- `400 Bad Request`: 请求参数错误
- `500 Internal Server Error`: 服务器内部错误

### 2. 查询 World ID 验证状态

**接口:** `GET /identity/worldid/status/{user_id}`

**描述:** 查询用户是否已通过World ID验证

**路径参数:**
- `user_id` (string): 用户ID

**成功响应:**
```json
{
  "user_id": "user_12345",
  "worldid_verified": true
}
```

## 🎓 可验证凭证（VC）验证

### 3. 验证可验证凭证

**接口:** `POST /identity/credential/verify`

**描述:** 验证用户提交的去中心化身份凭证

**请求体:**
```json
{
  "user_id": "user_12345",
  "credential": "{\"@context\":[\"https://www.w3.org/2018/credentials/v1\"],\"id\":\"http://example.edu/credentials/3732\",\"type\":[\"VerifiableCredential\",\"UniversityDegreeCredential\"],\"issuer\":\"did:example:university\",\"issuanceDate\":\"2024-01-01T00:00:00Z\",\"credentialSubject\":{\"id\":\"did:example:student\",\"degree\":{\"type\":\"BachelorDegree\",\"name\":\"Computer Science\"}},\"proof\":{\"type\":\"Ed25519Signature2020\",\"created\":\"2024-01-01T00:00:00Z\",\"verificationMethod\":\"did:example:university#key-1\",\"proofPurpose\":\"assertionMethod\",\"jws\":\"eyJhbGc...\"}}"
}
```

**参数说明:**
- `user_id` (string, 必需): 用户ID
- `credential` (string, 必需): VC凭证JSON字符串

**成功响应:**
```json
{
  "success": true,
  "verified": true,
  "credential_data": {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    "id": "http://example.edu/credentials/3732",
    "type": ["VerifiableCredential", "UniversityDegreeCredential"],
    "issuer": "did:example:university",
    "issuanceDate": "2024-01-01T00:00:00Z",
    "credentialSubject": {
      "id": "did:example:student",
      "degree": {
        "type": "BachelorDegree",
        "name": "Computer Science"
      }
    }
  },
  "message": "Credential verification successful"
}
```

### 4. 获取用户的可验证凭证列表

**接口:** `GET /identity/credential/{user_id}`

**描述:** 获取用户已验证的所有凭证列表

**路径参数:**
- `user_id` (string): 用户ID

**成功响应:**
```json
[
  {
    "id": "http://example.edu/credentials/3732",
    "issuer": "did:example:university",
    "vc_type": ["VerifiableCredential", "UniversityDegreeCredential"],
    "verified_at": "2024-01-01T00:00:00Z"
  }
]
```

## 🔗 OAuth 社交平台绑定

### 5. 绑定 OAuth 账号

**接口:** `POST /identity/oauth/bind`

**描述:** 绑定社交平台账号（Twitter、GitHub、Facebook、微信）

**请求体:**
```json
{
  "user_id": "user_12345",
  "provider": "github",
  "code": "authorization_code_from_oauth",
  "redirect_uri": "https://app.credinet.com/callback"
}
```

**参数说明:**
- `user_id` (string, 必需): 用户ID
- `provider` (string, 必需): 平台名称 (twitter/github/facebook/wechat)
- `code` (string, 必需): OAuth授权码
- `redirect_uri` (string, 必需): 回调地址

**成功响应:**
```json
{
  "success": true,
  "provider": "github",
  "external_id": "github_user_123",
  "message": "OAuth binding successful"
}
```

### 6. 解绑 OAuth 账号

**接口:** `POST /identity/oauth/unbind`

**描述:** 解除社交平台账号绑定

**请求体:**
```json
{
  "user_id": "user_12345",
  "provider": "github"
}
```

**成功响应:**
```json
{
  "success": true,
  "message": "OAuth unbinding successful"
}
```

### 7. 获取用户的 OAuth 绑定列表

**接口:** `GET /identity/oauth/{user_id}`

**描述:** 获取用户已绑定的所有社交平台账号

**路径参数:**
- `user_id` (string): 用户ID

**成功响应:**
```json
[
  {
    "provider": "github",
    "external_id": "github_user_123",
    "username": "user_github",
    "bound_at": "2024-01-01T00:00:00Z"
  },
  {
    "provider": "twitter",
    "external_id": "twitter_user_456",
    "username": "user_twitter",
    "bound_at": "2024-01-02T00:00:00Z"
  }
]
```

## 💰 钱包地址关联

### 8. 连接钱包地址

**接口:** `POST /identity/wallet/connect`

**描述:** 关联区块链钱包地址

**请求体:**
```json
{
  "user_id": "user_12345",
  "address": "0x1234567890abcdef1234567890abcdef12345678",
  "chain_type": "ethereum",
  "signature": "0xabcdef...",
  "message": "I am connecting my wallet to CrediNet"
}
```

**参数说明:**
- `user_id` (string, 必需): 用户ID
- `address` (string, 必需): 钱包地址
- `chain_type` (string, 必需): 链类型 (ethereum/polygon/bsc/solana/bitcoin)
- `signature` (string, 可选): 签名数据（用于验证地址归属）
- `message` (string, 可选): 签名的原始消息

**成功响应:**
```json
{
  "success": true,
  "address": "0x1234567890abcdef1234567890abcdef12345678",
  "verified": true,
  "message": "Wallet connected and verified"
}
```

### 9. 设置主钱包地址

**接口:** `PUT /identity/wallet/primary`

**描述:** 设置用户的主钱包地址

**请求体:**
```json
{
  "user_id": "user_12345",
  "address": "0x1234567890abcdef1234567890abcdef12345678"
}
```

**成功响应:**
```json
{
  "success": true,
  "message": "Primary wallet set successfully"
}
```

### 10. 获取用户的钱包地址列表

**接口:** `GET /identity/wallet/{user_id}`

**描述:** 获取用户关联的所有钱包地址

**路径参数:**
- `user_id` (string): 用户ID

**成功响应:**
```json
{
  "wallets": [
    {
      "address": "0x1234567890abcdef1234567890abcdef12345678",
      "chain_type": "ethereum",
      "is_primary": true,
      "verified": true,
      "connected_at": "2024-01-01T00:00:00Z"
    },
    {
      "address": "0xabcdef1234567890abcdef1234567890abcdef12",
      "chain_type": "polygon",
      "is_primary": false,
      "verified": false,
      "connected_at": "2024-01-02T00:00:00Z"
    }
  ]
}
```

### 11. 获取主钱包地址

**接口:** `GET /identity/wallet/primary/{user_id}`

**描述:** 获取用户的主钱包地址

**路径参数:**
- `user_id` (string): 用户ID

**成功响应:**
```json
{
  "user_id": "user_12345",
  "primary_wallet": "0x1234567890abcdef1234567890abcdef12345678"
}
```

## 👤 综合查询

### 12. 获取用户完整身份信息

**接口:** `GET /identity/user/{user_id}`

**描述:** 获取用户的所有身份验证和绑定信息

**路径参数:**
- `user_id` (string): 用户ID

**成功响应:**
```json
{
  "user_id": "user_12345",
  "worldid_verified": true,
  "worldid_nullifier": "0xabcdef1234567890...",
  "verified_credentials": [
    {
      "id": "http://example.edu/credentials/3732",
      "issuer": "did:example:university",
      "vc_type": ["VerifiableCredential", "UniversityDegreeCredential"],
      "verified_at": "2024-01-01T00:00:00Z"
    }
  ],
  "oauth_bindings": [
    {
      "provider": "github",
      "external_id": "github_user_123",
      "username": "user_github",
      "bound_at": "2024-01-01T00:00:00Z"
    }
  ],
  "wallets": [
    {
      "address": "0x1234567890abcdef1234567890abcdef12345678",
      "chain_type": "ethereum",
      "is_primary": true,
      "verified": true,
      "connected_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## 🔧 使用示例

### cURL 示例

**验证 World ID:**
```bash
curl -X POST http://127.0.0.1:8080/identity/worldid/verify \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_12345",
    "proof": {
      "merkle_root": "0x1234567890abcdef...",
      "nullifier_hash": "0xabcdef1234567890...",
      "proof": "0x...",
      "verification_level": "orb"
    },
    "action": "verify_humanity",
    "signal": "user_12345"
  }'
```

**绑定 GitHub 账号:**
```bash
curl -X POST http://127.0.0.1:8080/identity/oauth/bind \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_12345",
    "provider": "github",
    "code": "authorization_code_from_github",
    "redirect_uri": "https://app.credinet.com/callback"
  }'
```

**连接钱包地址:**
```bash
curl -X POST http://127.0.0.1:8080/identity/wallet/connect \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_12345",
    "address": "0x1234567890abcdef1234567890abcdef12345678",
    "chain_type": "ethereum",
    "signature": "0xabcdef...",
    "message": "I am connecting my wallet to CrediNet"
  }'
```

**设置主钱包:**
```bash
curl -X PUT http://127.0.0.1:8080/identity/wallet/primary \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_12345",
    "address": "0x1234567890abcdef1234567890abcdef12345678"
  }'
```

### Python 示例

```python
import requests

base_url = "http://127.0.0.1:8080"

# 验证 World ID
worldid_response = requests.post(
    f"{base_url}/identity/worldid/verify",
    json={
        "user_id": "user_12345",
        "proof": {
            "merkle_root": "0x1234567890abcdef...",
            "nullifier_hash": "0xabcdef1234567890...",
            "proof": "0x...",
            "verification_level": "orb"
        },
        "action": "verify_humanity",
        "signal": "user_12345"
    }
)
print(worldid_response.json())

# 绑定 GitHub
github_response = requests.post(
    f"{base_url}/identity/oauth/bind",
    json={
        "user_id": "user_12345",
        "provider": "github",
        "code": "authorization_code",
        "redirect_uri": "https://app.credinet.com/callback"
    }
)
print(github_response.json())

# 连接钱包
wallet_response = requests.post(
    f"{base_url}/identity/wallet/connect",
    json={
        "user_id": "user_12345",
        "address": "0x1234567890abcdef1234567890abcdef12345678",
        "chain_type": "ethereum"
    }
)
print(wallet_response.json())

# 获取用户完整身份信息
identity_response = requests.get(f"{base_url}/identity/user/user_12345")
print(identity_response.json())
```

## 📊 状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 404 | 资源未找到 |
| 500 | 服务器内部错误 |

## 🏗️ 数据库结构

### worldid_verifications 表
- `user_id` (TEXT PRIMARY KEY): 用户ID
- `nullifier_hash` (TEXT UNIQUE): 唯一性哈希
- `verification_level` (TEXT): 验证级别
- `verified_at` (TEXT): 验证时间

### verifiable_credentials 表
- `id` (INTEGER PRIMARY KEY): 自增ID
- `user_id` (TEXT): 用户ID
- `credential_id` (TEXT): 凭证ID
- `issuer` (TEXT): 颁发者DID
- `vc_type` (TEXT): 凭证类型JSON
- `credential_data` (TEXT): 凭证完整数据
- `verified_at` (TEXT): 验证时间

### oauth_bindings 表
- `id` (INTEGER PRIMARY KEY): 自增ID
- `user_id` (TEXT): 用户ID
- `provider` (TEXT): 平台名称
- `external_id` (TEXT): 第三方账号ID
- `username` (TEXT): 用户名
- `access_token` (TEXT): 访问令牌
- `refresh_token` (TEXT): 刷新令牌
- `profile_data` (TEXT): 用户资料JSON
- `bound_at` (TEXT): 绑定时间

### wallet_addresses 表
- `id` (INTEGER PRIMARY KEY): 自增ID
- `user_id` (TEXT): 用户ID
- `address` (TEXT UNIQUE): 钱包地址
- `chain_type` (TEXT): 链类型
- `is_primary` (INTEGER): 是否为主地址
- `verified` (INTEGER): 是否已验证
- `connected_at` (TEXT): 连接时间

## 🔒 安全特性

### World ID 安全
- **唯一性保证**: Nullifier Hash确保每个人只能验证一次
- **零知识证明**: 不泄露用户隐私的情况下证明人类身份
- **防重放攻击**: 验证级别和时间戳检查

### VC 凭证安全
- **签名验证**: 验证颁发者的数字签名
- **DID验证**: 检查颁发者DID的可信度
- **过期检查**: 验证凭证是否在有效期内
- **吊销检查**: 检查凭证是否被吊销

### OAuth 安全
- **令牌加密**: 敏感令牌加密存储
- **授权码模式**: 使用标准OAuth 2.0授权码流程
- **CSRF保护**: State参数防止跨站请求伪造
- **令牌刷新**: 支持访问令牌自动刷新

### 钱包安全
- **签名验证**: 验证用户对钱包地址的控制权
- **地址唯一性**: 每个地址只能绑定一个用户
- **主地址保护**: 同一时间只能有一个主地址
- **操作日志**: 记录所有地址关联操作

## 🚀 集成指南

### World ID 集成

1. **前端集成 IDKit:**
```javascript
import { IDKit } from '@worldcoin/idkit'

<IDKit
  app_id="app_staging_1234567890"
  action="verify_humanity"
  signal={userId}
  onSuccess={(proof) => {
    // 发送proof到后端验证
    fetch('/identity/worldid/verify', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        proof: proof,
        action: 'verify_humanity',
        signal: userId
      })
    })
  }}
/>
```

2. **后端验证流程:**
   - 接收前端提交的证明
   - 调用Worldcoin API验证
   - 存储验证结果

### OAuth 集成流程

1. **创建OAuth应用** - 在各平台创建应用获取client_id和client_secret
2. **前端跳转** - 引导用户到OAuth授权页面
3. **回调处理** - 接收授权码并调用后端绑定接口
4. **令牌管理** - 后端存储和刷新访问令牌

### 钱包连接流程

1. **前端连接钱包** - 使用WalletConnect或浏览器插件
2. **签名验证** - 用户签名随机消息证明地址归属
3. **提交后端** - 发送地址、签名到后端验证
4. **设置主地址** - 用户选择主地址用于链上操作

## 🔗 支持的平台

### OAuth 平台
- ✅ GitHub
- ✅ Twitter
- ✅ Facebook
- ✅ 微信

### 区块链网络
- ✅ Ethereum
- ✅ Polygon
- ✅ BSC (Binance Smart Chain)
- ✅ Solana
- ✅ Bitcoin

### 身份验证系统
- ✅ Worldcoin World ID
- ✅ W3C Verifiable Credentials
- ✅ Self SSI Platform

## 📈 扩展功能

### 计划中的功能
1. **多因素认证**: 组合多种身份验证方式
2. **信用评分**: 基于身份绑定的信用评分
3. **隐私保护**: 零知识证明身份属性
4. **跨链支持**: 更多区块链网络支持
5. **社交图谱**: 基于社交绑定的关系网络

## 📞 技术支持

如有问题或建议，请联系开发团队。

## 📝 更新日志

### v1.0.0
- 初始版本发布
- 支持World ID验证
- 支持可验证凭证验证
- 支持OAuth社交平台绑定
- 支持多链钱包地址关联
- 提供完整的测试接口
