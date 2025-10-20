#!/bin/bash

echo "🔄 重置开发环境..."

# 停止所有进程
pkill -f anvil
pkill -f "pnpm dev"
pkill -f "next dev"

echo "⏳ 等待进程停止..."
sleep 3

# 重启Anvil
echo "🚀 启动Anvil..."
cd /Users/mingji/postgraduate/FocusBond-ETH
anvil --port 8545 &
sleep 3

# 重新部署
echo "📄 部署合约..."
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# 设置最小时间
echo "⚙️ 配置合约..."
forge script script/SetMinDuration.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# 发送资金
echo "💰 发送测试资金..."
forge script script/SendETH.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
forge script script/MintTokens.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
forge script script/SendToAccount2.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

echo ""
echo "✅ 环境重置完成！"
echo ""
echo "📋 下一步："
echo "1. 重置MetaMask账户 (设置 → 高级 → 重置账户)"
echo "2. 刷新浏览器页面: http://localhost:3000"
echo "3. 连接钱包并测试"
echo ""
echo "🔑 可用测试账户:"
echo "账户#1: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo "私钥#1: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
echo ""
echo "账户#2: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
echo "私钥#2: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
