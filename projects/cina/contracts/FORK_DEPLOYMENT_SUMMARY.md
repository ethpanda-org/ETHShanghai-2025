# Fork Network Deployment Summary

## Network Information
- **Network**: BuildBear Fork
- **RPC URL**: https://rpc.buildbear.io/enthusiastic-ironfist-ed8f02f9
- **Chain ID**: 31337
- **Deployer Address**: 0xE8055E0fAb02Ceb32D30DA3540Cf97BE1FBf244A

## Deployed Contract Addresses

### Core Infrastructure
| Contract | Address |
|----------|---------|
| CustomProxyAdmin | `0x078406F0E8c962C3e9d23acFe68d5Af0398796D3` |
| MultiPathConverter | `0x6cc9977c053500A10fC4fFc2B2370eB304a71c70` |

### Main Protocol Contracts
| Contract | Address |
|----------|---------|
| PoolManagerProxy | `0xB5Cd8A1468a26b7930Be4B58c21f410862B91E88` |
| PoolManagerImplementation | `0xCEDD0ddfBE70A556dbfEfb79B5FC874Ac464976C` |
| PegKeeperProxy | `0x6d392347C750F83B93a402c461a6d03428d01aF5` |
| PegKeeperImplementation | `0x0fABf900f7b0eC4f9b91bCE3e7b3eE2446AbD8ac` |
| FxUSDBasePoolProxy | `0x7B3836A85872dFd9dDb8D2baea1e16A016076A20` |
| FxUSDBasePoolImplementation | `0x0eBA5F0D3Ddf3c8C82674080b323aDdf377D1A51` |
| FxUSDImplementation | `0x83cc9f69e039C2597Ecf9333052000543E52Fa0A` |

### Pool & Reward Contracts
| Contract | Address |
|----------|---------|
| ReservePool | `0x99DBba13d4127245147519936C9e89673d0D2bef` |
| RevenuePool | `0xf15cf33F795b145c301ed39DFA09f4af0b299438` |
| FxUSDBasePoolGaugeProxy | `0x18dade8153b5344f45673416C40225A8e87fdeAe` |
| GaugeRewarder | `0x58D01aC571440BA71c94B6383Dd36de098b1A16b` |

### Existing Contracts (Reused)
| Contract | Address |
|----------|---------|
| Fx ProxyAdmin | `0x9B54B7703551D9d0ced177A78367560a8B2eDDA4` |
| EmptyContract | `0x387568e1ea4Ff4D003B8147739dB69D87325E206` |
| FxUSDProxy | `0x085780639CC2cACd35E474e71f4d000e2405d8f6` |
| GeneralTokenConverter | `0x11C907b3aeDbD863e551c37f21DD3F36b28A6784` |
| LiquidityGaugeImplementation | `0xF62F458D2F6dd2AD074E715655064d7632e136D6` |

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

## Deployment Timestamp
2025-10-09

## Notes
- All contracts have been successfully deployed and initialized
- Proxy admin ownership has been transferred to the Fx ProxyAdmin
- Gauge rewards have been configured with wstETH and FXN tokens
- All proxies are now controlled by the Fx ProxyAdmin for upgrade management
