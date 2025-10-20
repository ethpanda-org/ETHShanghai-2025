# Protocol Bank 生产环境部署步骤

本文档提供了将 Protocol Bank 部署到生产环境的详细步骤。请按照以下步骤进行操作，确保部署的顺利进行。

## 1. 部署前检查清单

在开始部署之前，请确保以下项目已准备就绪：

### 1.1. 基础设施检查

- [ ] PostgreSQL 数据库已安装并运行
- [ ] Redis 缓存已安装并运行
- [ ] Solana RPC 节点 URL 已获取并测试
- [ ] Ethereum RPC 节点 URL 已获取并测试
- [ ] 负载均衡器已配置
- [ ] SSL/TLS 证书已获取
- [ ] 防火墙规则已配置
- [ ] DNS 记录已指向生产服务器

### 1.2. 应用程序检查

- [ ] 所有代码已提交到 GitHub
- [ ] Docker 镜像已构建并推送到镜像仓库
- [ ] 环境变量已准备好
- [ ] 数据库迁移脚本已准备好
- [ ] 初始数据已准备好 (如需要)

### 1.3. 监控和日志检查

- [ ] Prometheus 已安装并配置
- [ ] Grafana 已安装并配置
- [ ] ELK Stack 已安装并配置
- [ ] 告警规则已配置
- [ ] 日志收集已配置

### 1.4. 安全检查

- [ ] 秘密管理服务已配置
- [ ] 数据库加密已启用
- [ ] 网络隔离已配置
- [ ] 安全审计已完成

## 2. 部署步骤

### 2.1. 部署数据库

```bash
# 连接到生产服务器
ssh user@production-server

# 创建数据库
createdb -U postgres protocol_bank

# 运行数据库迁移
psql -U postgres -d protocol_bank -f /path/to/migration.sql

# 验证数据库
psql -U postgres -d protocol_bank -c "SELECT version();"
```

### 2.2. 部署 Redis

```bash
# 启动 Redis 服务
sudo systemctl start redis-server

# 验证 Redis
redis-cli ping
```

### 2.3. 部署后端 API

#### 方式 1: 使用 Docker

```bash
# 拉取镜像
docker pull your-registry/protocol-bank-backend:latest

# 运行容器
docker run -d \
  --name protocol-bank-backend \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://user:password@host:5432/protocol_bank" \
  -e REDIS_URL="redis://host:6379/0" \
  -e SOLANA_RPC_URL="https://api.mainnet-beta.solana.com" \
  -e ETHEREUM_RPC_URL="https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID" \
  your-registry/protocol-bank-backend:latest

# 验证容器
docker logs protocol-bank-backend
```

#### 方式 2: 使用 Kubernetes

```bash
# 应用 Kubernetes 配置
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# 验证部署
kubectl get pods -n protocol-bank
kubectl get svc -n protocol-bank
```

### 2.4. 部署前端

#### 方式 1: 使用 Nginx

```bash
# 拉取镜像
docker pull your-registry/protocol-bank-frontend:latest

# 运行容器
docker run -d \
  --name protocol-bank-frontend \
  -p 80:80 \
  -p 443:443 \
  -v /path/to/ssl/certs:/etc/nginx/certs \
  your-registry/protocol-bank-frontend:latest

# 验证容器
docker logs protocol-bank-frontend
```

#### 方式 2: 使用 CDN

```bash
# 上传构建文件到 CDN
aws s3 sync ./dist s3://your-bucket/protocol-bank/
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### 2.5. 配置负载均衡器

```bash
# 配置负载均衡器以分发流量到后端实例
# 示例 (Nginx 反向代理)

upstream backend {
  server backend1:5000;
  server backend2:5000;
  server backend3:5000;
}

