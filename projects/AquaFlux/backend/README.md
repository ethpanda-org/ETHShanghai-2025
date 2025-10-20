# AquaFlux DeFi API Backend

这是 AquaFlux RWA (Real World Assets) DeFi 平台的后端 API 服务，基于创新的 P/C/S 三层结构，提供资产代币化、结构化交易和投资组合管理功能。

## 🛠️ 技术栈

- **Express** - Web 框架
- **TypeScript** - 类型安全的 JavaScript 超集
- **Prisma** - ORM 和数据库迁移工具
- **PostgreSQL** - 主数据库
- **TSyringe** - 依赖注入容器
- **Zod** - 环境变量及请求体验证
- **Pino** - 结构化日志记录
- **pnpm** - 包管理工具
- **JWT + Passport** - 用户认证

## 🏗️ 项目结构

```
backend-typescript/
├── prisma/                        # Prisma 配置和迁移文件
│   ├── schema.prisma              # 数据库模型定义 (P/C/S 结构)
│   └── migrations/                # 数据库迁移记录
├── src/
│   ├── app.ts                     # Express 应用配置 (中间件、路由)
│   ├── index.ts                   # 应用入口文件 (服务器启动)
│   ├── bootstrap.ts               # 依赖注入引导程序
│   ├── config.ts                  # 应用配置 (环境变量加载与校验)
│   ├── lib/                       # 核心库
│   │   ├── prisma.ts             # Prisma 客户端
│   │   ├── logger.ts             # Pino 日志实例
│   │   └── axios.ts              # HTTP 客户端
│   ├── middlewares/               # Express 中间件
│   │   ├── admin.middleware.ts   # 管理员权限中间件
│   │   ├── auth.middleware.ts    # JWT 认证中间件
│   │   ├── errorHandler.ts       # 全局错误处理
│   │   └── validate.middleware.ts # Zod 数据验证
│   ├── modules/                   # 业务功能模块
│   │   ├── asset/                # 资产管理模块
│   │   │   ├── asset.controller.ts
│   │   │   ├── asset.service.ts
│   │   │   ├── asset.routes.ts
│   │   │   └── asset.schema.ts
│   ├── routes/                    # 路由汇总
│   │   └── index.ts              # 主路由配置
│   ├── types/                     # TypeScript 类型定义
│   │   └── express.ts            # Express 扩展类型
│   └── utils/                     # 通用工具函数
│       ├── appError.ts           # 自定义错误类
│       └── catchAsync.ts         # 异步错误捕获
├── .env.example                   # 环境变量模板
├── ecosystem.config.js            # PM2 配置文件
├── docker-compose.yml             # Docker 服务配置
├── package.json                   # 项目依赖和脚本
└── tsconfig.json                  # TypeScript 配置
```

## 🏛️ 核心业务逻辑

### P/C/S 三层结构
AquaFlux 基于创新的 P/C/S 三层代币化模型：

- **P (Principal)**: 本金层，固定到期收益，低风险
- **C (Coupon)**: 票息层，可波动收益，中等风险
- **S (Shield)**: 护盾层，高收益/高风险，提供下行保护

**核心等式**: `1P + 1C + 1S = 1 RWA`

## 🚀 开发准备

### 环境要求
- Node.js 18+ (推荐使用 LTS 版本)
- pnpm 8+
- PostgreSQL 15+ (或使用 Docker)
- Redis 7+ (或使用 Docker)

### 快速启动 (Docker)

1. **克隆项目并进入目录**
```bash
cd backend-typescript
```

2. **启动所有服务**
```bash
docker-compose up -d
```

3. **安装依赖**
```bash
pnpm install
```

4. **运行数据库迁移**
```bash
pnpm prisma:migrate
```

### 手动安装

1. **安装依赖**
```bash
pnpm install
```

2. **配置环境变量**
复制环境变量模板并配置：
```bash
cp .env.example .env
```

必需的环境变量：
```env
# 数据库
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aquaflux_dev?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT 认证
JWT_SECRET="your-super-secret-jwt-key-at-least-32-characters-long"
JWT_EXPIRES_IN="7d"

# 应用配置
NODE_ENV="development"
PORT=3001

# 密码加密
BCRYPT_SALT_ROUNDS=10
```

3. **设置数据库**
```bash
# 生成 Prisma 客户端
pnpm prisma:generate

# 运行数据库迁移
pnpm prisma:migrate

# (可选) 启动数据库管理界面
pnpm prisma:studio
```

## 📋 开发命令

```bash
# 开发模式启动 (ts-node-dev 热重载)
pnpm dev

# 构建项目 (编译 TypeScript 到 dist/)
pnpm build

# 生产模式启动 (运行 dist/index.js)
pnpm start

# 代码检查 (TypeScript 类型检查)
pnpm lint

# Prisma 相关命令
pnpm prisma:generate    # 生成 Prisma Client
pnpm prisma:migrate     # 创建并应用数据库迁移 (开发环境)
pnpm prisma:deploy      # 部署迁移到生产环境
pnpm prisma:studio      # 启动 Prisma Studio (数据库 GUI)
```

## 📚 API 文档

所有 API 端点均以 `/api/v1/` 作为前缀。

### 🏦 资产管理 (`/api/v1/assets`)

**公开端点 (无需认证)**
- `GET /` - 获取资产列表 (支持分页、筛选)
- `GET /:id` - 获取单个资产详情

### 🏗️ 结构化操作 (`/api/v1/structure`)

### 认证方式

```bash
# 在请求头中包含 JWT token
Authorization: Bearer <your-jwt-token>
```

## 🐳 Docker 部署

项目包含完整的 Docker Compose 配置：

### 启动服务
```bash
# 启动所有服务 (后端、PostgreSQL、Redis)
docker-compose up -d

# 包含 pgAdmin 数据库管理工具
docker-compose up -d --profile tools

# 查看日志
docker-compose logs -f backend-typescript
```

### 服务端口
- **后端 API**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379  
- **pgAdmin**: http://localhost:5050 (可选)

## 🔐 安全特性

- **JWT 认证**: 基于 JSON Web Token 的用户认证
- **数据验证**: Zod 模式验证所有输入数据
- **错误处理**: 统一的错误处理和日志记录
- **类型安全**: TypeScript 全栈类型检查
- **依赖注入**: TSyringe 管理服务依赖
- **SQL 防注入**: Prisma ORM 预防 SQL 注入攻击

## 📊 监控和日志

项目使用 Pino 进行结构化日志记录：

- **请求日志**: 自动记录所有 HTTP 请求
- **错误日志**: 详细的错误堆栈和上下文
- **业务日志**: 关键业务操作的审计日志
- **性能监控**: 请求耗时和数据库查询性能

## 🚀 生产部署

### PM2 部署
```bash
# 构建项目
pnpm build

# 使用 PM2 启动
pm2 start ecosystem.config.js --env production

# PM2 管理命令
pm2 status          # 查看状态
pm2 logs            # 查看日志
pm2 restart all     # 重启服务
pm2 stop all        # 停止服务
```

### 环境变量 (生产)
```env
NODE_ENV=production
DATABASE_URL="postgresql://user:password@host:5432/aquaflux_prod"
REDIS_URL="redis://host:6379"
JWT_SECRET="your-production-jwt-secret-key"
PORT=3001
```

## 🤝 开发贡献

1. 遵循 TypeScript 严格模式
2. 使用 Zod 验证所有输入数据
3. 编写完整的 JSDoc 注释
4. 遵循依赖注入模式
5. 添加适当的错误处理和日志

---

**AquaFlux DeFi Backend** - 为 RWA 代币化和结构化金融产品提供强大的 API 支持