# 🏗️ Technical Architecture

This document provides detailed technical information about Ponymarket's architecture, implementation, and key concepts.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│           React + Wagmi + RainbowKit + Vite                 │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                      Backend Indexer                        │
│              NestJS + Redis + Event Listener                │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                    Smart Contracts                          │
│  MockCTF (Prediction Markets) + BribePool (Incentives)     │
│  veToken (Governance) + pCTFTrading (Secondary Market)     │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Smart Contracts (`hardhat-bribe/`)
- **Hardhat 3.0** - Development environment
- **Solidity 0.8.28** - Smart contract language
- **Viem** - TypeScript interface for Ethereum
- **OpenZeppelin Contracts** - Security-audited base contracts
- **Foundry (forge-std)** - Testing framework

**Key Contracts:**
- `MockCTF.sol` - Simplified Conditional Token Framework
- `BribePool.sol` - Liquidity incentive mechanism
- `veToken.sol` - Vote-escrowed governance tokens
- `pCTFTrading.sol` - Secondary market for staked positions
- `MockERC20.sol` - Test USDC token (6 decimals)

### Backend (`nestjs-bribe/`)
- **NestJS 11** - Enterprise TypeScript framework
- **Redis (ioredis)** - Event caching and state management
- **Viem** - Blockchain event listener
- **Swagger** - Auto-generated API documentation

**Responsibilities:**
- Listen to `ConditionPreparation` events from blockchain
- Index market data into Redis
- Provide REST API for frontend queries
- Cache event history for fast retrieval

### Frontend (`vite-bribe/`)
- **React 19** - UI framework
- **TypeScript** - Type-safe development
- **Vite 7** - Fast build tool
- **Wagmi v2** - React hooks for Ethereum
- **Viem** - Low-level Ethereum interactions
- **RainbowKit v2** - Wallet connection UI
- **React Router v7** - Client-side routing
- **shadcn/ui** - Accessible component library
- **Tailwind CSS** - Utility-first styling

**Key Pages:**
- `/` - Landing page
- `/markets` - Market list and creation
- `/markets/:conditionId` - Market detail and trading
- `/bribes` - Browse incentive pools
- `/bribes/:conditionId` - Create bribe pool
- `/delegation` - Delegate voting power
- `/staking` - veToken staking interface
- `/pctf-trading` - Secondary market for pCTF tokens
- `/faucet` - Get test USDC

---

## Project Structure

```
251011/
├── hardhat-bribe/           # Smart Contracts Layer
│   ├── contracts/           # Solidity source files
│   │   ├── MockCTF.sol      # Core prediction market logic
│   │   ├── BribePool.sol    # Liquidity incentives
│   │   ├── veToken.sol      # Vote-escrowed staking
│   │   ├── pCTFTrading.sol  # Secondary market
│   │   └── MockERC20.sol    # Test token
│   │
│   ├── ignition/modules/    # Hardhat Ignition deployment scripts
│   │   └── Deploy.ts        # Main deployment script
│   │
│   ├── test/                # Contract tests
│   │   ├── MockCTF.test.ts  # CTF functionality tests
│   │   └── *.test.sol       # Foundry tests
│   │
│   ├── scripts/             # Utility scripts
│   │   └── export-abis.js   # Export ABIs to frontend
│   │
│   └── hardhat.config.ts    # Hardhat configuration
│
├── nestjs-bribe/            # Backend Indexer
│   ├── src/
│   │   ├── markets/         # Market indexing module
│   │   │   ├── markets.service.ts   # Event listener logic
│   │   │   └── markets.controller.ts # REST API endpoints
│   │   │
│   │   ├── redis/           # Redis client module
│   │   └── main.ts          # Application entry point
│   │
│   └── package.json
│
└── vite-bribe/              # Frontend DApp
    ├── src/
    │   ├── pages/           # Route components
    │   │   ├── Home.tsx
    │   │   ├── Markets.tsx
    │   │   ├── MarketDetail.tsx
    │   │   ├── Bribes.tsx
    │   │   ├── CreateBribe.tsx
    │   │   ├── Staking.tsx
    │   │   ├── Delegation.tsx
    │   │   ├── PCTFTrading.tsx
    │   │   └── Faucet.tsx
    │   │
    │   ├── components/      # Reusable UI components
    │   │   ├── ui/          # shadcn/ui primitives
    │   │   ├── StakeTab.tsx
    │   │   ├── RewardsTab.tsx
    │   │   └── TradeDialog.tsx
    │   │
    │   ├── contracts/       # Auto-generated ABI files
    │   │   ├── MockCTF.json
    │   │   └── MockERC20.json
    │   │
    │   ├── lib/             # Utility functions
    │   └── App.tsx          # Root component
    │
    ├── .env.local           # Auto-generated contract addresses
    └── vite.config.ts
```

