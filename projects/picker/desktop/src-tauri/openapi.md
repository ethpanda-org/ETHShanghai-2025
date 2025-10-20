# Picker Server API 文档

## 健康检查

### GET /
- **描述**: 检查服务器是否正常运行
- **请求参数**: 无
- **返回**: 
  - `200`: 文本内容 "Pickers Server is running!"

## 用户管理

### POST /api/users/register
- **描述**: 注册新用户账户
- **请求参数**:
  ```json
  {
    "email": "string",
    "user_name": "string", 
    "user_password": "string",
    "user_type": "gen" | "dev"
  }
  ```
- **返回**:
  - `200`: `{ "user_id": "uuid", "message": "string" }`
  - `400`: 请求参数错误
  - `422`: 邮箱已被注册

### POST /api/users/login
- **描述**: 用户登录获取访问令牌
- **请求参数**:
  ```json
  {
    "email": "string",
    "user_password": "string"
  }
  ```
- **返回**:
  - `200`: `{ "token": "string", "user": UserInfo }`
  - `401`: 邮箱或密码错误
  - `404`: 用户不存在

### POST /api/users/verify
- **描述**: 使用验证码验证邮箱地址
- **请求参数**:
  ```json
  {
    "email": "string",
    "code": "string"
  }
  ```
- **返回**:
  - `200`: `{ "token": "string", "user": UserInfo }`
  - `400`: 验证码错误或已过期

### GET /api/users/profile
- **描述**: 获取当前登录用户的详细信息
- **请求参数**: 无 (需要Bearer Token认证)
- **返回**:
  - `200`: UserInfo对象
  - `401`: 未授权访问
  - `404`: 用户不存在

## Picker管理

### GET /api/pickers
- **描述**: 获取可用的Picker列表，支持分页和搜索
- **请求参数** (Query):
  - `page`: integer (可选，默认1)
  - `size`: integer (可选，默认10)
  - `keyword`: string (可选，搜索关键词)
- **返回**:
  - `200`: `{ "pickers": PickerInfo[], "total": number }`
  - `500`: 服务器内部错误

### POST /api/pickers
- **描述**: 开发者上传新的Picker到市场
- **请求参数** (multipart/form-data):
  - `alias`: string (Picker别名)
  - `description`: string (描述信息)
  - `price`: integer (价格，分为单位)
  - `version`: string (版本号)
  - `image`: binary (图片文件)
  - `file`: binary (Picker文件)
- **返回**:
  - `200`: `{ "picker_id": "uuid", "message": "string" }`
  - `400`: 请求参数错误或非开发者用户
  - `401`: 未授权访问
  - `500`: 服务器内部错误

### GET /api/pickers/{picker_id}
- **描述**: 根据ID获取特定Picker的详细信息
- **请求参数**:
  - `picker_id`: uuid (路径参数)
- **返回**:
  - `200`: PickerInfo对象
  - `404`: Picker不存在
  - `500`: 服务器内部错误

## 订单管理

### GET /api/orders
- **描述**: 获取当前用户的所有订单，支持分页和状态筛选
- **请求参数** (Query):
  - `page`: integer (可选，默认1)
  - `size`: integer (可选，默认10)
  - `status`: "pending" | "success" | "expired" (可选)
- **返回**:
  - `200`: `{ "orders": OrderInfo[], "total": number, "page": number, "size": number, "has_next": boolean }`
  - `401`: 未授权访问
  - `500`: 服务器内部错误

### POST /api/orders
- **描述**: 为指定的Picker创建订单，支持Premium和钱包支付两种方式
- **请求参数**:
  ```json
  {
    "pay_type": "wallet" | "premium",
    "picker_id": "uuid"
  }
  ```
- **返回**:
  - `200`: `{ "token": "string", "message": "string" }`
  - `400`: 请求参数错误
  - `404`: 用户或Picker不存在
  - `500`: 服务器内部错误

### GET /api/orders/{order_id}
- **描述**: 根据订单ID获取订单的详细信息
- **请求参数**:
  - `order_id`: uuid (路径参数)
- **返回**:
  - `200`: OrderInfo对象
  - `401`: 未授权访问
  - `404`: 订单不存在
  - `500`: 服务器内部错误

## 文件下载

### GET /download
- **描述**: 使用下载令牌下载已购买的Picker文件
- **请求参数** (Query):
  - `token`: string (下载令牌)
- **返回**:
  - `200`: 文件流 (application/octet-stream)
  - `401`: 令牌无效或已过期
  - `404`: 订单、Picker或文件不存在
  - `500`: 服务器内部错误

## 数据模型

### UserInfo
```json
{
  "user_id": "uuid",
  "email": "string",
  "user_name": "string", 
  "user_type": "gen" | "dev",
  "wallet_address": "string",
  "premium_balance": "integer",
  "created_at": "datetime"
}
```

### PickerInfo
```json
{
  "picker_id": "uuid",
  "alias": "string",
  "description": "string",
  "price": "integer",
  "image_path": "string",
  "version": "string",
  "download_count": "integer",
  "created_at": "datetime"
}
```

### OrderInfo
```json
{
  "order_id": "uuid",
  "user_id": "uuid",
  "picker_id": "uuid",
  "picker_alias": "string",
  "amount": "integer",
  "pay_type": "wallet" | "premium",
  "status": "pending" | "success" | "expired",
  "created_at": "datetime"
}
```

### ErrorResponse
```json
{
  "error": "string",
  "message": "string"
}
```

## 认证方式

大部分API需要Bearer Token认证，在请求头中添加：
```
Authorization: Bearer <your-token>
```