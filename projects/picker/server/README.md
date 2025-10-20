# Pickers Server

基于 Rust Axum 的 Picker 应用市场后端系统，支持用户注册、Picker上传、订单支付和文件下载。

## 功能特性

- **用户模块**: 注册、邮箱验证、登录、用户信息管理
- **Picker模块**: 上传、市场展示、详情查看
- **订单模块**: 创建订单、积分支付、钱包支付、订单查询
- **文件下载**: 安全的临时下载链接系统

## 技术栈

- **Web框架**: Axum 0.8.4
- **数据库**: SQLite3 + SQLx
- **认证**: JWT
- **文件处理**: Multipart上传

## 快速开始

### 1. 安装依赖

确保已安装 Rust 和 Cargo：

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 2. 运行服务器

```bash
cd server
cargo run
```

服务器将在 `http://localhost:3000` 启动。

### 3. 数据库

服务器启动时会自动创建 SQLite 数据库文件 `picker.db` 并运行迁移。

## API 接口

### 用户相关

- `POST /api/users/register` - 用户注册
- `POST /api/users/verify` - 邮箱验证
- `POST /api/users/login` - 用户登录
- `GET /api/users/profile` - 获取用户信息 (需要JWT)

### Picker相关

- `GET /api/pickers` - 获取市场列表
- `POST /api/pickers` - 上传Picker (需要JWT，仅开发者)
- `GET /api/pickers/:id` - 获取Picker详情

### 订单相关

- `POST /api/orders` - 创建订单 (需要JWT)
- `GET /api/orders/:id` - 获取订单详情 (需要JWT)
- `GET /api/orders` - 获取订单列表 (需要JWT)

### 文件下载

- `GET /download?token=xxx` - 下载文件 (需要有效token)

## 示例请求

### 用户注册

```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "user_name": "Test User",
    "user_type": "gen"
  }'
```

### 邮箱验证

```bash
curl -X POST http://localhost:3000/api/users/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "code": "123456"
  }'
```

### 获取市场列表

```bash
curl "http://localhost:3000/api/pickers?page=1&size=10&keyword=test"
```

## 项目结构

```
server/
├── src/
│   ├── handlers/          # API处理器
│   │   ├── users.rs       # 用户相关API
│   │   ├── pickers.rs     # Picker相关API
│   │   ├── orders.rs      # 订单相关API
│   │   └── mod.rs
│   ├── config.rs          # 应用配置
│   ├── database.rs        # 数据库配置
│   ├── download.rs        # 文件下载
│   ├── middleware.rs      # JWT中间件
│   ├── models.rs          # 数据模型
│   ├── utils.rs           # 工具函数
│   └── main.rs            # 主程序
├── migrations/            # 数据库迁移
├── uploads/               # 文件上传目录
├── Cargo.toml
└── README.md
```

## 注意事项

1. **验证码**: 当前版本验证码会打印到控制台，生产环境需要集成邮件服务
2. **钱包生成**: 当前使用简化的钱包生成，生产环境需要使用真实的EVM钱包库
3. **智能合约**: Picker注册到智能合约的功能需要根据实际合约地址实现
4. **文件存储**: 当前文件存储在本地，生产环境建议使用云存储
5. **JWT密钥**: 生产环境需要使用安全的密钥管理

## 开发模式

启动开发模式（自动重载）：

```bash
cargo install cargo-watch
cargo watch -x run
```

## 测试

```bash
cargo test

# 测试覆盖率
cargo install cargo-tarpaulin --version 0.32.8
cargo tarpaulin --skip-clean --exclude-files "src/main.rs" --output-dir "./coverage" --out Html -- --quiet
```

## 构建发布版本

```bash
cargo build --release