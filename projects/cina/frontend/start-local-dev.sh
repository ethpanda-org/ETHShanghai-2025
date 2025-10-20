#!/bin/bash

echo "🚀 启动本地开发环境"
echo "=================="

# 检查是否安装了hardhat
if ! command -v npx &> /dev/null; then
    echo "❌ 请先安装Node.js和npm"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖..."
npm install

# 编译合约
echo "🔨 编译合约..."
npx hardhat compile

# 启动本地网络
echo "🌐 启动本地Hardhat网络..."
npx hardhat node &
HARDHAT_PID=$!

# 等待网络启动
echo "⏳ 等待网络启动..."
sleep 5

# 部署合约
echo "📦 部署合约到本地网络..."
npx hardhat run scripts/deploy.js --network localhost

# 设置环境变量
echo "🔧 设置环境变量..."
export NEXT_PUBLIC_USE_LOCAL=true
export NODE_ENV=development

# 启动前端应用
echo "🎨 启动前端应用..."
npm run dev

# 清理函数
cleanup() {
    echo "🛑 停止本地网络..."
    kill $HARDHAT_PID 2>/dev/null
    exit 0
}

# 捕获中断信号
trap cleanup SIGINT SIGTERM

echo "✅ 本地开发环境已启动！"
echo "📱 前端应用: http://localhost:3000"
echo "🌐 本地网络: http://127.0.0.1:8545"
echo "🔑 测试账户私钥已显示在部署日志中"
echo ""
echo "按 Ctrl+C 停止所有服务"
