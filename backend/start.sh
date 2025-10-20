#!/bin/bash

# EasyTrader 后端启动脚本

echo "🚀 启动 EasyTrader 后端服务..."

# 检查环境变量
if [ ! -f .env ]; then
    echo "❌ 未找到 .env 文件，请先配置环境变量"
    echo "📝 复制 .env.example 到 .env 并配置数据库连接信息"
    exit 1
fi

# 加载环境变量
source .env

# 检查数据库连接
echo "🔍 检查数据库连接..."
if ! mysql -h localhost -u easytrader -p$MYSQL_PASSWORD -e "SELECT 1;" easytrader > /dev/null 2>&1; then
    echo "❌ 数据库连接失败，请检查配置"
    echo "💡 请确保："
    echo "   1. MySQL 服务正在运行"
    echo "   2. 数据库 'easytrader' 已创建"
    echo "   3. 用户 'easytrader' 有访问权限"
    exit 1
fi

echo "✅ 数据库连接正常"

# 运行数据库迁移
echo "🔄 运行数据库迁移..."
if command -v sqlx &> /dev/null; then
    sqlx migrate run
    echo "✅ 数据库迁移完成"
else
    echo "⚠️  sqlx-cli 未安装，跳过数据库迁移"
    echo "💡 安装命令: cargo install sqlx-cli"
fi

# 编译项目
echo "🔨 编译项目..."
if cargo build --release; then
    echo "✅ 编译成功"
else
    echo "❌ 编译失败"
    exit 1
fi

# 启动服务
echo "🚀 启动服务..."
echo "📍 服务地址: http://127.0.0.1:8081"
echo "🔗 API 文档: http://127.0.0.1:8081/backend/health"
echo "⏹️  按 Ctrl+C 停止服务"

./target/release/backend
