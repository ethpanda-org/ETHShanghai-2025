# Polymarket Bribe Protocol - Frontend

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Get WalletConnect Project ID (Optional but recommended)

1. Go to https://cloud.walletconnect.com
2. Create a free project  
3. Copy the Project ID
4. Update `src/config/wagmi.ts` with your Project ID

### 3. Run Development Server

```bash
npm run dev
```

## Deployment

Deploy contracts from the `hardhat-bribe` project first, then update contract addresses in `src/config/contracts.ts`.

## Features

- ✅ Wallet connection (MetaMask, WalletConnect, etc.)
- ✅ USDC faucet for testing  
- ✅ Polygon Amoy testnet support
- 🚧 Market trading interface (coming soon)

## Get Test Funds

1. **MATIC (for gas)**: https://faucet.polygon.technology/
2. **USDC**: Use the built-in faucet at `/faucet` after contracts are deployed
