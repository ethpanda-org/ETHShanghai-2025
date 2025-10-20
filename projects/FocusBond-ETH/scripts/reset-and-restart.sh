#!/bin/bash

echo "🔄 重置并重启 FocusBond-ETH 系统..."

# 停止所有服务
echo "🛑 停止现有服务..."
pkill anvil 2>/dev/null || true
pkill -f "pnpm dev" 2>/dev/null || true

# 释放端口
echo "🔓 释放端口..."
lsof -ti :8545 | xargs kill -9 2>/dev/null || true
lsof -ti :3000 | xargs kill -9 2>/dev/null || true

sleep 3

# 启动 Anvil
echo "⛓️  启动 Anvil 区块链..."
anvil --port 8545 --gas-price 500000000 &
ANVIL_PID=$!

# 等待 Anvil 启动
echo "⏳ 等待 Anvil 启动..."
sleep 5

# 检查 Anvil 是否启动成功
if ! curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' http://127.0.0.1:8545 > /dev/null; then
    echo "❌ Anvil 启动失败"
    exit 1
fi

echo "✅ Anvil 启动成功"

# 部署合约
echo "📜 部署合约..."
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# 配置合约
echo "⚙️  配置合约..."
forge script script/UpdateFees.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
forge script script/SetMinDuration.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# 为合约充值奖励资金
echo "💰 为合约充值奖励资金..."
cast send 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0 "fundRewards()" --value 10ether --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --rpc-url http://127.0.0.1:8545

# 给合约mint FOCUS代币用于销售
echo "🪙 给合约mint FOCUS代币..."
cast send 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 "mint(address,uint256)" 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0 100000000000000000000000 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --rpc-url http://127.0.0.1:8545

# 给用户发送ETH和代币
echo "💸 给用户发送ETH和代币..."
forge script script/SendETH.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
forge script script/MintTokens.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# 启动前端
echo "🌐 启动前端..."
cd apps/web
pnpm dev --port 3000 &
FRONTEND_PID=$!

# 等待前端启动
echo "⏳ 等待前端启动..."
sleep 10

# 检查前端是否启动成功
if curl -s http://localhost:3000 | grep -q "FocusBond"; then
    echo "✅ 前端启动成功"
else
    echo "❌ 前端启动失败"
    exit 1
fi

echo ""
echo "🎉 系统重置并启动完成！"
echo ""
echo "📋 系统信息:"
echo "- 区块链: http://127.0.0.1:8545"
echo "- 前端: http://localhost:3000"
echo "- 链ID: 31337"
echo ""
echo "📜 合约地址:"
echo "- FocusBond: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
echo "- MockUSDC: 0x5FbDB2315678afecb367f032d93F642f64180aa3"
echo "- MockFOCUS: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
echo ""
echo "🔑 测试账户:"
echo "- 地址: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo "- 私钥: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
echo ""
echo "💡 使用说明:"
echo "1. 在MetaMask中导入测试私钥"
echo "2. 添加Anvil网络 (RPC: http://127.0.0.1:8545, 链ID: 31337)"
echo "3. 访问 http://localhost:3000 开始使用"
echo ""
echo "🔧 如果遇到nonce问题，请在MetaMask中重置账户"
