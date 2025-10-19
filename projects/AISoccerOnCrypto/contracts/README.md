# AI Soccer On Crypto - Smart Contracts

A decentralized platform for AI soccer agent competitions with tokenized agents, on-chain reputation systems, and fair launch token mechanisms.

## 🎯 Project Overview

AI Soccer On Crypto is a blockchain-based gaming platform where AI agents compete in soccer matches. The platform features:

- **Agent Registration & Identity**: NFT-based identity system for AI soccer agents
- **Token Launch Platform**: Fair launch mechanism for agent-bound ERC20 tokens
- **Competition System**: Decentralized match creation, acceptance, and execution
- **Reputation System**: On-chain reputation tracking with server-validated results
- **Token Buyback & Burn**: Automatic token buyback mechanism during successful matches

## 📋 Core Contracts

### 1. SoccerAgentRegistry
**Address**: `0x93D251E6a2F08b61c06d36eEDD81bA6ac384E40D` (Sepolia)

The core identity registry for AI soccer agents, implemented as an ERC721 NFT contract.

**Key Features**:
- Register AI agents with team name, model version, and metadata
- Each agent is represented as a unique NFT
- Track agent ownership and manage metadata
- Enable agent transfers and approvals

**Main Functions**:
```solidity
function registerSoccerAgent(
    string memory teamName,
    string memory modelVersion,
    string memory tokenUri
) external returns (uint256 agentId)

function getSoccerAgentInfo(uint256 agentId) external view returns (SoccerAgentInfo memory)
function getDeveloperAgents(address developer) external view returns (uint256[] memory)
```

### 2. ServerReputationRegistry
**Address**: `0x0D5a8A2f22cC59a9293C14404a41818E71b3528A` (Sepolia)

Manages authorized game servers and on-chain reputation tracking based on match results.

**Key Features**:
- Server authorization and management
- Submit match results with cryptographic proofs
- Track win/loss/draw statistics for each agent
- Calculate and update agent reputation scores
- Store match logs with IPFS URIs

**Main Functions**:
```solidity
function registerServer(address serverAddress) external onlyOwner
function submitMatchResult(
    uint256 agentId,
    uint256 opponentAgentId,
    uint8 result,
    uint128 selfScore,
    uint128 opponentScore,
    string calldata matchLogUri,
    bytes32 matchLogHash
) external

function getAgentReputation(uint256 agentId) external view returns (int256)
```

### 3. LaunchPad
**Address**: `0xBA9d3DA6116d8D3d5F90B3065f59d7B205F5C852` (Sepolia)

Fair launch platform for agent-bound ERC20 tokens with Uniswap V2 liquidity provision.

**Key Features**:
- Agent owners can launch tokens bound to their agents
- Fair launch mechanism: 50% public mint, 5% to owner, 45% for liquidity
- Batch minting system (1-100 batches, 1000 tokens per batch, 0.001 ETH per batch)
- Attach messages to mint transactions (max 200 bytes)
- 3-day mint period with automatic liquidity provision upon completion
- Refund mechanism if mint target not reached
- Transfer restrictions until 50% mint completion

**Token Economics**:
- Total Supply: 100,000,000 tokens
- Public Mint (50%): 50,000,000 tokens
- Agent Owner (5%): 5,000,000 tokens
- Liquidity Pool (45%): 45,000,000 tokens
- Foundation Fee: 5% of mint fees
- Liquidity: 95% of mint fees

**Main Functions**:
```solidity
function launchToken(uint256 agentId) external returns (address tokenAddress)

function mint(
    uint256 agentId,
    uint256 batches,
    string calldata message
) external payable

function requestRefund(uint256 agentId) external
function getTokenLaunch(uint256 agentId) external view returns (TokenLaunch memory)
```

### 4. TokenBoundAgent
ERC20 token contract deployed by LaunchPad for each agent.

**Key Features**:
- Standard ERC20 functionality
- Only LaunchPad can mint tokens
- Transfer restrictions until launch completion
- Burn functionality for refunds
- Bound to specific agent ID

### 5. Competition
**Address**: `0xDe30530F1Fa736E656A42fCb3f91E004B1e1819a` (Sepolia)

Manages soccer match invitations, match queue, and fee distribution with token buyback mechanism.

**Key Features**:
- Create match invitations with ETH fees
- Accept/reject/cancel invitations
- Match queue system for server assignment
- Authorized servers can start and complete matches
- Automatic fee distribution with token buyback and burn
- 1-hour cooldown between match acceptances
- Platform and opponent revenue sharing

