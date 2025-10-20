# Tauri 应用后端 API 封装

# Picker Desktop Application (Tauri Backend)

## 项目介绍

Picker Desktop Application 是一个基于 Tauri 框架开发的跨平台桌面应用程序，提供了 Picker 市场浏览、订单管理、用户认证等功能。本目录包含应用的后端代码。

## 目录结构

```
src-tauri/
├── src/               # 源代码目录
│   ├── api/           # API 客户端和模型定义
│   ├── commands/      # Tauri 命令实现
│   ├── utils/         # 工具函数
│   ├── config.rs      # 配置管理
│   ├── lib.rs         # 应用库入口
│   └── main.rs        # 应用入口
├── tests/             # 测试文件
├── Cargo.toml         # Rust 依赖配置
└── tauri.conf.json    # Tauri 配置文件
```

## 功能模块

1. **API 客户端**：处理与服务器的所有 HTTP 通信
2. **命令模块**：实现前端可调用的 Tauri 命令
   - 用户命令：登录、注册、验证、资料管理
   - Picker 命令：市场浏览、详情查看、上传
   - 订单命令：创建订单、查看订单
   - 下载命令：下载 Picker 文件
3. **认证管理**：处理用户认证和令牌存储
4. **配置管理**：加载和管理应用配置

## 测试

项目包含完整的测试套件，包括单元测试和集成测试：

- **单元测试**：位于 `src/tests/` 目录，测试各个模块的独立功能
- **集成测试**：位于 `tests/` 目录，测试完整的功能流程

### 运行测试

```bash
# 运行所有测试
cd /opt/rust/project/picker/desktop/src-tauri
cargo test

# 运行特定测试
cargo test --test api_test
cargo test --test commands_test
cargo test --test config_test
cargo test --test utils_test
cargo test --test integration_test
```

## 开发指南

1. 确保已安装 Rust 和 Tauri CLI
2. 克隆仓库并进入项目目录
3. 安装依赖：`cargo install`
4. 运行开发服务器：`npm run tauri dev`
5. 构建应用：`npm run tauri build`

## 注意事项

- 开发环境中，API 默认为 `http://localhost:8080`
- 可以通过环境变量 `API_BASE_URL` 覆盖默认 API 地址
- 测试使用 mockito 模拟 API 响应，不依赖真实服务器

## 项目概述

本项目是一个基于 Tauri 2.0 的桌面应用后端，为前端 React 应用提供类型安全、易于使用的接口，实现了与 Picker 后端服务的无缝通信。该后端封装并管理 Picker 系统的所有 API 调用，包括用户认证、Picker 市场浏览、订单管理和文件下载等核心功能。

## 项目结构

项目采用模块化设计，代码组织清晰，主要包含以下目录和文件：

```
src-tauri/
├── src/                          # Rust 源代码目录
│   ├── lib.rs                    # 主入口文件，应用初始化和命令注册
│   ├── main.rs                   # 程序入口点
│   ├── commands/                 # Tauri 命令模块目录
│   │   ├── mod.rs                # 命令模块导出
│   │   ├── users.rs              # 用户相关命令实现
│   │   ├── pickers.rs            # Picker 相关命令实现
│   │   ├── orders.rs             # 订单相关命令实现
│   │   └── download.rs           # 下载相关命令实现
│   ├── api/                      # API 客户端目录
│   │   ├── mod.rs                # API 客户端模块导出
│   │   ├── client.rs             # HTTP 客户端实现
│   │   └── models.rs             # API 数据模型定义
│   ├── utils/                    # 工具函数目录
│   │   ├── mod.rs                # 工具模块导出
│   │   └── auth.rs               # 认证管理实现
│   └── config.rs                 # 应用配置管理
├── Cargo.toml                    # Rust 项目依赖配置
├── tauri.conf.json               # Tauri 应用配置
├── capabilities/                 # Tauri 权限配置
└── openapi.json                  # OpenAPI 文档
```

## 核心功能

