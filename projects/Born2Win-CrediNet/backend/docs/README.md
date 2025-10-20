# 📘 CrediNet API 文档中心

> 所有API文档的导航中心 - 6大核心模块完整覆盖

## 🎯 六大模块API

### 模块1: 身份认证 API
**[📗 AUTH_API_DOCS.md](AUTH_API_DOCS.md)** (200+行)

**功能**: 验证码登录、JWT令牌、权限控制  
**端点数**: 4个  
**核心接口**: `/auth/send_code`, `/auth/login`  
**文档**: [AUTH_API_DOCS.md](AUTH_API_DOCS.md)

### 模块2: DID管理 API
**[📙 DID_API_DOCS.md](DID_API_DOCS.md)** (400+行)

**功能**: DID生成、文档管理、版本控制、区块链注册  
**端点数**: 8个  
**核心接口**: `/did`, `/did/:did`  
**文档**: [DID_API_DOCS.md](DID_API_DOCS.md)

### 模块3: 身份验证 API
**[📕 IDENTITY_API_DOCS.md](IDENTITY_API_DOCS.md)** (650+行)

**功能**: World ID验证、VC验证、OAuth绑定、钱包关联  
**端点数**: 12个  
**核心接口**: `/identity/worldid/verify`, `/identity/oauth/bind`  
**文档**: [IDENTITY_API_DOCS.md](IDENTITY_API_DOCS.md)

### 模块4: 用户授权 API
**[📘 AUTHORIZATION_API_DOCS.md](AUTHORIZATION_API_DOCS.md)** (100+行)

**功能**: 数据源授权、日志审计、权限范围限定  
**端点数**: 10个  
**核心接口**: `/authorization/set`, `/authorization/:user_id`  
**文档**: [AUTHORIZATION_API_DOCS.md](AUTHORIZATION_API_DOCS.md)

### 模块5: 信用评分 API ⭐
**[📊 CREDIT_API_DOCS.md](CREDIT_API_DOCS.md)** (500+行)

**功能**: 多维度评分、信用画像、数据抓取、历史记录  
**端点数**: 9个  
**核心接口**: `/credit/calculate`, `/credit/score`, `/credit/profile`  
**文档**: [CREDIT_API_DOCS.md](CREDIT_API_DOCS.md)

### 模块6: SBT发放 API ⭐
**[🎁 SBT_API_DOCS.md](SBT_API_DOCS.md)** (400+行)

**功能**: 自动发放、条件判断、状态管理、交易同步  
**端点数**: 12个  
**核心接口**: `/sbt/auto_issue`, `/sbt/my`, `/sbt/types`  
**文档**: [SBT_API_DOCS.md](SBT_API_DOCS.md)

## 🔍 按功能查找API

### 核心功能

| 功能 | 模块 | 接口 |
|------|------|------|
| 用户登录 | 身份认证 | `POST /auth/login` |
| 创建DID | DID管理 | `POST /did` |
| World ID验证 | 身份验证 | `POST /identity/worldid/verify` |
| OAuth绑定 | 身份验证 | `POST /identity/oauth/bind` |
| 钱包连接 | 身份验证 | `POST /identity/wallet/connect` |
| 设置授权 | 用户授权 | `POST /authorization/set` |
| 计算信用评分 | 信用评分 | `POST /credit/calculate` |
| 自动发放SBT | SBT发放 | `POST /sbt/auto_issue` |

### 查询功能

| 功能 | 模块 | 接口 |
|------|------|------|
| 获取DID文档 | DID管理 | `GET /did/:did` |
| 获取用户身份 | 身份验证 | `GET /identity/user/:user_id` |
| 获取授权列表 | 用户授权 | `GET /authorization/:user_id/all` |
| 获取信用评分 | 信用评分 | `GET /credit/score` |
| 获取信用画像 | 信用评分 | `GET /credit/profile` |
| 获取我的SBT | SBT发放 | `GET /sbt/my` |

## 📖 其他文档

| 文档 | 说明 | 适合人群 |
|------|------|---------|
| [QUICK_START.md](QUICK_START.md) | 5分钟上手指南 | 新手 |
| [**FRONTEND_API_GUIDE.md**](FRONTEND_API_GUIDE.md) ⭐ | **前端开发者完整API指南（1700+行）** | **前端开发者** |
| [**API_QUICK_REFERENCE.md**](API_QUICK_REFERENCE.md) 📋 | **API快速参考卡** | **前端开发者** |
| [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) | 系统架构设计 | 架构师 |
| [测试指南](../tests/README.md) | 完整测试说明 | 测试工程师 |
| [测试总结](../TEST_SUMMARY.md) | 测试体系说明 | 项目经理 |

## 📊 API端点总览

