#!/bin/bash

################################################################################
# 配置验证脚本
#
# 在部署前运行此脚本，检查所有配置是否正确
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

errors=0
warnings=0

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
    ((errors++))
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((warnings++))
}

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

echo "════════════════════════════════════════════════════════════════"
echo "  AetherOracle 配置验证"
echo "════════════════════════════════════════════════════════════════"
echo ""

# 1. 检查系统依赖
echo "1. 检查系统依赖"
echo "────────────────────────────────────────"

# Docker
if command -v docker &> /dev/null; then
    docker_version=$(docker --version | awk '{print $3}' | tr -d ',')
    log_success "Docker installed: $docker_version"

    # 检查 Docker daemon
    if docker info > /dev/null 2>&1; then
        log_success "Docker daemon running"
    else
        log_error "Docker daemon not running. Please start Docker."
    fi
else
    log_error "Docker not installed"
fi

# Docker Compose
if command -v docker-compose &> /dev/null; then
    compose_version=$(docker-compose --version | awk '{print $3}' | tr -d ',')
    log_success "Docker Compose installed: $compose_version"
else
    log_error "Docker Compose not installed"
fi

# Node.js
if command -v node &> /dev/null; then
    node_version=$(node --version)
    log_success "Node.js installed: $node_version"

    # 检查版本是否 >= 18
    major_version=$(echo $node_version | cut -d'.' -f1 | tr -d 'v')
    if [ "$major_version" -ge 18 ]; then
        log_success "Node.js version is compatible (>= 18.x)"
    else
        log_warn "Node.js version should be >= 18.x (current: $node_version)"
    fi
else
    log_error "Node.js not installed"
fi

# npm
if command -v npm &> /dev/null; then
    npm_version=$(npm --version)
    log_success "npm installed: $npm_version"
else
    log_error "npm not installed"
fi

# npx
if command -v npx &> /dev/null; then
    log_success "npx available"
else
    log_error "npx not available"
fi

echo ""

# 2. 检查文件结构
echo "2. 检查项目文件结构"
echo "────────────────────────────────────────"

required_files=(
    "package.json"
    "hardhat.config.js"
    "contracts/AetherOracleV3_EigenDA.sol"
    "scripts/deploy-eigenda.js"
    "oracle/server.js"
    "eigenda-proxy/docker-compose.yml"
)

for file in "${required_files[@]}"; do
    if [ -f "$SCRIPT_DIR/../$file" ]; then
        log_success "$file exists"
    else
        log_error "$file not found"
    fi
done

echo ""

# 3. 检查环境配置
echo "3. 检查环境配置"
echo "────────────────────────────────────────"

env_file="$SCRIPT_DIR/../oracle/.env"

if [ -f "$env_file" ]; then
    log_success ".env file exists"

    # 加载环境变量
    source "$env_file"

    # 检查关键配置项
    config_items=(
        "RPC_URL"
        "CHAIN_ID"
        "PRIVATE_KEY"
        "NETWORK"
    )

    for item in "${config_items[@]}"; do
        if [ -n "${!item}" ]; then
            # 隐藏私钥显示
            if [ "$item" = "PRIVATE_KEY" ]; then
                if [ "${!item}" = "0x0000000000000000000000000000000000000000000000000000000000000000" ]; then
                    log_error "$item is using example value (please set a real private key)"
                else
                    log_success "$item is set (${!item:0:8}...)"
                fi
            else
                log_success "$item = ${!item}"
            fi
        else
            log_error "$item not set in .env"
        fi
    done

    # 检查可选配置
    optional_items=(
        "USE_EIGENDA"
        "EIGENDA_PROXY_URL"
        "ORACLE_CONTRACT_ADDRESS"
    )

    for item in "${optional_items[@]}"; do
        if [ -n "${!item}" ]; then
            log_info "$item = ${!item}"
        else
            log_warn "$item not set (will be configured during deployment)"
        fi
    done

else
    log_error ".env file not found at $env_file"
    log_info "Run deployment script to create .env file"
fi

echo ""

# 4. 检查网络连接
echo "4. 检查网络连接"
echo "────────────────────────────────────────"

