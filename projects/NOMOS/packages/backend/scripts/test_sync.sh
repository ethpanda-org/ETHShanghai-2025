#!/bin/bash

# 数据同步功能测试脚本

echo "=== 数据同步功能测试 ==="

# 检查服务是否运行
echo "1. 检查服务状态..."
curl -s http://localhost:8080/health || {
    echo "错误: 后端服务未运行，请先启动服务"
    echo "运行命令: cd packages/backend && make dev"
    exit 1
}
echo "✓ 后端服务运行正常"

# 测试同步状态API
echo ""
echo "2. 测试同步状态API..."
curl -s http://localhost:8080/api/v1/sync/status | jq '.' || echo "同步状态API测试失败"

# 测试单个用户同步
echo ""
echo "3. 测试单个用户同步..."
# 使用一个测试地址
TEST_ADDRESS="0x1234567890123456789012345678901234567890"
curl -X POST http://localhost:8080/api/v1/sync/users/$TEST_ADDRESS || echo "单个用户同步测试失败"

# 测试批量同步
echo ""
echo "4. 测试批量同步..."
curl -X POST http://localhost:8080/api/v1/sync/users/batch \
  -H "Content-Type: application/json" \
  -d '{"addresses": ["0x1234567890123456789012345678901234567890", "0x0987654321098765432109876543210987654321"]}' || echo "批量同步测试失败"

# 测试全量同步（注意：这会同步所有用户，可能需要较长时间）
echo ""
echo "5. 测试全量同步（谨慎使用）..."
read -p "是否执行全量同步？这可能需要较长时间 (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    curl -X POST http://localhost:8080/api/v1/sync/users || echo "全量同步测试失败"
else
    echo "跳过全量同步测试"
fi

# 检查数据库中的数据
echo ""
echo "6. 检查数据库中的数据..."
echo "用户数量:"
docker exec guild-score-postgres psql -U postgres -d guild_score -c "SELECT COUNT(*) as user_count FROM users;" 2>/dev/null || echo "无法连接到数据库"

echo "任务缓存数量:"
docker exec guild-score-postgres psql -U postgres -d guild_score -c "SELECT COUNT(*) as task_count FROM task_caches;" 2>/dev/null || echo "无法连接到数据库"

echo ""
echo "=== 测试完成 ==="
echo ""
echo "如果所有测试都通过，说明数据同步功能工作正常。"
echo "你可以通过以下方式进一步测试："
echo "1. 查看日志: make logs"
echo "2. 手动同步: go run cmd/sync/main.go -action user -address 0x1234..."
echo "3. 查看API文档: http://localhost:8080/api/v1/sync/status"
