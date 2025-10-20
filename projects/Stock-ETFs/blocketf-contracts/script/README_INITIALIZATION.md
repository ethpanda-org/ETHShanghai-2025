# ETF Initialization Scripts

This directory contains scripts for initializing your BlockETF with initial liquidity.

## Overview

After deploying the BlockETF contracts (BlockETFCore, PriceOracle, Rebalancer, Router), you need to initialize the ETF with initial assets. This process:

1. Transfers tokens from your wallet to the ETF
2. Sets up the asset allocation (weights)
3. Mints initial ETF shares
4. Establishes the initial share price (~$1)

## Files

### 1. InitializeETF.s.sol
Main Solidity script for ETF initialization.

**Features:**
- Verifies token balances before initialization
- Calculates required token amounts based on prices
- Approves tokens for ETF Core
- Initializes the ETF
- Verifies successful initialization

**Usage:**
```bash
forge script script/InitializeETF.s.sol:InitializeETF \
    --rpc-url $RPC_URL \
    --broadcast \
    --private-key $PRIVATE_KEY \
    -vvv
```

### 2. QuickInitializeETF.sh
Bash script for easy initialization with pre-flight checks.

**Features:**
- ✅ Validates environment configuration
- ✅ Checks if ETF is already initialized
- ✅ Verifies token prices are set in oracle
- ✅ Confirms sufficient token balances
- ✅ Interactive confirmation prompts
- ✅ Clear success/error reporting

**Usage:**
```bash
./script/QuickInitializeETF.sh
```

### 3. INITIALIZATION_GUIDE.md
Comprehensive guide covering:
- Prerequisites and requirements
- Three initialization methods (Quick Script, Forge Script, Direct Call)
- Post-initialization configuration
- Troubleshooting common issues
- Testing procedures

## Quick Start

### Prerequisites

Before initializing, ensure you have:

1. **Deployed Contracts:**
   - BlockETFCore ✓
   - PriceOracle ✓

2. **Token Addresses:**
   - WBNB (0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd)
   - BTCB (deployed mock or testnet)
   - ETH (deployed mock or testnet)
   - USDT (deployed mock or testnet)

3. **Prices Set in Oracle:**
   Run `SyncPoolPrices.s.sol` to sync prices from PancakeSwap

4. **Token Balances:**
   You need sufficient tokens based on:
   - Target ETF value: $10,000
   - Weights: WBNB 40%, BTCB 30%, ETH 20%, USDT 10%

### Step 1: Configure Environment

Update your `.env` file:

```bash
# Required for initialization
PRIVATE_KEY=your_private_key
RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/

# Deployed contracts
ETF_CORE_ADDRESS=0x862ade3291ca93ed9cac581a96a03b9f82aaf84f
PRICE_ORACLE_ADDRESS=0xYourOracleAddress

# Token addresses
WBNB_ADDRESS=0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd
BTCB_ADDRESS=0xYourBTCBAddress
ETH_ADDRESS=0xYourETHAddress
USDT_ADDRESS=0xYourUSDTAddress
```

### Step 2: Run Quick Initialization

```bash
cd blocketf-contracts
./script/QuickInitializeETF.sh
```

The script will guide you through the process with safety checks.

### Step 3: Verify Initialization

```bash
# Check if initialized
cast call $ETF_CORE_ADDRESS "initialized()(bool)" --rpc-url $RPC_URL

# Check your BETF balance
cast call $ETF_CORE_ADDRESS \
    "balanceOf(address)(uint256)" \
    $(cast wallet address $PRIVATE_KEY) \
    --rpc-url $RPC_URL
```

## Token Amount Calculation

The required token amounts depend on current prices:

```
Required Amount = (Target Value × Weight%) / Token Price
```

**Example with $10,000 target:**

Assuming prices:
- WBNB = $600
- BTCB = $95,000
- ETH = $3,500
- USDT = $1

Required tokens:
- WBNB: ($10,000 × 40%) / $600 = **6.67 WBNB**
- BTCB: ($10,000 × 30%) / $95,000 = **0.0316 BTCB**
- ETH: ($10,000 × 20%) / $3,500 = **0.571 ETH**
- USDT: ($10,000 × 10%) / $1 = **1,000 USDT**

The script automatically calculates these amounts based on oracle prices.

## Configuration Parameters

### Default Asset Allocation

From `DeployConfig.sol`:

