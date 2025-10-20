#!/bin/bash

# 编译所有平台电路
# 运行: bash compile_all_platforms.sh

set -e  # 遇到错误立即退出

echo "🚀 开始编译所有平台电路..."
echo ""

# 创建build目录
mkdir -p build/propertyfy
mkdir -p build/realt
mkdir -p build/realestate
mkdir -p keys

cd "$(dirname "$0")"

# 1. PropertyFy (KYC + Asset)
echo "1️⃣ 编译 PropertyFy 电路 (KYC + Asset)..."
circom propertyfy_circuit.circom \
  --r1cs \
  --wasm \
  --sym \
  --output build/propertyfy

if [ $? -eq 0 ]; then
  echo "✅ PropertyFy 电路编译成功"
else
  echo "❌ PropertyFy 电路编译失败"
  exit 1
fi
echo ""

# 2. RealT (KYC + AML)
echo "2️⃣ 编译 RealT 电路 (KYC + AML)..."
circom realt_circuit.circom \
  --r1cs \
  --wasm \
  --sym \
  --output build/realt

if [ $? -eq 0 ]; then
  echo "✅ RealT 电路编译成功"
else
  echo "❌ RealT 电路编译失败"
  exit 1
fi
echo ""

# 3. RealestateIO (Full)
echo "3️⃣ 编译 RealestateIO 电路 (Full Compliance)..."
circom realestate_circuit.circom \
  --r1cs \
  --wasm \
  --sym \
  --output build/realestate

if [ $? -eq 0 ]; then
  echo "✅ RealestateIO 电路编译成功"
else
  echo "❌ RealestateIO 电路编译失败"
  exit 1
fi
echo ""

echo "🎉 所有电路编译完成！"
echo ""
echo "📊 编译结果:"
ls -lh build/propertyfy/*.r1cs 2>/dev/null || echo "  PropertyFy: 编译文件不存在"
ls -lh build/realt/*.r1cs 2>/dev/null || echo "  RealT: 编译文件不存在"
ls -lh build/realestate/*.r1cs 2>/dev/null || echo "  RealestateIO: 编译文件不存在"
echo ""
echo "⏭️  下一步: 运行 generate_keys.sh 生成密钥"

