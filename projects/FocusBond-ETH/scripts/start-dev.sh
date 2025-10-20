#!/bin/bash

echo "🚀 启动 FocusBond 开发环境..."

# 检查并启动 Anvil
if ! curl -s http://127.0.0.1:8545 > /dev/null; then
    echo "📦 启动 Anvil 区块链..."
    anvil --port 8545 &
    sleep 3
else
    echo "✅ Anvil 已运行"
fi

# 部署合约
echo "📄 部署智能合约..."
cd /Users/mingji/postgraduate/FocusBond-ETH
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# 发送测试资金
echo "💰 发送测试资金..."
forge script script/SendETH.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
forge script script/MintTokens.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# 启动前端
echo "🌐 启动前端服务..."
cd apps/web-evm
pnpm dev --port 3000 &

echo ""
echo "🎉 开发环境启动完成！"
echo ""
echo "📋 接下来的步骤："
echo "1. 打开浏览器访问: http://localhost:3000"
echo "2. 配置MetaMask:"
echo "   - 网络: Anvil Local (http://127.0.0.1:8545, Chain ID: 31337)"
echo "   - 导入账户私钥: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
echo "3. 重置MetaMask账户 (设置 → 高级 → 重置账户)"
echo "4. 连接钱包并开始测试！"
echo ""
echo "🔧 合约地址:"
echo "   - FocusBond: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
echo "   - MockUSDC: 0x5FbDB2315678afecb367f032d93F642f64180aa3"
echo "   - MockFOCUS: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
