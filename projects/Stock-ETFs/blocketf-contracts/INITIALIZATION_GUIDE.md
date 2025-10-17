# ETF Initialization Guide

This guide will walk you through initializing your first BlockETF on BNB Testnet.

## Prerequisites

Before initializing the ETF, ensure you have:

1. ✅ Deployed the following contracts:
   - BlockETFCore
   - PriceOracle
   - ETFRebalancerV1 (optional for initialization)
   - ETFRouterV1 (optional for initialization)

2. ✅ Deployed or have access to the following tokens:
   - WBNB (0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd on BNB Testnet)
   - BTCB (mock or testnet token)
   - ETH (mock or testnet token)
   - USDT (mock or testnet token)

3. ✅ Set token prices in PriceOracle
   - Use `SyncPoolPrices.s.sol` script to sync prices from PancakeSwap pools

4. ✅ Have sufficient token balances in your deployer wallet

## Method 1: Quick Initialization (Recommended)

The easiest way to initialize your ETF is using the provided bash script.

### Step 1: Configure Environment Variables

Create or update your `.env` file with the following variables:

```bash
# Network Configuration
RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/

# Private Key (keep this secure!)
PRIVATE_KEY=your_private_key_here

# Contract Addresses (from deployment)
ETF_CORE_ADDRESS=0x862ade3291ca93ed9cac581a96a03b9f82aaf84f
PRICE_ORACLE_ADDRESS=0xYourPriceOracleAddress

# Token Addresses
WBNB_ADDRESS=0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd
BTCB_ADDRESS=0xYourBTCBAddress
ETH_ADDRESS=0xYourETHAddress
USDT_ADDRESS=0xYourUSDTAddress
```

### Step 2: Run the Quick Initialization Script

```bash
cd blocketf-contracts
./script/QuickInitializeETF.sh
```

The script will:
1. ✅ Check all required configuration
2. ✅ Verify ETF is not already initialized
3. ✅ Check token prices are set in oracle
4. ✅ Verify token balances
5. ✅ Initialize the ETF with $10,000 target value
6. ✅ Show initialization results

### Expected Output

```
========================================
BlockETF - Quick ETF Initialization
========================================

1. Checking Configuration...
  ✓ PRIVATE_KEY: 0x...
  ✓ ETF_CORE_ADDRESS: 0x862ade3291ca93ed9cac581a96a03b9f82aaf84f
  ✓ PRICE_ORACLE_ADDRESS: 0x...
  ...

2. Checking ETF Status...
  ✓ ETF is not initialized yet

3. Checking Token Prices in Oracle...
  ✓ WBNB: $600.00
  ✓ BTCB: $95000.00
  ✓ ETH: $3500.00
  ✓ USDT: $1.00

4. Checking Token Balances...
  ✓ WBNB: 100.0000
  ✓ BTCB: 1.0000
  ✓ ETH: 5.0000
  ✓ USDT: 10000.0000

5. Ready to Initialize ETF
  Target Total Value: $10,000 USD
  Assets:
    - WBNB: 40%
    - BTCB: 30%
    - ETH: 20%
    - USDT: 10%

Do you want to proceed with initialization? (y/n) y

6. Running Initialization Script...
[Transaction output...]

========================================
ETF Initialized Successfully!
========================================

ETF Details:
  Total Supply: 9999.00 BETF
  Total Value: $10000.00

Next Steps:
  1. Configure ETF fees: etfCore.setFees(...)
  2. Set rebalancer: etfCore.setRebalancer(...)
  3. Test minting: Use ETFRouterV1 to mint shares
  4. Monitor performance: Check share value regularly
```

## Method 2: Manual Initialization with Forge Script

If you prefer more control, you can use the Forge script directly.

### Step 1: Set Environment Variables

Same as Method 1.

### Step 2: Run Forge Script

```bash
forge script script/InitializeETF.s.sol:InitializeETF \
    --rpc-url $RPC_URL \
    --broadcast \
    --private-key $PRIVATE_KEY \
    -vvv
```

## Method 3: Direct Contract Interaction

You can also initialize the ETF by directly calling the contract.

### Step 1: Approve Tokens

For each token (WBNB, BTCB, ETH, USDT), approve the ETF Core contract:

```bash
# Calculate required amounts based on prices and weights
# For example, if WBNB is $600 and weight is 40%:
# Required = ($10,000 * 40%) / $600 = 6.667 WBNB

cast send $WBNB_ADDRESS \
    "approve(address,uint256)" \
    $ETF_CORE_ADDRESS \
    "10000000000000000000" \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY
```

Repeat for all tokens.

### Step 2: Call Initialize Function

