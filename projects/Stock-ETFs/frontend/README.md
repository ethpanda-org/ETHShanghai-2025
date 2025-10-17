# BlockETF Frontend

A decentralized ETF platform built on Binance Smart Chain, allowing users to invest in diversified crypto portfolios.

## Features

- 🔗 **Wallet Integration** - Connect with MetaMask, WalletConnect, and other Web3 wallets
- 💰 **Invest & Redeem** - Buy ETF shares with USDT or redeem shares for USDT
- 💧 **Testnet Faucet** - Claim test tokens for BSC Testnet (USDT, WBTC, WETH, WBNB)
- 📊 **Real-time Data** - View ETF composition, prices, and your holdings
- 🎨 **Clean UI** - Simple interface with navigation between Home and Faucet
- ⛓️ **BSC Support** - Built for Binance Smart Chain (testnet & mainnet)

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **wagmi v2** - React hooks for Ethereum
- **viem** - TypeScript Ethereum library
- **RainbowKit** - Wallet connection UI

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Web3 wallet (MetaMask recommended)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```

3. **Update `.env.local` with your values:**
   ```env
   # Get from https://cloud.walletconnect.com
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

   # Update after deploying contracts
   NEXT_PUBLIC_BLOCK_ETF_CORE=0x...
   NEXT_PUBLIC_PRICE_ORACLE=0x...
   NEXT_PUBLIC_ETF_ROUTER=0x...

   # 97 for BSC Testnet, 56 for BSC Mainnet
   NEXT_PUBLIC_DEFAULT_CHAIN_ID=97
   ```

4. **Update contract addresses:**

   Edit `src/lib/contracts/addresses.ts` with your deployed contract addresses.

5. **Run development server:**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with providers
│   │   ├── page.tsx             # Main page (ETF trading)
│   │   └── faucet/
│   │       └── page.tsx         # Faucet page (claim test tokens)
│   ├── components/
│   │   ├── Providers.tsx        # Web3 providers (wagmi, RainbowKit)
│   │   ├── ETFOverview.tsx      # ETF info & composition
│   │   ├── MyHoldings.tsx       # User's ETF holdings
│   │   └── TradePanel.tsx       # Invest/Redeem interface
│   ├── hooks/
│   │   └── useBlockETF.ts       # Contract interaction hooks
│   └── lib/
│       ├── wagmi.ts             # wagmi configuration
│       └── contracts/
│           ├── abis.ts          # Contract ABIs
│           └── addresses.ts     # Contract addresses
├── .env.example                 # Environment template
└── README.md
```

## Pages

### Home (`/`)
- **ETF Overview**: Share price, TVL, portfolio composition with real-time prices
- **My Holdings**: User's ETF shares and current value
- **Trade Panel**: Invest (buy) or Redeem (sell) ETF shares with USDT

### Faucet (`/faucet`)
- **Claim Test Tokens**: Get USDT, WBTC, WETH, WBNB for testing on BSC Testnet
- **24-hour Cooldown**: Each token can be claimed once per day
- **Balance Display**: See your current token balances

## Contract Integration

### Reading Data

The app reads data from three contracts:

1. **BlockETFCore** - ETF shares, assets, and values
2. **PriceOracle** - Asset prices (via Chainlink)
3. **ETFRouterV1** - Trade previews and execution

### Key Hooks

- `useBlockETFData()` - Fetches ETF info, assets, and prices
- `useUserBalance()` - Gets user's ETF share balance
- Trade previews are handled directly in `TradePanel` component

## TODO: Implementation Needed

The following features need to be implemented:

1. **Contract Write Functions** - Add invest/redeem transaction logic
2. **USDT Approval** - Implement token approval flow
3. **Transaction Status** - Add loading states and error handling
4. **Token Symbols** - Fetch ERC20 symbols for asset display
5. **Faucet Contracts** - Deploy mock ERC20 tokens with faucet functionality

## Testing on BSC Testnet

1. **Switch to BSC Testnet** in your wallet (ChainID: 97)
2. **Get test BNB** from [BNB Faucet](https://testnet.bnbchain.org/faucet-smart) for gas fees
3. **Visit `/faucet`** page and claim test tokens (USDT, WBTC, WETH, WBNB)
4. **Return to Home** and start investing in BlockETF!

## Building for Production

```bash
npm run build
npm start
```

## Deployment

Deploy to Vercel, Netlify, or any Next.js-compatible platform.

## License

MIT
