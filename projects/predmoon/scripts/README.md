# 脚本工具

这个目录包含了项目的各种脚本工具。

## 脚本列表

### 部署脚本
- `deploy.js` - 智能合约部署脚本
- `verify.js` - 合约验证脚本

### 测试脚本
- `test.js` - 集成测试脚本
- `load-test.js` - 压力测试脚本

### 数据脚本
- `seed.js` - 数据库初始化脚本
- `migrate.js` - 数据迁移脚本

### 工具脚本
- `utils.js` - 通用工具函数
- `config.js` - 配置管理脚本

## 使用方法

```bash
# 运行部署脚本
node scripts/deploy.js

# 运行测试脚本
node scripts/test.js

# 查看帮助信息
node scripts/[脚本名] --help
```

## 环境要求

确保在运行脚本前：

1. 已安装 Node.js 18+
2. 已配置必要的环境变量
3. 已安装项目依赖：`npm install`

## 注意事项

- 脚本运行前请仔细检查配置
- 生产环境部署前请先在测试环境验证
- 敏感信息请使用环境变量，不要硬编码
