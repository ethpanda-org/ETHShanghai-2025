# 📁 EasyTrader 项目结构总览

## 🏗️ 整体架构

```
EasyTrader/
├── 📱 前端 (Next.js 15)
├── 🦀 后端 (Rust + Actix-web)
├── 🗄️ 数据库 (MySQL 8.0)
└── 📚 文档和配置
```

## 📂 详细目录结构

```
d:\Code\nextjs\
├── 📁 my-next-app/                    # Next.js 前端应用
│   ├── 📁 app/
│   │   ├── 📁 components/            # React 组件
│   │   │   ├── 📄 TradingForm.tsx     # 交易参数表单
│   │   │   ├── 📄 StatusPanel.tsx     # 状态控制面板
│   │   │   └── 📄 PriceDisplay.tsx    # 价格显示组件
│   │   ├── 📁 services/               # API 服务
│   │   │   └── 📄 api.ts             # 后端 API 封装
│   │   ├── 📄 page.tsx               # 主页面
│   │   ├── 📄 layout.tsx             # 布局组件
│   │   └── 📄 globals.css            # 全局样式
│   ├── 📄 package.json               # 前端依赖配置
│   ├── 📄 next.config.ts             # Next.js 配置
│   ├── 📄 tsconfig.json              # TypeScript 配置
│   └── 📄 TRADING_APP_README.md       # 前端说明文档
│
├── 📁 backend/                        # Rust 后端服务
│   ├── 📁 src/
│   │   ├── 📄 main.rs                # 主程序入口
│   │   ├── 📄 models.rs              # 数据模型定义
│   │   ├── 📄 database.rs            # 数据库连接
│   │   ├── 📄 services.rs            # 业务服务层
│   │   └── 📄 handlers.rs            # API 处理器
│   ├── 📁 migrations/                # 数据库迁移
│   │   └── 📄 001_initial.sql       # 初始表结构
│   ├── 📄 Cargo.toml                # Rust 依赖配置
│   ├── 📄 config.toml               # 后端配置文件
│   ├── 📄 start.sh                  # Linux/macOS 启动脚本
│   ├── 📄 start.bat                 # Windows 启动脚本
│   └── 📄 README.md                 # 后端说明文档
│
├── 📁 database/                      # 数据库相关
│   └── 📄 schema.sql                # 完整数据库结构
│
├── 📄 DEPLOYMENT_GUIDE.md           # 详细部署指南
├── 📄 quick-start.md                # 快速启动指南
├── 📄 PROJECT_STRUCTURE.md         # 项目结构说明
└── 📄 readme.md                     # 项目根说明
```

## 🎯 核心组件说明

### 📱 前端组件 (my-next-app/)

#### 主要文件
- **`app/page.tsx`** - 主页面，包含状态管理和组件协调
- **`app/layout.tsx`** - 应用布局，字体和元数据配置
- **`app/globals.css`** - 全局样式，TailwindCSS 配置

#### 组件模块
- **`TradingForm.tsx`** - 交易参数配置表单
  - 支持 CEX/DEX 交易所选择
  - 表单验证和错误处理
  - 条件渲染不同字段

- **`StatusPanel.tsx`** - 策略状态控制面板
  - 状态指示器（颜色编码）
  - 控制按钮（启动/暂停/停止）
  - 交易日志显示

- **`PriceDisplay.tsx`** - 实时价格显示
  - 多交易所价格获取
  - 自动刷新机制
  - 错误处理

#### 服务模块
- **`api.ts`** - 后端 API 封装
  - RESTful 接口调用
  - 错误处理机制
  - TypeScript 类型安全

### 🦀 后端服务 (backend/)

#### 核心模块
- **`main.rs`** - 应用入口
  - HTTP 服务器配置
  - 路由注册
  - 中间件设置

- **`models.rs`** - 数据模型
  - 数据库表结构映射
  - API 请求/响应模型
  - 枚举类型定义

