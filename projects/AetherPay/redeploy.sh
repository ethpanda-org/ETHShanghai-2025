#!/bin/bash

# 清理并重新部署脚本

echo "🧹 Step 1: 清理缓存..."
npx hardhat clean

echo "📦 Step 2: 重新编译..."
npx hardhat compile

echo "💰 Step 3: 检查余额..."
npx hardhat run scripts/check-balance.js --network op-sepolia

echo "🚀 Step 4: 开始部署..."
echo "请确保账户有足够的 ETH (至少 0.1 ETH)"
read -p "按回车继续部署，或按 Ctrl+C 取消..."

# 部署新合约
npx hardhat run scripts/full-redeploy.js --network op-sepolia

echo "✅ 部署完成！"