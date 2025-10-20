#!/bin/bash

# Quick Initialize ETF Script
# This script reads all addresses from deployed-contracts.json
# Only PRIVATE_KEY is needed in .env
#
# Usage:
#   ./script/QuickInitializeETF.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}BlockETF - Quick ETF Initialization${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo -e "${YELLOW}Please create a .env file with:${NC}"
    echo "  PRIVATE_KEY=<your_private_key>"
    echo "  RPC_URL=<rpc_url> (optional, defaults to BNB testnet)"
    exit 1
fi

# Load environment variables
source .env

# Check for PRIVATE_KEY
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}Error: PRIVATE_KEY is not set in .env file${NC}"
    exit 1
fi

# Set default RPC_URL if not provided
if [ -z "$RPC_URL" ]; then
    RPC_URL="https://data-seed-prebsc-1-s1.binance.org:8545/"
    echo -e "${YELLOW}No RPC_URL set, using default: $RPC_URL${NC}\n"
fi

# Check if deployed-contracts.json exists
if [ ! -f deployed-contracts.json ]; then
    echo -e "${RED}Error: deployed-contracts.json not found!${NC}"
    echo -e "${YELLOW}Please ensure the contract addresses are in deployed-contracts.json${NC}"
    exit 1
fi

echo -e "${YELLOW}1. Loading Addresses from deployed-contracts.json...${NC}"

# Extract addresses from JSON using jq
ETF_CORE_ADDRESS=$(jq -r '.contracts.etfCore.contractAddress' deployed-contracts.json)
PRICE_ORACLE_ADDRESS=$(jq -r '.contracts.priceOracle.contractAddress' deployed-contracts.json)
WBNB_ADDRESS=$(jq -r '.contracts.mockTokens[0].contractAddress' deployed-contracts.json)
BTCB_ADDRESS=$(jq -r '.contracts.mockTokens[1].contractAddress' deployed-contracts.json)
ETH_ADDRESS=$(jq -r '.contracts.mockTokens[2].contractAddress' deployed-contracts.json)
ADA_ADDRESS=$(jq -r '.contracts.mockTokens[3].contractAddress' deployed-contracts.json)
BCH_ADDRESS=$(jq -r '.contracts.mockTokens[4].contractAddress' deployed-contracts.json)

# Verify all addresses were loaded
if [ "$ETF_CORE_ADDRESS" == "null" ] || [ -z "$ETF_CORE_ADDRESS" ]; then
    echo -e "${RED}Error: ETF Core address not found in JSON${NC}"
    exit 1
fi

if [ "$PRICE_ORACLE_ADDRESS" == "null" ] || [ -z "$PRICE_ORACLE_ADDRESS" ]; then
    echo -e "${RED}Error: Price Oracle address not found in JSON${NC}"
    exit 1
fi

echo -e "  ${GREEN}✓${NC} ETF Core: $ETF_CORE_ADDRESS"
echo -e "  ${GREEN}✓${NC} Price Oracle: $PRICE_ORACLE_ADDRESS"
echo -e "  ${GREEN}✓${NC} WBNB: $WBNB_ADDRESS"
echo -e "  ${GREEN}✓${NC} BTCB: $BTCB_ADDRESS"
echo -e "  ${GREEN}✓${NC} ETH: $ETH_ADDRESS"
echo -e "  ${GREEN}✓${NC} ADA: $ADA_ADDRESS"
echo -e "  ${GREEN}✓${NC} BCH: $BCH_ADDRESS"

echo -e "\n${YELLOW}2. Checking ETF Status...${NC}"

# Check if ETF is already initialized
initialized=$(cast call $ETF_CORE_ADDRESS "initialized()(bool)" --rpc-url $RPC_URL 2>/dev/null || echo "error")

if [ "$initialized" == "error" ]; then
    echo -e "${RED}Error: Cannot connect to ETF Core contract${NC}"
    echo -e "${YELLOW}Please check your RPC_URL and ETF_CORE_ADDRESS${NC}"
    exit 1
fi

if [ "$initialized" == "true" ]; then
    echo -e "${RED}Error: ETF is already initialized!${NC}"
    echo -e "${YELLOW}If you want to re-initialize, you need to deploy a new ETF Core contract.${NC}"
    exit 1
fi

echo -e "  ${GREEN}✓${NC} ETF is not initialized yet"

echo -e "\n${YELLOW}3. Checking Token Prices in Oracle...${NC}"

tokens=($WBNB_ADDRESS $BTCB_ADDRESS $ETH_ADDRESS $ADA_ADDRESS $BCH_ADDRESS)
token_names=("WBNB" "BTCB" "ETH" "ADA" "BCH")

all_prices_set=true