**Fee Distribution**:
- Platform: minimum fee + 20% of remaining fee
- Opponent: 80% of remaining fee
  - If opponent has launched token: 20% used for token buyback & burn
  - Remaining 80% goes to opponent

**Main Functions**:
```solidity
function createMatchInvitation(
    uint256 challengerAgentId,
    uint256 opponentAgentId
) external payable returns (uint256 matchId)

function acceptMatchInvitation(uint256 matchId) external
function rejectMatchInvitation(uint256 matchId) external
function cancelMatchInvitation(uint256 matchId) external

// Server functions
function startMatch(uint256 matchId) external
function completeMatch(uint256 matchId) external
function failMatch(uint256 matchId) external

// View functions
function getMatch(uint256 matchId) external view returns (Match memory)
function getMatchQueue() external view returns (uint256[] memory)
function getPendingInvitations(uint256 agentId) external view returns (uint256[] memory)
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User/Developer                          │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Register Agent
                   ↓
         ┌──────────────────────┐
         │ SoccerAgentRegistry  │ (ERC721)
         │  - Agent Identity    │
         │  - Agent Metadata    │
         └──────────┬───────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ↓           ↓           ↓
   ┌─────────┐  ┌──────────┐  ┌──────────────┐
   │LaunchPad│  │Competition│  │ServerRegistry│
   │         │  │           │  │              │
   │- Launch │  │- Matches  │  │- Reputation  │
   │  Token  │  │- Fees     │  │- Results     │
   │- Fair   │  │- Buyback  │  │              │
   │  Mint   │  │  & Burn   │  │              │
   └────┬────┘  └─────┬─────┘  └──────────────┘
        │             │
        ↓             ↓
  ┌──────────┐  ┌─────────────┐
  │  Token   │  │  Uniswap V2 │
  │ (ERC20)  │←→│   Router    │
  └──────────┘  └─────────────┘
```

## 🔄 User Workflows

### Workflow 1: Register an Agent
1. Developer calls `SoccerAgentRegistry.registerSoccerAgent()`
2. Receives unique agent ID (NFT)
3. Agent can now participate in matches

### Workflow 2: Launch Agent Token
1. Agent owner calls `LaunchPad.launchToken(agentId)`
2. TokenBoundAgent ERC20 contract deployed
3. Users mint tokens over 3 days (50% target)
4. Upon 50% completion:
   - 5% minted to agent owner
   - 5% of fees to foundation
   - 45% tokens + 95% fees added to Uniswap V2
   - Token transfers enabled

### Workflow 3: Create & Play Match
1. Challenger creates invitation with `Competition.createMatchInvitation()`
2. Opponent accepts with `acceptMatchInvitation()`
3. Match enters queue
4. Authorized server starts match with `startMatch()`
5. Server completes match with `completeMatch()`
6. Fees distributed:
   - Platform receives minimum fee + 20% extra
   - Opponent receives 80% extra
   - If opponent has token: 20% of opponent share used for buyback & burn

### Workflow 4: Token Buyback Mechanism
When a match completes:
1. Check if opponent agent has successfully launched token
2. If yes: 20% of opponent's match reward used to buy token
3. Tokens purchased from Uniswap V2 pool
4. Purchased tokens sent to dead address (burned)
5. Event emitted with buyback details

## 🚀 Deployment

### Sepolia Testnet (Chain ID: 11155111)

```json
{
  "SoccerAgentRegistry": "0x93D251E6a2F08b61c06d36eEDD81bA6ac384E40D",
  "ServerReputationRegistry": "0x0D5a8A2f22cC59a9293C14404a41818E71b3528A",
  "LaunchPad": "0xBA9d3DA6116d8D3d5F90B3065f59d7B205F5C852",
  "Competition": "0xDe30530F1Fa736E656A42fCb3f91E004B1e1819a"
}
```

**Configuration**:
- Uniswap V2 Router: `0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008`
- Minimum Match Fee: `0.001 ETH`
- Foundation Address: `0xF0C995a3659a2BC6020F579AEd7A206244AE52c0`
- Platform Treasury: `0xF0C995a3659a2BC6020F579AEd7A206244AE52c0`

### Deploy to Other Networks

```bash
# 1. Update configuration in script/Deploy.s.sol
# 2. Set environment variables
export PRIVATE_KEY=your_private_key
export RPC_URL=your_rpc_url

# 3. Deploy
forge script script/Deploy.s.sol:Deploy --rpc-url $RPC_URL --broadcast --verify
```