server {
  listen 80;
  server_name api.protocol-bank.com;

  location / {
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## 3. 部署后验证

### 3.1. 健康检查

```bash
# 检查后端 API 健康状态
curl http://api.protocol-bank.com/health

# 检查数据库连接
curl http://api.protocol-bank.com/db-health

# 检查 Redis 连接
curl http://api.protocol-bank.com/cache-health
```

### 3.2. 功能测试

```bash
# 测试用户注册
curl -X POST http://api.protocol-bank.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 测试用户登录
curl -X POST http://api.protocol-bank.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 测试创建账户
curl -X POST http://api.protocol-bank.com/accounts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"account_type":"checking","currency":"USD"}'

# 测试交易
curl -X POST http://api.protocol-bank.com/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"from_account":"account1","to_account":"account2","amount":100,"currency":"USD"}'
```

### 3.3. 监控和日志检查

```bash
# 检查 Prometheus 指标
curl http://prometheus:9090/api/v1/query?query=up

# 检查 Grafana 仪表板
# 访问 http://grafana:3000

# 检查 Kibana 日志
# 访问 http://kibana:5601
```

### 3.4. 性能测试

```bash
# 使用 Apache Bench 进行负载测试
ab -n 1000 -c 10 http://api.protocol-bank.com/

# 使用 wrk 进行性能测试
wrk -t12 -c400 -d30s http://api.protocol-bank.com/
```

## 4. 部署后配置

### 4.1. 启用 SSL/TLS

```bash
# 使用 Let's Encrypt 和 Certbot
sudo certbot certonly --standalone -d api.protocol-bank.com

# 配置 Nginx 使用 SSL 证书
server {
  listen 443 ssl;
  server_name api.protocol-bank.com;

  ssl_certificate /etc/letsencrypt/live/api.protocol-bank.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.protocol-bank.com/privkey.pem;

  # ... 其他配置
}

# 重定向 HTTP 到 HTTPS
server {
  listen 80;
  server_name api.protocol-bank.com;
  return 301 https://$server_name$request_uri;
}
```

### 4.2. 配置自动备份

```bash
# 创建备份脚本
cat > /usr/local/bin/backup-protocol-bank.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/protocol-bank"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 备份数据库
pg_dump -U postgres protocol_bank | gzip > $BACKUP_DIR/protocol_bank_$TIMESTAMP.sql.gz

# 备份应用数据
tar -czf $BACKUP_DIR/app_data_$TIMESTAMP.tar.gz /app/data

# 上传到 S3
aws s3 cp $BACKUP_DIR/ s3://your-backup-bucket/protocol-bank/ --recursive
EOF

# 设置定时任务
0 2 * * * /usr/local/bin/backup-protocol-bank.sh
```

### 4.3. 配置监控告警

```bash
# 配置 Prometheus 告警规则
cat > /etc/prometheus/rules.yml << 'EOF'
groups:
  - name: protocol_bank
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
      
      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        annotations:
          summary: "Database is down"
EOF
```

## 5. 部署完成后

### 5.1. 文档更新

- [ ] 更新运维文档
- [ ] 记录部署日期和版本
- [ ] 记录已知问题和解决方案

### 5.2. 团队通知

- [ ] 通知开发团队部署完成
- [ ] 通知运维团队部署完成
- [ ] 通知产品团队部署完成

### 5.3. 监控和维护

- [ ] 持续监控应用性能
- [ ] 定期检查日志和告警
- [ ] 定期进行安全审计
- [ ] 定期进行备份验证

## 6. 故障排查

### 6.1. 常见问题

**问题：后端 API 无法连接到数据库**

解决方案：
- 检查数据库服务是否运行
- 检查数据库凭据是否正确
- 检查网络连接
- 检查防火墙规则

**问题：前端无法加载**

解决方案：
- 检查前端服务是否运行
- 检查 DNS 记录
- 检查 CDN 配置
- 检查浏览器缓存

**问题：高延迟或超时**

解决方案：
- 检查服务器资源使用情况
- 检查网络带宽
- 检查数据库查询性能
- 增加服务器资源或优化代码

### 6.2. 日志分析

```bash
# 查看后端日志
docker logs protocol-bank-backend

# 查看 Nginx 日志
tail -f /var/log/nginx/access.log

# 查看系统日志
journalctl -u protocol-bank-backend -f
```

## 7. 部署清单

部署完成后，请确保以下项目已完成：

- [ ] 所有服务都在运行
- [ ] 健康检查通过
- [ ] 功能测试通过
- [ ] 性能测试通过
- [ ] 监控和告警已配置
- [ ] 备份已配置
- [ ] SSL/TLS 已启用
- [ ] 文档已更新
- [ ] 团队已通知

请您按照本指南逐步进行部署。如有任何问题，请参考故障排查部分或联系技术支持。
