# CrediNet DID 管理模块 API 文档

## 📋 概述

CrediNet DID 管理模块提供了完整的去中心化标识符（DID）管理功能，包括DID生成、存储、版本管理和区块链注册。

## 🚀 快速开始

### 启动服务
```bash
cargo run
```

服务将在 `http://127.0.0.1:8080` 启动

### 运行测试
```bash
# DID模块测试
python3 tests/did/test_did.py

# 完整系统测试
python3 tests/integration/test_complete.py
```

## 📚 API 接口

### 1. 创建DID

**接口:** `POST /did`

**描述:** 为用户创建新的DID和DID Document

**请求体:**
```json
{
  "user_id": "user_12345",
  "public_key": "z6MkhaXgBZDvotDkL2577ULvitBVkChaLBQc2zHvJbNJ1p2v",
  "services": [
    {
      "id": "user_12345#service-1",
      "type": "CrediNetService",
      "service_endpoint": "https://api.credinet.com/v1"
    }
  ]
}
```

**参数说明:**
- `user_id` (string, 必需): 用户ID
- `public_key` (string, 必需): 公钥（multibase编码）
- `services` (array, 可选): 服务端点列表

**成功响应:**
```json
{
  "did": "did:credinet:abc123def456",
  "document": {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1"
    ],
    "id": "did:credinet:abc123def456",
    "version": 1,
    "created": "2024-01-01T00:00:00Z",
    "updated": "2024-01-01T00:00:00Z",
    "verification_method": [
      {
        "id": "did:credinet:abc123def456#key-1",
        "type": "Ed25519VerificationKey2020",
        "controller": "did:credinet:abc123def456",
        "public_key_multibase": "z6MkhaXgBZDvotDkL2577ULvitBVkChaLBQc2zHvJbNJ1p2v"
      }
    ],
    "authentication": ["did:credinet:abc123def456#key-1"],
    "service": [
      {
        "id": "user_12345#service-1",
        "type": "CrediNetService",
        "service_endpoint": "https://api.credinet.com/v1"
      }
    ]
  }
}
```

**错误响应:**
- `400 Bad Request`: 请求参数错误
- `500 Internal Server Error`: 服务器内部错误

### 2. 获取DID文档

**接口:** `GET /did/{did}`

**描述:** 获取指定DID的最新版本文档

**路径参数:**
- `did` (string): DID标识符

**成功响应:** 同创建DID的响应格式

**错误响应:**
- `404 Not Found`: DID不存在
- `500 Internal Server Error`: 服务器内部错误

### 3. 获取特定版本DID文档

**接口:** `GET /did/{did}/version/{version}`

**描述:** 获取指定DID的特定版本文档

**路径参数:**
- `did` (string): DID标识符
- `version` (integer): 版本号

**成功响应:** 同创建DID的响应格式

**错误响应:**
- `404 Not Found`: DID或版本不存在
- `500 Internal Server Error`: 服务器内部错误

### 4. 更新DID文档

**接口:** `PUT /did/{did}`

**描述:** 更新DID文档（创建新版本）

**路径参数:**
- `did` (string): DID标识符

**请求体:**
```json
{
  "public_key": "z6MkhaXgBZDvotDkL2577ULvitBVkChaLBQc2zHvJbNJ1p2v_updated",
  "services": [
    {
      "id": "user_12345#service-1",
      "type": "CrediNetService",
      "service_endpoint": "https://api.credinet.com/v2"
    }
  ]
}
```

**参数说明:**
- `public_key` (string, 可选): 新的公钥
- `services` (array, 可选): 新的服务端点列表

**成功响应:** 同创建DID的响应格式（版本号会递增）

**错误响应:**
- `400 Bad Request`: 请求参数错误
- `404 Not Found`: DID不存在
- `500 Internal Server Error`: 服务器内部错误

### 5. 获取DID版本历史

**接口:** `GET /did/{did}/versions`

**描述:** 获取指定DID的所有版本历史

**路径参数:**
- `did` (string): DID标识符

