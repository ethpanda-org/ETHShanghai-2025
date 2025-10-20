#!/usr/bin/env bash
# Pool State Checker
# 用途：检查链上当前的池子承诺和本地缓存状态

set -euo pipefail

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT_DIR"

# 读取配置
if [ -f "client/.env.local" ]; then
    source client/.env.local
elif [ -f "client/.env" ]; then
    source client/.env
else
    echo -e "${RED}❌ No .env file found${NC}"
    exit 1
fi

RPC_URL=${VITE_PUBLIC_RPC_URL:-http://127.0.0.1:8545}
VAULT_ADDRESS=${VITE_VAULT_CONTRACT_ADDRESS}

if [ -z "$VAULT_ADDRESS" ]; then
    echo -e "${RED}❌ VITE_VAULT_CONTRACT_ADDRESS not set${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Checking Pool State${NC}\n"
echo "RPC URL:       $RPC_URL"
echo "Vault Address: $VAULT_ADDRESS"
echo ""

# 检查 RPC 是否可用
if ! curl -s -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    "$RPC_URL" > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to RPC at $RPC_URL${NC}"
    echo "   Make sure Anvil is running: make anvil"
    exit 1
fi

echo -e "${GREEN}✅ RPC connection OK${NC}\n"

# 查询链上的 currentCommitment
# Function selector: currentCommitment() = 0x3c6b16ab
echo -e "${BLUE}📡 Querying on-chain commitment...${NC}"

COMMITMENT_HEX=$(curl -s -X POST -H "Content-Type: application/json" \
    --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_call\",\"params\":[{\"to\":\"$VAULT_ADDRESS\",\"data\":\"0x3c6b16ab\"},\"latest\"],\"id\":1}" \
    "$RPC_URL" | jq -r '.result')

if [ -z "$COMMITMENT_HEX" ] || [ "$COMMITMENT_HEX" = "null" ]; then
    echo -e "${RED}❌ Failed to query commitment${NC}"
    exit 1
fi

echo -e "${GREEN}Current Commitment:${NC}"
echo "  $COMMITMENT_HEX"
echo ""

# 查询链上的 currentRoot (Merkle root)
echo -e "${BLUE}📡 Querying Merkle root...${NC}"

ROOT_HEX=$(curl -s -X POST -H "Content-Type: application/json" \
    --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_call\",\"params\":[{\"to\":\"$VAULT_ADDRESS\",\"data\":\"0xb58f37b1\"},\"latest\"],\"id\":1}" \
    "$RPC_URL" | jq -r '.result')

echo -e "${GREEN}Merkle Root:${NC}"
echo "  $ROOT_HEX"
echo ""

# 检查本地缓存
echo -e "${BLUE}💾 Checking local cache (localStorage)...${NC}"

CACHE_KEY="luminal.pool-state-cache.v1"

if command -v node &> /dev/null; then
    # 尝试读取 localStorage（需要浏览器环境，这里只是示例）
    echo -e "${YELLOW}ℹ️  To check localStorage, open browser DevTools:${NC}"
    echo ""
    echo "  1. Open http://localhost:5173"
    echo "  2. Press F12 (DevTools)"
    echo "  3. Go to Application → Local Storage"
    echo "  4. Look for key: $CACHE_KEY"
    echo ""
    echo "  Or run in Console:"
    echo "    JSON.parse(localStorage.getItem('$CACHE_KEY'))"
    echo ""
else
    echo -e "${YELLOW}⚠️  Node.js not found, skipping cache check${NC}"
fi

# 尝试反推状态（使用 compute-commitment.js）
echo -e "${BLUE}🔐 Attempting to decode commitment...${NC}"
echo ""

if [ -f "scripts/compute-commitment.js" ] && [ -d "client/node_modules" ]; then
    cd client
    node ../scripts/compute-commitment.js --check "$COMMITMENT_HEX"
    cd ..
else
    echo -e "${YELLOW}⚠️  compute-commitment.js not available${NC}"
    echo "   Run: npm install in client/ directory"
fi

# 显示摘要
echo -e "${BLUE}📊 Summary${NC}\n"

echo -e "${GREEN}On-chain State:${NC}"
echo "  Commitment: $COMMITMENT_HEX"
echo "  Merkle Root: $ROOT_HEX"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo "  - If pool state shows in UI: cache is working ✅"
echo "  - If 'Unable to decrypt': clear cache and refresh"
echo "  - If button disabled: check wallet connection"
echo ""

echo -e "${BLUE}Useful Commands:${NC}"
echo "  # Clear browser cache"
echo "    localStorage.clear()"
echo ""
echo "  # Manually cache state (in browser console)"
echo "    import { cachePoolState } from './lib/state'"
echo "    cachePoolState(commitment, { reserve0, reserve1, nonce, feeBps })"
echo ""
