# 脚本工具

这个目录包含了项目的各种脚本工具。

## 脚本列表

### 部署脚本
- cd frontend;
- Linux / MacOS: `./start.sh`
- Windows: `start.bat`
- Fallback: `npm install` `npm run dev`

### 测试脚本
- cd frontend;
- `npm run test`

## 使用方法
部署后打开浏览器访问 `http://localhost:5173` 即可使用应用。

## 环境要求

确保在运行脚本前：

1. 已安装 Node.js 18+
2. 已安装项目依赖：`npm install`

## 注意事项

- 脚本运行前请仔细检查配置
- 生产环境部署前请先在测试环境验证
- 敏感信息请使用环境变量，不要硬编码
