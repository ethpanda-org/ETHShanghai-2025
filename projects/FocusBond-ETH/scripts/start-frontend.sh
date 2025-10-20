#!/bin/bash

echo "🚀 启动前端应用..."

cd /Users/mingji/postgraduate/FocusBond-ETH/apps/web

# 清理可能的缓存问题
echo "🧹 清理缓存..."
rm -rf .next
rm -rf node_modules/.cache

# 启动前端
echo "▶️ 启动Next.js开发服务器..."
pnpm dev
