#!/bin/bash

# 检查是否提供了钱包地址
if [ -z "$1" ]; then
  echo "Usage: $0 <wallet_address>"
  echo "Example: $0 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  exit 1
fi

WALLET_ADDRESS=$1
RPC_URL="http://127.0.0.1:8545"
DEPLOYER_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

# 合约地址 (与前端配置保持一致)
FOCUS_TOKEN_ADDRESS="0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
USDC_TOKEN_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"

echo "🪙 开始铸造测试代币..."
echo "目标钱包: $WALLET_ADDRESS"

echo ""
echo "铸造 FOCUS 代币..."
cast send $FOCUS_TOKEN_ADDRESS "mint(address,uint256)" $WALLET_ADDRESS 500000000000000000000000 --rpc-url $RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --json
echo "✅ FOCUS 代币铸造完成"

echo ""
echo "铸造 USDC 代币..."
cast send $USDC_TOKEN_ADDRESS "mint(address,uint256)" $WALLET_ADDRESS 500000000000 --rpc-url $RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --json
echo "✅ USDC 代币铸造完成"

echo ""
echo "=== 查询余额 ==="
FOCUS_BALANCE=$(cast call $FOCUS_TOKEN_ADDRESS "balanceOf(address)" $WALLET_ADDRESS --rpc-url $RPC_URL)
echo "FOCUS 余额: $FOCUS_BALANCE"

USDC_BALANCE=$(cast call $USDC_TOKEN_ADDRESS "balanceOf(address)" $WALLET_ADDRESS --rpc-url $RPC_URL)
echo "USDC 余额: $USDC_BALANCE"

echo ""
echo "🎉 完成！请刷新浏览器页面查看余额更新"