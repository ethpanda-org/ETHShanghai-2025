#!/bin/bash

# Circom 电路构建脚本
# 用途：编译电路、生成 zkey、导出验证器合约

set -e

echo "🔧 Building Privacy AMM Circuit..."

# 配置
CIRCUIT_NAME="swap_circuit"
PTAU_SIZE=12  # Powers of Tau: 2^12 = 4096 constraints
SRC_DIR="src"
BUILD_DIR="build"
OUTPUT_DIR="output"

# 创建输出目录
mkdir -p $BUILD_DIR
mkdir -p $OUTPUT_DIR

# Step 1: 编译电路
echo "📝 Step 1: Compiling circuit..."
circom $SRC_DIR/${CIRCUIT_NAME}.circom \
  --r1cs \
  --wasm \
  --sym \
  -o $BUILD_DIR

echo "✅ Circuit compiled successfully!"

# Step 2: 显示电路信息
echo "📊 Circuit info:"
npx snarkjs r1cs info $BUILD_DIR/${CIRCUIT_NAME}.r1cs

# Step 3: 下载 Powers of Tau (如果不存在)
PTAU_FILE="$BUILD_DIR/pot${PTAU_SIZE}_final.ptau"
if [ ! -f "$PTAU_FILE" ]; then
    echo "📥 Step 2: Downloading Powers of Tau (ptau${PTAU_SIZE})..."
    curl -L -o $PTAU_FILE https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_${PTAU_SIZE}.ptau
    echo "✅ Powers of Tau downloaded!"
else
    echo "✅ Powers of Tau already exists, skipping download"
fi

# Step 4: 生成 zkey (Groth16 trusted setup)
echo "🔑 Step 3: Generating zkey (Phase 1)..."
npx snarkjs groth16 setup \
  $BUILD_DIR/${CIRCUIT_NAME}.r1cs \
  $PTAU_FILE \
  $BUILD_DIR/${CIRCUIT_NAME}_0000.zkey

echo "🔑 Step 4: Contributing to Phase 2..."
npx snarkjs zkey contribute \
  $BUILD_DIR/${CIRCUIT_NAME}_0000.zkey \
  $BUILD_DIR/${CIRCUIT_NAME}_final.zkey \
  --name="First contribution" \
  -v \
  -e="$(openssl rand -base64 32)"

echo "✅ Final zkey generated!"

# Step 5: 导出验证器密钥
echo "🔐 Step 5: Exporting verification key..."
npx snarkjs zkey export verificationkey \
  $BUILD_DIR/${CIRCUIT_NAME}_final.zkey \
  $OUTPUT_DIR/verification_key.json

echo "✅ Verification key exported!"

# Step 6: 生成 Solidity 验证器合约
echo "📜 Step 6: Generating Solidity verifier..."
npx snarkjs zkey export solidityverifier \
  $BUILD_DIR/${CIRCUIT_NAME}_final.zkey \
  $OUTPUT_DIR/Groth16Verifier.sol

echo "✅ Solidity verifier generated!"

# Step 7: 复制验证器到 contracts
echo "📋 Step 7: Copying verifier to contracts..."
cp $OUTPUT_DIR/Groth16Verifier.sol ../contracts/src/Groth16Verifier.sol

echo "✅ Verifier copied to contracts/src/"

# 显示摘要
echo ""
echo "🎉 Build completed successfully!"
echo ""
echo "📁 Generated files:"
echo "  - $BUILD_DIR/${CIRCUIT_NAME}.r1cs"
echo "  - $BUILD_DIR/${CIRCUIT_NAME}.wasm"
echo "  - $BUILD_DIR/${CIRCUIT_NAME}_final.zkey"
echo "  - $OUTPUT_DIR/verification_key.json"
echo "  - $OUTPUT_DIR/Groth16Verifier.sol"
echo "  - ../contracts/src/Groth16Verifier.sol"
echo ""
echo "📊 Circuit Stats:"
npx snarkjs r1cs info $BUILD_DIR/${CIRCUIT_NAME}.r1cs | grep -E "# of|# Public"
echo ""
echo "✨ Next steps:"
echo "  1. Test the circuit: npm run test"
echo "  2. Generate proof: npm run prove"
echo "  3. Deploy contracts: cd ../contracts && forge script script/Deploy.s.sol"
