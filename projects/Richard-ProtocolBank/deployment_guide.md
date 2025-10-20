# Protocol Bank 部署指南

## 概述

本指南詳細說明如何將Protocol Bank數位銀行平台部署到生產環境。系統採用前後端分離架構，後端使用Flask，前端使用React，數據庫使用PostgreSQL。

## 系統要求

### 最低硬件要求
- **CPU**: 4核心
- **內存**: 8GB RAM
- **存儲**: 100GB SSD
- **網絡**: 100Mbps帶寬

### 推薦硬件配置
- **CPU**: 8核心
- **內存**: 16GB RAM
- **存儲**: 500GB SSD
- **網絡**: 1Gbps帶寬

### 軟件要求
- **操作系統**: Ubuntu 22.04 LTS 或 CentOS 8+
- **Python**: 3.11+
- **Node.js**: 18+
- **PostgreSQL**: 15+
- **Redis**: 7+
- **Nginx**: 1.20+

## 部署架構

```
Internet
    ↓
[Load Balancer]
    ↓
[Nginx (Reverse Proxy)]
    ↓
[Gunicorn (WSGI Server)]
    ↓
[Flask Application]
    ↓
[PostgreSQL Database]
    ↓
[Redis Cache]
```

## 部署步驟

### 1. 服務器準備

#### 1.1 更新系統
```bash
sudo apt update && sudo apt upgrade -y
```

#### 1.2 安裝基礎軟件
```bash
# 安裝必要的包
sudo apt install -y python3.11 python3.11-venv python3-pip nodejs npm postgresql postgresql-contrib redis-server nginx git curl

# 安裝Docker（可選）
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

#### 1.3 創建應用用戶
```bash
sudo useradd -m -s /bin/bash protocolbank
sudo usermod -aG sudo protocolbank
```

### 2. 數據庫設置

#### 2.1 配置PostgreSQL
```bash
# 切換到postgres用戶
sudo -u postgres psql

-- 在PostgreSQL中執行
CREATE DATABASE protocol_bank_prod;
CREATE USER protocol_bank_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE protocol_bank_prod TO protocol_bank_user;
ALTER USER protocol_bank_user CREATEDB;
\q
```

#### 2.2 配置Redis
```bash
# 編輯Redis配置
sudo nano /etc/redis/redis.conf

# 修改以下配置
bind 127.0.0.1
port 6379
requirepass your_redis_password

# 重啟Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

### 3. 應用部署

#### 3.1 克隆代碼
```bash
# 切換到應用用戶
sudo su - protocolbank

# 克隆代碼庫
git clone https://github.com/your-org/protocol-bank.git
cd protocol-bank
```

#### 3.2 後端部署

##### 創建虛擬環境
```bash
cd protocol-bank-api
python3.11 -m venv venv
source venv/bin/activate
```

##### 安裝依賴
```bash
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn psycopg2-binary
```

##### 配置環境變量
```bash
# 創建環境變量文件
nano .env
```

```bash
# .env 文件內容
FLASK_ENV=production
SECRET_KEY=your-super-secure-secret-key-here
DATABASE_URL=postgresql://protocol_bank_user:your_secure_password@localhost/protocol_bank_prod
REDIS_URL=redis://:your_redis_password@localhost:6379/0

# JWT配置
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ACCESS_TOKEN_EXPIRES=900
JWT_REFRESH_TOKEN_EXPIRES=2592000

# 面部識別配置
FACE_RECOGNITION_PROVIDER=aws_rekognition
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REKOGNITION_REGION=us-east-1

# NFC支付配置
NFC_ENCRYPTION_KEY=your-nfc-encryption-key
NFC_TOKEN_EXPIRY_MINUTES=5
NFC_MAX_TRANSACTION_AMOUNT=1000.0
```

