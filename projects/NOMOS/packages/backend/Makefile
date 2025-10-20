.PHONY: build run test migrate docker-up docker-down clean

# 构建
build:
	go build -o bin/server cmd/server/main.go

# 运行
run:
	go run cmd/server/main.go

# 测试
test:
	go test -v ./...

# 数据库迁移
migrate:
	@echo "Running database migrations..."
	go run cmd/server/main.go --migrate

# 启动 Docker 服务
docker-up:
	docker-compose up -d postgres

# 停止 Docker 服务
docker-down:
	docker-compose down

# 安装依赖
deps:
	go mod download
	go mod tidy

# 代码格式化
fmt:
	go fmt ./...

# 代码检查
lint:
	golangci-lint run

# 清理
clean:
	rm -rf bin/
	go clean

# 完整的开发环境启动
dev: docker-up
	@echo "Waiting for database..."
	@sleep 5
	@echo "Starting backend..."
	@make run

# 查看日志
logs:
	docker-compose logs -f

# 重置数据库
reset-db:
	docker-compose down -v
	docker-compose up -d postgres
	@sleep 5
	@make run

# 测试数据同步功能
test-sync:
	@echo "测试数据同步功能..."
	@./scripts/test_sync.sh

# 手动同步所有用户
sync-all:
	@echo "手动同步所有用户数据..."
	@go run cmd/sync/main.go -action all

# 手动同步单个用户
sync-user:
	@echo "手动同步用户数据..."
	@go run cmd/sync/main.go -action user -address $(ADDRESS)

# 查看同步状态
sync-status:
	@echo "查看同步状态..."
	@curl -s http://localhost:8080/api/v1/sync/status | jq '.' || echo "无法获取同步状态"

# 数据库管理
db-new:
	@echo "创建新的PostgreSQL数据库..."
	@docker run -d --name guild-score-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=123456 -e POSTGRES_DB=guild_score -p 5433:5432 postgres:15-alpine
	@echo "等待数据库启动..."
	@sleep 10
	@echo "数据库已创建，端口: 5433"

db-stop:
	@echo "停止数据库..."
	@docker stop guild-score-postgres || true
	@docker rm guild-score-postgres || true

db-restart: db-stop db-new
	@echo "数据库已重启"

db-status:
	@echo "检查数据库状态..."
	@docker exec guild-score-postgres pg_isready -U postgres || echo "数据库未运行"

db-tables:
	@echo "查看数据库表..."
	@docker exec guild-score-postgres psql -U postgres -d guild_score -c "\dt"

db-users:
	@echo "查看用户数据..."
	@docker exec guild-score-postgres psql -U postgres -d guild_score -c "SELECT COUNT(*) as user_count FROM users;"

# 数据库迁移
migrate:
	@echo "执行数据库迁移..."
	@go run cmd/migrate/main.go

# 数据迁移
data-migration:
	@echo "执行数据迁移..."
	@go run cmd/data_migration/main.go

# 清理不需要的表
cleanup-tables:
	@echo "清理不需要的表..."
	@go run cmd/cleanup_tables/main.go

# 查看增强表数据
db-enhanced-users:
	@echo "查看增强用户数据..."
	@docker exec guild-score-postgres psql -U postgres -d guild_score -c "SELECT COUNT(*) as enhanced_user_count FROM enhanced_users;"

db-behavior-stats:
	@echo "查看用户行为统计数据..."
	@docker exec guild-score-postgres psql -U postgres -d guild_score -c "SELECT COUNT(*) as behavior_stats_count FROM user_behavior_stats;"

db-enhanced-scores:
	@echo "查看增强公会分数数据..."
	@docker exec guild-score-postgres psql -U postgres -d guild_score -c "SELECT COUNT(*) as enhanced_score_count FROM enhanced_guild_scores;"

# 计算所有用户分数
calculate-scores:
	@echo "计算所有用户分数..."
	@go run cmd/calculate_scores/main.go

# 查看用户排名
view-ranking:
	@echo "查看用户排名..."
	@docker exec guild-score-postgres psql -U postgres -d guild_score -c "SELECT u.address, s.total_score, s.rank, s.rank_title FROM enhanced_users u JOIN enhanced_guild_scores s ON u.id = s.user_id ORDER BY s.total_score DESC LIMIT 10;"