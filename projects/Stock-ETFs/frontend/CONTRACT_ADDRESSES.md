# Contract Addresses - BSC Testnet (Chain ID: 97)

**Last Updated**: 2025-10-11

## Core Contracts

| Contract | Address | Description |
|----------|---------|-------------|
| **BlockETFCore (T5)** | `0xa63E59DEf7Ab22C17030467E75829C7F90f44d0C` | Main ETF token contract |
| **PriceOracle** | `0xcF5d2d59810128fDE6d332827A0b1B01cb50245b` | Price oracle for all assets |
| **ETFRouterV1** | `0xa87f31e7c044260d466727607FF3Aed5c8330743` | Router for minting/burning with USDT (v2) |
| **ETFRebalancerV1** | `0x797739bA3af7427066CeF9dbBC755e33082bF26E` | Rebalancer contract |
| **QuoterV3** | `0x6a12F38238fC16e809F1eaBbe8E893812cC627f7` | PancakeSwap V3 quoter |

## Mock Tokens

| Symbol | Name | Address |
|--------|------|---------|
| **USDT** | Tether USD | `0xe4e93c531697aeb44904f9579c3cce1034eb4886` |
| **WBNB** | Wrapped BNB | `0x998367e7de460b309500e06cfdabb0c94adb18de` |
| **BTCB** | Bitcoin BEP20 | `0xd20268cb7065d20307b0793f702febddf5d24856` |
| **ETH** | Ethereum BEP20 | `0xd81e1ac7f2ccdd106701e484f12b842684719bd3` |
| **ADA** | Cardano BEP20 | `0x8dcd14418995d376e40255dabf55ce58d994bfc4` |
| **BCH** | Bitcoin Cash BEP20 | `0xe9636149f4ebda9e1d368385e39e74021d7bf53f` |

## Faucets

| Token | Faucet Address |
|-------|----------------|
| **USDT** | `0x2bed84630e430f5bf1295b11a66266eae661aad8` |

## PancakeSwap V3 Pools (Asset-USDT Pairs)

| Pair | Pool Address | Fee Tier | Position NFT ID |
|------|--------------|----------|-----------------|
| **WBNB-USDT** | `0xAA2EeCccc51f1F2716Fc531E19eC83d3094f437c` | 100 (0.01%) | 24706 |
| **BTCB-USDT** | `0x757fb48255e0470035a95a28fb9f3cec20a20e1f` | 500 (0.05%) | 24707 |
| **ETH-USDT** | `0xab30c22eaf3aa69804b2eca3cccf2d1a2ff434bd` | 500 (0.05%) | 24708 |
| **ADA-USDT** | `0x038df8c35068b9322780f38c61015a6d34e84fed` | 2500 (0.25%) | 24709 |
| **BCH-USDT** | `0xed441cca35f387cece32b9dc4a766e93f56f9f2b` | 2500 (0.25%) | 24710 |

## Configuration Status

✅ **Router V3 Pools**: Configured
✅ **Rebalancer V3 Pools**: Configured
✅ **Pool Prices**: Synced with oracle

## Important Links

- **BSC Testnet Explorer**: https://testnet.bscscan.com
- **PancakeSwap V3 (Testnet)**: https://pancakeswap.finance
- **Testnet Faucet**: https://testnet.binance.org/faucet-smart

## Usage Notes

### For Frontend Integration

1. **Minting ETF Tokens**:
   - User approves USDT to `ETFRouterV1`
   - Call `mintExactShares()` or `mintWithUSDT()` on `ETFRouterV1`

2. **Burning ETF Tokens**:
   - User approves T5 tokens to `ETFRouterV1`
   - Call `burnToUSDT()` on `ETFRouterV1`

3. **Getting Quotes**:
   - Use `usdtNeededForShares()` for mint estimates
   - Use `sharesToUsdt()` for burn estimates
   - Use `QuoterV3` for direct V3 pool quotes

### Contract Interactions

```typescript
// Import addresses
import { contractAddresses } from '@/lib/contracts/addresses';

// Get addresses for BSC Testnet (chainId: 97)
const etfCore = contractAddresses[97].blockETFCore;
const router = contractAddresses[97].etfRouter;
const usdt = contractAddresses[97].usdt;

// Example: Get token addresses
const wbnb = contractAddresses[97].tokens.wbnb;
const btcb = contractAddresses[97].tokens.btcb;

// Example: Get pool addresses
const wbnbPool = contractAddresses[97].v3Pools.wbnb;
```

## Deployment Information

- **Network**: BSC Testnet
- **Chain ID**: 97
- **Deployment Date**: 2025-10-10
- **Configuration Date**: 2025-10-11
- **Deployed By**: Owner account

## Maintenance Scripts

Located in `/blocketf-contracts/script/`:

- `ConfigureRouterPools.s.sol` - Configure Router V3 pools
- `ConfigureRebalancerPools.s.sol` - Configure Rebalancer V3 pools
- `SyncPoolPrices.s.sol` - Sync pool prices with oracle