##### 初始化數據庫
```bash
# 安裝Flask-Migrate
pip install Flask-Migrate

# 設置數據庫遷移
export FLASK_APP=src/main.py
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

##### 創建Gunicorn配置
```bash
nano gunicorn.conf.py
```

```python
# gunicorn.conf.py
bind = "127.0.0.1:5000"
workers = 4
worker_class = "gevent"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 100
timeout = 30
keepalive = 2
preload_app = True
user = "protocolbank"
group = "protocolbank"
```

##### 創建systemd服務
```bash
sudo nano /etc/systemd/system/protocol-bank.service
```

```ini
[Unit]
Description=Protocol Bank Flask Application
After=network.target

[Service]
User=protocolbank
Group=protocolbank
WorkingDirectory=/home/protocolbank/protocol-bank/protocol-bank-api
Environment=PATH=/home/protocolbank/protocol-bank/protocol-bank-api/venv/bin
EnvironmentFile=/home/protocolbank/protocol-bank/protocol-bank-api/.env
ExecStart=/home/protocolbank/protocol-bank/protocol-bank-api/venv/bin/gunicorn --config gunicorn.conf.py src.main:app
Restart=always

[Install]
WantedBy=multi-user.target
```

#### 3.3 前端部署

##### 構建前端應用
```bash
cd ../protocol-bank
npm install
npm run build
```

##### 複製構建文件
```bash
sudo mkdir -p /var/www/protocol-bank
sudo cp -r dist/* /var/www/protocol-bank/
sudo chown -R www-data:www-data /var/www/protocol-bank
```

### 4. Nginx配置

#### 4.1 創建Nginx配置文件
```bash
sudo nano /etc/nginx/sites-available/protocol-bank
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL配置
    ssl_certificate /etc/ssl/certs/protocol-bank.crt;
    ssl_certificate_key /etc/ssl/private/protocol-bank.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # 安全頭
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;";

    # 靜態文件
    location /static/ {
        alias /var/www/protocol-bank/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API代理
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    # 前端應用
    location / {
        try_files $uri $uri/ /index.html;
        root /var/www/protocol-bank;
        index index.html;
    }

    # 健康檢查
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        access_log off;
    }

    # 速率限制
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    location /api/auth/ {
        limit_req zone=api burst=5 nodelay;
        proxy_pass http://127.0.0.1:5000;
    }
}
```

#### 4.2 啟用站點
```bash
sudo ln -s /etc/nginx/sites-available/protocol-bank /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 5. SSL證書配置

#### 5.1 使用Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

#### 5.2 自動續期
```bash
sudo crontab -e
# 添加以下行
0 12 * * * /usr/bin/certbot renew --quiet
```

### 6. 啟動服務

```bash
# 啟動並啟用服務
sudo systemctl start protocol-bank
sudo systemctl enable protocol-bank

# 檢查服務狀態
sudo systemctl status protocol-bank
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status redis-server
```

### 7. 防火牆配置

```bash
# 配置UFW防火牆
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw status
```

## Docker部署（可選）

### 1. 使用Docker Compose

#### 1.1 創建docker-compose.yml
```yaml
version: '3.8'

services:
  web:
    build: ./protocol-bank-api
    ports:
      - "5000:5000"
    environment:
      - FLASK_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/protocol_bank
      - REDIS_URL=redis://:password@redis:6379/0
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs

  frontend:
    build: ./protocol-bank
    ports:
      - "3000:3000"
    depends_on:
      - web

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=protocol_bank
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass password
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - web
      - frontend

volumes:
  postgres_data:
  redis_data:
```

#### 1.2 啟動Docker服務
```bash
docker-compose up -d
```

## 監控和日誌

### 1. 日誌配置

#### 1.1 應用日誌
```bash
# 查看應用日誌
sudo journalctl -u protocol-bank -f

# 查看Nginx日誌
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

#### 1.2 日誌輪轉
```bash
sudo nano /etc/logrotate.d/protocol-bank
```

```
/home/protocolbank/protocol-bank/protocol-bank-api/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 protocolbank protocolbank
}
```

### 2. 監控設置

#### 2.1 健康檢查腳本
```bash
#!/bin/bash
# health_check.sh

HEALTH_URL="https://your-domain.com/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "$(date): Service is healthy"
else
    echo "$(date): Service is unhealthy (HTTP $RESPONSE)"
    # 發送告警
    # send_alert "Protocol Bank service is down"
fi
```

#### 2.2 Cron監控任務
```bash
# 每5分鐘檢查一次
*/5 * * * * /home/protocolbank/health_check.sh >> /var/log/health_check.log
```

## 備份策略

### 1. 數據庫備份

```bash
#!/bin/bash
# backup_db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/database"
DB_NAME="protocol_bank_prod"