```solidity
WEIGHT_WBNB = 4000;  // 40%
WEIGHT_BTCB = 3000;  // 30%
WEIGHT_ETH = 2000;   // 20%
WEIGHT_USDT = 1000;  // 10%
```

### Target Value

```solidity
TARGET_TOTAL_VALUE_USD = 10_000e18; // $10,000 USD
```

This means:
- Initial supply ≈ 10,000 BETF tokens
- Initial share price ≈ $1.00
- After minimum liquidity lock: 9,999 BETF minted to you

## Post-Initialization

After initializing, you should:

### 1. Set Fees
```bash
cast send $ETF_CORE_ADDRESS \
    "setFees(uint32,uint256)" \
    30 200 \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY
```

### 2. Set Rebalancer
```bash
cast send $ETF_CORE_ADDRESS \
    "setRebalancer(address)" \
    $REBALANCER_ADDRESS \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY
```

### 3. Configure Rebalance Parameters
```bash
cast send $ETF_CORE_ADDRESS \
    "setRebalanceThreshold(uint256)" \
    500 \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY
```

## Common Issues

### "ETF is already initialized"

The ETF can only be initialized once. To start over, deploy a new ETF Core contract.

### "Price not set for token"

Token prices must be set in PriceOracle first:

```bash
forge script script/SyncPoolPrices.s.sol --rpc-url bnb_testnet --broadcast
```

### "Insufficient balance"

You need more tokens. Options:
1. Get testnet tokens from faucets
2. Swap on PancakeSwap testnet
3. Deploy mock tokens with mint function

### "Transfer amount mismatch"

Your tokens may have transfer fees. The ETF allows up to 5% loss. For higher fees, consider using different tokens or adjusting the contract.

## Testing

After initialization, test core functionality:

### Check ETF State
```bash
# Total supply
cast call $ETF_CORE_ADDRESS "totalSupply()(uint256)" --rpc-url $RPC_URL

# Total value
cast call $ETF_CORE_ADDRESS "getTotalValue()(uint256)" --rpc-url $RPC_URL

# Share value (should be ~1e18 = $1)
cast call $ETF_CORE_ADDRESS "getShareValue()(uint256)" --rpc-url $RPC_URL
```

### Test Minting
```bash
# Use ETFRouterV1 to mint more shares
forge script script/TestMinting.s.sol --rpc-url bnb_testnet --broadcast
```

### Test Burning
```bash
# Burn shares to get underlying assets back
forge script script/TestBurning.s.sol --rpc-url bnb_testnet --broadcast
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Private Keys:** Never commit `.env` with real private keys
2. **Testnet Only:** This is for testnet deployment
3. **Audit Required:** Get professional audit before mainnet
4. **Price Oracle Security:** Ensure reliable price feeds
5. **Access Control:** Be careful with owner/rebalancer roles

## Related Scripts

Other useful scripts in this directory:

- **DeployETFContracts.s.sol** - Deploy all ETF contracts
- **SyncPoolPrices.s.sol** - Sync token prices from PancakeSwap
- **SetupLiquidity.s.sol** - Add liquidity to PancakeSwap pools
- **VerifyDeployment.s.sol** - Verify all deployments

## Support

For detailed information:
- See [INITIALIZATION_GUIDE.md](../INITIALIZATION_GUIDE.md)
- Review contract documentation in [../src/](../src/)
- Check [README.md](../README.md) for project overview

## Example Workflow

Complete initialization workflow:

```bash
# 1. Deploy contracts (if not done)
forge script script/DeployETFContracts.s.sol --rpc-url bnb_testnet --broadcast

# 2. Sync prices from PancakeSwap
forge script script/SyncPoolPrices.s.sol --rpc-url bnb_testnet --broadcast

# 3. Initialize ETF (this script)
./script/QuickInitializeETF.sh

# 4. Set fees
cast send $ETF_CORE_ADDRESS "setFees(uint32,uint256)" 30 200 \
    --rpc-url $RPC_URL --private-key $PRIVATE_KEY

# 5. Set rebalancer
cast send $ETF_CORE_ADDRESS "setRebalancer(address)" $REBALANCER_ADDRESS \
    --rpc-url $RPC_URL --private-key $PRIVATE_KEY

# 6. Test minting
forge script script/TestMinting.s.sol --rpc-url bnb_testnet --broadcast

# 7. Verify everything works
forge script script/VerifyDeployment.s.sol --rpc-url bnb_testnet
```

## License

MIT License - See [LICENSE](../LICENSE) for details.