| 模块 | 端点数 | 状态 | 文档链接 |
|------|--------|------|----------|
| 身份认证 | 4 | ✅ | [AUTH_API_DOCS.md](AUTH_API_DOCS.md) |
| DID管理 | 8 | ✅ | [DID_API_DOCS.md](DID_API_DOCS.md) |
| 身份验证 | 12 | ✅ | [IDENTITY_API_DOCS.md](IDENTITY_API_DOCS.md) |
| 用户授权 | 10 | ✅ | [AUTHORIZATION_API_DOCS.md](AUTHORIZATION_API_DOCS.md) |
| 信用评分 | 9 | ✅ | [CREDIT_API_DOCS.md](CREDIT_API_DOCS.md) |
| SBT发放 | 12 | ✅ | [SBT_API_DOCS.md](SBT_API_DOCS.md) |
| 测试辅助 | 4 | ✅ | - |
| **总计** | **59** | **✅** | - |

## 🎓 学习路径

### 前端开发者路径 ⭐（推荐）
1. 阅读 [**前端API完整指南**](FRONTEND_API_GUIDE.md) 👈 从这里开始
2. 理解JWT Token认证机制
3. 按模块集成API（登录→DID→身份验证→评分→SBT）
4. 参考React/Vue示例代码
5. 测试完整用户流程

### 入门路径（新手）
1. 阅读 [快速开始](QUICK_START.md)
2. 学习 [身份认证API](AUTH_API_DOCS.md)
3. 了解 [DID管理API](DID_API_DOCS.md)
4. 运行测试：`./run_tests.sh auth`

### 进阶路径（后端开发者）
1. 学习 [身份验证API](IDENTITY_API_DOCS.md)
2. 学习 [用户授权API](AUTHORIZATION_API_DOCS.md)
3. 学习 [信用评分API](CREDIT_API_DOCS.md)
4. 学习 [SBT发放API](SBT_API_DOCS.md)
5. 运行完整测试：`./run_tests.sh all`

### 架构路径（架构师）
1. 阅读 [项目总览](PROJECT_OVERVIEW.md)
2. 理解各模块交互关系
3. 查看 [测试总结](../TEST_SUMMARY.md)
4. 运行集成测试：`./run_tests.sh integration`

## 💡 使用示例

### 完整用户旅程

```bash
# 1. 用户登录
POST /auth/send_code {"contact":"user@example.com"}
POST /auth/login {"contact":"user@example.com","code":"123456"}

# 2. 创建DID
POST /did {"user_id":"xxx","public_key":"xxx"}

# 3. 身份验证
POST /identity/worldid/verify {验证数据}
POST /identity/oauth/bind {OAuth数据}

# 4. 授权数据源
POST /authorization/set {"data_source":"github","authorized":true}

# 5. 计算信用评分
POST /credit/calculate?force_refresh=true

# 6. 自动发放SBT
POST /sbt/auto_issue

# 7. 查看结果
GET /sbt/my
```

### 信用评分流程

```bash
# 1. 授权GitHub数据
POST /authorization/set {"data_source":"github","authorized":true}

# 2. 计算评分
POST /credit/calculate?force_refresh=true

# 3. 查看评分
GET /credit/score

# 4. 查看信用画像
GET /credit/profile

# 5. 查看历史
GET /credit/history?limit=10
```

### SBT发放流程

```bash
# 1. 查看符合条件的SBT
GET /sbt/eligible

# 2. 自动发放
POST /sbt/auto_issue

# 3. 查看我的SBT
GET /sbt/my

# 4. 查看统计
GET /sbt/stats
```

## 🔧 测试工具

### 运行API测试

```bash
# 测试所有模块
./run_tests.sh all

# 测试单个模块
./run_tests.sh credit    # 信用评分
./run_tests.sh sbt      # SBT发放

# 快速测试
./tests/test_all_modules.sh
```

### 使用cURL测试

每个API文档都包含完整的cURL使用示例，可以直接复制运行。

## 💼 API规范

### 通用响应格式

**成功响应**:
```json
{
  "success": true,
  "data": {...},
  "message": "操作成功"
}
```

**错误响应**:
```json
{
  "error": "错误类型",
  "message": "详细错误信息"
}
```

### 认证方式

大多数API需要JWT认证：
```http
Authorization: Bearer {your_jwt_token}
```

### 状态码

- `200 OK` - 成功
- `201 Created` - 创建成功
- `400 Bad Request` - 请求参数错误
- `401 Unauthorized` - 未授权
- `403 Forbidden` - 权限不足
- `404 Not Found` - 资源不存在
- `500 Internal Server Error` - 服务器错误

## 📚 相关资源

### 外部文档
- [W3C DID规范](https://www.w3.org/TR/did-core/)
- [W3C VC规范](https://www.w3.org/TR/vc-data-model/)
- [Worldcoin文档](https://docs.worldcoin.org/)
- [OAuth 2.0规范](https://oauth.net/2/)

### 内部资源
- [项目主页](../README.md)
- [测试指南](../tests/README.md)
- [服务脚本](../service.sh)

## 💡 快速链接

- 🏠 [返回项目主页](../README.md)
- 📖 [快速开始](QUICK_START.md)
- 🧪 [运行测试](../tests/README.md)
- 📊 [查看统计](../TEST_SUMMARY.md)

---

**文档版本**: v2.0  
**最后更新**: 2025-10-12  
**维护状态**: ✅ 活跃维护

💡 每个API文档都包含完整的请求/响应示例和实际使用场景