## 🛠️ Development

### Prerequisites
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Solidity ^0.8.20

### Setup
```bash
cd projects/AISoccerOnCrypto/contracts
forge install
```

### Build
```bash
forge build
```

### Test
```bash
forge test
```

### Deploy
```bash
# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Deploy
source .env
forge script script/Deploy.s.sol:Deploy --rpc-url $RPC_URL --broadcast
```

## 📊 Contract Interactions

### Example: Register Agent and Launch Token

```javascript
// 1. Register Agent
const agentRegistry = new ethers.Contract(AGENT_REGISTRY_ADDRESS, ABI, signer);
const tx1 = await agentRegistry.registerSoccerAgent(
  "Dream Team FC",
  "v1.0.0",
  "ipfs://QmXYZ..."
);
const receipt1 = await tx1.wait();
const agentId = receipt1.events[0].args.agentId;

// 2. Launch Token
const launchPad = new ethers.Contract(LAUNCHPAD_ADDRESS, ABI, signer);
const tx2 = await launchPad.launchToken(agentId);
const receipt2 = await tx2.wait();
const tokenAddress = receipt2.events[0].args.tokenAddress;

// 3. Mint Tokens
const tx3 = await launchPad.mint(
  agentId,
  10, // 10 batches = 10,000 tokens
  "Go Team!",
  { value: ethers.utils.parseEther("0.01") } // 10 * 0.001 ETH
);
await tx3.wait();
```

### Example: Create and Accept Match

```javascript
// 1. Create Match Invitation
const competition = new ethers.Contract(COMPETITION_ADDRESS, ABI, signer);
const tx1 = await competition.createMatchInvitation(
  myAgentId,
  opponentAgentId,
  { value: ethers.utils.parseEther("0.001") }
);
const receipt1 = await tx1.wait();
const matchId = receipt1.events[0].args.matchId;

// 2. Opponent Accepts (different signer)
const tx2 = await competition.connect(opponentSigner).acceptMatchInvitation(matchId);
await tx2.wait();

// 3. Server Starts Match
const tx3 = await competition.connect(serverSigner).startMatch(matchId);
await tx3.wait();

// 4. Server Completes Match
const tx4 = await competition.connect(serverSigner).completeMatch(matchId);
await tx4.wait();
```

## 🔐 Security Features

- **Reentrancy Protection**: All state-changing functions use OpenZeppelin's ReentrancyGuard
- **Access Control**: Owner-only functions and server authorization system
- **Agent Ownership Verification**: All agent actions verify ownership/approval
- **Transfer Restrictions**: Tokens locked until fair launch completion
- **Cooldown Period**: 1-hour cooldown between match acceptances
- **Refund Mechanism**: Users can claim refunds if token launch fails

## 📝 Events

Key events emitted by contracts:

```solidity
// SoccerAgentRegistry
event SoccerAgentRegistered(uint256 indexed agentId, address indexed developer, string teamName, string modelVersion);

// LaunchPad
event TokenLaunched(uint256 indexed agentId, address indexed tokenAddress, address indexed agentOwner, string name, string symbol);
event TokenMinted(uint256 indexed agentId, address indexed tokenAddress, address indexed user, uint256 batches, uint256 tokenAmount, uint256 fee, string message);
event LaunchCompleted(uint256 indexed agentId, address indexed tokenAddress, address uniswapPool, uint256 liquidityTokens, uint256 liquidityETH);

// Competition
event MatchInvitationCreated(uint256 indexed matchId, uint256 indexed challengerAgentId, uint256 indexed opponentAgentId, address challenger, address opponent, uint256 matchFee);
event MatchCompleted(uint256 indexed matchId, address indexed server);
event TokenBuybackAndBurn(uint256 indexed matchId, uint256 indexed agentId, address indexed tokenAddress, uint256 ethAmount, uint256 tokenAmount);

// ServerReputationRegistry
event MatchResultSubmitted(uint256 indexed agentId, uint256 indexed opponentAgentId, address indexed serverAddress, uint8 result, uint128 selfScore, uint128 opponentScore, string matchLogUri);
```

## 📚 Additional Resources

- **OpenZeppelin Contracts**: Used for ERC20, ERC721, Ownable, and ReentrancyGuard
- **Uniswap V2**: Used for token liquidity and buyback mechanism
- **Foundry**: Ethereum development framework

## 📄 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## ⚠️ Disclaimer

This is experimental software. Use at your own risk. The smart contracts have not been audited. Do not use in production with real funds without proper security audits.

