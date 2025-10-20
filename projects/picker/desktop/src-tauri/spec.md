# Tauri 应用后端 API 封装设计方案

## 1. 项目概述

本文档描述了如何在 Tauri 2.0 框架中封装 OpenAPI 文档中定义的所有后端 API 功能，使其能够被前端 React TypeScript 代码调用。该设计方案旨在提供一种类型安全、易于维护的方式来处理前后端通信。

## 2. 项目结构和状态

### 2.1 现有项目结构
- 前端：React TypeScript，位于 `/opt/rust/project/picker/desktop/src/`
- 客户端框架：Tauri 2.0，位于 `/opt/rust/project/picker/desktop/src-tauri/`
- API 定义：OpenAPI 3.1.0 文档，位于 `/opt/rust/project/picker/desktop/src-tauri/openapi.json`

### 2.2 当前状态
- Tauri 应用基本框架已搭建，但目前 `lib.rs` 中没有实现与后端 API 交互的功能
- 前端代码中已有一些模拟数据和组件，API 调用函数（如登录、注册）目前使用直接 `fetch` 调用

## 3. 设计目标

1. **类型安全**：提供完整的类型定义，确保前端和后端之间的数据一致性
2. **易于使用**：提供简洁直观的 API，简化前端开发人员的工作
3. **可维护性**：采用模块化的代码结构，便于后续扩展和维护
4. **安全性**：实现安全的认证机制，保护用户数据
5. **错误处理**：提供统一的错误处理机制，增强应用的健壮性

## 4. 需要封装的 API 功能

根据 OpenAPI 文档，需要封装以下几类 API 端点：

### 4.1 用户管理接口 (`/api/users/`)
- `POST /api/users/login` - 用户登录
- `POST /api/users/register` - 用户注册
- `POST /api/users/verify` - 邮箱验证
- `GET /api/users/profile` - 获取用户资料（需要授权）

### 4.2 Picker 管理接口 (`/api/pickers/`)
- `GET /api/pickers` - 获取 Picker 市场列表
- `POST /api/pickers` - 上传新的 Picker（需要授权）
- `GET /api/pickers/{picker_id}` - 获取 Picker 详情

### 4.3 订单管理接口 (`/api/orders/`)
- `GET /api/orders` - 获取用户订单列表（需要授权）
- `POST /api/orders` - 创建订单（需要授权）
- `GET /api/orders/{order_id}` - 获取订单详情（需要授权）

### 4.4 文件下载接口
- `GET /download` - 使用下载令牌下载已购买的 Picker 文件

### 4.5 健康检查接口
- `GET /` - 检查服务器是否正常运行

## 5. 模块结构设计

我将在 `src-tauri/src/` 目录下创建以下模块结构：

```
src-tauri/src/
├── lib.rs               # 主入口文件，注册所有命令
├── commands/            # 命令模块目录
│   ├── mod.rs           # 命令模块导出
│   ├── users.rs         # 用户相关命令
│   ├── pickers.rs       # Picker 相关命令
│   ├── orders.rs        # 订单相关命令
│   └── download.rs      # 下载相关命令
├── api/                 # API 客户端目录
│   ├── mod.rs           # API 客户端模块导出
│   ├── client.rs        # HTTP 客户端实现
│   └── models.rs        # API 数据模型
├── utils/               # 工具函数目录
│   ├── mod.rs           # 工具模块导出
│   └── auth.rs          # 认证相关工具
└── config.rs            # 配置管理
```

## 6. 核心组件详细设计

### 6.1 Tauri 命令设计

每个命令函数将对应一个 API 端点，使用 `#[tauri::command]` 宏进行标记。命令函数的参数和返回类型将基于 OpenAPI 文档中的定义。

**基本结构示例**：
```rust
#[tauri::command]
pub async fn login(email: String, password: String) -> Result<LoginResponse, ApiError> {
    // 实现登录逻辑
}
```

### 6.2 HTTP 客户端实现

HTTP 客户端将负责与后端 API 进行通信，主要功能包括：

1. **请求构建**：根据 API 端点和参数构建 HTTP 请求
2. **响应处理**：处理 HTTP 响应，包括状态码检查、JSON 解析等
3. **错误处理**：统一的错误处理逻辑
4. **重试机制**：对特定类型的错误实现自动重试
5. **超时处理**：设置请求超时时间，避免长时间阻塞

**核心实现**：
```rust
pub struct ApiClient {
    base_url: String,
    client: reqwest::Client,
}

impl ApiClient {
    pub fn new(base_url: &str) -> Self {
        // 创建 HTTP 客户端实例
    }
    
    pub async fn post<T, U>(&self, path: &str, body: &T) -> Result<U, ApiError>
    where
        T: serde::Serialize,
        U: serde::de::DeserializeOwned,
    {
        // 实现 POST 请求
    }
    
    pub async fn get<U>(&self, path: &str, params: Option<&HashMap<&str, &str>>) -> Result<U, ApiError>
    where
        U: serde::de::DeserializeOwned,
    {
        // 实现 GET 请求
    }
}
```

### 6.3 认证机制

认证机制将负责管理用户的认证状态，主要功能包括：

