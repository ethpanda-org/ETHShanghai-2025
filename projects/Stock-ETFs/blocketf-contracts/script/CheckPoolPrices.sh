#!/bin/bash

# Script to check V3 pool prices vs oracle prices
# Usage: bash script/CheckPoolPrices.sh

# Load environment
source .env

# Addresses (from deployed-contracts.json)
WBNB="0xfadc475b03e3bd7813a71446369204271a0a9843"
BTCB="0x15ab97353bfb6c6f07b3354a2ea1615eb2f45941"
ETH="0x1cd44ec6cfb99132531793a397220c84216c5eed"
ADA="0xbe1bf5c613c64b2a5f2ded08b4a26dd2082fa2cb"
BCH="0x1ab580a59da516f068f43efcac10cc33862a7e88"
USDT="0xe364204ad025bbcdff6dcb4291f89f532b0a8c35"

ORACLE="0x33bfb48f9f7203259247f6a12265fcb8571e1951"
FACTORY="0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865"
SWAP_ROUTER="0x1b81D678ffb9C0263b24A97847620C99d213eB14"

echo "============================================================"
echo "Pool Prices vs Oracle Prices"
echo "============================================================"
echo ""

# Function to get oracle price (remove formatting)
get_oracle_price() {
    local token=$1
    cast call $ORACLE "getPrice(address)(uint256)" $token --rpc-url bnb_testnet 2>/dev/null | head -1 | awk '{print $1}'
}

# Function to calculate deviation
calculate_deviation() {
    python3 - <<EOF
oracle = $1
pool = $2
if oracle > 0:
    dev = abs(pool - oracle) / oracle * 100
    print(f"{dev:.2f}%")
else:
    print("N/A")
EOF
}

# Check WBNB
echo "WBNB/USDT (0.05% fee):"
echo "--------------------------"
WBNB_ORACLE=$(get_oracle_price $WBNB)
WBNB_POOL=$(cast call $FACTORY "getPool(address,address,uint24)(address)" $WBNB $USDT 500 --rpc-url bnb_testnet)
echo "  Pool address: $WBNB_POOL"
echo "  Oracle price: \$$(python3 -c "print($WBNB_ORACLE / 1e18)")"
echo "  Suggested sync: Use Router to swap USDT <-> WBNB to adjust price"
echo ""

# Check BTCB
echo "BTCB/USDT (0.25% fee):"
echo "--------------------------"
BTCB_ORACLE=$(get_oracle_price $BTCB)
BTCB_POOL=$(cast call $FACTORY "getPool(address,address,uint24)(address)" $BTCB $USDT 2500 --rpc-url bnb_testnet)
echo "  Pool address: $BTCB_POOL"
echo "  Oracle price: \$$(python3 -c "print($BTCB_ORACLE / 1e18)")"
echo ""

# Check ETH
echo "ETH/USDT (0.25% fee):"
echo "--------------------------"
ETH_ORACLE=$(get_oracle_price $ETH)
ETH_POOL=$(cast call $FACTORY "getPool(address,address,uint24)(address)" $ETH $USDT 2500 --rpc-url bnb_testnet)
echo "  Pool address: $ETH_POOL"
echo "  Oracle price: \$$(python3 -c "print($ETH_ORACLE / 1e18)")"
echo ""

# Check ADA
echo "ADA/USDT (0.05% fee):"
echo "--------------------------"
ADA_ORACLE=$(get_oracle_price $ADA)
ADA_POOL=$(cast call $FACTORY "getPool(address,address,uint24)(address)" $ADA $USDT 500 --rpc-url bnb_testnet)
echo "  Pool address: $ADA_POOL"
echo "  Oracle price: \$$(python3 -c "print($ADA_ORACLE / 1e18)")"
echo ""

# Check BCH
echo "BCH/USDT (0.05% fee):"
echo "--------------------------"
BCH_ORACLE=$(get_oracle_price $BCH)
BCH_POOL=$(cast call $FACTORY "getPool(address,address,uint24)(address)" $BCH $USDT 500 --rpc-url bnb_testnet)
echo "  Pool address: $BCH_POOL"
echo "  Oracle price: \$$(python3 -c "print($BCH_ORACLE / 1e18)")"
echo ""

echo "============================================================"
echo "Manual Sync Instructions:"
echo "============================================================"
echo ""
echo "To sync a pool price, execute a swap transaction:"
echo ""
echo "If pool price > oracle price: SELL the asset"
echo "  cast send $SWAP_ROUTER 'exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))' \\"
echo "    '(<TOKEN>,<USDT>,<FEE>,<YOUR_ADDRESS>,<DEADLINE>,<AMOUNT_IN>,0,0)' \\"
echo "    --rpc-url bnb_testnet --private-key \$PRIVATE_KEY"
echo ""
echo "If pool price < oracle price: BUY the asset"
echo "  cast send $SWAP_ROUTER 'exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))' \\"
echo "    '(<USDT>,<TOKEN>,<FEE>,<YOUR_ADDRESS>,<DEADLINE>,<AMOUNT_IN>,0,0)' \\"
echo "    --rpc-url bnb_testnet --private-key \$PRIVATE_KEY"
echo ""
echo "Recommended swap amounts:"
echo "  - Start with 1000 USDT worth"
echo "  - Check price after swap"
echo "  - Repeat if deviation still > 1%"