```bash
cast send $ETF_CORE_ADDRESS \
    "initialize(address[],uint32[],uint256)" \
    "[$WBNB_ADDRESS,$BTCB_ADDRESS,$ETH_ADDRESS,$USDT_ADDRESS]" \
    "[4000,3000,2000,1000]" \
    "10000000000000000000000" \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY
```

## Initial Configuration

The ETF is initialized with the following default configuration:

### Asset Allocation
- **WBNB**: 40% (4000 bps)
- **BTCB**: 30% (3000 bps)
- **ETH**: 20% (2000 bps)
- **USDT**: 10% (1000 bps)

### Target Value
- **Initial Total Value**: $10,000 USD
- **Initial Supply**: ~10,000 BETF tokens
- **Target Share Price**: ~$1.00 per BETF

### Required Token Amounts

The exact amounts needed depend on current token prices. The script calculates:

```
Required Amount = (Target Value * Weight%) / Token Price
```

Example with sample prices:
- WBNB @ $600: Need 6.67 WBNB ($4,000 / $600)
- BTCB @ $95,000: Need 0.0316 BTCB ($3,000 / $95,000)
- ETH @ $3,500: Need 0.571 ETH ($2,000 / $3,500)
- USDT @ $1: Need 1,000 USDT ($1,000 / $1)

## Post-Initialization Steps

After successfully initializing the ETF, you should:

### 1. Configure Fees

```bash
# Set withdraw fee (30 bps = 0.3%) and management fee (200 bps = 2% annual)
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
# Set rebalance threshold (500 bps = 5%)
cast send $ETF_CORE_ADDRESS \
    "setRebalanceThreshold(uint256)" \
    500 \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY

# Set minimum rebalance cooldown (1 hour)
cast send $ETF_CORE_ADDRESS \
    "setMinRebalanceCooldown(uint256)" \
    3600 \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY
```

### 4. Verify Initialization

```bash
# Check if initialized
cast call $ETF_CORE_ADDRESS "initialized()(bool)" --rpc-url $RPC_URL

# Check total supply
cast call $ETF_CORE_ADDRESS "totalSupply()(uint256)" --rpc-url $RPC_URL

# Check total value
cast call $ETF_CORE_ADDRESS "getTotalValue()(uint256)" --rpc-url $RPC_URL

# Check share value (should be ~1e18 = $1)
cast call $ETF_CORE_ADDRESS "getShareValue()(uint256)" --rpc-url $RPC_URL

# Check your BETF balance
cast call $ETF_CORE_ADDRESS \
    "balanceOf(address)(uint256)" \
    $(cast wallet address $PRIVATE_KEY) \
    --rpc-url $RPC_URL
```

## Troubleshooting

### Error: "ETF is already initialized"

The ETF can only be initialized once. If you need to start over, you must deploy a new ETF Core contract.

### Error: "Price not set for token"

Some token prices are not set in the PriceOracle. Run the price sync script:

```bash
forge script script/SyncPoolPrices.s.sol --rpc-url bnb_testnet --broadcast
```

### Error: "Insufficient balance"

You don't have enough tokens. You can:
1. Get testnet tokens from faucets
2. Swap for tokens on PancakeSwap testnet
3. Deploy mock tokens with sufficient balance

### Error: "Transfer amount mismatch"

This can occur if tokens have transfer fees. The ETF allows up to 5% transfer loss. If your token has higher fees, you may need to adjust the ETF contract.

### Transaction Fails Without Error

Check:
1. Gas limit is sufficient
2. Wallet has enough BNB for gas
3. Token approvals are correct
4. RPC URL is responding

## Testing After Initialization

### Test Minting (via Router)

```bash
forge script script/TestMinting.s.sol --rpc-url bnb_testnet --broadcast
```

### Test Burning

```bash
forge script script/TestBurning.s.sol --rpc-url bnb_testnet --broadcast
```

### Test Rebalancing

```bash
# First adjust weights if needed
forge script script/AdjustWeights.s.sol --rpc-url bnb_testnet --broadcast

# Then execute rebalance
forge script script/ExecuteRebalance.s.sol --rpc-url bnb_testnet --broadcast
```

## Security Considerations

1. **Private Key**: Never commit your private key to version control
2. **Testnet Only**: This guide is for testnet deployment only
3. **Audit**: Get a professional audit before mainnet deployment
4. **Access Control**: Be careful who has owner and rebalancer roles
5. **Price Oracle**: Ensure price feeds are reliable and manipulation-resistant

## Additional Resources

- [BlockETF Documentation](../README.md)
- [PancakeSwap Testnet](https://testnet.pancakeswap.finance/)
- [BNB Testnet Faucet](https://testnet.bnbchain.org/faucet-smart)
- [BscScan Testnet](https://testnet.bscscan.com/)

## Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review transaction logs with `-vvvv` flag
3. Verify all contract addresses are correct
4. Ensure you're on the correct network (Chain ID 97)