### 1. 用户认证系统
- 用户登录、注册和邮箱验证
- 用户信息管理和登出功能
- 登录状态检查和 JWT Token 管理

### 2. Picker 管理
- 获取 Picker 市场列表（支持分页和关键词搜索）
- 查看 Picker 详细信息
- 上传新的 Picker 到市场（支持文件和图片上传）

### 3. 订单处理
- 获取用户订单列表（支持分页和状态筛选）
- 创建新订单
- 查看订单详细信息

### 4. 文件下载
- 使用下载令牌安全下载已购买的 Picker 文件

### 5. 安全存储
- 使用 Tauri Store 插件安全存储认证信息
- 支持配置文件和环境变量双重配置机制

## 核心组件

### ApiClient

`ApiClient` 是整个应用的核心组件，负责所有与后端 API 的通信：

```rust
pub struct ApiClient {
    base_url: String,            // API 基础地址
    client: ReqwestClient,       // HTTP 客户端实例
    auth_manager: Option<AuthManager>,  // 认证管理器（可选）
    max_retries: u32,            // 最大重试次数
}
```

主要方法：
- `post<T, U>(path, body)`：发送 POST 请求并自动序列化/反序列化数据
- `get<U>(path, params)`：发送 GET 请求并自动处理查询参数
- `download(path, token)`：下载文件并处理二进制数据，支持请求重试
- `upload_file(path, alias, description, price, version, file_bytes, image_bytes)`：上传文件并附带元数据，支持多部分表单提交

### AuthManager

`AuthManager` 负责处理认证相关的逻辑，包括 Token 存储、解析和验证：

```rust
#[derive(Clone)]
pub struct AuthManager {
    token_storage: State<'static, Store<Wry>>,  // 安全存储实例
}
```

主要方法：
- `get_auth_header()`：获取用于 API 请求的认证头
- `set_token(token)`：设置并保存认证 Token
- `get_token()`：获取存储的认证 Token
- `clear_token()`：清除认证信息
- `is_logged_in()`：检查用户是否已登录
- `save_user_info(user_info)`：保存用户信息
- `get_user_info()`：获取存储的用户信息
- `is_token_expired()`：检查 Token 是否已过期

### AppConfig

`AppConfig` 负责应用配置的加载和管理：

```rust
pub struct AppConfig {
    pub api_base_url: String,       // API 基础 URL
    pub request_timeout_ms: u64,    // 请求超时时间（毫秒）
    pub max_retries: u32,           // 最大重试次数
}
```

主要方法：
- `load()`：从环境变量或配置文件加载配置
- `default()`：获取默认配置

## 命令接口

以下是所有注册的 Tauri 命令，前端可通过 `invoke` 函数调用：

### 用户相关命令
- `login(email, password)`：用户登录，返回用户信息和 Token
- `register(email, password, user_name, user_type, wallet_address)`：用户注册
- `verify_email(email, verification_code)`：邮箱验证
- `get_user_lastest_info()`：获取当前用户最新个人资料
- `logout()`：用户登出，清除认证信息
- `check_login_status()`：检查登录状态
- `get_current_user_info()`：获取当前用户信息

### Picker 相关命令
- `get_picker_marketplace(page, size, keyword)`：获取 Picker 市场列表，支持分页和关键词搜索
- `get_picker_detail(picker_id)`：获取特定 Picker 的详细信息
- `upload_picker(alias, description, version, price, file, image)`：上传新 Picker 到市场，支持文件上传

### 订单相关命令
- `get_user_orders(page, size, status)`：获取用户订单列表，支持分页和状态筛选
- `create_order(picker_id)`：创建新订单
- `get_order_detail(order_id)`：获取特定订单的详细信息

### 下载相关命令
- `download_picker(token, app)`：下载 Picker 文件到用户的下载目录

## API 路径参考

以下是应用中使用的主要 API 路径：

#### 用户认证
- 登录: `/api/auth/login`
- 注册: `/api/auth/register`
- 邮箱验证: `/api/auth/verify`
- 获取用户资料: `/api/users/profile`