---

## Key Concepts

### 1. Conditional Token Framework (CTF)

The CTF is a standard for representing prediction market outcomes as ERC-1155 tokens.

**Core Mechanics:**
- **Condition**: A binary question with 2 outcomes (YES/NO)
- **ConditionId**: `keccak256(oracle, questionId, outcomeSlotCount)`
- **Position Tokens**: Represents a claim on a specific outcome
- **Collateral**: Base currency used for trading (USDC in our case)

**Token Creation (Split):**
```
1 USDC → 1 YES token + 1 NO token
```
This is **always** possible and costs exactly 1 USDC.

**Token Destruction (Merge):**
```
1 YES token + 1 NO token → 1 USDC
```
Burning both outcomes returns the collateral.

**Settlement:**
After the oracle reports the result:
- Winning tokens redeem 1:1 for collateral
- Losing tokens become worthless

**Example:**
```solidity
// Question: "Will ETH reach $5000 by Dec 31, 2025?"
bytes32 questionId = keccak256("ETH-5000-2025");
bytes32 conditionId = keccak256(oracle, questionId, 2);

// User splits 100 USDC into outcome tokens
mockCTF.splitPosition(conditionId, 100_000000);
// Result: User has 100 YES + 100 NO tokens

// User trades 50 YES tokens for more NO tokens
mockCTF.buyNo(conditionId, 50_000000);

// Oracle resolves: ETH did NOT reach $5000
mockCTF.reportPayouts(questionId, [1, 0]); // [NO wins, YES loses]

// User redeems NO tokens for USDC
mockCTF.redeemPositions(conditionId, [0]); // Redeem NO position
```

---

### 2. Automated Market Maker (AMM)

Our AMM uses a **constant product formula** for price discovery.

**Pricing Formula:**
```
k = yes_reserve * no_reserve  (constant)
price_yes + price_no = 1       (probabilities sum to 100%)
```

**Trade Execution:**
```solidity
// Buying YES tokens:
// 1. User pays USDC collateral
// 2. Contract splits USDC into YES+NO
// 3. Contract sells NO tokens to pool, receives YES tokens
// 4. User receives YES tokens

function buyYes(bytes32 conditionId, uint256 amount) {
    // Split collateral into YES+NO
    splitPosition(conditionId, amount);

    // Swap NO tokens for more YES
    uint256 yesReceived = swapNoForYes(conditionId, amount);

    // Transfer YES to user
    transfer(msg.sender, yesReceived);
}
```

**Price Impact:**
Larger trades cause more slippage due to the constant product formula.

---

### 3. Vote-Escrowed (ve) Model

Inspired by Curve Finance's veCRV, our veToken system incentivizes long-term commitment.

**Staking Mechanics:**
```solidity
struct Stake {
    uint256 amount;          // pCTF tokens locked
    uint256 unlockTime;      // When tokens can be withdrawn
    uint256 votingPower;     // Linear with lock duration
    bool permanentLock;      // Max boost, no expiry
}
```

**Voting Power Calculation:**
```
votingPower = amount * lockDuration / MAX_LOCK_DURATION
```

**Example:**
- Lock 100 pCTF for 1 year → 100 voting power
- Lock 100 pCTF for 4 years → 400 voting power
- Permanent lock 100 pCTF → 1000 voting power (10x boost)

**Delegation:**
Transfer voting power to another address without transferring tokens:
```solidity
veToken.delegate(conditionId, delegatee);
```

---

### 4. Liquidity Incentives (Bribes)

Market creators can incentivize liquidity by creating reward pools.

**Bribe Pool Structure:**
```solidity
struct BribePool {
    address creator;              // Who funded the pool
    address rewardToken;          // Token to distribute
    uint256 totalRewards;         // Total reward amount
    uint256 releaseStart;         // When rewards start
    uint256 releaseDuration;      // Linear release period
    bool requirePermanentLock;    // Require permanent stake?
}
```

**Reward Distribution:**
```
rewardsPerSecond = totalRewards / releaseDuration
userReward = (userVotingPower / totalVotingPower) * rewardsPerSecond * timeStaked
```

**Example:**
```solidity
// Create a bribe pool for ETH-5000 market
bribePool.createBribe(
    conditionId,           // ETH-5000 market
    1,                     // Reward YES stakers
    rewardToken,           // Distribute PONY tokens
    1000_000000,           // 1000 PONY total
    block.timestamp,       // Start now
    30 days,               // Release over 30 days
    false                  // No permanent lock required
);

// Users stake YES tokens to earn PONY
veToken.stake(conditionId, 1, 100_000000, 30 days, false);

// Claim accumulated rewards
bribePool.claimRewards(conditionId, 1);
```

