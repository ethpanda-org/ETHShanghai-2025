#!/bin/bash

# 为所有平台生成 Solidity 验证器合约
# 运行: bash generate_verifier_contracts.sh

set -e

echo "📝 开始生成所有平台的验证器合约..."
echo ""

cd "$(dirname "$0")"

# 创建 keys 目录（如果不存在）
mkdir -p keys

# 1. PropertyFy 验证器
echo "1️⃣ 生成 PropertyFy 验证器合约..."
if [ -f "keys/propertyfy_final.zkey" ]; then
  snarkjs zkey export solidityverifier keys/propertyfy_final.zkey keys/PropertyFyVerifier.sol
  echo "✅ PropertyFy 验证器合约已生成: keys/PropertyFyVerifier.sol"
else
  echo "❌ 找不到 PropertyFy 密钥文件: keys/propertyfy_final.zkey"
fi
echo ""

# 2. RealT 验证器
echo "2️⃣ 生成 RealT 验证器合约..."
if [ -f "keys/realt_final.zkey" ]; then
  snarkjs zkey export solidityverifier keys/realt_final.zkey keys/RealTVerifier.sol
  echo "✅ RealT 验证器合约已生成: keys/RealTVerifier.sol"
else
  echo "❌ 找不到 RealT 密钥文件: keys/realt_final.zkey"
fi
echo ""

# 3. RealestateIO 验证器
echo "3️⃣ 生成 RealestateIO 验证器合约..."
if [ -f "keys/realestate_final.zkey" ]; then
  snarkjs zkey export solidityverifier keys/realestate_final.zkey keys/RealestateVerifier.sol
  echo "✅ RealestateIO 验证器合约已生成: keys/RealestateVerifier.sol"
else
  echo "❌ 找不到 RealestateIO 密钥文件: keys/realestate_final.zkey"
fi
echo ""

echo "🎉 所有验证器合约生成完成！"
echo ""
echo "📊 生成的合约文件:"
ls -lh keys/*Verifier.sol 2>/dev/null || echo "  没有找到验证器合约"
echo ""
echo "📋 下一步："
echo "1. 将验证器合约复制到 zk-contract/contracts/ 目录"
echo "2. 编译合约: cd ../../zk-contract && npx hardhat compile"
echo "3. 部署合约: npx hardhat run scripts/deploy-multi-platform.ts"


