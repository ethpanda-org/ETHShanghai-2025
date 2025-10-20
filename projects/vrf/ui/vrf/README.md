# Trade Book DApp

A decentralized application (DApp) built with Vue.js 3 and Ethereum smart contracts for submitting and tracking trades on the blockchain.

## Features

- 🦊 **MetaMask Integration** - Connect your wallet to interact with the blockchain
- 📝 **Trade Submission** - Submit buy/sell trades with price and volume
- 📊 **Epoch-Based Grouping** - Trades are automatically grouped into epochs (5 blocks each)
- 🔄 **Real-time Updates** - Automatically refreshes when new trades are submitted
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Vue.js 3, TypeScript, Pinia
- **Blockchain**: Solidity, Hardhat, Ethers.js
- **Build Tool**: Vite

## Quick Start

See [QUICKSTART.md](./QUICKSTART.md) for a step-by-step guide to get running in minutes.

## Detailed Setup

See [SETUP.md](./SETUP.md) for comprehensive setup instructions and troubleshooting.

## Project Structure

```
├── contracts/          # Solidity smart contracts
│   └── TradeBook.sol
├── scripts/           # Deployment scripts
│   ├── deploy.ts
│   └── deploy-and-save.ts
├── src/
│   ├── components/    # Vue components
│   │   ├── TradeForm.vue
│   │   └── TradeList.vue
│   ├── stores/        # Pinia stores
│   │   └── web3.ts
│   ├── types/         # TypeScript type definitions
│   ├── App.vue        # Main app component
│   └── main.ts        # App entry point
├── hardhat.config.ts  # Hardhat configuration
└── package.json
```

## Available Scripts

```bash
# Install dependencies
npm install

# Compile smart contracts
npm run compile

# Start local blockchain
npm run node

# Deploy contract to local network
npm run deploy

# Deploy and save contract address
npm run deploy:save

# Start development server
npm run dev

# Build for production
npm run build
```

## Smart Contract

The `TradeBook` contract provides:

- `submitTrade(price, volume, tradeType)` - Submit a new trade
- `getAllTrades()` - Get all trades
- `getTrade(tradeId)` - Get a specific trade
- `getTradeCount()` - Get total number of trades
- `getTradesByEpoch(startBlock, endBlock)` - Get trades within a block range

## Development Workflow

1. **Terminal 1**: `npm run node` - Start local blockchain
2. **Terminal 2**: `npm run deploy:save` - Deploy contract
3. **Terminal 3**: `npm run dev` - Start UI
4. Open browser, connect MetaMask, paste contract address, and start trading!

## License

MIT