---

## Smart Contract API

### MockCTF.sol

**Prepare Condition (Create Market):**
```solidity
function prepareCondition(
    address oracle,
    bytes32 questionId,
    uint256 outcomeSlotCount,  // Must be 2 for binary
    uint256 initialYesPrice    // 0-1 ether (0-100%)
) external
```

**Split Position (Mint YES+NO):**
```solidity
function splitPosition(
    bytes32 conditionId,
    uint256 amount
) external
```

**Merge Positions (Burn YES+NO):**
```solidity
function mergePositions(
    bytes32 conditionId,
    uint256 amount
) external
```

**Trade YES/NO:**
```solidity
function buyYes(bytes32 conditionId, uint256 amount) external
function buyNo(bytes32 conditionId, uint256 amount) external
```

**Oracle Settlement:**
```solidity
function reportPayouts(
    bytes32 questionId,
    uint256[] calldata payouts
) external

function redeemPositions(
    bytes32 conditionId,
    uint256[] calldata indexSets
) external
```

**Query Functions:**
```solidity
function getPositionBalance(
    address user,
    bytes32 conditionId,
    uint256 outcomeIndex
) external view returns (uint256)

function getMarketPrices(
    bytes32 conditionId
) external view returns (uint256 yesPrice, uint256 noPrice)
```

---

### BribePool.sol

**Create Incentive Pool:**
```solidity
function createBribe(
    bytes32 conditionId,
    uint256 outcomeIndex,
    address rewardToken,
    uint256 rewardAmount,
    uint256 releaseStart,
    uint256 releaseDuration,
    bool requirePermanentLock
) external
```

**Claim Rewards:**
```solidity
function claimRewards(
    bytes32 conditionId,
    uint256 outcomeIndex
) external returns (uint256 reward)
```

**Query Functions:**
```solidity
function getClaimableRewards(
    address user,
    bytes32 conditionId,
    uint256 outcomeIndex
) external view returns (uint256)

function getBribePool(
    bytes32 conditionId,
    uint256 outcomeIndex
) external view returns (BribePool memory)
```

---

### veToken.sol

**Stake Position Tokens:**
```solidity
function stake(
    bytes32 conditionId,
    uint256 outcomeIndex,
    uint256 amount,
    uint256 lockDuration,
    bool permanentLock
) external
```

**Increase Stake Amount:**
```solidity
function increaseAmount(
    bytes32 conditionId,
    uint256 outcomeIndex,
    uint256 additionalAmount
) external
```

**Extend Lock Duration:**
```solidity
function extendLock(
    bytes32 conditionId,
    uint256 outcomeIndex,
    uint256 newUnlockTime
) external
```

**Withdraw After Unlock:**
```solidity
function withdraw(
    bytes32 conditionId,
    uint256 outcomeIndex
) external
```

**Delegate Voting Power:**
```solidity
function delegate(
    bytes32 conditionId,
    address delegatee
) external
```

**Query Functions:**
```solidity
function getStakeInfo(
    address user,
    bytes32 conditionId,
    uint256 outcomeIndex
) external view returns (StakeInfo memory)

function getVotingPower(
    address user,
    bytes32 conditionId
) external view returns (uint256)
```

---

## Backend API

Base URL: `http://localhost:3000`

### Endpoints

**Get All Markets:**
```http
GET /markets
```

Response:
```json
[
  {
    "conditionId": "0x1234...",
    "oracle": "0xabcd...",
    "questionId": "0x5678...",
    "outcomeSlotCount": 2,
    "timestamp": 1640000000
  }
]
```

**Get Single Market:**
```http
GET /markets/:conditionId
```

Response:
```json
{
  "conditionId": "0x1234...",
  "oracle": "0xabcd...",
  "questionId": "0x5678...",
  "outcomeSlotCount": 2,
  "timestamp": 1640000000,
  "yesPrice": "0.6",
  "noPrice": "0.4"
}
```

**Swagger Documentation:**
```
http://localhost:3000/api
```

---

## Configuration

### Environment Variables

**hardhat-bribe/.env:**
```bash
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology/
PRIVATE_KEY=your_private_key_here
```

**vite-bribe/.env.local** *(auto-generated by `export-abis`)*:
```bash
VITE_MOCK_CTF_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_MOCK_USDC_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

**nestjs-bribe/.env:**
```bash
REDIS_HOST=localhost
REDIS_PORT=6381
RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

---

### Hardhat Networks

