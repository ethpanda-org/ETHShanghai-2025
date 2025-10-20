@echo off
chcp 65001 >nul

echo 🚀 启动 EasyTrader 后端服务...

REM 检查环境变量文件
if not exist .env (
    echo ❌ 未找到 .env 文件，请先配置环境变量
    echo 📝 复制 .env.example 到 .env 并配置数据库连接信息
    pause
    exit /b 1
)

echo 🔍 检查数据库连接...
REM 这里可以添加数据库连接检查

echo 🔨 编译项目...
cargo build --release
if %errorlevel% neq 0 (
    echo ❌ 编译失败
    pause
    exit /b 1
)

echo ✅ 编译成功

echo 🚀 启动服务...
echo 📍 服务地址: http://127.0.0.1:8081
echo 🔗 API 文档: http://127.0.0.1:8081/backend/health
echo ⏹️  按 Ctrl+C 停止服务

target\release\backend.exe
