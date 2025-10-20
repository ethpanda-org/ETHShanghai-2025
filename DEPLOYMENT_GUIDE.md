# EasyTrader 完整部署指南

## 📋 项目概述

EasyTrader 是一个智能交易策略控制台，包含：
- **前端**: Next.js 15 + TypeScript + TailwindCSS
- **后端**: Rust + Actix-web + MySQL8
- **数据库**: MySQL 8.0

## 🚀 快速部署

### 1. 环境准备

#### 系统要求
- **操作系统**: Windows 10/11, macOS, Linux
- **内存**: 至少 4GB RAM
- **存储**: 至少 2GB 可用空间
- **网络**: 稳定的互联网连接

#### 必需软件
- **Node.js 18+** (前端)
- **Rust 1.70+** (后端)
- **MySQL 8.0+** (数据库)
- **Git** (版本控制)

### 2. 数据库设置

#### 安装 MySQL 8.0

**Windows:**
```bash
# 下载 MySQL 8.0 安装包
# https://dev.mysql.com/downloads/mysql/
# 选择 MySQL Installer for Windows
```

**macOS:**
```bash
# 使用 Homebrew
brew install mysql
brew services start mysql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install mysql-server-8.0
sudo systemctl start mysql
sudo systemctl enable mysql
```

#### 创建数据库和用户

```sql
-- 登录 MySQL
mysql -u root -p

-- 创建数据库
CREATE DATABASE easytrader DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户
CREATE USER 'easytrader'@'localhost' IDENTIFIED BY 'your_secure_password';

-- 授权
GRANT ALL PRIVILEGES ON easytrader.* TO 'easytrader'@'localhost';
FLUSH PRIVILEGES;

-- 退出
EXIT;
```

#### 执行数据库迁移

```bash
# 进入后端目录
cd backend

# 安装 sqlx-cli (如果未安装)
cargo install sqlx-cli

# 设置数据库连接
export DATABASE_URL="mysql://easytrader:your_secure_password@localhost:3306/easytrader"

# 运行迁移
sqlx migrate run
```

### 3. 后端部署

#### 安装 Rust

```bash
# 下载并安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 重新加载环境变量
source ~/.cargo/env

# 验证安装
rustc --version
cargo --version
```

#### 配置后端

```bash
# 进入后端目录
cd backend

# 创建环境变量文件
cp .env.example .env

# 编辑配置文件
nano .env  # 或使用其他编辑器
```

配置 `.env` 文件：
```env
DATABASE_URL=mysql://easytrader:your_secure_password@localhost:3306/easytrader
HOST=127.0.0.1
PORT=8081
ENCRYPTION_KEY=your-32-character-encryption-key-here
RUST_LOG=info
```

#### 启动后端服务

**Windows:**
```cmd
# 使用批处理文件
start.bat

# 或手动启动
cargo run --release
```

**Linux/macOS:**
```bash
# 使用脚本
chmod +x start.sh
./start.sh

# 或手动启动
cargo run --release
```

### 4. 前端部署

#### 安装 Node.js

**Windows:**
- 下载并安装 Node.js 18+ from https://nodejs.org/

**macOS:**
```bash
# 使用 Homebrew
brew install node
```

**Linux:**
```bash
# 使用 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 启动前端服务

```bash
# 进入前端目录
cd my-next-app

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 🔧 配置说明

### 后端配置

#### 数据库配置
- **连接池大小**: 10 个连接
- **超时设置**: 30 秒
- **字符集**: utf8mb4

#### API 配置
- **端口**: 8081
- **CORS**: 允许所有来源
- **日志级别**: info

#### 安全配置
- **加密密钥**: 32 字符随机字符串
- **API 密钥加密**: AES-GCM
- **HTTPS**: 生产环境建议启用

### 前端配置

#### 开发配置
- **端口**: 3000
- **热重载**: 启用
- **TypeScript**: 严格模式

#### 构建配置
- **Turbopack**: 快速构建
- **TailwindCSS**: 样式框架
- **响应式设计**: 支持移动端

## 📊 监控和维护

### 日志监控

#### 后端日志
```bash
# 查看实时日志
tail -f backend.log

# 设置日志级别
export RUST_LOG=debug
```

#### 前端日志
```bash
# 开发模式日志
npm run dev

# 生产模式日志
npm run build
npm start
```

### 数据库维护

#### 备份数据库
```bash
# 创建备份
mysqldump -u easytrader -p easytrader > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复备份
mysql -u easytrader -p easytrader < backup_file.sql
```

