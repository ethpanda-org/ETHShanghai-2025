# Protocol Bank

> **🌐 Live Demo**: [https://www.protocolbanks.com/](https://www.protocolbanks.com/)  
> **📝 Team**: Richard  
> **🏆 ETHShanghai 2025 Hackathon Project**

---

## 🚀 Quick Links

- **🌐 Official Website**: [https://www.protocolbanks.com/](https://www.protocolbanks.com/)
- **📜 Smart Contracts**: [View Contracts](#-smart-contracts)
- **📖 Documentation**: [Full Documentation](./docs/)
- **🎥 Demo Video**: [Coming Soon]

---

## 📋 Overview

Protocol Bank is a cutting-edge digital banking platform designed to revolutionize global payments by seamlessly integrating traditional fiat services with the innovative world of cryptocurrencies. Positioned as a blockchain-based competitor to SWIFT, Protocol Bank aims to address the inefficiencies, high costs, and lack of transparency prevalent in existing cross-border payment systems.

---

## 🎯 Problems Solved

Traditional global payment systems, such as SWIFT, are often characterized by:

- **High Fees**: Multiple intermediary banks lead to cumulative transaction costs.
- **Slow Settlement Times**: Payments can take days to clear due to batch processing and fragmented national systems.
- **Lack of Transparency**: Senders and receivers have limited visibility into payment status and deducted fees.
- **Operational & Compliance Overhead**: Complex relationships and pre-funding requirements for financial institutions.

Protocol Bank directly tackles these issues by offering a decentralized, efficient, and transparent alternative.

---

## ✨ Key Features

- **Dual Fiat and Cryptocurrency Support**: Seamlessly manage both traditional currencies and digital assets.
- **Global Payment Network Integration**: Direct integration with major clearing networks like CHIPS, CHAPS, Fedwire, TARGET2, and CIPS for rapid cross-border transactions.
- **Automated DeFi Lending**: Leverage decentralized finance for automated lending and borrowing.
- **Automated Payment Splitting**: Businesses can automatically split payments for suppliers and vendors, optimizing supply chain finance.
- **Streaming Payments**: Enable real-time, continuous payments for freelancers and subscription services.
- **Facial Recognition Login & KYC Integration**: Enhanced security and streamlined user onboarding with advanced biometric authentication and regulatory compliance.
- **NFC Contactless Payments**: Modern and convenient payment options.
- **Solana & Ethereum Compatibility**: Primary deployment on Solana for speed and low fees, with cross-chain bridge capabilities and EIP protocol support for Ethereum compatibility.
- **Virtual Master Accounts with Real Sub-Accounts**: Optimize tax and financial management for individuals and businesses.

---

## 🔗 Smart Contracts

### 📜 Deployed Contracts

Protocol Bank utilizes smart contracts on both **Ethereum** and **Solana** blockchains for maximum compatibility and efficiency.

#### **Ethereum Contracts**

| Contract Name | Network | Address | Purpose |
|--------------|---------|---------|---------|
| **StreamPayment** | Sepolia Testnet | `0x5FbDB2315678afecb367f032d93F642f64180aa3` | Real-time streaming payments |
| **MockERC20 (USDC)** | Sepolia Testnet | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` | Test token for payments |

#### **Contract Features**

**StreamPayment Contract**:
- ✅ Real-time payment streaming
- ✅ Automated payment splitting to multiple suppliers
- ✅ Payment scheduling and automation
- ✅ Supplier registration and management
- ✅ Payment visualization and tracking

**Key Functions**:
```solidity
// Register a supplier for payment splitting
function registerSupplier(address supplier, string memory name, uint256 percentage)

// Create a streaming payment
function createPayment(address recipient, uint256 amount, uint256 duration)

// Split payment to multiple suppliers
function splitPayment(uint256 totalAmount, address[] memory suppliers)
```

### 📊 Smart Contract Examples

#### **Example 1: Streaming Payment**
```javascript
// Create a 30-day streaming payment of 1000 USDC
await streamPayment.createPayment(
  recipientAddress,
  ethers.utils.parseUnits("1000", 18),
  30 * 24 * 60 * 60 // 30 days in seconds
);
```

#### **Example 2: Automated Payment Splitting**
```javascript
// Register suppliers
await streamPayment.registerSupplier(supplier1, "Supplier A", 40); // 40%
await streamPayment.registerSupplier(supplier2, "Supplier B", 35); // 35%
await streamPayment.registerSupplier(supplier3, "Supplier C", 25); // 25%

// Split 10,000 USDC payment
await streamPayment.splitPayment(
  ethers.utils.parseUnits("10000", 18),
  [supplier1, supplier2, supplier3]
);
```

#### **Example 3: Query Payment Status**
```javascript
// Get payment details
const payment = await streamPayment.getPayment(paymentId);
console.log("Amount:", payment.amount);
console.log("Duration:", payment.duration);
console.log("Start Time:", payment.startTime);
```

### 🔧 Contract Deployment

For detailed deployment instructions, see:
- [Ethereum Contract Deployment Guide](./contracts/ethereum/DEPLOYMENT_GUIDE.md)
- [Smart Contract Implementation Report](./SMART_CONTRACT_IMPLEMENTATION_REPORT.md)
- [Quick Start Guide](./QUICKSTART.md)

---

## 🏗️ Technical Architecture

Protocol Bank is built with a robust and scalable architecture:

- **Frontend**: React.js with a minimalist UI design (inspired by mirror.xyz and N26), utilizing Aeonik font and a white/gray/frosted glass color palette.
- **Backend**: Flask RESTful API with PostgreSQL database for persistent storage and Redis caching for performance.
- **Blockchain**: 
  - **Solana**: Primary blockchain for high-speed, low-cost transactions
  - **Ethereum**: Smart contracts for DeFi integration and cross-chain compatibility
- **Security**: JWT authentication (EdDSA/ES256), Multi-factor authentication (MFA), facial recognition with liveness detection, NFC payment system, and device fingerprinting.
- **Messaging**: ISO 20022 standard for financial messaging, ensuring interoperability with traditional systems.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL 14+
- Redis 6+
- MetaMask or compatible Web3 wallet

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/everest-an/Protocol-Bank.git
cd Protocol-Bank
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start development server**
```bash
npm run dev
```

5. **Visit the application**
```
http://localhost:5173
```

For detailed setup instructions, see [QUICKSTART.md](./QUICKSTART.md)

---

## 📚 Documentation

- [Comprehensive Whitepaper (v2.0)](./docs/protocol_bank_complete_whitepaper.md)
- [Smart Contract Implementation Report](./SMART_CONTRACT_IMPLEMENTATION_REPORT.md)
- [Backend API Integration Guide](./backend_api_integration_guide.md)
- [Deployment Guide](./deployment_guide.md)
- [Quick Start Guide](./QUICKSTART.md)
- [Dual Chain Compatibility Research](./dual_chain_compatibility_research.md)
- [Multi-Chain Smart Contract Strategy](./multi_chain_smart_contract_strategy.md)

---

## 🎨 Features Showcase

### 💳 Payment Visualization
Interactive payment network graph showing real-time payment flows and supplier relationships.

### 🔄 Streaming Payments
Real-time payment streaming with automated distribution to multiple suppliers.

### 🌐 Global Network Integration
Direct integration with major payment networks (CHIPS, CHAPS, Fedwire, TARGET2, CIPS).

### 🔐 Advanced Security
- Facial recognition login
- Multi-factor authentication
- NFC contactless payments
- Device fingerprinting

---

## 🧪 Testing

### Smart Contract Testing
```bash
cd contracts/ethereum
npm test
```

### Integration Testing
```bash
npm run test:integration
```

### Demo Script
```bash
cd contracts/ethereum
node scripts/demo-stream-payment.js
```

---

## 🌐 Live Demo

**Visit our live demo**: [https://www.protocolbanks.com/](https://www.protocolbanks.com/)

**Test Features**:
- ✅ Wallet connection (MetaMask)
- ✅ Payment visualization
- ✅ Streaming payment creation
- ✅ Supplier management
- ✅ Payment splitting

---

## 👥 Team

**Team Name**: Richard

**Contact**:
- GitHub: [@everest-an](https://github.com/everest-an)
- Project Repository: [Protocol Bank](https://github.com/everest-an/Protocol-Bank)

---

## 📄 License

[License Information Here]

---

## 🏆 ETHShanghai 2025

This project is submitted to **ETHShanghai 2025 Hackathon**.

**Track**: DeFi × Infra

**Submission Date**: October 20, 2025

---

## 🔗 Additional Resources

- **Official Website**: [https://www.protocolbanks.com/](https://www.protocolbanks.com/)
- **Smart Contracts**: [Ethereum Contracts](./contracts/ethereum/)
- **API Documentation**: [Backend API Guide](./backend_api_integration_guide.md)
- **Whitepaper**: [Full Whitepaper](./docs/protocol_bank_complete_whitepaper.md)

