#!/bin/bash

# 为所有平台生成密钥
# 运行: bash generate_keys.sh

set -e

echo "🔐 开始生成所有平台的密钥..."
echo ""

cd "$(dirname "$0")"

# 检查 Powers of Tau 文件
PTAU_FILE="powersOfTau28_hez_final_18.ptau"
if [ ! -f "$PTAU_FILE" ]; then
  echo "❌ Powers of Tau 文件不存在: $PTAU_FILE"
  echo "请从 https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_18.ptau 下载"
  exit 1
fi

echo "✅ Powers of Tau 文件存在"
echo ""

# 1. PropertyFy
echo "1️⃣ 生成 PropertyFy 密钥..."
if [ -f "build/propertyfy/propertyfy_circuit.r1cs" ]; then
  snarkjs groth16 setup build/propertyfy/propertyfy_circuit.r1cs $PTAU_FILE keys/propertyfy_0000.zkey
  snarkjs zkey contribute keys/propertyfy_0000.zkey keys/propertyfy_final.zkey --name="PropertyFy" -v
  snarkjs zkey export verificationkey keys/propertyfy_final.zkey keys/propertyfy_verification_key.json
  echo "✅ PropertyFy 密钥生成完成"
  rm keys/propertyfy_0000.zkey
else
  echo "⚠️ PropertyFy 电路文件不存在，跳过"
fi
echo ""

# 2. RealT
echo "2️⃣ 生成 RealT 密钥..."
if [ -f "build/realt/realt_circuit.r1cs" ]; then
  snarkjs groth16 setup build/realt/realt_circuit.r1cs $PTAU_FILE keys/realt_0000.zkey
  snarkjs zkey contribute keys/realt_0000.zkey keys/realt_final.zkey --name="RealT" -v
  snarkjs zkey export verificationkey keys/realt_final.zkey keys/realt_verification_key.json
  echo "✅ RealT 密钥生成完成"
  rm keys/realt_0000.zkey
else
  echo "⚠️ RealT 电路文件不存在，跳过"
fi
echo ""

# 3. RealestateIO
echo "3️⃣ 生成 RealestateIO 密钥..."
if [ -f "build/realestate/realestate_circuit.r1cs" ]; then
  # RealestateIO 电路更复杂，可能需要更大的 ptau
  snarkjs groth16 setup build/realestate/realestate_circuit.r1cs $PTAU_FILE keys/realestate_0000.zkey
  snarkjs zkey contribute keys/realestate_0000.zkey keys/realestate_final.zkey --name="RealestateIO" -v
  snarkjs zkey export verificationkey keys/realestate_final.zkey keys/realestate_verification_key.json
  echo "✅ RealestateIO 密钥生成完成"
  rm keys/realestate_0000.zkey
else
  echo "⚠️ RealestateIO 电路文件不存在，跳过"
fi
echo ""

echo "🎉 所有密钥生成完成！"
echo ""
echo "📊 生成的密钥文件:"
ls -lh keys/*.zkey 2>/dev/null || echo "  没有找到 .zkey 文件"
ls -lh keys/*_verification_key.json 2>/dev/null || echo "  没有找到验证密钥"

