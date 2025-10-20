#!/bin/bash

# ZK Flex - 电路构建脚本
# 用途：为新开发者自动下载和生成所有必需的电路文件

set -e

echo "🚀 ZK Flex 电路环境设置"
echo "================================"
echo ""

# 检查依赖
echo "📋 检查依赖..."
command -v circom >/dev/null 2>&1 || { echo "❌ 错误: 需要安装 circom"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ 错误: 需要安装 Node.js"; exit 1; }

# 创建 build 目录
echo "📁 创建 build 目录..."
mkdir -p circuits/build

# 下载 Powers of Tau 21
if [ ! -f "circuits/build/powersOfTau28_hez_final_21.ptau" ]; then
    echo "⬇️  下载 Powers of Tau 21 (2.3GB, 预计 5-10 分钟)..."
    wget -O circuits/build/powersOfTau28_hez_final_21.ptau \
        https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_21.ptau
    echo "✅ Powers of Tau 21 下载完成"
else
    echo "✅ Powers of Tau 21 已存在，跳过下载"
fi

# 编译电路
echo "🔨 编译电路 (预计 1-2 分钟)..."
circom circuits/wealth_proof.circom --r1cs --wasm --sym -o circuits/build

echo "✅ 电路编译完成"
echo "   约束数: ~1,880,000"

# 执行 Trusted Setup
echo "🔐 执行 Trusted Setup (预计 2-3 分钟, 需要 8GB RAM)..."
NODE_OPTIONS="--max-old-space-size=8192" npx snarkjs groth16 setup \
    circuits/build/wealth_proof.r1cs \
    circuits/build/powersOfTau28_hez_final_21.ptau \
    circuits/build/wealth_proof_final.zkey

echo "✅ Trusted Setup 完成"
echo "   zkey 大小: ~919MB"

# 导出验证密钥
echo "📤 导出验证密钥..."
npx snarkjs zkey export verificationkey \
    circuits/build/wealth_proof_final.zkey \
    circuits/build/verification_key.json

# 生成 Solidity 验证器
echo "📜 生成 Solidity 验证器..."
npx snarkjs zkey export solidityverifier \
    circuits/build/wealth_proof_final.zkey \
    packages/foundry/contracts/Groth16Verifier.sol

echo "✅ Solidity 验证器已生成"

# 复制文件到前端 public 目录
echo "📦 复制文件到前端..."
mkdir -p packages/nextjs/public/circuits
cp circuits/build/wealth_proof_js/wealth_proof.wasm packages/nextjs/public/circuits/
cp circuits/build/wealth_proof_final.zkey packages/nextjs/public/circuits/

echo ""
echo "🎉 所有文件准备完成！"
echo "================================"
echo ""
echo "📊 文件大小："
echo "   Powers of Tau 21: 2.3GB"
echo "   wealth_proof.zkey: 919MB"
echo "   wealth_proof.wasm: ~5MB"
echo "   Groth16Verifier.sol: ~32KB"
echo ""
echo "💾 总磁盘占用: ~5.2GB"
echo ""
echo "🚀 下一步："
echo "   yarn chain    # Terminal 1"
echo "   yarn deploy   # Terminal 2"
echo "   yarn start    # Terminal 3"
echo ""

