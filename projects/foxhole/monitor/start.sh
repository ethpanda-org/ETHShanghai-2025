#!/bin/bash
# Dex Screener Token Monitor 启动脚本

echo "=========================================="
echo "Dex Screener Token Monitor"
echo "=========================================="
echo ""

# 检查依赖
echo "检查依赖..."
python3 -c "import aiohttp" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "缺少依赖，正在安装..."
    pip install -r requirements.txt
fi

echo "启动监控..."
echo "按 Ctrl+C 停止"
echo ""

# 启动监控
python3 token_monitor.py

