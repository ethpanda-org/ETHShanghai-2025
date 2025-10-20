#!/bin/bash
# agent-evm 快速安装脚本

set -e

echo "🚀 开始安装 agent-evm..."

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 未找到 Python3，请先安装 Python 3.8+"
    exit 1
fi

echo "✅ Python3 已安装: $(python3 --version)"

# 创建虚拟环境
if [ ! -d ".venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv .venv
    echo "✅ 虚拟环境已创建"
else
    echo "✅ 虚拟环境已存在"
fi

# 激活虚拟环境
echo "🔄 激活虚拟环境..."
source .venv/bin/activate

# 升级 pip
echo "📦 升级 pip..."
pip install --upgrade pip

# 安装依赖
echo "📦 安装依赖包（这可能需要几分钟）..."
pip install -r requirements.txt

# 生成 gRPC 代码
echo "🔧 生成 gRPC 代码..."
python -m grpc_tools.protoc \
  -I./proto \
  --python_out=. \
  --grpc_python_out=. \
  ./proto/agent.proto

echo "✅ gRPC 代码已生成"

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 文件"
    echo "📝 复制 env.example 为 .env..."
    cp env.example .env
    echo "⚠️  请编辑 .env 文件，填入真实的 API Keys"
    echo "   nano .env"
else
    echo "✅ .env 文件已存在"
fi

# 创建 docs 目录
if [ ! -d "docs" ]; then
    echo "📁 创建 docs 目录..."
    mkdir -p docs
    echo "💡 提示: 将文档（.md 或 .pdf）放入 docs/ 目录以启用 RAG"
fi

# 检查 evm-mcp
EVM_MCP_PATH="../evm-mcp/target/release/evm-mcp"
if [ -f "$EVM_MCP_PATH" ]; then
    echo "✅ evm-mcp 已编译"
else
    echo "⚠️  未找到 evm-mcp"
    echo "   请先编译 evm-mcp:"
    echo "   cd ../evm-mcp && cargo build --release"
fi

echo ""
echo "🎉 安装完成！"
echo ""
echo "📋 下一步:"
echo "1. 编辑 .env 文件，填入 API Keys"
echo "   nano .env"
echo ""
echo "2. 运行配置测试（可选但推荐）"
echo "   python test_config.py"
echo ""
echo "3. 启动 agent（通常由 evm-cli 自动启动）"
echo "   python main.py"
echo ""
echo "或者使用 evm-cli:"
echo "   cd ../evm-cli"
echo "   ./target/release/evm-cli cli"
echo ""
