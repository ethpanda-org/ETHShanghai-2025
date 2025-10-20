#!/bin/bash

# Load environment variables
source .env

# Start Anvil fork of Ethereum mainnet
echo "Starting Anvil fork of Ethereum mainnet..."
echo "RPC URL: $MAINNET_RPC_URL"
echo "Fork will be available at: http://127.0.0.1:8545"
echo "Chain ID: 31337"
echo ""

anvil \
  --fork-url "$MAINNET_RPC_URL" \
  --chain-id 31337 \
  --host 127.0.0.1 \
  --port 8545 \
  --accounts 10 \
  --balance 10000 \
  --gas-limit 30000000 \
  --code-size-limit 50000 \
  --gas-price 0