**成功响应:**
```json
[
  {
    "did": "did:credinet:abc123def456",
    "version": 2,
    "document": { ... },
    "created_at": "2024-01-01T01:00:00Z"
  },
  {
    "did": "did:credinet:abc123def456",
    "version": 1,
    "document": { ... },
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

**错误响应:**
- `404 Not Found`: DID不存在
- `500 Internal Server Error`: 服务器内部错误

### 6. 获取用户的所有DID

**接口:** `GET /user/{user_id}/dids`

**描述:** 获取指定用户的所有DID列表

**路径参数:**
- `user_id` (string): 用户ID

**成功响应:**
```json
[
  "did:credinet:abc123def456",
  "did:credinet:def456ghi789"
]
```

**错误响应:**
- `500 Internal Server Error`: 服务器内部错误

## ⛓️ 区块链功能

### 7. 注册DID到区块链

**接口:** `POST /did/{did}/blockchain/register`

**描述:** 将DID注册到区块链（模拟实现）

**路径参数:**
- `did` (string): DID标识符

**成功响应:**
```json
{
  "did": "did:credinet:abc123def456",
  "tx_hash": "0x1234567890abcdef...",
  "status": "registered"
}
```

**错误响应:**
- `404 Not Found`: DID不存在
- `500 Internal Server Error`: 服务器内部错误

### 8. 查询区块链状态

**接口:** `GET /did/{did}/blockchain/status`

**描述:** 查询DID在区块链上的注册状态

**路径参数:**
- `did` (string): DID标识符

**成功响应:**
```json
{
  "did": "did:credinet:abc123def456",
  "tx_hash": "0x1234567890abcdef...",
  "block_number": 1234567,
  "status": "confirmed",
  "created_at": "2024-01-01T00:00:00Z"
}
```

**错误响应:**
- `404 Not Found`: DID未在区块链上注册
- `500 Internal Server Error`: 服务器内部错误

## 🔧 使用示例

### cURL 示例

**创建DID:**
```bash
curl -X POST http://127.0.0.1:8080/did \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_12345",
    "public_key": "z6MkhaXgBZDvotDkL2577ULvitBVkChaLBQc2zHvJbNJ1p2v",
    "services": [
      {
        "id": "user_12345#service-1",
        "type": "CrediNetService",
        "service_endpoint": "https://api.credinet.com/v1"
      }
    ]
  }'
```

**获取DID文档:**
```bash
curl http://127.0.0.1:8080/did/did:credinet:abc123def456
```

**更新DID文档:**
```bash
curl -X PUT http://127.0.0.1:8080/did/did:credinet:abc123def456 \
  -H "Content-Type: application/json" \
  -d '{
    "public_key": "z6MkhaXgBZDvotDkL2577ULvitBVkChaLBQc2zHvJbNJ1p2v_updated",
    "services": [
      {
        "id": "user_12345#service-1",
        "type": "CrediNetService",
        "service_endpoint": "https://api.credinet.com/v2"
      }
    ]
  }'
```

**注册到区块链:**
```bash
curl -X POST http://127.0.0.1:8080/did/did:credinet:abc123def456/blockchain/register
```

### Python 示例

```python
import requests

# 创建DID
response = requests.post(
    "http://127.0.0.1:8080/did",
    json={
        "user_id": "user_12345",
        "public_key": "z6MkhaXgBZDvotDkL2577ULvitBVkChaLBQc2zHvJbNJ1p2v",
        "services": [
            {
                "id": "user_12345#service-1",
                "type": "CrediNetService",
                "service_endpoint": "https://api.credinet.com/v1"
            }
        ]
    }
)

if response.status_code == 201:
    data = response.json()
    did = data["did"]
    document = data["document"]
    
    # 获取DID文档
    get_response = requests.get(f"http://127.0.0.1:8080/did/{did}")
    print(get_response.json())
    
    # 更新DID文档
    update_response = requests.put(
        f"http://127.0.0.1:8080/did/{did}",
        json={
            "public_key": "z6MkhaXgBZDvotDkL2577ULvitBVkChaLBQc2zHvJbNJ1p2v_updated"
        }
    )
    print(update_response.json())
```

## 📊 状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 404 | 资源未找到 |
| 500 | 服务器内部错误 |

## 🏗️ 数据库结构

### dids 表
- `did` (TEXT PRIMARY KEY): DID标识符
- `user_id` (TEXT): 用户ID
- `current_version` (INTEGER): 当前版本号
- `created_at` (TEXT): 创建时间
- `updated_at` (TEXT): 更新时间

### did_documents 表
- `id` (INTEGER PRIMARY KEY): 自增ID
- `did` (TEXT): DID标识符
- `version` (INTEGER): 版本号
- `document` (TEXT): DID文档JSON
- `created_at` (TEXT): 创建时间

### blockchain_registrations 表
- `id` (INTEGER PRIMARY KEY): 自增ID
- `did` (TEXT): DID标识符
- `tx_hash` (TEXT): 交易哈希
- `block_number` (INTEGER): 区块号
- `status` (TEXT): 注册状态
- `created_at` (TEXT): 创建时间
- `updated_at` (TEXT): 更新时间

## 🔒 安全考虑

1. **DID唯一性**: 每个DID都是基于用户ID和时间戳生成的唯一标识符
2. **版本控制**: 所有DID文档变更都会创建新版本，保留历史记录
3. **数据完整性**: 使用外键约束确保数据一致性
4. **区块链模拟**: 当前使用模拟实现，生产环境需要对接真实区块链

## 🚀 扩展功能

### 计划中的功能
1. **真实区块链集成**: 支持以太坊、Polygon等主流区块链
2. **DID解析器**: 实现标准DID解析协议
3. **密钥管理**: 集成硬件安全模块(HSM)
4. **审计日志**: 完整的操作审计记录
5. **权限控制**: 细粒度的DID操作权限管理

## 📞 技术支持

如有问题或建议，请联系开发团队。

## 📝 更新日志

### v1.0.0
- 初始版本发布
- 支持DID生成和解析
- 支持DID Document存储和版本管理
- 支持区块链注册（模拟实现）
- 提供完整的测试接口
