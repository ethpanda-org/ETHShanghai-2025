#!/bin/bash

echo "🔄 FocusBond-ETH 完整重启"
echo "======================="

# 1. 停止所有进程
echo "🛑 停止所有进程..."
pkill anvil 2>/dev/null || true
pkill -f "pnpm dev" 2>/dev/null || true
lsof -ti :8545 | xargs kill -9 2>/dev/null || true
lsof -ti :3000 | xargs kill -9 2>/dev/null || true
sleep 3

# 2. 启动Anvil
echo "⛓️  启动Anvil区块链..."
anvil --port 8545 --gas-price 500000000 > /dev/null 2>&1 &
sleep 5

# 3. 部署合约
echo "📜 部署合约..."
cd /Users/mingji/postgraduate/FocusBond-ETH
forge script script/DeployCompliant.s.sol --rpc-url http://127.0.0.1:8545 --broadcast 2>&1 | grep "Contract created" | tail -3

# 4. 设置最小时长
echo "⚙️  配置系统..."
forge script script/SetMinDurationCompliant.s.sol --rpc-url http://127.0.0.1:8545 --broadcast > /dev/null 2>&1

# 5. 充值测试账户
echo "💰 充值测试账户..."
cast send --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://127.0.0.1:8545 --value 100ether 0x891402c216Dbda3eD7BEB0f95Dd89b010523642A > /dev/null 2>&1

cast send --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://127.0.0.1:8545 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0 \
  "grantCredits(address,uint256,string)" 0x891402c216Dbda3eD7BEB0f95Dd89b010523642A \
  1000000000000000000000 "Initial credits" > /dev/null 2>&1

# 6. 清理前端缓存
echo "🧹 清理前端缓存..."
cd /Users/mingji/postgraduate/FocusBond-ETH/apps/web-evm
rm -rf .next

# 7. 启动前端
echo "🌐 启动前端..."
pnpm dev --port 3000 > /dev/null 2>&1 &
sleep 8

echo ""
echo "✅ 重启完成！"
echo "==============="
echo "🌐 前端: http://localhost:3000"
echo "📡 区块链: http://127.0.0.1:8545"
echo ""
echo "📋 合约地址:"
echo "FocusBond:   0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
echo "MockUSDC:    0x5FbDB2315678afecb367f032d93F642f64180aa3"
echo "FocusCredit: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
echo ""
echo "👛 测试账户:"
echo "地址: 0x891402c216Dbda3eD7BEB0f95Dd89b010523642A"
echo "私钥: 导入到MetaMask使用"
echo ""
echo "🎮 打开浏览器访问 http://localhost:3000"
