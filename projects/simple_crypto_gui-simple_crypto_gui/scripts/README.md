# 脚本工具 / Script Tools

这个目录包含了项目的各种脚本工具。
This directory contains various script tools for the project.

## 脚本列表 / Script List

### 部署脚本 / Deployment Scripts
- cd frontend;
- Linux / MacOS: `./start.sh`
- Windows: `start.bat`
- Fallback: `npm install` `npm run dev`

### 测试脚本 / Testing Scripts
- cd frontend;
- `npm run test`

## 使用方法 / Usage Instructions
部署后打开浏览器访问 `http://localhost:5173` 即可使用应用。
After deployment, open a browser and visit `http://localhost:5173` to use the application.

## 环境要求 / Environment Requirements

确保在运行脚本前：
Ensure before running scripts:

1. 已安装 Node.js 18+ / Node.js 18+ installed
2. 已安装项目依赖：`npm install` / Project dependencies installed: `npm install`

## 注意事项 / Notes

- 脚本运行前请仔细检查配置 / Please carefully check the configuration before running scripts
- 生产环境部署前请先在测试环境验证 / Please verify in the test environment before deploying to the production environment
- 敏感信息请使用环境变量，不要硬编码 / Please use environment variables for sensitive information, do not hardcode them