1. **Token 存储**：安全存储用户的 JWT token
2. **Token 刷新**：在 token 过期时自动刷新
3. **认证头添加**：为需要授权的请求自动添加 Authorization 头

**核心实现**：
```rust
pub struct AuthManager {
    token_storage: tauri::State<'static, TokenStorage>,
}

impl AuthManager {
    pub fn new(token_storage: tauri::State<'static, TokenStorage>) -> Self {
        // 创建认证管理器实例
    }
    
    pub fn get_auth_header(&self) -> Option<String> {
        // 获取认证头
    }
    
    pub fn set_token(&self, token: &str) {
        // 设置 token
    }
    
    pub fn clear_token(&self) {
        // 清除 token
    }
}
```

### 6.4 数据模型

根据 OpenAPI 文档，我们将创建一系列的 Rust 结构体来表示 API 的请求和响应数据模型。这些模型将使用 Serde 库进行序列化和反序列化。

**示例模型**：
```rust
#[derive(Debug, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserInfo,
}

#[derive(Debug, Deserialize)]
pub struct UserInfo {
    pub user_id: String,
    pub email: String,
    pub user_name: String,
    pub user_type: UserType,
    pub wallet_address: String,
    pub premium_balance: i64,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UserType {
    Gen,
    Dev,
}
```

### 6.5 错误处理

我们将实现一个统一的错误处理机制，将各种可能的错误转换为前端可以理解的格式。

**核心实现**：
```rust
#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("网络错误: {0}")]
    NetworkError(#[from] reqwest::Error),
    
    #[error("服务器错误: {0}")]
    ServerError(String),
    
    #[error("认证错误: {0}")]
    AuthError(String),
    
    #[error("请求参数错误: {0}")]
    ValidationError(String),
    
    #[error("未找到资源")]
    NotFound,
    
    #[error("未知错误")]
    Unknown,
}

// 实现 serde::Serialize 以便能够传递给前端
impl serde::Serialize for ApiError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        // 实现序列化逻辑
    }
}
```

### 6.6 配置管理

配置管理模块将负责管理应用的配置信息，如 API 服务器地址、请求超时时间等。

**核心实现**：
```rust
#[derive(Debug, Deserialize)]
pub struct AppConfig {
    pub api_base_url: String,
    pub request_timeout_ms: u64,
    pub max_retries: u32,
}

impl AppConfig {
    pub fn load() -> Result<Self, ConfigError> {
        // 从配置文件或环境变量加载配置
    }
}
```

## 7. 前端调用方式

前端 React 代码将使用 Tauri 的 `invoke` 函数来调用这些命令，而不是直接使用 `fetch`：

**示例调用**：
```typescript
import { invoke } from '@tauri-apps/api/core';

// 调用登录命令
const handleLogin = async (email: string, password: string) => {
  try {
    const result = await invoke('login', {
      email: email,
      password: password
    });
    // 处理登录成功结果
  } catch (error) {
    // 处理登录失败
  }
};
```

## 8. 实现步骤

1. 创建模块结构和基础文件
2. 实现数据模型和配置管理
3. 实现 HTTP 客户端和认证工具
4. 实现各个 API 端点对应的 Tauri 命令
5. 在 `lib.rs` 中注册所有命令
6. 生成 TypeScript 类型定义
7. 更新前端代码，使用 Tauri `invoke` 替代直接 `fetch` 调用
8. 测试所有功能

## 9. 安全考虑

1. **Token 安全存储**：使用 Tauri 的安全存储机制存储认证 token
2. **防止 XSS 攻击**：在 Tauri 环境中运行，天然隔离了浏览器环境的 XSS 风险
3. **防止 CSRF 攻击**：不依赖 cookie，使用 Bearer token 进行认证
4. **输入验证**：在客户端和服务器端都进行输入验证
5. **HTTPS 通信**：生产环境中使用 HTTPS 协议进行通信

## 10. 性能优化

1. **请求缓存**：对频繁请求且数据不经常变化的接口实现缓存
2. **请求合并**：对于短时间内多次请求同一接口的情况，实现请求合并
3. **延迟加载**：对于大数据量的响应，实现延迟加载或分页加载
4. **背景处理**：对于耗时较长的操作，考虑使用 Tauri 的后台任务处理

## 11. 扩展性设计

1. **中间件机制**：设计可插拔的中间件机制，便于添加日志、监控等功能
2. **插件系统**：考虑设计插件系统，便于扩展 API 功能
3. **版本控制**：API 实现考虑版本控制，便于后续升级和兼容性管理

## 12. 测试策略

1. **单元测试**：对各个模块进行单元测试，确保核心功能的正确性
2. **集成测试**：测试不同模块之间的交互
3. **端到端测试**：测试从前端调用到后端响应的完整流程
4. **模拟服务器**：在测试环境中使用模拟服务器，避免对真实后端的依赖

## 13. 文档和注释

1. **代码注释**：为所有公共 API 和关键函数添加详细的文档注释
2. **API 文档**：生成 API 文档，便于前端开发人员参考
3. **变更日志**：记录每个版本的变更内容，便于追踪和维护
