# FlowPay 部署指南

本文档提供了FlowPay平台的完整部署说明，包括本地开发环境和测试网环境的部署步骤。

## 环境要求

### 系统要求
- **操作系统**: macOS, Linux, Windows
- **Python版本**: Python 3.8+
- **Node.js版本**: Node.js 16+ (可选，用于前端开发)
- **Git**: 版本控制工具

### 硬件要求
- **内存**: 最少4GB RAM，推荐8GB+
- **存储**: 最少2GB可用空间
- **网络**: 稳定的互联网连接

## 方式一：本地开发环境部署（Ganache）

### 1. 环境准备

#### 安装Python依赖
```bash
# 克隆项目
git clone https://github.com/ethpanda-org/ETHShanghai-2025.git
cd ETHShanghai-2025/projects/BinaryGrace-FlowPay

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/macOS
# 或
venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

#### 安装Ganache
```bash
# 使用npm安装Ganache CLI
npm install -g ganache-cli

# 或使用Docker
docker run -d -p 8545:8545 trufflesuite/ganache-cli
```

### 2. 配置环境变量

创建`.env`文件：
```bash
# 区块链网络配置
ETHEREUM_RPC_URL_DEVNET=http://localhost:8545
NETWORK_TYPE=devnet

# 合约地址配置（部署后更新）
TASK_CONTRACT_ADDRESS_LOCAL=0xCFEAf0d7f4043C62A9e7dc59CF015561f76A728c

# AI配置
OPENAI_API_KEY=your_deepseek_api_key_here

# 可选配置
LOG_LEVEL=INFO
```

### 3. 启动Ganache本地网络

```bash
# 启动Ganache
ganache-cli --port 8545 --gasLimit 10000000 --accounts 10 --defaultBalanceEther 100
```

### 4. 部署智能合约

```bash
# 部署合约到本地网络
python deployments/deploy_contract.py
```

### 5. 启动应用

```bash
# 启动完整服务
python main.py full --network devnet

# 或分别启动
python main.py backend --network devnet
```

### 6. 访问应用

打开浏览器访问：http://localhost:8000

## 方式二：测试网环境部署（Sepolia）

### 1. 环境准备

#### 安装依赖
```bash
# 安装Python依赖
pip install -r requirements.txt

# 安装MetaMask浏览器扩展
# 访问: https://metamask.io/
```

#### 获取测试网ETH
```bash
# Sepolia测试网水龙头
# 访问: https://sepoliafaucet.com/
# 或: https://faucet.sepolia.dev/
```

### 2. 配置环境变量

创建`.env`文件：
```bash
# 区块链网络配置
ETHEREUM_RPC_URL_TESTNET=https://sepolia.infura.io/v3/your_infura_key
NETWORK_TYPE=testnet

# 合约地址配置（部署后更新）
TASK_CONTRACT_ADDRESS_TESTNET=0x5cac8cc82f285cd82c45d446883d76644fffb30c

# AI配置
OPENAI_API_KEY=your_deepseek_api_key_here

# Infura配置（可选）
INFURA_PROJECT_ID=your_infura_project_id
```

### 3. 部署智能合约

#### 使用Remix IDE部署
1. 访问 [Remix IDE](https://remix.ethereum.org/)
2. 创建新文件 `TaskContract.sol`
3. 复制合约代码到文件
4. 编译合约（Solidity 0.8.30+）
5. 切换到Sepolia测试网
6. 部署合约并记录地址

#### 使用Hardhat部署（可选）
```bash
# 安装Hardhat
npm install --save-dev hardhat

# 初始化项目
npx hardhat init

# 配置hardhat.config.js
# 部署合约
npx hardhat run scripts/deploy.js --network sepolia
```

### 4. 配置MetaMask

1. 安装MetaMask浏览器扩展
2. 创建新钱包或导入现有钱包
3. 切换到Sepolia测试网
4. 从水龙头获取测试ETH
5. 验证网络连接

### 5. 启动应用

```bash
# 启动完整服务
python main.py full --network testnet
```

### 6. 访问应用

打开浏览器访问：http://localhost:8000

## 环境配置详解

### 网络配置

#### 本地开发网络（Ganache）
```bash
# 网络参数
RPC_URL=http://localhost:8545
CHAIN_ID=1337
CURRENCY_SYMBOL=ETH
```

#### Sepolia测试网
```bash
# 网络参数
RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
CHAIN_ID=11155111
CURRENCY_SYMBOL=ETH
```

### AI服务配置

#### DeepSeek API配置
```bash
# 获取API Key
# 访问: https://ark.cn-beijing.volces.com/
# 注册账号并获取API Key