**hardhat.config.ts:**
```typescript
networks: {
  hardhatMainnet: {
    chainId: 31337,
    forking: { url: process.env.MAINNET_RPC_URL }
  },
  hardhatOp: {
    chainId: 31337,
    forking: { url: process.env.OPTIMISM_RPC_URL }
  },
  localhost: {
    url: "http://127.0.0.1:8545",
    chainId: 31337
  },
  polygonAmoy: {
    url: process.env.POLYGON_AMOY_RPC_URL,
    accounts: [process.env.PRIVATE_KEY]
  }
}
```

---

## Development Scripts

### hardhat-bribe
```bash
npm run build              # Compile contracts
npm test                   # Run all tests
npm run test:gas           # Test with gas reporting
npm run export-abis        # Export ABIs to frontend
npx hardhat node           # Start local node
npx hardhat clean          # Clean build artifacts
```

### nestjs-bribe
```bash
npm run start:dev          # Development mode (hot reload)
npm run start:debug        # Debug mode
npm run build              # Build for production
npm run start:prod         # Run production build
npm test                   # Unit tests
npm run test:e2e           # End-to-end tests
```

### vite-bribe
```bash
npm run dev                # Development server
npm run build              # Production build
npm run preview            # Preview production build
npm run lint               # ESLint check
npm run type-check         # TypeScript check
```

---

## Testing

### Smart Contracts

**Hardhat Tests (TypeScript + Viem):**
```bash
cd hardhat-bribe
npm test
```

**Foundry Tests (Solidity):**
```bash
cd hardhat-bribe
npx hardhat test --grep "forge"
```

**Gas Reporting:**
```bash
REPORT_GAS=true npm test
```

### Backend

**Unit Tests:**
```bash
cd nestjs-bribe
npm test
```

**E2E Tests:**
```bash
npm run test:e2e
```

### Frontend

**Manual Testing:**
1. Start local Hardhat node
2. Deploy contracts
3. Start backend indexer
4. Launch frontend
5. Connect MetaMask to `localhost:8545`
6. Test user flows

---

## Security Considerations

⚠️ **This is a hackathon project - NOT audited!**

**Known Issues:**
1. **Oracle Trust** - Single oracle can manipulate results
2. **AMM Manipulation** - No protection against sandwich attacks
3. **Precision Loss** - Integer division in reward calculations
4. **Reentrancy** - Not all functions use reentrancy guards
5. **Front-running** - No commit-reveal scheme for trades

**Recommended Improvements:**
- [ ] Multi-signature oracle or UMA integration
- [ ] Flash loan attack protection
- [ ] Comprehensive test coverage (>90%)
- [ ] Professional security audit
- [ ] Chainlink price feeds for collateral
- [ ] Governance timelock for upgrades

---

## Performance Optimizations

### Smart Contracts
- Use `unchecked` blocks for safe arithmetic
- Pack storage variables to save gas
- Batch operations when possible
- Cache storage reads in memory

### Backend
- Redis caching for event history
- Lazy loading of market data
- Pagination for large result sets
- WebSocket for real-time updates (future)

### Frontend
- Code splitting by route
- Lazy load heavy components
- Memoize expensive calculations
- Debounce user inputs
- Optimize re-renders with React.memo

---

## Deployment Checklist

### Local Development
- [x] Hardhat node running
- [x] Contracts deployed
- [x] ABIs exported to frontend
- [x] Redis running
- [x] Backend indexing events
- [x] Frontend connected to localhost
- [x] MetaMask configured for local network

### Testnet (Polygon Amoy)
- [ ] Update hardhat.config.ts with testnet RPC
- [ ] Fund deployer wallet with MATIC
- [ ] Deploy contracts to testnet
- [ ] Update backend with testnet RPC
- [ ] Update frontend with testnet contract addresses
- [ ] Verify contracts on PolygonScan
- [ ] Test end-to-end flows on testnet

### Production (Not Recommended Yet)
- [ ] Complete security audit
- [ ] Implement timelock governance
- [ ] Set up monitoring and alerts
- [ ] Deploy to mainnet
- [ ] Submit contracts for verification
- [ ] Launch with limited TVL cap

---

## Troubleshooting

See [DEPLOYMENT.md](./DEPLOYMENT.md#故障排查) for common issues and solutions.

---

## Further Reading

- [Gnosis Conditional Tokens Documentation](https://docs.gnosis.io/conditionaltokens/)
- [Curve Finance veCRV Model](https://curve.readthedocs.io/dao-vecrv.html)
- [Polymarket Technical Architecture](https://docs.polymarket.com/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Viem Documentation](https://viem.sh/)
- [Wagmi Documentation](https://wagmi.sh/)
