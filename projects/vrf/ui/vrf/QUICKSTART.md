# Quick Start Guide

Follow these steps to get the Trade Book DApp running quickly:

## 1. Install Dependencies

```bash
npm install
```

## 2. Compile Smart Contract

```bash
npx hardhat compile
```

This creates the contract artifacts needed by the UI.

## 3. Start Local Blockchain (Terminal 1)

```bash
npx hardhat node
```

Keep this running. It will show you test accounts with private keys.

## 4. Deploy Contract (Terminal 2)

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

**Copy the contract address** from the output (e.g., `0x5FbDB2315678afecb367f032d93F642f64180aa3`)

## 5. Configure MetaMask

1. Open MetaMask
2. Click network dropdown → "Add Network" → "Add a network manually"
3. Enter:
   - **Network Name**: Hardhat Local
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `1337`
   - **Currency Symbol**: `ETH`
4. Click "Save"
5. Import a test account:
   - Click account icon → "Import Account"
   - Copy a private key from the `npx hardhat node` output
   - Paste and import

## 6. Start the UI (Terminal 3)

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

## 7. Use the App

1. Click **"Connect Wallet"** → Approve in MetaMask
2. Paste the **contract address** from step 4
3. Click **"Initialize"**
4. Submit trades and watch them appear grouped by epochs!

## Tips

- Each epoch contains 5 blocks
- Trades are automatically grouped and displayed
- Click on an epoch to expand and see all trades
- The list auto-refreshes when new trades are submitted

## Troubleshooting

**"Cannot find module" errors**: Run `npm install` again

**MetaMask not connecting**: Make sure you're on the Hardhat Local network (Chain ID 1337)

**No trades showing**: Make sure the contract address is correct and you've submitted at least one trade