OPENAI_API_KEY=your_api_key_here
```

#### 模型配置
```python
# 在agents/fairness_auditor.py中配置
model="deepseek-v3-250324"
temperature=0.3
max_tokens=2000
```

### 合约配置

#### 合约地址管理
```bash
# 本地网络
TASK_CONTRACT_ADDRESS_LOCAL=0x...

# 测试网
TASK_CONTRACT_ADDRESS_TESTNET=0x...

# 主网
TASK_CONTRACT_ADDRESS_MAINNET=0x...
```

## 部署验证

### 1. 健康检查

```bash
# 检查API健康状态
curl http://localhost:8000/api/health

# 预期响应
{"status": "healthy", "timestamp": 1234567890}
```

### 2. 网络连接测试

```bash
# 测试区块链连接
python -c "
from blockchain.blockchain_client import BlockchainClient
client = BlockchainClient()
print(f'网络类型: {client.network_type}')
print(f'连接状态: {client.w3.is_connected()}')
"
```

### 3. AI服务测试

```bash
# 测试AI审核功能
python test_ai_audit.py
```

### 4. 前端功能测试

1. 访问 http://localhost:8000
2. 连接MetaMask钱包
3. 发布测试任务
4. 启动AI Agent
5. 验证完整流程

## 故障排除

### 常见问题

#### 1. 区块链连接失败
```bash
# 检查网络配置
echo $ETHEREUM_RPC_URL_DEVNET
echo $NETWORK_TYPE

# 测试网络连接
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545
```

#### 2. 合约部署失败
```bash
# 检查账户余额
python -c "
from blockchain.blockchain_client import BlockchainClient
client = BlockchainClient()
print(f'账户余额: {client.w3.eth.get_balance(client.account)}')
"
```

#### 3. AI服务不可用
```bash
# 检查API Key
echo $OPENAI_API_KEY

# 测试AI连接
python -c "
from agents.fairness_auditor import FairnessAuditor
auditor = FairnessAuditor()
print('AI服务状态:', auditor.llm is not None)
"
```

#### 4. 前端无法访问
```bash
# 检查端口占用
lsof -i :8000

# 重启服务
python main.py full --network devnet
```

### 日志调试

#### 启用详细日志
```bash
# 设置日志级别
export LOG_LEVEL=DEBUG

# 启动服务
python main.py full --network devnet
```

#### 查看错误日志
```bash
# 查看Python错误
python -c "
import traceback
try:
    from backend.main import app
    print('后端启动成功')
except Exception as e:
    traceback.print_exc()
"
```

## 生产环境部署

### Docker部署

#### 创建Dockerfile
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["python", "main.py", "full", "--network", "testnet"]
```

#### 构建和运行
```bash
# 构建镜像
docker build -t flowpay .

# 运行容器
docker run -p 8000:8000 --env-file .env flowpay
```

### 云服务部署

#### 使用Heroku
```bash
# 安装Heroku CLI
# 创建Procfile
echo "web: python main.py full --network testnet" > Procfile

# 部署到Heroku
heroku create flowpay-app
git push heroku main
```

#### 使用AWS
```bash
# 使用AWS Elastic Beanstalk
eb init flowpay-app
eb create production
eb deploy
```

## 监控和维护

### 性能监控

#### 系统指标
```bash
# CPU使用率
top -p $(pgrep -f "python main.py")

# 内存使用
ps aux | grep "python main.py"

# 网络连接
netstat -an | grep :8000
```

#### 应用指标
```bash
# API响应时间
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8000/api/health

# 区块链连接状态
python -c "
from blockchain.blockchain_client import BlockchainClient
client = BlockchainClient()
print(f'最新区块: {client.w3.eth.block_number}')
"
```

### 备份和恢复

#### 数据备份
```bash
# 备份智能合约状态
python -c "
from blockchain.blockchain_client import BlockchainClient
client = BlockchainClient()
tasks = client.get_available_tasks()
print(f'任务数量: {len(tasks)}')
"
```

#### 配置备份
```bash
# 备份环境配置
cp .env .env.backup
cp -r build/ build.backup/
```

---

**FlowPay部署指南** - 快速部署去中心化AI协作平台 🚀
