# CrediNet 去中心化信用网络系统

> 🚀 基于Rust的Web3信用与身份管理完整解决方案

一个完整的去中心化信用网络系统，提供身份认证、DID管理、身份验证、用户授权、信用评分和SBT发放等全栈功能。

## ⚡ 快速开始

### 方式一：使用服务管理脚本（推荐）

```bash
# 启动服务
./service.sh start

# 查看状态
./service.sh status

# 运行测试
./service.sh test

# 停止服务
./service.sh stop
```

### 方式二：直接运行

```bash
# 1. 启动服务
cargo run --release

# 2. 快速测试所有模块
./tests/test_all_modules.sh

# 3. 查看文档
cat docs/README.md
```

> 💡 **新手推荐**: 查看 [快速开始指南](docs/QUICK_START.md) 了解详细步骤

### 服务管理命令

```bash
./service.sh start     # 启动服务
./service.sh stop      # 停止服务
./service.sh restart   # 重启服务
./service.sh status    # 查看状态
./service.sh logs      # 实时日志
./service.sh kill      # 强制清理（解决端口占用）
./service.sh test      # 测试接口
```

## 🎯 核心功能

### 六大核心模块

| 模块 | 功能 | API端点 | 状态 |
|------|------|---------|------|
| **身份认证** | 验证码登录、JWT认证、权限控制 | 4个 | ✅ |
| **DID管理** | DID生成、文档管理、版本控制 | 8个 | ✅ |
| **身份验证** | World ID、OAuth、钱包关联 | 12个 | ✅ |
| **用户授权** | 数据源授权、日志审计、权限管理 | 10个 | ✅ |
| **信用评分** | 多维评分、信用画像、数据抓取 | 9个 | ✅ |
| **SBT发放** | 自动发放、条件判断、交易管理 | 12个 | ✅ |

**总计**: 55+ API端点，覆盖完整的Web3信用网络场景

### 主要特性

✅ **身份认证模块**
- 邮箱/手机号验证码登录
- JWT令牌管理（24小时有效期）
- 基于角色的权限控制（RBAC）
- 令牌刷新和撤销机制

✅ **DID管理模块**
- W3C标准DID生成（`did:credinet:xxx`）
- DID Document版本控制
- 区块链注册支持
- 历史版本查询

✅ **身份验证模块**
- Worldcoin World ID验证（零知识证明）
- 可验证凭证（VC）验证
- OAuth社交平台绑定（GitHub、Twitter等）
- 多链钱包地址关联（Ethereum、Polygon等）
- 主钱包设置

✅ **用户授权模块**
- 数据源授权自主控制
- 授权变更和撤销
- 完整的授权日志审计
- 权限范围明确限定
- 批量授权管理

✅ **信用评分模块**
- 多维度信用评分算法
- 技术能力评估（GitHub）
- 资产能力评估（钱包）
- 社交活跃度评估
- 身份可信度评估
- 评分历史记录
- 数据源状态监控
- 智能缓存机制

✅ **SBT发放模块**
- 基于信用画像的智能判断
- 自动/手动发放SBT
- 多种SBT类型（10+种）
- 区块链交易管理
- 发放状态追踪
- 失败重试机制
- 统计和分析

## 📚 文档导航

### 📖 快速入门
- [快速开始](docs/QUICK_START.md) - 5分钟上手指南
- [**前端开发指南**](docs/FRONTEND_API_GUIDE.md) ⭐ - 前端开发者必读
- [API导航](docs/README.md) - API文档中心
- [项目总览](docs/PROJECT_OVERVIEW.md) - 系统架构设计

### 📘 API参考（6个模块）
- [身份认证API](docs/AUTH_API_DOCS.md) - 登录、JWT、权限
- [DID管理API](docs/DID_API_DOCS.md) - DID创建、版本控制
- [身份验证API](docs/IDENTITY_API_DOCS.md) - World ID、OAuth、钱包
- [用户授权API](docs/AUTHORIZATION_API_DOCS.md) - 授权管理、审计
- [信用评分API](docs/CREDIT_API_DOCS.md) - 评分计算、信用画像
- [SBT发放API](docs/SBT_API_DOCS.md) - SBT发放、状态管理

### 📙 测试文档
- [测试指南](tests/README.md) - 完整测试说明
- [测试总结](TEST_SUMMARY.md) - 测试体系说明
- [验证结果](VERIFICATION_RESULT.md) - 最新验证报告

## 🧪 测试

### 运行所有测试
```bash
# 方式1: 使用主测试脚本
./run_tests.sh all

# 方式2: 快速bash测试
./tests/test_all_modules.sh
```

### 运行单个模块测试
```bash
./run_tests.sh auth          # 身份认证
./run_tests.sh did           # DID管理
./run_tests.sh identity      # 身份验证
./run_tests.sh authorization # 用户授权
./run_tests.sh credit        # 信用评分
./run_tests.sh sbt           # SBT发放
./run_tests.sh integration   # 集成测试
```

