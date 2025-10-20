# Localhost Fork Deployment Summary (Foundry Anvil)

## Network Information
- **Network**: Foundry Anvil Fork (Ethereum Mainnet)
- **RPC URL**: http://127.0.0.1:8545
- **Chain ID**: 31337
- **Fork Source**: https://eth.llamarpc.com
- **Forked Block**: 23534412
- **Deployer Address**: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
- **Deployer Balance**: 10,000 ETH

## Anvil Configuration
```bash
anvil \
  --fork-url https://eth.llamarpc.com \
  --chain-id 31337 \
  --host 127.0.0.1 \
  --port 8545 \
  --accounts 10 \
  --balance 10000 \
  --gas-limit 30000000 \
  --code-size-limit 50000 \
  --gas-price 0
```

## Quick Start Commands

### Start Anvil Fork
```bash
./start-fork.sh
```

Or manually:
```bash
anvil --fork-url https://eth.llamarpc.com --chain-id 31337 --port 8545
```

### Deploy Contracts
```bash
npx hardhat run deploy-fork.ts --network localhost
```

### Connect to Fork
```bash
# RPC Endpoint
http://127.0.0.1:8545

# Chain ID
31337
```

## Deployed Contract Addresses

### Core Infrastructure
| Contract | Address |
|----------|---------|
| CustomProxyAdmin | `0x33137047cB5962C06803748Af324bDB7118B0Dc8` |
| MultiPathConverter | `0x2d493cde51adc74D4494b3dC146759cF32957A23` |

### Main Protocol Contracts
| Contract | Address |
|----------|---------|
| PoolManagerProxy | `0x66713e76897CdC363dF358C853df5eE5831c3E5a` |
| PoolManagerImplementation | `0x7b506952142c6B85ca370d79e0094DCD29C0b6a7` |
| PegKeeperProxy | `0xA157711624f837865F0a3b503dD6864E7eD36759` |
| PegKeeperImplementation | `0x631Cc89BAb95812b5FBdfD65A039a103210105b5` |
| FxUSDBasePoolProxy | `0x6384D5F8999EaAC8bcCfae137D4e535075b47494` |
| FxUSDBasePoolImplementation | `0x47A643C1f3c78F87Bf72Ca8787dD09Ee4F2C538D` |
| FxUSDImplementation | `0x23b9efEC6328249538614171626feAf27031791b` |

### Pool & Reward Contracts
| Contract | Address |
|----------|---------|
| ReservePool | `0xc66DEdC010e09BAE8fa355b60f08a0fC8089DF2c` |
| RevenuePool | `0x7fAB7AEAB965240986e42729210Cf6E9Fdf26A5f` |
| FxUSDBasePoolGaugeProxy | `0x3907e0Ebb70c4e556a9DFAC210ACE0B7b6c9c3c4` |
| GaugeRewarder | `0x4cDA739ae3b19347ADa57990eE6d0eb53A547600` |

### Existing Contracts (Reused from Fork)
| Contract | Address |
|----------|---------|
| Fx ProxyAdmin | `0x9B54B7703551D9d0ced177A78367560a8B2eDDA4` |
| EmptyContract | `0x387568e1ea4Ff4D003B8147739dB69D87325E206` |
| FxUSDProxy | `0x085780639CC2cACd35E474e71f4d000e2405d8f6` |
| GeneralTokenConverter | `0x11C907b3aeDbD863e551c37f21DD3F36b28A6784` |
| LiquidityGaugeImplementation | `0xF62F458D2F6dd2AD074E715655064d7632e136D6` |

## Anvil Default Accounts

The following accounts are pre-funded with 10,000 ETH each:

| # | Address | Private Key |
|---|---------|-------------|
| 0 | 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 |  |
| 1 | 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 | 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d |
| 2 | 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC | 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a |
| 3 | 0x90F79bf6EB2c4f870365E785982E1f101E93b906 | 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6 |
| 4 | 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 | 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a |
| 5 | 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc | 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba |
| 6 | 0x976EA74026E726554dB657fA54763abd0C3a0aa9 | 0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e |
| 7 | 0x14dC79964da2C08b23698B3D3cc7Ca32193d9955 | 0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356 |
| 8 | 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f | 0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97 |
| 9 | 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720 | 0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6 |

**Mnemonic**: `test test test test test test test test test test test junk`

## Configuration Parameters

### PoolManager
- **HarvesterRatio**: 10000000 (1%)
- **FlashLoanFeeRatio**: 100000 (0.01%)
- **RewardsExpenseRatio**: 0
- **FundingExpenseRatio**: 0
- **LiquidationExpenseRatio**: 100000000 (10%)
- **RedeemFeeRatio**: 5000000 (0.5%)

### FxUSDBasePool
- **Name**: fxUSD Save
- **Symbol**: fxBASE
- **StableDepegPrice**: 995000000000000000 (0.995 USD)
- **RedeemCoolDownPeriod**: 1800 seconds (30 minutes)

### Reward Tokens
- **wstETH**: Registered
- **FXN**: Registered

## Treasury Address
`0x0084C2e1B1823564e597Ff4848a88D61ac63D703`

## Interacting with the Fork

### Using Hardhat Console
```bash
npx hardhat console --network localhost
```

### Using Cast (Foundry)
```bash
# Check block number
cast block-number --rpc-url http://127.0.0.1:8545

# Check balance
cast balance 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url http://127.0.0.1:8545

# Call contract
cast call <CONTRACT_ADDRESS> "symbol()" --rpc-url http://127.0.0.1:8545
```

### Using ethers.js
```javascript
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const wallet = new ethers.Wallet("", provider);
```

## Important Notes

1. **Anvil Fork State**: The fork is ephemeral - all state is lost when Anvil is stopped
2. **Automatic Mining**: Anvil automatically mines a new block for each transaction
3. **Instant Transactions**: Gas price is set to 0 for fast testing
4. **High Gas Limit**: 30,000,000 gas limit per block
5. **Fork Freshness**: The fork starts at block 23534412 and doesn't sync with mainnet

## Deployment Timestamp
2025-10-09

## Files
- **Start Script**: `start-fork.sh`
- **Deploy Script**: `deploy-fork.ts`
- **Deployment Log**: `localhost-deploy-final.log`
