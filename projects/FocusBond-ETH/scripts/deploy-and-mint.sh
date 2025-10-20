#!/bin/bash

echo "🚀 开始自动部署和代币铸造..."

# 配置
RPC_URL="http://127.0.0.1:8545"
DEPLOYER_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
TEST_ACCOUNT="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

echo ""
echo "1️⃣ 部署合约..."
cd /Users/mingji/postgraduate/FocusBond-ETH
forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --broadcast

echo ""
echo "2️⃣ 等待合约部署完成..."
sleep 3

echo ""
echo "3️⃣ 铸造测试代币..."
# 合约地址 (从部署输出获取)
FOCUS_TOKEN_ADDRESS="0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
USDC_TOKEN_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"

echo "铸造 FOCUS 代币到测试账户..."
cast send $FOCUS_TOKEN_ADDRESS "mint(address,uint256)" $TEST_ACCOUNT 500000000000000000000000 --rpc-url $RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --json

echo "铸造 USDC 代币到测试账户..."
cast send $USDC_TOKEN_ADDRESS "mint(address,uint256)" $TEST_ACCOUNT 500000000000 --rpc-url $RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --json

echo ""
echo "4️⃣ 验证余额..."
FOCUS_BALANCE=$(cast call $FOCUS_TOKEN_ADDRESS "balanceOf(address)" $TEST_ACCOUNT --rpc-url $RPC_URL)
USDC_BALANCE=$(cast call $USDC_TOKEN_ADDRESS "balanceOf(address)" $TEST_ACCOUNT --rpc-url $RPC_URL)

echo "✅ 部署完成！"
echo "📋 合约地址:"
echo "   FocusBond: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
echo "   FocusToken: $FOCUS_TOKEN_ADDRESS"
echo "   USDC: $USDC_TOKEN_ADDRESS"
echo ""
echo "💰 测试账户余额:"
echo "   FOCUS: $FOCUS_BALANCE"
echo "   USDC: $USDC_BALANCE"
echo ""
echo "🎉 现在可以启动前端应用了！"
