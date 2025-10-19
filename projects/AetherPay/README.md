# 🌟 AetherPay Oracle

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Solidity](https://img.shields.io/badge/Solidity-0.8.19-363636?logo=solidity)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)
![Python](https://img.shields.io/badge/Python-3.9+-3776AB?logo=python)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js)

**AI-Powered Decentralized Oracle for Cross-Border Payments**

[Features](#-features) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 📖 Overview

AetherPay Oracle is a cutting-edge **AI-driven decentralized oracle system** designed for cross-border payments. It combines blockchain technology, machine learning, and DeFi protocols to provide accurate, real-time exchange rates with a unique **price spread donation mechanism** for public goods funding.

### 🎯 Key Highlights

- ✨ **AI-Powered Predictions**: LightGBM models for accurate rate forecasting
- 🔗 **Multi-Oracle Consensus**: Decentralized network with reputation system
- 💱 **Low-Slippage FX Swaps**: Optimized liquidity pools with dynamic fees
- 🎁 **Spread Donation**: Automatic contribution of trading spreads to public goods
- 🔐 **MEV Protection**: Multi-layer safeguards against sandwich attacks
- ⚡ **Gas Optimized**: Efficient smart contracts with IR compiler optimization

---

## 🚀 Features

### Smart Contracts (Solidity 0.8.19)

#### 1. **AetherOracleV2** - Decentralized Oracle
- Multi-node consensus with median aggregation
- ECDSA signature verification (ZK-proof POC)
- Dynamic reputation scoring (0-1000)
- 5-minute consensus window
- Confidence threshold validation (80%)

#### 2. **PaymentGatewayV2** - Payment Processor
- Order lifecycle management (PENDING → PAID → PROCESSING → COMPLETED)
- Cross-currency swap integration
- IPFS metadata storage
- Partial payment support
- Designated payer mechanism
- Dynamic fee rates (0.1% stablecoins, 0.2% crypto)

#### 3. **FXPool** - Liquidity Management
- Multi-stablecoin liquidity pools
- Oracle-based exchange rates
- Smart order splitting (auto-split for >$100k)
- Dynamic fees based on confidence levels
- LP token rewards

#### 4. **PublicGoodsFund** - Charity Integration
- Automated spread donations
- Transparent contributor tracking
- Multi-token support

### Oracle Services (Node.js + Python)

- **Real-time Price Aggregation**: 6+ data sources (Binance, CoinGecko, 1inch, etc.)
- **AI Prediction Engine**: LightGBM models with confidence scoring
- **RESTful API**: `/realtime/:pair` endpoints
- **Redis Caching**: Fast response times
- **Winston Logging**: Comprehensive audit trails

### Frontend (Next.js 14)

- **Merchant Dashboard**: Order management & analytics
- **Payment Interface**: User-friendly crypto payment flow
- **Public Goods Tracker**: Donation transparency
- **Wallet Integration**: RainbowKit + Wagmi support

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Data Sources Layer                      │
│  Binance │ CoinGecko │ 1inch │ OKX │ ExchangeRate API       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 AI Prediction Layer (Python)                 │
│  LightGBM Models │ Feature Engineering │ Confidence Scoring │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Oracle Network (Node.js Multi-Node)            │
│  ECDSA Signing │ Rate Submission │ Consensus Mechanism     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 Smart Contracts (Solidity)                  │
│  AetherOracleV2 │ PaymentGatewayV2 │ FXPool │ PublicGoods │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Frontend (Next.js 14)                     │
│  Merchant Dashboard │ Payment UI │ Analytics │ Donations   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.9+
- Hardhat
- Redis (optional, for caching)
- MetaMask or compatible Web3 wallet

### 📥 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/aether-oracle.git
cd aether-oracle

# Install dependencies
cd aether-oracle
npm install

# Install Python dependencies
pip3 install -r requirements.txt

# Copy environment template
cp .env.example .env
# ⚠️ IMPORTANT: Edit .env and add your API keys and private key

# Frontend setup
cd frontend
npm install
```

### 🔧 Configuration

Edit `.env` file:

```bash
# Blockchain
PRIVATE_KEY=0xyour_private_key_here
ETHEREUM_RPC_URL=https://optimism-sepolia.publicnode.com

# API Keys
BINANCE_API_KEY=your_binance_api_key
COINGECKO_API_KEY=your_coingecko_api_key
# ... (see .env.example for all options)
```

### 🚀 Deployment

```bash
# Compile contracts
npx hardhat compile

# Deploy to Optimism Sepolia (testnet)
npx hardhat run scripts/deploy-all-v2.js --network op-sepolia

# Update contract addresses in .env
AETHER_ORACLE_ADDRESS=0x...
PAYMENT_GATEWAY_ADDRESS=0x...
FX_POOL_ADDRESS=0x...
```

### ▶️ Running the Services

```bash
# Terminal 1: Start Oracle Server
cd aether-oracle/oracle
node server.js

# Terminal 2: Start Frontend
cd aether-oracle/frontend
npm run dev

# Terminal 3: Start Data Collection (Optional)
python3 aether-oracle/data/data_collector.py

# Terminal 4: Train AI Models (Optional)
python3 aether-oracle/models/train_model_optimized.py --pair "ETH/USDT"
```

### 📱 Access the Application

- **Frontend**: http://localhost:3000
- **Oracle API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **Real-time Price**: http://localhost:3001/realtime/ETH%2FUSDT

---

## 📚 Documentation

### Smart Contract Interfaces

#### Create an Order

```javascript
await paymentGateway.createOrder(
  "ORDER-12345",        // Order ID string
  1000000,              // Amount (in token decimals)
  usdcAddress,          // Payment token
  usdtAddress,          // Settlement token
  "ipfs://Qm...",       // Metadata URI
  false,                // Allow partial payment
  buyerAddress          // Designated payer (0x0 for public)
);
```

#### Submit Oracle Rate

```javascript
const signature = await wallet.signMessage(messageHash);
await oracle.submitRate(
  "ETH/USDT",           // Trading pair
  250000000000,         // Rate (8 decimals: 2500.00)
  9500,                 // Confidence (95%)
  signature             // ECDSA signature
);
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check |
| `/realtime/:pair` | GET | Get real-time price for pair |
| `/realtime?pair=ETH/USDT` | GET | Alternative query param format |

### Environment Variables

See [`.env.example`](./aether-oracle/.env.example) for full list.

---

## 🧪 Testing

```bash
# Run Hardhat tests
npx hardhat test

# Run specific test file
npx hardhat test test/PaymentGateway.test.js

# Deploy to local network
npx hardhat node
npx hardhat run scripts/deploy-all-v2.js --network localhost

# Analyze models
python3 analyze_models.py
```

---

## 🌐 Supported Networks

| Network | Chain ID | RPC URL | Status |
|---------|----------|---------|--------|
| Optimism Sepolia | 11155420 | https://optimism-sepolia.publicnode.com | ✅ Active |
| Base Sepolia | 84532 | https://sepolia.base.org | ✅ Active |
| Hardhat Local | 1337 | http://127.0.0.1:8545 | 🧪 Development |

---

## 📊 Project Structure

```
aether-oracle/
├── contracts/              # Solidity smart contracts
│   ├── AetherOracleV2.sol
│   ├── PaymentGatewayV2.sol
│   ├── FXPool.sol
│   └── PublicGoodsFundV2.sol
├── oracle/                 # Oracle service (Node.js)
│   ├── server.js           # Main server
│   └── services/           # Service modules
├── models/                 # AI models (Python)
│   ├── train_*.py          # Training scripts
│   └── *_predictor.py      # Prediction engines
├── data/                   # Data collection scripts
├── frontend/               # Next.js frontend
│   ├── app/                # App routes
│   └── components/         # React components
├── scripts/                # Deployment & utility scripts
├── test/                   # Contract tests
└── deployments/            # Deployment artifacts
```

---

## 🔐 Security

⚠️ **NEVER commit sensitive data to Git!**

- Private keys
- API keys/secrets
- Database files
- `.env` files

This project includes:
- ✅ ReentrancyGuard
- ✅ Pausable contracts
- ✅ Ownable access control
- ✅ SafeERC20 transfers
- ✅ MEV protection (95% slippage tolerance)
- ✅ ECDSA signature verification

### Security Audit Status

🔍 **Not audited** - This is experimental software. Use at your own risk.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Solidity: Follow [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- JavaScript: ESLint + Prettier
- Python: PEP 8

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [OpenZeppelin](https://openzeppelin.com/) - Smart contract libraries
- [Hardhat](https://hardhat.org/) - Ethereum development environment
- [LightGBM](https://lightgbm.readthedocs.io/) - Machine learning framework
- [Next.js](https://nextjs.org/) - React framework
- [RainbowKit](https://www.rainbowkit.com/) - Wallet connection UI

---

## 📞 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/aether-oracle/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/aether-oracle/discussions)
- **Email**: your.email@example.com

---

## ⚠️ Disclaimer

This software is experimental and provided "as is" without warranty of any kind. Use at your own risk. The authors are not responsible for any losses or damages.

---

<div align="center">

Made with ❤️ by the AetherPay Team

[Website](#) • [Docs](#) • [Twitter](#) • [Discord](#)

</div>