mkdir -p $BACKUP_DIR

# 創建備份
pg_dump -h localhost -U protocol_bank_user $DB_NAME > $BACKUP_DIR/protocol_bank_$DATE.sql

# 壓縮備份
gzip $BACKUP_DIR/protocol_bank_$DATE.sql

# 刪除7天前的備份
find $BACKUP_DIR -name "protocol_bank_*.sql.gz" -mtime +7 -delete

echo "Database backup completed: protocol_bank_$DATE.sql.gz"
```

### 2. 應用備份

```bash
#!/bin/bash
# backup_app.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/application"
APP_DIR="/home/protocolbank/protocol-bank"

mkdir -p $BACKUP_DIR

# 備份應用代碼和配置
tar -czf $BACKUP_DIR/protocol_bank_app_$DATE.tar.gz -C $APP_DIR .

# 刪除30天前的備份
find $BACKUP_DIR -name "protocol_bank_app_*.tar.gz" -mtime +30 -delete

echo "Application backup completed: protocol_bank_app_$DATE.tar.gz"
```

## 故障排除

### 1. 常見問題

#### 1.1 服務無法啟動
```bash
# 檢查服務狀態
sudo systemctl status protocol-bank

# 查看詳細日誌
sudo journalctl -u protocol-bank -n 50

# 檢查配置文件
python -m py_compile src/main.py
```

#### 1.2 數據庫連接問題
```bash
# 測試數據庫連接
psql -h localhost -U protocol_bank_user -d protocol_bank_prod

# 檢查PostgreSQL狀態
sudo systemctl status postgresql
```

#### 1.3 Nginx配置問題
```bash
# 測試Nginx配置
sudo nginx -t

# 重新加載配置
sudo systemctl reload nginx
```

### 2. 性能調優

#### 2.1 數據庫優化
```sql
-- 創建索引
CREATE INDEX idx_user_email ON user(email);
CREATE INDEX idx_account_user_id ON account(user_id);
CREATE INDEX idx_transaction_account_id ON transaction(account_id);
CREATE INDEX idx_transaction_created_at ON transaction(created_at);
```

#### 2.2 應用優化
```python
# 啟用查詢緩存
from flask_caching import Cache
cache = Cache(app)

# 數據庫連接池
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 20,
    'pool_recycle': 3600,
    'pool_pre_ping': True
}
```

## 安全檢查清單

- [ ] SSL證書已配置並有效
- [ ] 防火牆規則已設置
- [ ] 數據庫密碼已更改
- [ ] 應用密鑰已設置為強密碼
- [ ] 敏感端口已關閉
- [ ] 日誌記錄已啟用
- [ ] 備份策略已實施
- [ ] 監控已設置
- [ ] 安全頭已配置
- [ ] 速率限制已啟用

## 維護計劃

### 日常維護
- 檢查服務狀態
- 查看錯誤日誌
- 監控系統資源使用

### 週期性維護
- 更新系統包
- 檢查SSL證書有效期
- 清理舊日誌文件
- 驗證備份完整性

### 月度維護
- 安全補丁更新
- 性能分析和優化
- 災難恢復測試

## 聯繫信息

如有部署問題，請聯繫：
- 技術支持：tech-support@protocolbank.com
- 緊急聯繫：emergency@protocolbank.com

---

**注意**：本指南假設您具有基本的Linux系統管理知識。在生產環境部署前，請確保充分測試所有配置。

