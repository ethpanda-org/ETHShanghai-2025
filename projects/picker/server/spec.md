# Picker软件应用市场后端支付系统

**核心功能**: 用户购买Picker安装包，支持EVM链上支付与积分支付，校验成功后提供下载链接

**系统架构**: 用户模块 + Picker模块 + 订单模块

## 技术栈

- **Web服务**: Rust Axum v0.8.4 (https://github.com/tokio-rs/axum)
- **数据库**: SQLite3

## 用户模块

**USER数据表**:
- `user_id` (UUID) - 主键
- `email` - 邮箱地址
- `user_name` - 用户昵称
- `user_password` - 用户密码(加密存储) 使用的 salt 是 user_id<UUID>字符串与"openpick"字符串的组合，这样使得每个用户的密码都有独立的加密salt，密码存储更加安全
- `user_type` - 身份类型 (gen/dev)
- `private_key` - 钱包地址 (加密存储)
- `wallet_address` - 钱包地址
- `premium_amount` - 积分余额 (默认0)
- `created_at` - 创建时间

**核心功能**:

### 1. 用户注册与验证
```rust
// POST /api/users/register
RegisterRequest {
    email: String,
    user_name: String,
    user_type: UserType, // gen | dev
}
```
- 验证邮箱格式和唯一性，发送验证码
- 自动生成EVM钱包地址
- 返回用户ID，等待邮箱验证

```rust
// POST /api/users/verify
VerifyRequest {
    email: String,
    code: String,
}
```
- 验证6位数字验证码(5分钟有效期)
- 激活账户并返回JWT Token和用户信息

### 2. 用户登录
```rust
// POST /api/users/login
LoginRequest {
    email: String,
}
```
- 发送登录验证码到已验证邮箱
- 使用 `/api/users/verify` 接口完成登录验证

### 3. 用户信息
```rust
// GET /api/users/profile
```
- 获取当前用户信息(积分余额、钱包地址等)
- JWT Token认证

## Picker模块

**PICKER数据表**:
- `picker_id` (UUID) - 主键
- `dev_user_id` - 开发者用户ID (外键 USER user_id)
- `alias` - Picker名称
- `description` - 描述信息
- `price` - 价格 (积分)
- `image_path` - 图片存储路径
- `file_path` - 安装包文件路径
- `version` - 版本号
- `status` - 上架状态 (active/inactive)
- `download_count` - 下载次数 (默认0)
- `created_at` - 创建时间

**核心功能**:

### 1. Picker上传与管理
```rust
// POST /api/pickers
UploadPickerRequest {
    alias: String,
    description: String,
    price: u64,
    image_file: MultipartFile,
    picker_file: MultipartFile,
    version: String,
}
```
- JWT验证开发者身份(user_type = dev)
- 文件格式验证，生成存储路径
- 初始状态设为 `inactive`

```rust
// POST https://sepolia.etherscan.io/address/{contract_id}/register
{
    picker_id: "xxxx",
    dev_user_id: "xxxx",
    dev_wallet_address: "xxxx"
}
```
- 后端调用智能合约进行 picker 注册，仅授权钱包地址可以注册picker到智能合约， 存储picker_id, dev_user_id, dev_wallet_address到链上

### 2. 市场展示
```rust
// GET /api/pickers?page={}&size={}&keyword={}
MarketResponse {
    pickers: Vec<PickerInfo>,
    total: u64,
}
```
- 分页展示active状态的Picker，支持关键词搜索
- 按下载量排序

```rust
// GET /api/pickers/{picker_id} - Picker详情
```

### 3. 下载管理

系统内部校验完订单后，生成下载url，不暴露 Endpoint

- 验证订单支付状态为success
- 生成临时下载token(10分钟有效)
- 更新download_count

## 订单模块

**ORDER数据表**:
- `order_id` (UUID) - 主键
- `status` - 订单状态 (pending/success/expired)
- `user_id` - 用户ID (外键 USER user_id)
- `picker_id` - Picker ID (外键 PICKER picker_id)
- `pay_type` - 支付类型 (wallet/premium)
- `amount` - 支付金额
- `tx_hash` - 链上交易哈希 (钱包支付时)
- `created_at` - 订单时间
- `expires_at` - 订单过期时间 (30分钟)

**核心功能**:

### 1. 订单创建与支付
```rust
// POST /api/orders
CreateOrderRequest {
    picker_id: UUID,
    pay_type: PayType, // wallet | premium
    tx_hash: Option<String>, // 仅钱包支付
}
```
- JWT验证用户身份，验证Picker存在且active
- 生成订单，30分钟过期时间
- 积分支付：立即扣除 user_id 的积分并标记 success，支付积分的 80% 转移到 dev_user_id 的 premium_amount
- 钱包支付：返回开发者钱包地址，状态为 pending。

### 2. 支付验证 (仅钱包支付)
```rust
// GET https://sepolia.etherscan.io/tx/{tx_hash} 
// 验证response json: from, to, value, pending --> success

// POST https://sepolia.etherscan.io/
{"jsonrpc":"2.0","id":"1991f703884102e4700d7c028","method":"cfx_call","params":[{"to":"net71:aa1rh1s4603tgjrtbadbuh79y5jextwh5a3uwsg79s","data":"0x70a0823100000000000000000000000067e2c2e6186ae9cc17798b5bd0c3c36ef0209ac9"},null]}
// 验证response json: user_wallet_address, dev_wallet_address, dev_user_id, picker_id

```
- 验证链上交易有效性
- 更新订单状态为success。转移给开发者的金额由链上智能合约控制，后端服务不处理这部分的逻辑，仅做支付验证与状态更新

### 3. 订单查询
```rust
// GET /api/orders/{order_id}
OrderDetailResponse {
    order_id: UUID,
    picker: {
        picker_id: UUID,
        alias: String,
        image_path: String,
        version: String,
    },
    amount: u64,
    pay_type: PayType,
    status: OrderStatus,
    payment_info: Option<PaymentInfo>, // 根据支付类型返回相应信息
    created_at: DateTime,
    expires_at: Option<DateTime>, // 仅pending状态
}

PaymentInfo {
    // 钱包支付
    recipient_address: Option<String>,
    tx_hash: Option<String>,
    // 积分支付
    premium_deducted: Option<u64>,
}

// GET /api/orders?status={}&page={}&limit={}
OrderListResponse {
    orders: Vec<OrderSummary>,
    pagination: {
        total: u64,
        page: u32,
        limit: u32,
        has_next: bool,
    }
}
```

**订单查询特性**:
- 单次查询返回完整订单信息，减少API调用
- 分页查询支持状态筛选 (pending/success/expired)
- 按创建时间倒序，最新订单优先

## 文件下载

**下载机制**: 订单支付成功后，在系统内部生成临时下载token，并生成完整的下载url，返回格式：
```json
{"download_url": "http://localhost:3000/download?token=<random_token>"}
```
- Token有效期10分钟
- 验证订单状态为success
- 记录下载统计

# 待实现或待优化

解决测试覆盖率的问题 80%

sqlite3转换内存数据库为本地数据库

