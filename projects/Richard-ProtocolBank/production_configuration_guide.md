# Protocol Bank 生产环境配置指南

本指南提供了将 Protocol Bank 部署到生产环境所需的详细配置步骤，包括容器化、编排、CI/CD 流水线、监控和日志管理等。

## 1. 容器化配置

### 1.1. 前端 Dockerfile

```dockerfile
# 构建阶段
FROM node:18-alpine AS builder
WORKDIR /app
COPY protocol-bank/package*.json ./
RUN npm install
COPY protocol-bank/ .
RUN npm run build

# 运行阶段
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 1.2. 后端 Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY protocol-bank-api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY protocol-bank-api/src .
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "main:app"]
```

### 1.3. Docker Compose 配置 (开发/测试)

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - backend

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/protocol_bank
      - REDIS_URL=redis://redis:6379/0
      - SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
      - ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=protocol_bank
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## 2. Kubernetes 部署配置

### 2.1. 命名空间

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: protocol-bank
```

### 2.2. 后端部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: protocol-bank-backend
  namespace: protocol-bank
spec:
  replicas: 3
  selector:
    matchLabels:
      app: protocol-bank-backend
  template:
    metadata:
      labels:
        app: protocol-bank-backend
    spec:
      containers:
      - name: backend
        image: your-registry/protocol-bank-backend:latest
        ports:
        - containerPort: 5000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: protocol-bank-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: protocol-bank-secrets
              key: redis-url
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 5000
          initialDelaySeconds: 10
          periodSeconds: 5
```

### 2.3. 服务

```yaml
apiVersion: v1
kind: Service
metadata:
  name: protocol-bank-backend-service
  namespace: protocol-bank
spec:
  type: LoadBalancer
  selector:
    app: protocol-bank-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 5000
```

### 2.4. 入口 (Ingress)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: protocol-bank-ingress
  namespace: protocol-bank
spec:
  rules:
  - host: api.protocol-bank.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: protocol-bank-backend-service
            port:
              number: 80
```

## 3. CI/CD 流水线配置 (GitHub Actions)

### 3.1. 构建和推送镜像

```yaml
name: Build and Push Docker Images

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v1
    
    - name: Login to Docker Registry
      uses: docker/login-action@v1
      with:
        registry: your-registry
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
    
    - name: Build and push backend
      uses: docker/build-push-action@v2
      with:
        context: ./protocol-bank-api
        file: ./protocol-bank-api/Dockerfile
        push: true
        tags: your-registry/protocol-bank-backend:latest
    
    - name: Build and push frontend
      uses: docker/build-push-action@v2
      with:
        context: ./protocol-bank
        file: ./protocol-bank/Dockerfile
        push: true
        tags: your-registry/protocol-bank-frontend:latest
```

### 3.2. 部署到 Kubernetes

```yaml
name: Deploy to Kubernetes

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up kubectl
      uses: azure/setup-kubectl@v1
      with:
        version: 'latest'
    
    - name: Configure kubectl
      run: |
        mkdir -p $HOME/.kube
        echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > $HOME/.kube/config
    
    - name: Deploy to Kubernetes
      run: |
        kubectl apply -f k8s/namespace.yaml
        kubectl apply -f k8s/secrets.yaml
        kubectl apply -f k8s/deployment.yaml
        kubectl apply -f k8s/service.yaml
        kubectl apply -f k8s/ingress.yaml
```

## 4. 监控和日志配置

### 4.1. Prometheus 配置

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'protocol-bank-backend'
    static_configs:
      - targets: ['localhost:5000']
```

### 4.2. Grafana 仪表板

建议创建以下关键指标的仪表板：

- 请求速率和延迟
- 错误率和异常
- 数据库连接和查询性能
- Redis 缓存命中率
- 区块链交易确认时间
- 用户活跃度

### 4.3. ELK Stack 配置

使用 Elasticsearch、Logstash 和 Kibana 进行集中式日志管理。配置 Logstash 从应用日志中提取关键信息，并在 Kibana 中创建可视化仪表板。

## 5. 安全配置

### 5.1. SSL/TLS 证书

使用 Let's Encrypt 和 Certbot 为生产域名配置 SSL/TLS 证书：

```bash
certbot certonly --standalone -d api.protocol-bank.com -d www.protocol-bank.com
```

### 5.2. 防火墙规则

配置防火墙以仅允许必要的入站流量：

- HTTP (80) 和 HTTPS (443) 用于 Web 流量
- SSH (22) 用于管理 (限制 IP)
- 数据库端口 (5432) 仅允许来自应用服务器的访问
- Redis 端口 (6379) 仅允许来自应用服务器的访问

### 5.3. 秘密管理

使用 AWS Secrets Manager、Google Secret Manager 或 HashiCorp Vault 来安全地存储和轮换敏感凭据。

## 6. 备份和灾难恢复

### 6.1. 数据库备份

配置自动每日备份，并将备份存储在地理位置分散的位置。

### 6.2. 灾难恢复计划

制定并定期测试灾难恢复计划，确保在发生故障时能够快速恢复服务。

## 7. 性能优化

### 7.1. 缓存策略

实施多层缓存策略，包括 HTTP 缓存、应用级缓存和数据库查询缓存。

### 7.2. CDN 配置

使用 CDN 来加速静态资源的分发，并减少源服务器的负载。

### 7.3. 数据库优化

创建适当的索引，优化查询，并考虑使用数据库分片来处理大规模数据。

## 8. 部署步骤总结

1. 准备生产环境基础设施 (服务器、数据库、缓存等)
2. 配置 Docker 镜像和容器
3. 设置 Kubernetes 集群和配置
4. 配置 CI/CD 流水线
5. 部署应用程序到生产环境
6. 配置监控、日志和告警
7. 进行安全审计和渗透测试
8. 进行最终测试和验证
9. 上线并监控应用性能

请您按照本指南逐步配置生产环境。当配置完成后，请告知我，我将继续进行部署和测试工作。