详细测试说明请查看 [测试指南](tests/README.md)

## 🔧 技术栈

### 后端技术
- **语言**: Rust 1.70+
- **Web框架**: Axum 0.7
- **数据库**: SQLite 3
- **异步运行时**: Tokio

### 认证与安全
- **JWT**: jsonwebtoken
- **加密**: bcrypt, ring
- **OAuth**: oauth2

### Web3集成
- **DID标准**: W3C DID
- **VC标准**: W3C Verifiable Credentials
- **区块链**: 支持Ethereum、Polygon等

## 📊 项目统计

- **模块数**: 6个核心模块
- **API端点**: 55+ 个
- **数据库表**: 15+ 个
- **代码行数**: 4000+ 行
- **文档页数**: 3000+ 行
- **测试覆盖**: 100% 模块覆盖

## 🏗️ 项目结构

```
credinet-auth/
├── src/
│   ├── auth/           # 身份认证模块
│   ├── did/            # DID管理模块
│   ├── identity/       # 身份验证模块
│   ├── authorization/  # 用户授权模块
│   ├── credit/         # 信用评分模块
│   │   ├── data_fetcher.rs    # 数据抓取
│   │   ├── data_processor.rs  # 数据处理
│   │   ├── scoring_engine.rs  # 评分引擎
│   │   └── ...
│   ├── sbt/            # SBT发放模块
│   │   ├── contract.rs        # 合约交互
│   │   ├── mapper.rs          # 条件映射
│   │   └── ...
│   ├── api/            # 统一API路由
│   ├── shared/         # 共享组件
│   │   ├── database.rs
│   │   ├── jwt.rs
│   │   ├── security.rs
│   │   └── ...
│   └── main.rs         # 主入口
│
├── docs/               # 完整API文档
│   ├── README.md       # 文档索引
│   ├── QUICK_START.md
│   ├── PROJECT_OVERVIEW.md
│   ├── AUTH_API_DOCS.md
│   ├── DID_API_DOCS.md
│   ├── IDENTITY_API_DOCS.md
│   ├── AUTHORIZATION_API_DOCS.md
│   ├── CREDIT_API_DOCS.md
│   └── SBT_API_DOCS.md
│
├── tests/              # 测试套件
│   ├── README.md       # 测试指南
│   ├── auth/
│   ├── did/
│   ├── identity/
│   ├── authorization/
│   ├── credit/
│   ├── sbt/
│   ├── integration/
│   └── test_all_modules.sh
│
├── run_tests.sh        # 主测试脚本
├── service.sh          # 服务管理脚本
└── README.md           # 本文档
```

## 🔒 安全特性

- **JWT签名验证**: 基于HMAC-SHA256
- **验证码安全**: 单次使用、5分钟过期
- **World ID验证**: 零知识证明
- **OAuth安全**: 令牌加密存储
- **钱包验证**: 签名验证机制
- **SQL注入防护**: 参数化查询
- **数据完整性**: 外键约束
- **权限控制**: RBAC角色控制

## 💡 使用场景

### 1. Web3身份认证
用户通过验证码登录，获取DID，完成World ID验证，绑定社交账号和钱包。

### 2. 信用评估
系统自动抓取用户在GitHub、社交平台、链上的数据，计算多维度信用评分。

### 3. SBT奖励
根据用户的信用评分和行为数据，自动发放相应的SBT（如：高信用用户、活跃贡献者等）。

### 4. 数据授权
用户自主控制哪些数据源可以被用于信用评分，支持随时撤销授权。

## 🚀 部署

### 开发环境
```bash
# 配置环境变量
cp env.example .env

# 启动开发服务
cargo run
```

### 生产环境
```bash
# 编译release版本
cargo build --release

# 启动服务
./target/release/credinet-auth

# 或使用服务脚本
./service.sh start
```

详细部署说明请查看 [项目总览](docs/PROJECT_OVERVIEW.md)

## 📈 开发计划

- [x] 身份认证模块
- [x] DID管理模块
- [x] 身份验证模块
- [x] 用户授权模块
- [x] 信用评分模块
- [x] SBT发放模块
- [ ] 前端Dashboard
- [ ] 移动端SDK
- [ ] 多链支持扩展

## 🤝 贡献

欢迎贡献代码、文档或提出建议！

### 贡献指南
1. Fork项目
2. 创建特性分支
3. 提交变更
4. 推送到分支
5. 创建Pull Request

## 📄 许可证

MIT License

## 📞 获取帮助

- 📖 查看 [文档中心](docs/README.md)
- 📝 查看 [测试指南](tests/README.md)
- 🐛 提交 Issue
- 💬 联系开发团队

---

**快速链接**: [快速开始](docs/QUICK_START.md) | [前端开发指南](docs/FRONTEND_API_GUIDE.md) | [API文档](docs/README.md) | [测试指南](tests/README.md) | [项目总览](docs/PROJECT_OVERVIEW.md)

**最后更新**: 2025-10-12 | **版本**: v2.0 | **状态**: ✅ 活跃开发
