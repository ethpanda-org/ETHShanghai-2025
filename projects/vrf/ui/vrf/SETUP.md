# Trade Book DApp Setup Guide

This is a Vue.js 3 application with MetaMask integration for submitting and viewing blockchain trades.

## Prerequisites

- Node.js (v20.19.0 or v22.12.0+)
- MetaMask browser extension
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

## Smart Contract Setup

### 1. Compile the Contract

```bash
npx hardhat compile
```

This will create the contract artifacts in the `artifacts/` directory.

### 2. Start Local Blockchain (Optional for Development)

In a separate terminal:
```bash
npx hardhat node
```

This starts a local Ethereum node at `http://127.0.0.1:8545` with test accounts.

### 3. Deploy the Contract

For local development:
```bash
npx hardhat run scripts/deploy.ts --network localhost
```

For Hardhat's built-in network:
```bash
npx hardhat run scripts/deploy.ts --network hardhat
```

**Important:** Copy the deployed contract address from the console output. You'll need this in the UI.

### 4. Configure MetaMask

For local development:
1. Open MetaMask
2. Add a new network:
   - Network Name: Hardhat Local
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 1337
   - Currency Symbol: ETH
3. Import a test account using one of the private keys from `npx hardhat node` output

## Running the Application

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Using the Application

1. **Connect Wallet**: Click "Connect Wallet" and approve the MetaMask connection
2. **Initialize Contract**: Enter the deployed contract address and click "Initialize"
3. **Submit Trades**: 
   - Enter price and volume
   - Select BUY or SELL
   - Click "Submit Trade"
   - Approve the transaction in MetaMask
4. **View Trades**: Trades are grouped by epochs (5 blocks each). Click on an epoch to expand and view trades.

## Project Structure

```
├── contracts/          # Solidity smart contracts
│   └── TradeBook.sol
├── scripts/           # Deployment scripts
│   └── deploy.ts
├── src/
│   ├── components/    # Vue components
│   │   ├── TradeForm.vue
│   │   └── TradeList.vue
│   ├── stores/        # Pinia stores
│   │   └── web3.ts
│   ├── types/         # TypeScript type definitions
│   │   └── window.d.ts
│   ├── App.vue        # Main app component
│   └── main.ts        # App entry point
├── hardhat.config.ts  # Hardhat configuration
└── package.json
```

## Features

- **MetaMask Integration**: Connect your wallet to interact with the blockchain
- **Trade Submission**: Submit buy/sell trades with price and volume
- **Trade History**: View all trades grouped by epochs (5 blocks per epoch)
- **Real-time Updates**: Automatically refreshes when new trades are submitted
- **Responsive Design**: Works on desktop and mobile devices

## Smart Contract Functions

- `submitTrade(price, volume, tradeType)`: Submit a new trade
- `getAllTrades()`: Get all trades
- `getTrade(tradeId)`: Get a specific trade
- `getTradeCount()`: Get total number of trades
- `getTradesByEpoch(startBlock, endBlock)`: Get trades within a block range

## Troubleshooting

### MetaMask Connection Issues
- Make sure MetaMask is installed and unlocked
- Check that you're on the correct network
- Try refreshing the page

### Contract Not Found
- Ensure the contract is deployed
- Verify the contract address is correct
- Check that you're on the same network as the deployed contract

### Transaction Failures
- Ensure you have enough ETH for gas fees
- Check that the contract address is correct
- Look at the error message in MetaMask for details