- **`database.rs`** - 数据库连接
  - 连接池管理
  - 健康检查
  - 迁移执行

- **`services.rs`** - 业务服务
  - 策略管理器
  - 交易所服务
  - 数据库服务

- **`handlers.rs`** - API 处理器
  - 启动/停止/暂停策略
  - 状态查询
  - 价格获取
  - 日志管理

#### 配置文件
- **`Cargo.toml`** - Rust 依赖管理
- **`config.toml`** - 应用配置
- **启动脚本** - 跨平台启动支持

### 🗄️ 数据库设计

#### 核心表结构
1. **`users`** - 用户管理
2. **`exchange_configs`** - 交易所配置
3. **`trading_strategies`** - 交易策略
4. **`trading_orders`** - 交易订单
5. **`price_history`** - 价格历史
6. **`trading_logs`** - 交易日志
7. **`strategy_statistics`** - 策略统计
8. **`system_configs`** - 系统配置

#### 视图和索引
- **策略概览视图** - 策略状态汇总
- **日交易统计视图** - 交易数据统计
- **性能索引** - 查询优化

## 🔄 数据流程

### 1. 用户操作流程
```
用户输入 → 前端验证 → API 调用 → 后端处理 → 数据库存储 → 状态更新 → 前端显示
```

### 2. 策略执行流程
```
启动策略 → 参数验证 → 交易所连接 → 价格监控 → 网格计算 → 订单执行 → 状态更新
```

### 3. 实时监控流程
```
价格更新 → 缓存存储 → 前端轮询 → 状态检查 → 日志记录 → 用户界面更新
```

## 🛠️ 技术栈

### 前端技术
- **框架**: Next.js 15.5.6
- **语言**: TypeScript
- **样式**: TailwindCSS 4
- **构建**: Turbopack
- **状态**: React Hooks

### 后端技术
- **语言**: Rust 1.70+
- **框架**: Actix-web 4.4
- **数据库**: SQLx + MySQL
- **异步**: Tokio
- **序列化**: Serde

### 数据库技术
- **数据库**: MySQL 8.0
- **字符集**: utf8mb4
- **引擎**: InnoDB
- **迁移**: SQLx Migrate

## 📊 API 接口

### 基础路径
- **前端**: `http://localhost:3000`
- **后端**: `http://localhost:8081/backend`

### 主要接口
- `GET /health` - 健康检查
- `POST /start` - 启动策略
- `POST /stop` - 停止策略
- `POST /pause` - 暂停策略
- `GET /status` - 获取状态
- `GET /price/{exchange}/{symbol}` - 获取价格
- `GET /logs` - 获取日志

## 🚀 部署方式

### 开发环境
```bash
# 前端
cd my-next-app && npm run dev

# 后端
cd backend && cargo run
```

### 生产环境
```bash
# Docker 部署
docker-compose up -d

# 系统服务
sudo systemctl start easytrader-backend
pm2 start ecosystem.config.js
```

## 🔒 安全特性

### 数据安全
- API 密钥加密存储
- 数据库连接加密
- 敏感信息保护

### 网络安全
- CORS 配置
- 请求频率限制
- HTTPS 支持

### 访问控制
- 最小权限原则
- 操作审计日志
- 异常监控告警

## 📈 性能优化

### 前端优化
- 代码分割
- 图片优化
- 缓存策略

### 后端优化
- 连接池
- 异步处理
- 数据库索引

### 系统优化
- 负载均衡
- CDN 加速
- 监控告警

## 🎯 扩展计划

### 功能扩展
- 更多交易所支持
- 高级策略算法
- 移动端应用

### 技术升级
- 微服务架构
- 容器化部署
- 云原生支持

---

这个项目结构展示了 EasyTrader 的完整架构，从数据库设计到前端界面，从后端 API 到部署配置，形成了一个完整的智能交易策略控制台系统。
