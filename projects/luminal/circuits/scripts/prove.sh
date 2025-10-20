#!/bin/bash

# Circom 证明生成脚本
# 用途：生成测试证明并验证

set -e

echo "🔐 Generating ZK Proof for Privacy AMM..."

# 配置
CIRCUIT_NAME="swap_circuit"
BUILD_DIR="build"
OUTPUT_DIR="output"

# 检查必要文件
if [ ! -f "$BUILD_DIR/${CIRCUIT_NAME}_final.zkey" ]; then
    echo "❌ Error: zkey not found. Please run 'npm run build' first."
    exit 1
fi

if [ ! -f "$BUILD_DIR/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm" ]; then
    echo "❌ Error: WASM not found. Please run 'npm run build' first."
    exit 1
fi

# Step 1: 生成测试输入
echo "📝 Step 1: Generating test input..."
cat > $OUTPUT_DIR/input.json <<EOF
{
  "reserveOld0": "1000000000000000000",
  "reserveOld1": "2000000000000000",
  "nonceOld": "0",
  "feeOld": "0",
  "amountIn": "100000000000000000",
  "amountOut": "190000000000000",
  "commitmentOld": "12345678901234567890123456789012345678901234567890123456789012",
  "commitmentNew": "98765432109876543210987654321098765432109876543210987654321098"
}
EOF

echo "✅ Test input generated!"

# Step 2: 计算 witness
echo "🧮 Step 2: Computing witness..."
node $BUILD_DIR/${CIRCUIT_NAME}_js/generate_witness.js \
  $BUILD_DIR/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm \
  $OUTPUT_DIR/input.json \
  $OUTPUT_DIR/witness.wtns

echo "✅ Witness computed!"

# Step 3: 生成证明
echo "🔑 Step 3: Generating proof..."
npx snarkjs groth16 prove \
  $BUILD_DIR/${CIRCUIT_NAME}_final.zkey \
  $OUTPUT_DIR/witness.wtns \
  $OUTPUT_DIR/proof.json \
  $OUTPUT_DIR/public.json

echo "✅ Proof generated!"

# Step 4: 验证证明
echo "✅ Step 4: Verifying proof..."
npx snarkjs groth16 verify \
  $OUTPUT_DIR/verification_key.json \
  $OUTPUT_DIR/public.json \
  $OUTPUT_DIR/proof.json

if [ $? -eq 0 ]; then
    echo "✅ Proof verified successfully!"
else
    echo "❌ Proof verification failed!"
    exit 1
fi

# Step 5: 生成 Solidity calldata
echo "📜 Step 5: Generating Solidity calldata..."
npx snarkjs zkey export soliditycalldata \
  $OUTPUT_DIR/public.json \
  $OUTPUT_DIR/proof.json \
  > $OUTPUT_DIR/calldata.txt

echo "✅ Calldata generated!"

# 显示摘要
echo ""
echo "🎉 Proof generation completed!"
echo ""
echo "📁 Generated files:"
echo "  - $OUTPUT_DIR/witness.wtns"
echo "  - $OUTPUT_DIR/proof.json"
echo "  - $OUTPUT_DIR/public.json"
echo "  - $OUTPUT_DIR/calldata.txt"
echo ""
echo "📋 Solidity Calldata (for testing):"
cat $OUTPUT_DIR/calldata.txt
echo ""
echo "✨ Next steps:"
echo "  1. Copy calldata and use in contract tests"
echo "  2. Deploy contracts: cd ../contracts && forge test"