# 检查 RPC 连接
if [ -n "$RPC_URL" ]; then
    log_info "Testing RPC connection to $RPC_URL..."

    rpc_response=$(curl -s -X POST "$RPC_URL" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' 2>&1)

    if echo "$rpc_response" | grep -q "result"; then
        block_number=$(echo "$rpc_response" | grep -oP '"result":"\K0x[0-9a-fA-F]+"' | head -1)
        block_decimal=$((16#${block_number:2}))
        log_success "RPC connection successful (Block: $block_decimal)"
    else
        log_error "RPC connection failed"
        log_info "Response: $rpc_response"
    fi
else
    log_warn "RPC_URL not set, skipping connection test"
fi

# 检查 EigenDA Proxy
log_info "Testing EigenDA Proxy connection..."
if curl -s http://localhost:4242/health > /dev/null 2>&1; then
    log_success "EigenDA Proxy is running (http://localhost:4242)"
else
    log_warn "EigenDA Proxy not running (will be started during deployment)"
fi

echo ""

# 5. 检查账户余额
echo "5. 检查账户余额"
echo "────────────────────────────────────────"

if [ -n "$RPC_URL" ] && [ -n "$PRIVATE_KEY" ] && [ "$PRIVATE_KEY" != "0x0000000000000000000000000000000000000000000000000000000000000000" ]; then
    cd "$SCRIPT_DIR/.."

    # 使用 Node.js 检查余额
    balance_check=$(node -e "
        const { ethers } = require('ethers');

        async function checkBalance() {
            try {
                const provider = new ethers.JsonRpcProvider('$RPC_URL');
                const wallet = new ethers.Wallet('$PRIVATE_KEY', provider);
                const balance = await provider.getBalance(wallet.address);
                const balanceInEth = ethers.formatEther(balance);

                console.log('ADDRESS:' + wallet.address);
                console.log('BALANCE:' + balanceInEth);
            } catch (error) {
                console.log('ERROR:' + error.message);
            }
        }

        checkBalance();
    " 2>&1)

    if echo "$balance_check" | grep -q "ADDRESS:"; then
        address=$(echo "$balance_check" | grep "ADDRESS:" | cut -d':' -f2)
        balance=$(echo "$balance_check" | grep "BALANCE:" | cut -d':' -f2)

        log_success "Oracle address: $address"
        log_info "Balance: $balance ETH"

        # 检查余额是否足够
        if (( $(echo "$balance > 0.01" | bc -l) )); then
            log_success "Balance is sufficient for deployment"
        elif (( $(echo "$balance > 0" | bc -l) )); then
            log_warn "Balance is low ($balance ETH). Recommended: > 0.01 ETH"
            log_info "Get testnet ETH: https://app.optimism.io/faucet"
        else
            log_error "Insufficient balance ($balance ETH)"
            log_info "Get testnet ETH: https://app.optimism.io/faucet"
        fi
    else
        log_error "Failed to check balance"
        error_msg=$(echo "$balance_check" | grep "ERROR:" | cut -d':' -f2-)
        log_info "Error: $error_msg"
    fi
else
    log_warn "Cannot check balance (RPC_URL or PRIVATE_KEY not set)"
fi

echo ""

# 6. 检查端口占用
echo "6. 检查端口占用"
echo "────────────────────────────────────────"

ports_to_check=(
    "3000:Oracle Service"
    "3001:Oracle Service (V3 parallel mode)"
    "4242:EigenDA Proxy"
    "5432:PostgreSQL (optional)"
    "6379:Redis (optional)"
    "9090:Prometheus (optional)"
    "3001:Grafana (optional)"
)

for port_desc in "${ports_to_check[@]}"; do
    port=$(echo "$port_desc" | cut -d':' -f1)
    desc=$(echo "$port_desc" | cut -d':' -f2)

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        # 检查是否是预期的服务
        if [ "$port" = "4242" ] && curl -s http://localhost:4242/health > /dev/null 2>&1; then
            log_success "Port $port ($desc) - Running"
        elif [ "$port" = "3000" ]; then
            log_warn "Port $port ($desc) - Already in use"
        else
            log_warn "Port $port ($desc) - In use"
        fi
    else
        log_info "Port $port ($desc) - Available"
    fi
done

echo ""

# 7. 检查磁盘空间
echo "7. 检查磁盘空间"
echo "────────────────────────────────────────"

available_space=$(df -BG "$SCRIPT_DIR" | awk 'NR==2 {print $4}' | sed 's/G//')
log_info "Available disk space: ${available_space}GB"

if [ "$available_space" -ge 10 ]; then
    log_success "Sufficient disk space (>= 10GB)"
elif [ "$available_space" -ge 5 ]; then
    log_warn "Limited disk space (${available_space}GB). Recommended: >= 10GB"
else
    log_error "Insufficient disk space (${available_space}GB). Need at least 5GB"
fi

echo ""

# 8. 总结
echo "════════════════════════════════════════════════════════════════"
echo "  验证结果总结"
echo "════════════════════════════════════════════════════════════════"
echo ""

if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
    echo -e "${GREEN}✓ 所有检查通过！可以开始部署。${NC}"
    echo ""
    echo "运行部署命令:"
    echo "  ./quick-deploy.sh          # 全新部署"
    echo "  ./migrate-to-eigenda.sh    # 从 V2 迁移"
    exit 0
elif [ $errors -eq 0 ]; then
    echo -e "${YELLOW}⚠ 检查完成，发现 $warnings 个警告${NC}"
    echo ""
    echo "可以继续部署，但建议先解决警告项。"
    exit 0
else
    echo -e "${RED}✗ 检查失败，发现 $errors 个错误和 $warnings 个警告${NC}"
    echo ""
    echo "请先解决错误项后再运行部署。"
    exit 1
fi
