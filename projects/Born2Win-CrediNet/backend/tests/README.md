# CrediNet 测试指南

本文档介绍 CrediNet 项目的完整测试体系及使用方法。

## 📋 目录结构

```
tests/
├── README.md                        # 本文档
├── test_all_modules.sh             # Bash快速测试（所有6个模块）
│
├── auth/                           # 身份认证模块测试
│   └── test_auth.py
│
├── did/                            # DID管理模块测试
│   └── test_did.py
│
├── identity/                       # 身份验证与绑定模块测试
│   └── test_identity.py
│
├── authorization/                  # 用户授权模块测试
│   └── test_authorization.py
│
├── credit/                         # 信用评分模块测试
│   └── test_credit.py
│
├── sbt/                           # SBT发放模块测试
│   └── test_sbt.py
│
└── integration/                    # 完整系统集成测试
    └── test_complete.py
```

## 🚀 快速开始

### 前提条件

1. **启动服务**
   ```bash
   cargo run --release
   ```

2. **确认服务运行**
   ```bash
   curl http://127.0.0.1:8080/test/health
   ```

### 运行测试

#### 方法1: 使用主测试脚本（推荐）

```bash
# 运行所有测试
./run_tests.sh all

# 运行单个模块测试
./run_tests.sh auth           # 身份认证
./run_tests.sh did            # DID管理
./run_tests.sh identity       # 身份验证
./run_tests.sh authorization  # 用户授权
./run_tests.sh credit         # 信用评分
./run_tests.sh sbt            # SBT发放
./run_tests.sh integration    # 集成测试
```

#### 方法2: 使用快速测试脚本

```bash
# Bash快速测试（所有6个模块）
./tests/test_all_modules.sh
```

#### 方法3: 直接运行Python测试

```bash
# 单独运行某个模块的测试
python3 tests/auth/test_auth.py
python3 tests/did/test_did.py
python3 tests/identity/test_identity.py
python3 tests/authorization/test_authorization.py
python3 tests/credit/test_credit.py
python3 tests/sbt/test_sbt.py

# 运行完整集成测试
python3 tests/integration/test_complete.py
```

## 📦 各模块测试说明

### 1. 身份认证模块 (auth)

**测试文件**: `tests/auth/test_auth.py`

**测试内容**:
- 验证码发送功能
- 有效/无效验证码登录
- Token验证
- 受保护路由访问
- 验证码重复使用检测

**运行**:
```bash
./run_tests.sh auth
```

### 2. DID管理模块 (did)

**测试文件**: `tests/did/test_did.py`

**测试内容**:
- DID创建
- DID文档获取与更新
- 版本历史管理
- 区块链注册
- 用户DID列表查询

**运行**:
```bash
./run_tests.sh did
```

### 3. 身份验证与绑定模块 (identity)

**测试文件**: `tests/identity/test_identity.py`

**测试内容**:
- World ID验证
- OAuth账号绑定（GitHub/Twitter等）
- 钱包地址连接与验证
- 主钱包设置
- 用户完整身份信息查询

**运行**:
```bash
./run_tests.sh identity
```

### 4. 用户授权模块 (authorization)

**测试文件**: `tests/authorization/test_authorization.py`

**测试内容**:
- 数据源授权设置
- 授权状态查询
- 授权撤销
- 授权日志记录
- 批量授权管理

**运行**:
```bash
./run_tests.sh authorization
```

### 5. 信用评分模块 (credit)

**测试文件**: `tests/credit/test_credit.py`

**测试内容**:
- 信用评分计算
- 评分查询（当前用户/指定用户）
- 信用画像获取
- 评分历史记录
- 数据源状态查询
- 缓存机制验证

**运行**:
```bash
./run_tests.sh credit
```

**特点**:
- 支持强制刷新参数
- 测试缓存性能
- 多维度评分验证

### 6. SBT发放模块 (sbt)

**测试文件**: `tests/sbt/test_sbt.py`

