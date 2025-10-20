#!/bin/bash

# Full test suite for FocusBond project
# Usage: ./scripts/test-full.sh

set -e

echo "🧪 Running full FocusBond test suite..."

# Test contracts
echo "📝 Testing Solidity contracts..."
forge test --match-contract FocusBondTest -v

# Build SDK
echo "🔧 Building SDK-EVM..."
pnpm --filter @focusbond/sdk-evm build

# Type check frontend
echo "🔍 Type checking frontend..."
pnpm --filter web-evm type-check

# Build frontend
echo "🏗️  Building frontend..."
pnpm --filter web-evm build

echo "✅ All tests passed!"
echo ""
echo "📊 Test Summary:"
echo "- ✅ Solidity contracts: All tests passing"
echo "- ✅ SDK-EVM: Built successfully"
echo "- ✅ Frontend: Type check and build successful"
echo ""
echo "🚀 Ready for deployment!"