#### Picker 市场
- 获取 Picker 列表: `/api/pickers`
- 获取 Picker 详情: `/api/pickers/{id}`
- 上传 Picker: `/api/pickers`

#### 订单管理
- 获取订单列表: `/api/orders`
- 创建订单: `/api/orders`
- 获取订单详情: `/api/orders/{id}`

#### 文件下载
- 下载 Picker: `/download`

## 配置管理

应用支持两种配置方式：

### 1. 环境变量
可以通过设置环境变量来覆盖默认配置：
- `API_BASE_URL`：API 服务器地址，默认为 "http://127.0.0.1:3000"
- `REQUEST_TIMEOUT_MS`：请求超时时间（毫秒），默认为 30000
- `MAX_RETRIES`：最大重试次数，默认为 3

### 2. 配置文件
配置文件位于操作系统配置目录下的 `picker-desktop/config.toml`。例如：
- Windows: `%APPDATA%\Roaming\picker-desktop\config.toml`
- macOS: `~/Library/Application Support/picker-desktop/config.toml`
- Linux: `~/.config/picker-desktop/config.toml`

配置文件格式：
```toml
api_base_url = "http://api.example.com"
request_timeout_ms = 30000
max_retries = 3
```

## 错误处理

应用实现了统一的错误处理机制，所有 API 错误都会被转换为 `ApiError` 枚举，并最终转换为用户友好的字符串消息传递给前端。

## 安全性考虑

1. **认证安全**：
   - 使用 JWT Token 进行认证
   - Token 通过 Tauri Store 插件安全存储
   - 支持 Token 过期检查

2. **网络安全**：
   - 支持 HTTPS 协议（生产环境推荐）
   - 实现请求超时和重试机制
   - 错误信息不会暴露敏感数据

3. **存储安全**：
   - 配置文件存储在用户专用目录
   - 使用 Tauri 的安全存储机制

## 性能优化

1. **请求重试**：对网络错误、超时等可恢复的错误实现自动重试机制
2. **超时处理**：为所有请求设置合理的超时时间，避免长时间阻塞
3. **异步处理**：基于 Tokio 异步运行时，确保 UI 响应流畅
4. **查询参数优化**：支持分页和过滤，减少不必要的数据传输

## 开发指南

### 前提条件
- [Rust](https://www.rust-lang.org/) 1.88.0 或更高版本
- [Tauri CLI](https://tauri.app/start/prerequisites/) 2.8 或更高版本
- [Node.js](https://nodejs.org/) 和 npm（用于前端开发） v22.19.0 或更高版本

### 安装依赖

```bash
# 在项目根目录（/opt/rust/project/picker/desktop）执行
npm install
```

### 开发模式运行

```bash
# 在项目根目录执行
npm run tauri dev
```

### 构建应用

```bash
# 在项目根目录执行
npm run tauri build
```

### 添加新功能

1. **添加新的 API 端点**：
   - 在 `api/models.rs` 中定义请求和响应数据模型
   - 在 `api/client.rs` 中添加相应的 API 调用方法
   - 在 `commands/` 目录下创建或修改命令文件，实现 Tauri 命令
   - 在 `lib.rs` 的 `generate_handler!` 宏中注册新命令

2. **修改配置项**：
   - 在 `config.rs` 中的 `AppConfig` 结构体中添加新的配置字段
   - 更新 `load()` 和 `default()` 方法以支持新配置

## 主要依赖项

- `tauri` (v2.8.4)：Tauri 框架核心
- `serde` 和 `serde_json`：数据序列化和反序列化
- `reqwest` (v0.12)：HTTP 客户端
- `thiserror`：错误处理
- `tokio`：异步运行时
- `tauri-plugin-store` (v2)：安全存储
- `tauri-plugin-log` (v2)：日志功能
- `dirs` (v5.0.1)：目录路径获取
- `base64` (v0.21.0)：Base64 编码/解码
- `anyhow`：错误处理

## License

本项目采用 MIT License 许可。