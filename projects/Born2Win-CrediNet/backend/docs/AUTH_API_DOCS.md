# CrediNet 身份认证模块 API 文档

## 📋 概述

CrediNet 身份认证模块提供了完整的用户身份验证功能，包括邮箱/手机号验证码登录、JWT令牌管理和权限控制。

## 🚀 快速开始

### 启动服务
```bash
cargo run
```

服务将在 `http://127.0.0.1:8080` 启动

### 运行测试
```bash
# 身份认证模块测试
python3 tests/auth/test_auth.py

# 完整系统测试
python3 tests/integration/test_complete.py
```

## 📚 API 接口

### 1. 发送验证码

**接口:** `POST /auth/send_code`

**描述:** 向指定邮箱或手机号发送验证码

**请求体:**
```json
{
  "contact": "test@example.com"
}
```

**参数说明:**
- `contact` (string, 必需): 邮箱地址或手机号码

**响应:**
```
HTTP/1.1 200 OK
Content-Type: text/plain

Verification code sent
```

**错误响应:**
- `400 Bad Request`: 请求参数错误
- `500 Internal Server Error`: 服务器内部错误

### 2. 验证码登录

**接口:** `POST /auth/login`

**描述:** 使用验证码进行用户登录

**请求体:**
```json
{
  "contact": "test@example.com",
  "code": "123456"
}
```

**参数说明:**
- `contact` (string, 必需): 邮箱地址或手机号码
- `code` (string, 必需): 6位数字验证码

**成功响应:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**错误响应:**
- `401 Unauthorized`: 验证码无效或已过期
- `400 Bad Request`: 请求参数错误
- `500 Internal Server Error`: 服务器内部错误

### 3. 访问受保护接口

**接口:** `GET /protected`

**描述:** 需要JWT令牌才能访问的受保护接口

**请求头:**
```
Authorization: Bearer <JWT_TOKEN>
```

**成功响应:**
```
HTTP/1.1 200 OK
Content-Type: text/plain

Hello user 550e8400-e29b-41d4-a716-446655440000 with role user
```

**错误响应:**
- `401 Unauthorized`: 缺少或无效的Authorization头
- `401 Unauthorized`: JWT令牌无效或已过期

### 4. 管理员接口

**接口:** `GET /admin`

**描述:** 仅管理员可访问的接口

**请求头:**
```
Authorization: Bearer <JWT_TOKEN>
```

**成功响应:**
```
HTTP/1.1 200 OK
Content-Type: text/plain

Welcome, admin
```

**错误响应:**
- `401 Unauthorized`: 缺少或无效的Authorization头
- `403 Forbidden`: 权限不足（非管理员用户）

## 🧪 测试接口

### 5. 服务健康检查

**接口:** `GET /test/health`

**描述:** 检查服务是否正常运行

**响应:**
```
HTTP/1.1 200 OK
Content-Type: text/plain

Service is healthy
```

### 6. 查看验证码状态

**接口:** `GET /test/codes`

**描述:** 查看当前存储的验证码（仅用于测试）

**响应:**
```json
[
  {
    "contact": "test@example.com",
    "code": "123456",
    "expires_at": "2024-01-01T00:05:00Z",
    "used": false
  }
]
```

### 7. 清理验证码

**接口:** `POST /test/clear_codes`

**描述:** 清理所有存储的验证码（仅用于测试）

**响应:**
```
HTTP/1.1 200 OK
Content-Type: text/plain

All verification codes cleared
```

### 8. 创建管理员用户

**接口:** `POST /test/create_admin`

**描述:** 创建管理员用户（仅用于测试）

**响应:**
```
HTTP/1.1 200 OK
Content-Type: text/plain

Admin user created with ID: 550e8400-e29b-41d4-a716-446655440000
```

## 🔧 使用示例

### cURL 示例

**发送验证码:**
```bash
curl -X POST http://127.0.0.1:8080/auth/send_code \
  -H "Content-Type: application/json" \
  -d '{"contact": "test@example.com"}'
```

**验证码登录:**
```bash
curl -X POST http://127.0.0.1:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"contact": "test@example.com", "code": "123456"}'
```

**访问受保护接口:**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://127.0.0.1:8080/protected
```

**访问管理员接口:**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://127.0.0.1:8080/admin
```

### Python 示例

```python
import requests

# 发送验证码
response = requests.post(
    "http://127.0.0.1:8080/auth/send_code",
    json={"contact": "test@example.com"}
)

# 登录
response = requests.post(
    "http://127.0.0.1:8080/auth/login",
    json={"contact": "test@example.com", "code": "123456"}
)

if response.status_code == 200:
    data = response.json()
    token = data["token"]
    user_id = data["user_id"]
    
    # 访问受保护接口
    headers = {"Authorization": f"Bearer {token}"}
    protected_response = requests.get(
        "http://127.0.0.1:8080/protected",
        headers=headers
    )
    print(protected_response.text)
```

## 📊 状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（验证码错误、令牌无效等） |
| 403 | 权限不足 |
| 404 | 资源未找到 |
| 500 | 服务器内部错误 |

## 🔒 安全特性

### 验证码安全
- **有效期**: 验证码有效期为5分钟
- **单次使用**: 验证码使用后立即失效
- **随机生成**: 6位随机数字验证码
- **防重复**: 同一邮箱/手机号不能重复使用验证码

### JWT令牌安全
- **签名验证**: 使用HMAC-SHA256算法签名
- **过期时间**: 令牌有效期为24小时
- **无状态**: 服务端不存储令牌状态
- **Bearer认证**: 使用标准的Bearer Token认证方式

### 权限控制
- **角色基础**: 支持用户和管理员角色
- **接口保护**: 受保护接口需要有效令牌
- **角色验证**: 管理员接口需要管理员权限

## 🏗️ 数据库结构

### users 表
- `id` (TEXT PRIMARY KEY): 用户唯一标识符
- `contact` (TEXT UNIQUE): 邮箱或手机号
- `role` (TEXT): 用户角色（user/admin）
- `created_at` (TEXT): 创建时间

## 🚀 部署说明

### 环境变量
```bash
# 数据库连接字符串
DATABASE_URL=sqlite:credinet.db

# JWT签名密钥
JWT_SECRET=your_secret_key_here
```

### 依赖要求
- Rust 1.70+
- SQLite 3
- 网络访问（用于发送验证码）

## 📞 技术支持

如有问题或建议，请联系开发团队。

## 📝 更新日志

### v1.0.0
- 初始版本发布
- 支持邮箱/手机号验证码登录
- 支持JWT令牌认证
- 支持基础权限控制
- 提供完整的测试接口
