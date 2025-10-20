# CrediNet 快速开始指南

## 🚀 5分钟快速上手

### 第1步: 启动服务

```bash
cd /Users/ethan/Documents/credinet-auth
cargo run
```

等待服务启动，看到以下输出表示成功：
```
🚀 CrediNet Auth & DID & Identity Service running at http://127.0.0.1:8080
```

### 第2步: 验证功能

在新的终端窗口运行：
```bash
./tests/test_all_modules.sh
```

应该看到所有模块测试通过：
```
✅ 模块1（身份认证）: 通过
✅ 模块2（DID管理）: 通过
✅ 模块3（身份验证）: 通过
🎉 所有三个模块功能正常！
```

### 第3步: 测试API

使用以下命令测试各个模块：

**测试身份认证:**
```bash
# 发送验证码
curl -X POST http://127.0.0.1:8080/auth/send_code \
  -H "Content-Type: application/json" \
  -d '{"contact":"test@example.com"}'
```

**测试DID管理:**
```bash
# 创建DID（需要先登录获取user_id）
curl -X POST http://127.0.0.1:8080/did \
  -H "Content-Type: application/json" \
  -d '{"user_id":"YOUR_USER_ID","public_key":"z6MkhaXgBZDvotDkL2577ULvitBVkChaLBQc2zHvJbNJ1p2v"}'
```

**测试身份验证:**
```bash
# World ID验证（需要先有用户）
curl -X POST http://127.0.0.1:8080/identity/worldid/verify \
  -H "Content-Type: application/json" \
  -d '{"user_id":"YOUR_USER_ID","proof":{...},"action":"verify_humanity","signal":"YOUR_USER_ID"}'
```

## 📚 查看文档

所有文档位于 `docs/` 目录：

```bash
# 进入文档目录
cd docs/

# 查看身份认证API文档
cat AUTH_API_DOCS.md

# 查看DID管理API文档
cat DID_API_DOCS.md

# 查看身份验证API文档
cat IDENTITY_API_DOCS.md

# 查看项目总览
cat PROJECT_OVERVIEW.md

# 查看测试指南
cat TESTING_GUIDE.md
```

## 🧪 运行完整测试

### 方法1: 使用测试脚本
```bash
# 测试所有模块
./run_tests.sh all

# 测试特定模块
./run_tests.sh auth
./run_tests.sh did
./run_tests.sh identity
./run_tests.sh integration
```

### 方法2: 使用Python测试
```bash
# 需要先安装requests库
pip3 install requests

# 运行各模块测试
python3 tests/auth/test_auth.py
python3 tests/did/test_did.py
python3 tests/identity/test_identity.py
python3 tests/integration/test_complete.py
```

### 方法3: 快速验证
```bash
# 快速验证所有模块
./verify_modules.sh
```

## 📊 查看测试报告

测试报告以JSON格式保存：

```bash
# 身份认证测试报告
cat tests/auth/auth_test_report.json

# DID管理测试报告
cat tests/did/did_test_report.json

# 身份验证测试报告
cat tests/identity/identity_test_report.json

# 完整集成测试报告
cat tests/integration/complete_test_report.json
```

## 🔧 配置

### 环境变量

创建 `.env` 文件：
```bash
DATABASE_URL=sqlite:credinet.db
JWT_SECRET=your_secret_key_here_change_in_production
```

### 数据库

首次运行会自动创建数据库和所有表。如需重置：
```bash
rm credinet.db
cargo run
```

## 📖 API端点总览

### 身份认证模块 (4个端点)
- POST /auth/send_code
- POST /auth/login
- GET /protected
- GET /admin

### DID管理模块 (8个端点)
- POST /did
- GET /did/:did
- PUT /did/:did
- GET /did/:did/version/:version
- GET /did/:did/versions
- GET /user/:user_id/dids
- POST /did/:did/blockchain/register
- GET /did/:did/blockchain/status

### 身份验证模块 (12个端点)
- POST /identity/worldid/verify
- GET /identity/worldid/status/:user_id
- POST /identity/credential/verify
- GET /identity/credential/:user_id
- POST /identity/oauth/bind
- POST /identity/oauth/unbind
- GET /identity/oauth/:user_id
- POST /identity/wallet/connect
- PUT /identity/wallet/primary
- GET /identity/wallet/:user_id
- GET /identity/wallet/primary/:user_id
- GET /identity/user/:user_id

### 测试辅助 (4个端点)
- GET /test/health
- GET /test/codes
- POST /test/clear_codes
- POST /test/create_admin

**总计: 28个API端点**

## 🎯 下一步

1. **查看详细文档**
   - 阅读 `README.md` 了解项目详情
   - 查看 `docs/PROJECT_OVERVIEW.md` 了解架构

2. **运行测试**
   - 执行 `./run_tests.sh all` 运行所有测试
   - 查看测试报告了解详细结果

3. **集成开发**
   - 参考API文档开发前端
   - 集成真实的第三方服务
   - 部署到生产环境

## 💡 提示

- 所有测试脚本都已配置好，可直接运行
- API文档包含完整的请求/响应示例
- 测试报告以JSON格式保存，便于分析
- 服务启动后会显示所有可用的文档和测试路径

## 📞 需要帮助？

查看以下文档：
- `../README.md` - 项目说明
- `TESTING_GUIDE.md` - 测试指南
- `PROJECT_OVERVIEW.md` - 项目总览
- `PROJECT_STATUS.md` - 项目状态
