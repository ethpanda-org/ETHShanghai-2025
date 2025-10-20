@echo off
echo 🚀 启动本地开发环境
echo ==================

REM 检查是否安装了Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 请先安装Node.js和npm
    pause
    exit /b 1
)

REM 安装依赖
echo 📦 安装依赖...
call npm install

REM 编译合约
echo 🔨 编译合约...
call npx hardhat compile

REM 启动本地网络
echo 🌐 启动本地Hardhat网络...
start /b npx hardhat node

REM 等待网络启动
echo ⏳ 等待网络启动...
timeout /t 5 /nobreak >nul

REM 部署合约
echo 📦 部署合约到本地网络...
call npx hardhat run scripts/deploy.js --network localhost

REM 设置环境变量并启动前端应用
echo 🎨 启动前端应用...
set NEXT_PUBLIC_USE_LOCAL=true
set NODE_ENV=development
call npm run dev

echo ✅ 本地开发环境已启动！
echo 📱 前端应用: http://localhost:3000
echo 🌐 本地网络: http://127.0.0.1:8545
echo 🔑 测试账户私钥已显示在部署日志中
echo.
echo 按任意键停止所有服务
pause