for i in "${!tokens[@]}"; do
    price=$(cast call $PRICE_ORACLE_ADDRESS "getPrice(address)(uint256)" ${tokens[$i]} --rpc-url $RPC_URL 2>/dev/null || echo "0")

    if [ "$price" == "0" ]; then
        echo -e "  ${RED}✗${NC} ${token_names[$i]}: Price not set!"
        all_prices_set=false
    else
        # Convert price from wei to readable format
        price_decimal=$(echo "scale=2; $price / 10^18" | bc 2>/dev/null || echo "N/A")
        echo -e "  ${GREEN}✓${NC} ${token_names[$i]}: \$$price_decimal"
    fi
done

if [ "$all_prices_set" = false ]; then
    echo -e "\n${RED}Error: Some token prices are not set in the oracle!${NC}"
    echo -e "${YELLOW}Please set prices using the SyncPoolPrices.s.sol script first:${NC}"
    echo -e "  forge script script/SyncPoolPrices.s.sol --rpc-url bnb_testnet --broadcast"
    exit 1
fi

echo -e "\n${YELLOW}4. Checking Token Balances...${NC}"

deployer_address=$(cast wallet address $PRIVATE_KEY)
all_balances_sufficient=true

for i in "${!tokens[@]}"; do
    balance=$(cast call ${tokens[$i]} "balanceOf(address)(uint256)" $deployer_address --rpc-url $RPC_URL 2>/dev/null || echo "0")

    if [ "$balance" == "0" ]; then
        echo -e "  ${RED}✗${NC} ${token_names[$i]}: No balance!"
        all_balances_sufficient=false
    else
        # Convert balance from wei to readable format
        balance_decimal=$(echo "scale=4; $balance / 10^18" | bc 2>/dev/null || echo "N/A")
        echo -e "  ${GREEN}✓${NC} ${token_names[$i]}: $balance_decimal"
    fi
done

if [ "$all_balances_sufficient" = false ]; then
    echo -e "\n${RED}Warning: You don't have sufficient token balances!${NC}"
    echo -e "${YELLOW}You may need to acquire tokens before initializing the ETF.${NC}"

    read -p "Do you want to continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "\n${YELLOW}5. Ready to Initialize ETF${NC}"
echo -e "  Target Total Value: ${GREEN}\$100 USD${NC}"
echo -e "  Assets (Top 5 Crypto - Equal Weight):"
echo -e "    - WBNB: 20%"
echo -e "    - BTCB: 20%"
echo -e "    - ETH: 20%"
echo -e "    - ADA: 20%"
echo -e "    - BCH: 20%"
echo ""

read -p "Do you want to proceed with initialization? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Initialization cancelled.${NC}"
    exit 0
fi

echo -e "\n${YELLOW}6. Running Initialization Script...${NC}\n"

# Run the forge script
forge script script/InitializeETF.s.sol:InitializeETF \
    --rpc-url $RPC_URL \
    --broadcast \
    --private-key $PRIVATE_KEY \
    -vvv

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}ETF Initialized Successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"

    # Get ETF details
    echo -e "\n${BLUE}ETF Details:${NC}"

    total_supply=$(cast call $ETF_CORE_ADDRESS "totalSupply()(uint256)" --rpc-url $RPC_URL 2>/dev/null || echo "0")
    total_value=$(cast call $ETF_CORE_ADDRESS "getTotalValue()(uint256)" --rpc-url $RPC_URL 2>/dev/null || echo "0")

    if [ "$total_supply" != "0" ] && [ "$total_value" != "0" ]; then
        total_supply_decimal=$(echo "scale=2; $total_supply / 10^18" | bc 2>/dev/null || echo "N/A")
        total_value_decimal=$(echo "scale=2; $total_value / 10^18" | bc 2>/dev/null || echo "N/A")

        echo -e "  Total Supply: ${GREEN}$total_supply_decimal BETF${NC}"
        echo -e "  Total Value: ${GREEN}\$$total_value_decimal${NC}"
    fi

    echo -e "\n${BLUE}Next Steps:${NC}"
    echo -e "  1. Configure ETF fees: ${YELLOW}etfCore.setFees(...)${NC}"
    echo -e "  2. Set rebalancer: ${YELLOW}etfCore.setRebalancer(...)${NC}"
    echo -e "  3. Test minting: ${YELLOW}Use ETFRouterV1 to mint shares${NC}"
    echo -e "  4. Monitor performance: ${YELLOW}Check share value regularly${NC}"
else
    echo -e "\n${RED}========================================${NC}"
    echo -e "${RED}ETF Initialization Failed!${NC}"
    echo -e "${RED}========================================${NC}"
    echo -e "${YELLOW}Please check the error messages above.${NC}"
    exit 1
fi
