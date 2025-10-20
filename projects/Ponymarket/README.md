<div align="center">
  <img src="pony.png" alt="Ponymarket Logo" width="200"/>
  <h1>Ponymarket</h1>
  <p><strong>Incentivized Binary Prediction Markets</strong></p>
</div>

---

## 🔍 The Problem: Polymarket's Interference Effect

### How Prediction Markets Work
Polymarket prices the probability of events through trading. If an event has 80% probability with payout N and 20% with payout M, the expected value is `0.8N + 0.2M`. Trading naturally reveals these probabilities.

### The Critical Flaw
During the 2024 US election, **media heavily referenced Polymarket data**, citing Trump's advantage on the platform. This data directly **influenced voter sentiment** - a classic observer effect.

When a prediction market simultaneously:
1. **Prices probability** of an outcome
2. **Influences the outcome** itself

The market is no longer pricing just probability - it's pricing **probability + influence power**. The data becomes polluted and loses its informational value.

### The Solution
We need to **separate and price the influence factor** in prediction markets. This is what Ponymarket does.

---

## 🎯 Introducing Ponymarket

**Ponymarket is an incentive layer for prediction markets** - think **"Convex for Polymarket"**.

Just as Convex adds a bribe/governance layer on top of Curve's liquidity pools, Ponymarket adds a **stake/bribe layer** on top of prediction market outcome tokens.

### How It Works

We introduce **staking** and **bribes** for outcome tokens:

1. **Users lock outcome tokens** (YES/NO) to become "committed voters"
   - Express strong conviction on outcomes
   - Longer locks = higher voting power
   - Create "iron voter bases" for positions

2. **Anyone can create bribe pools** to incentivize specific positions
   - Deposit any ERC20 token as rewards
   - Target YES or NO stakers on any market
   - Transparently priced influence campaigns

3. **Results**:
   - ✅ **Bribe rewards are clearly priced** - influence cost becomes explicit
   - ✅ **Bribe creation is permissionless** - fair access for all parties
   - ✅ **Influence is separated from probability** - restore market integrity

By making influence **explicit, priced, and tradeable**, we separate it from pure probability pricing.

---

## 🚀 Three Core Features

### 1. **Stake** - Lock Outcome Tokens
Lock your YES/NO outcome tokens to become a "committed voter":
- Express strong conviction on market outcomes
- Longer lock periods = higher voting power
- Optional permanent lock for maximum boost
- Earn rewards from bribe pools targeting your position

### 2. **Bribe** - Incentivize Positions
Create reward pools to influence market sentiment:
- Deposit **any ERC20 token** as rewards (not just native tokens)
- Target specific outcomes (YES or NO) on any market
- Time-locked linear reward distribution
- Permissionless - anyone can create bribes

### 3. **Delegation** - Trade Locked Positions
Delegate staked tokens to receive tradeable pCTF (position-conditional tokens):
- Auto-claim rewards without manual operations
- Sell pCTF for liquidity while maintaining locked position
- Transfer influence rights without transferring original tokens
- Exit strategy for long-term locks

---

## 💡 Use Cases

### 1. Election Campaigns / Influence Pricing
**Problem**: In the 2024 US election, Polymarket data influenced voters - markets priced "probability + influence" together.

**Solution**: Campaigns can create bribes to incentivize positions. This makes influence **explicit, priced, and fair**:
- Trump campaign bribes YES stakers on "Trump wins" market
- Biden campaign bribes NO stakers on the same market
- Influence cost is transparent and quantified
- Both sides have equal access to bribe mechanisms

### 2. Token Airdrops
**Problem**: Airdrops often go to mercenary capital that dumps immediately.

**Solution**: Projects create bribes requiring **permanent locks**:
- Only users with long-term conviction qualify
- Reward distribution stretches over time (e.g., 1 year)
- Creates committed token holders, not farmers
- Natural Sybil resistance through capital lock-up

### 3. Market Bootstrapping
**Problem**: New prediction markets lack liquidity and participation.

**Solution**: Use bribes as **cold-start incentives**:
- Reward early stakers to bootstrap market activity
- Encourage users to express strong opinions
- Build initial liquidity and price discovery
- Transition to organic market dynamics over time

---

## 🚦 Quick Start

Want to run Ponymarket locally? Check out the **[DEPLOYMENT.md](./DEPLOYMENT.md)** guide.

**TL;DR**: Start Hardhat node → Deploy contracts → Run backend → Launch frontend

---

## 🔒 Security Notes

⚠️ **Experimental prototype - NOT production ready!**

Known limitations:
- No security audit - contracts may have vulnerabilities
- Simplified AMM - no advanced price curves
- Mock oracle - real oracles need dispute mechanisms
- Local testing only - not deployed to mainnet

---

## 🛠️ Development Roadmap

- [x] Basic CTF implementation
- [x] AMM trading functionality
- [x] Bribe pool incentives
- [x] Vote-escrowed staking
- [x] Delegation system
- [ ] Advanced AMM algorithms (LMSR, logarithmic)
- [ ] Chainlink oracle integration
- [ ] Cross-chain deployment
- [ ] Governance voting interface
- [ ] Analytics dashboard

---

## 📖 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - How to run locally
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical deep dive
- **[Swagger API](http://localhost:3000/api)** - Backend API (when running)

---

## 🤝 Contributing

Feedback and contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📜 License

MIT License - Open source and experimental.

---

## 🙏 Acknowledgments

- **Gnosis Conditional Tokens** - CTF framework inspiration
- **Curve Finance** - Vote-escrowed tokenomics model
- **Polymarket** - Prediction market UX patterns

---

<div align="center">
  <p>
    <a href="./DEPLOYMENT.md">📚 Deployment</a> •
    <a href="./ARCHITECTURE.md">🏗️ Architecture</a> •
    <a href="http://localhost:3000/api">📊 API</a>
  </p>
</div>
