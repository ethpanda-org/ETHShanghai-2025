#!/bin/bash

# FocusBond-ETH 快速启动脚本
# 自动化部署和启动整个项目

set -e

echo "🚀 FocusBond-ETH 快速启动脚本"
echo "================================"

# 检查必要工具
echo "📋 检查环境依赖..."
if ! command -v forge &> /dev/null; then
    echo "❌ Foundry 未安装，正在安装..."
    curl -L https://foundry.paradigm.xyz | bash
    source ~/.zshenv
    foundryup
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm 未安装，请先安装 pnpm"
    exit 1
fi

echo "✅ 环境检查完成"

# 停止现有服务
echo "🛑 停止现有服务..."
pkill anvil 2>/dev/null || true
pkill -f "pnpm dev" 2>/dev/null || true

# 检查并释放端口
echo "🔍 检查端口占用..."
if lsof -i :8545 > /dev/null 2>&1; then
    echo "⚠️  端口 8545 被占用，正在释放..."
    lsof -ti :8545 | xargs kill -9 2>/dev/null || true
fi

if lsof -i :3000 > /dev/null 2>&1; then
    echo "⚠️  端口 3000 被占用，正在释放..."
    lsof -ti :3000 | xargs kill -9 2>/dev/null || true
fi

sleep 3

# 启动 Anvil
echo "⛓️  启动 Anvil 区块链..."
anvil --port 8545 --gas-price 500000000 &
ANVIL_PID=$!
sleep 3

# 验证 Anvil 启动
if ! curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  http://127.0.0.1:8545 > /dev/null; then
    echo "❌ Anvil 启动失败"
    exit 1
fi
echo "✅ Anvil 启动成功 (PID: $ANVIL_PID)"

# 部署合约
echo "📜 部署智能合约..."
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

echo "⚙️  配置合约参数..."
forge script script/SetMinDuration.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

echo "💰 发送测试 ETH..."
forge script script/SendETH.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

echo "🪙 铸造测试代币..."
forge script script/MintTokens.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# 启动前端
echo "🌐 启动前端服务..."
cd apps/web-evm
pnpm dev --port 3000 &
FRONTEND_PID=$!
cd ../..

# 等待前端启动
echo "⏳ 等待前端启动..."
sleep 8

# 验证部署
echo "🔍 验证部署状态..."
if curl -s http://localhost:3000 | grep -q "FocusBond EVM"; then
    echo "✅ 前端启动成功"
else
    echo "❌ 前端启动失败"
    exit 1
fi

if curl -s "http://localhost:3000/api/session/calculate-fee?userAddress=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266&tokenType=usdc" | grep -q "没有活跃会话"; then
    echo "✅ API 端点正常"
else
    echo "❌ API 端点异常"
fi

echo ""
echo "🎉 FocusBond-ETH 部署完成！"
echo "================================"
echo "📋 部署信息:"
echo "• Anvil 区块链: http://127.0.0.1:8545 (PID: $ANVIL_PID)"
echo "• 前端服务: http://localhost:3000 (PID: $FRONTEND_PID)"
echo "• 链ID: 31337"
echo ""
echo "📜 合约地址:"
echo "• FocusBond:  0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
echo "• MockUSDC:   0x5FbDB2315678afecb367f032d93F642f64180aa3"
echo "• MockFOCUS:  0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
echo ""
echo "🔑 测试账户:"
echo "• 地址: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo "• 私钥: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
echo "• ETH 余额: ~10000 ETH"
echo ""
echo "📱 MetaMask 配置:"
echo "• 网络名称: Anvil Local"
echo "• RPC URL: http://127.0.0.1:8545"
echo "• 链ID: 31337"
echo "• 货币符号: ETH"
echo ""
echo "🛑 停止服务:"
echo "• pkill anvil"
echo "• pkill -f \"pnpm dev\""
echo ""
echo "🎯 现在可以访问 http://localhost:3000 开始使用！"
