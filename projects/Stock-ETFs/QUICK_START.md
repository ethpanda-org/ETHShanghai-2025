# BlockETF Quick Start Guide

## 📍 Contract Addresses (BSC Testnet)

### Core Contracts
```
BlockETFCore:    0xa63E59DEf7Ab22C17030467E75829C7F90f44d0C
ETFRouterV1:     0xa87f31e7c044260d466727607FF3Aed5c8330743 (v2 - bug fix)
PriceOracle:     0xcF5d2d59810128fDE6d332827A0b1B01cb50245b
Rebalancer:      0x797739bA3af7427066CeF9dbBC755e33082bF26E
```

### Tokens
```
USDT:  0xe4e93c531697aeb44904f9579c3cce1034eb4886
WBNB:  0x998367e7de460b309500e06cfdabb0c94adb18de
BTCB:  0xd20268cb7065d20307b0793f702febddf5d24856
ETH:   0xd81e1ac7f2ccdd106701e484f12b842684719bd3
ADA:   0x8dcd14418995d376e40255dabf55ce58d994bfc4
BCH:   0xe9636149f4ebda9e1d368385e39e74021d7bf53f
```

### USDT Faucet
```
0x2bed84630e430f5bf1295b11a66266eae661aad8
```

## 🚀 Quick Commands

### Get Test USDT
```bash
# In frontend or using web3
faucet.claim()
# Get 10,000 USDT per claim
```

### Sync Pool Prices
```bash
cd blocketf-contracts
forge script script/SyncPoolPrices.s.sol --rpc-url bnb_testnet --broadcast
```

### Configure Router (if needed)
```bash
forge script script/ConfigureRouterPools.s.sol --rpc-url bnb_testnet --broadcast
```

### Configure Rebalancer (if needed)
```bash
forge script script/ConfigureRebalancerPools.s.sol --rpc-url bnb_testnet --broadcast
```

## 💻 Frontend Integration

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env.local
# Add your WalletConnect Project ID
```

### 3. Run Development Server
```bash
npm run dev
# Visit http://localhost:3000
```

### 4. Import Addresses in Code
```typescript
import { contractAddresses } from '@/lib/contracts/addresses';

const router = contractAddresses[97].etfRouter;
const usdt = contractAddresses[97].usdt;
```

## 📊 Current Status

✅ All contracts deployed
✅ V3 pools created and configured
✅ Router configured
✅ Rebalancer configured
✅ Prices synced (<2% deviation)
✅ Frontend addresses updated

## 🔗 Links

- **BSCScan Testnet**: https://testnet.bscscan.com
- **PancakeSwap V3**: https://pancakeswap.finance
- **BNB Testnet Faucet**: https://testnet.binance.org/faucet-smart

## 📚 Documentation

- Full deployment summary: `/DEPLOYMENT_SUMMARY.md`
- Contract addresses: `/frontend/CONTRACT_ADDRESSES.md`
- Deployed contracts: `/blocketf-contracts/deployed-contracts.json`

## 🧪 Testing Flow

### 1. Get USDT
- Connect wallet to BSC Testnet
- Call `claim()` on USDT Faucet: `0x2bed84630e430f5bf1295b11a66266eae661aad8`

### 2. Mint ETF Tokens
```solidity
// Approve USDT
usdt.approve(router, amount);

// Mint exact shares
router.mintExactShares(shares, maxUSDT, deadline);

// OR mint with USDT
router.mintWithUSDT(usdtAmount, minShares, deadline);
```

### 3. Burn ETF Tokens
```solidity
// Approve T5 tokens
etfCore.approve(router, shares);

// Burn to USDT
router.burnToUSDT(shares, minUSDT, deadline);
```

## 🔍 Key Features

- **No Slippage Minting**: Exact shares guaranteed
- **V3 Pool Integration**: Optimized routing
- **Price Oracle**: 24h staleness protection
- **Auto Rebalancing**: 1-hour cooldown
- **USDT-based**: Simple user experience

## ⚠️ Important Notes

1. **Testnet Only**: This is for testing purposes
2. **Mock Tokens**: All tokens except USDT are mock tokens
3. **Pool Prices**: Synced to oracle prices (~1% deviation)
4. **Gas Costs**: Paid in BNB (get from testnet faucet)

## 🆘 Troubleshooting

### "Insufficient Balance"
- Claim USDT from faucet
- Check approval for router

### "Pool Not Found"
- Verify pool addresses in configuration
- Run configuration scripts if needed

### "Price Deviation Too High"
- Run price sync script
- Wait for pool price stabilization

### "Transaction Failed"
- Check gas balance (BNB)
- Verify slippage settings
- Check deadline parameter

---

**Network**: BSC Testnet (Chain ID: 97)
**Last Updated**: 2025-10-11
**Status**: ✅ Ready for Testing
