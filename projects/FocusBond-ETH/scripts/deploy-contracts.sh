#!/bin/bash

# Deploy FocusBond contracts to Base Sepolia
# Usage: ./scripts/deploy-contracts.sh

set -e

echo "🚀 Deploying FocusBond contracts to Base Sepolia..."

# Check if required environment variables are set
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY environment variable is not set"
    echo "Please set your private key: export PRIVATE_KEY=0x..."
    exit 1
fi

# Set default RPC URL if not provided
if [ -z "$BASE_SEPOLIA_RPC_URL" ]; then
    BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
    echo "ℹ️  Using default Base Sepolia RPC: $BASE_SEPOLIA_RPC_URL"
fi

# Deploy contracts
echo "📝 Compiling contracts..."
forge build

echo "🔍 Running tests..."
forge test --match-contract FocusBondTest

echo "🚀 Deploying to Base Sepolia..."
forge script script/Deploy.s.sol \
    --rpc-url $BASE_SEPOLIA_RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify \
    --etherscan-api-key $BASESCAN_API_KEY \
    -vvvv

echo "✅ Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Update environment variables with deployed contract addresses"
echo "2. Configure frontend with new contract addresses"
echo "3. Test the deployment with the frontend"
echo ""
echo "🔗 View on BaseScan: https://sepolia.basescan.org/"
