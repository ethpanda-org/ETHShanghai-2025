#!/bin/bash

# WebSocket 服务器启动脚本

echo "======================================================================"
echo "启动审计数据 WebSocket 服务器"
echo "======================================================================"
echo ""

# 检查 Python 环境
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到 python3"
    exit 1
fi

# 检查必要的包
echo "检查依赖包..."
python3 -c "import websockets" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "正在安装 websockets 包..."
    pip3 install websockets
fi

echo ""
echo "启动服务器..."
echo "默认地址: ws://localhost:8765"
echo "Web 客户端: 请在浏览器中打开 ws_client.html"
echo ""
echo "按 Ctrl+C 停止服务器"
echo "======================================================================"
echo ""

# 启动服务器
python3 ws_server.py "$@"