**测试内容**:
- SBT类型列表查询
- 符合条件的SBT判断
- 自动发放SBT
- 手动发放指定类型SBT
- SBT查询（我的/指定用户）
- SBT状态查询
- 发放统计
- 交易同步
- 失败重试
- 发放撤销
- 管理员发放功能

**运行**:
```bash
./run_tests.sh sbt
```

**特点**:
- 完整的SBT生命周期测试
- 区块链交易状态同步
- 多种发放方式测试

### 7. 完整系统集成测试 (integration)

**测试文件**: `tests/integration/test_complete.py`

**测试内容**:
- 所有6个模块的端到端测试
- 模块间协作测试
- 完整用户旅程模拟
- 错误处理测试

**运行**:
```bash
./run_tests.sh integration
```

## 📊 测试报告

所有测试完成后会生成JSON格式的详细报告：

```
tests/
├── auth/auth_test_report.json
├── did/did_test_report.json
├── identity/identity_test_report.json
├── authorization/authorization_test_report.json
├── credit/credit_test_report.json
├── sbt/sbt_test_report.json
└── integration/complete_test_report.json
```

报告包含：
- 测试名称
- 成功/失败状态
- 详细消息
- 时间戳

## 🎯 测试最佳实践

### 1. 测试顺序建议

```bash
# 按依赖关系依次测试
./run_tests.sh auth          # 1. 先测试认证
./run_tests.sh did           # 2. 再测试DID
./run_tests.sh identity      # 3. 然后身份验证
./run_tests.sh authorization # 4. 接着授权
./run_tests.sh credit        # 5. 信用评分
./run_tests.sh sbt          # 6. 最后SBT发放
./run_tests.sh integration   # 7. 完整集成测试
```

### 2. 持续集成

```bash
# 在提交代码前运行所有测试
./run_tests.sh all

# 或使用快速测试脚本
./tests/test_all_modules.sh
```

### 3. 调试失败的测试

```bash
# 查看详细日志
python3 tests/<module>/test_<module>.py

# 查看测试报告
cat tests/<module>/<module>_test_report.json | jq '.'
```

## 🔧 测试配置

### 修改测试基础URL

在各测试文件中修改 `base_url` 参数：

```python
# 默认
tester = AuthTester(base_url="http://127.0.0.1:8080")

# 自定义
tester = AuthTester(base_url="http://your-server:port")
```

### 修改测试用户信息

在测试文件的 `setup_test_user()` 方法中修改测试邮箱：

```python
test_contact = "your_test@credinet.com"
```

## ⚠️ 注意事项

1. **服务必须运行**: 所有测试前确保服务已启动
2. **端口占用**: 确保8080端口可用
3. **数据库状态**: 测试会创建测试数据，建议使用测试数据库
4. **并发测试**: 避免同时运行多个测试实例
5. **网络依赖**: 部分测试需要网络连接（OAuth、World ID等）

## 📝 添加新测试

### 1. 创建测试文件

```python
#!/usr/bin/env python3
"""
模块测试脚本
"""
import requests
import json
from datetime import datetime

class ModuleTester:
    def __init__(self, base_url="http://127.0.0.1:8080"):
        self.base_url = base_url
        self.test_results = []
    
    def log_test(self, test_name, success, message=""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat()
        })
    
    def run_all_tests(self):
        # 实现测试逻辑
        pass

if __name__ == "__main__":
    tester = ModuleTester()
    tester.run_all_tests()
```

### 2. 更新测试脚本

在 `run_tests.sh` 中添加新模块的测试函数。

### 3. 更新集成测试

在 `tests/integration/test_complete.py` 中添加新模块的测试流程。

## 🤝 贡献

欢迎提交新的测试用例或改进现有测试！

## 📞 支持

如有问题，请查看：
- 项目文档: `docs/`
- 测试指南: `docs/TESTING_GUIDE.md`
- API文档: `docs/*_API_DOCS.md`

---

**版本**: v2.0  
**更新日期**: 2025-10-12  
**包含模块**: 6个核心模块完整测试