#### 清理日志
```sql
-- 清理 30 天前的日志
DELETE FROM trading_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- 清理价格历史（保留 7 天）
DELETE FROM price_history WHERE timestamp < DATE_SUB(NOW(), INTERVAL 7 DAY);
```

## 🚀 生产部署

### Docker 部署

#### 创建 Dockerfile

**后端 Dockerfile:**
```dockerfile
FROM rust:1.70 as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/backend /usr/local/bin/backend
EXPOSE 8081
CMD ["backend"]
```

**前端 Dockerfile:**
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
EXPOSE 3000
CMD ["npm", "start"]
```

#### Docker Compose

```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: easytrader
      MYSQL_USER: easytrader
      MYSQL_PASSWORD: your_secure_password
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: mysql://easytrader:your_secure_password@mysql:3306/easytrader
    ports:
      - "8081:8081"
    depends_on:
      - mysql

  frontend:
    build: ./my-next-app
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  mysql_data:
```

### 系统服务

#### 后端服务 (systemd)

创建 `/etc/systemd/system/easytrader-backend.service`:

```ini
[Unit]
Description=EasyTrader Backend Service
After=network.target mysql.service

[Service]
Type=simple
User=easytrader
WorkingDirectory=/opt/easytrader/backend
ExecStart=/opt/easytrader/backend/target/release/backend
Restart=always
Environment=RUST_LOG=info
Environment=DATABASE_URL=mysql://easytrader:password@localhost:3306/easytrader

[Install]
WantedBy=multi-user.target
```

#### 前端服务 (PM2)

```bash
# 安装 PM2
npm install -g pm2

# 创建 PM2 配置
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'easytrader-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/opt/easytrader/my-next-app',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
EOF

# 启动服务
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🔒 安全配置

### 网络安全

#### 防火墙配置
```bash
# Ubuntu/Debian
sudo ufw allow 3000  # 前端
sudo ufw allow 8081  # 后端
sudo ufw allow 3306  # 数据库（仅本地）
```

#### HTTPS 配置

**使用 Nginx 反向代理:**
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /backend {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 数据安全

#### 加密配置
- **API 密钥**: AES-GCM 加密存储
- **数据库连接**: SSL/TLS 加密
- **传输数据**: HTTPS 加密

#### 访问控制
- **数据库用户**: 最小权限原则
- **API 访问**: 频率限制
- **日志记录**: 操作审计

## 📈 性能优化

### 数据库优化

#### 索引优化
```sql
-- 为常用查询添加索引
CREATE INDEX idx_strategy_status ON trading_strategies(status);
CREATE INDEX idx_order_created ON trading_orders(created_at);
CREATE INDEX idx_log_type_time ON trading_logs(log_type, created_at);
```

#### 查询优化
- 使用连接池
- 避免 N+1 查询
- 定期分析慢查询

### 应用优化

#### 后端优化
- 启用连接池
- 使用异步处理
- 实现缓存机制

#### 前端优化
- 代码分割
- 图片优化
- CDN 加速

## 🐛 故障排除

### 常见问题

#### 数据库连接失败
```bash
# 检查 MySQL 服务状态
sudo systemctl status mysql

# 检查端口占用
netstat -tlnp | grep 3306

# 测试连接
mysql -u easytrader -p -h localhost easytrader
```

#### 后端启动失败
```bash
# 检查端口占用
netstat -tlnp | grep 8081

# 查看错误日志
cargo run 2>&1 | tee error.log

# 检查环境变量
env | grep DATABASE_URL
```

#### 前端构建失败
```bash
# 清理缓存
rm -rf node_modules package-lock.json
npm install

# 检查 Node.js 版本
node --version
npm --version
```

### 日志分析

#### 后端日志
```bash
# 实时查看日志
tail -f /var/log/easytrader/backend.log

# 搜索错误
grep -i error /var/log/easytrader/backend.log

# 统计请求
grep "GET\|POST" /var/log/easytrader/backend.log | wc -l
```

#### 数据库日志
```sql
-- 查看慢查询
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';

-- 分析查询性能
EXPLAIN SELECT * FROM trading_strategies WHERE status = 'running';
```

## 📞 技术支持

### 获取帮助

1. **查看日志**: 检查应用和系统日志
2. **检查配置**: 验证环境变量和配置文件
3. **测试连接**: 确认网络和数据库连接
4. **查看文档**: 参考 README 和 API 文档

### 联系信息

- **GitHub**: https://github.com/Liuzhichao99/EthShanghai2025EasyTrader
- **团队**: EasyTrader

## 📄 许可证

本项目仅供学习和演示使用。在生产环境中使用前，请确保：
1. 了解相关法律法规
2. 进行充分的安全测试
3. 制定风险管理策略
4. 遵守交易所使用条款
