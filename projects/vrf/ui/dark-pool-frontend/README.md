# Dark Pool Trading Frontend

A privacy-preserving dark pool trading interface built with React, TypeScript, and Tailwind CSS.

## Features

### 🔐 Privacy-First Design
- **Anonymous Identity**: Mathematical identity over legal identity
- **Information Obfuscation**: Strategic blurring of sensitive data
- **Delayed Feedback**: Prevents timing analysis
- **Zero-Knowledge Proofs**: Verifiable compliance without data disclosure

### 🎯 Core Components

#### Privacy Components
- `BlurredBalance`: Default blur for sensitive values with hover reveal
- `RangeDisplay`: Show ranges instead of exact values
- `PrivatePortfolio`: Multi-level privacy disclosure
- `DelayedFeedback`: Intentionally delayed status updates

#### Authentication
- `WalletConnect`: MetaMask and WalletConnect integration
- `DarkIdentityInit`: Anonymous identity generation
- Hardware wallet authentication support

#### Trading Interface
- `DarkTradingView`: Privacy-focused trading interface
- `PrivateOrderBlotter`: Order status with minimal information
- Obfuscated market data display

#### Hardware Integration
- `HardwareConfirmation`: Ledger device confirmation flow
- Physical transaction verification
- Offline signing support

#### Compliance
- `ComplianceDashboard`: Regulatory interface
- `ZK-proof generation`: Verifiable tax reports
- Time-locked auditor access

## Architecture

### Technology Stack
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand patterns
- **Web3**: ethers.js for wallet integration
- **Hardware Wallet**: Ledger WebHID integration
- **ZK Proofs**: snarkjs for client-side proofs
- **Encryption**: Client-side data encryption

### Privacy Patterns

#### 1. Information Obfuscation
```typescript
<BlurredBalance
  value={balance}
  blurLevel="high"
  revealOnHover={false}
  requiresAuth={true}
/>
```

#### 2. Range Display
```typescript
<RangeDisplay
  value={amount}
  variance={10}
  unit="ETH"
/>
```

#### 3. Delayed Feedback
```typescript
<DelayedFeedback
  status="matching"
  minDelay={1000}
  maxDelay={3000}
/>
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- MetaMask browser extension

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd dark-pool-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Project Structure

```
src/
├── components/
│   ├── auth/          # Authentication components
│   ├── privacy/       # Privacy-preserving UI
│   ├── trading/       # Trading interface
│   ├── hardware/      # Hardware wallet integration
│   └── compliance/    # Regulatory compliance
├── hooks/             # Custom React hooks
├── services/          # API and external services
├── utils/             # Utility functions
│   ├── obfuscation.ts # Value blurring utilities
│   ├── encryption.ts  # Client-side encryption
│   ├── delay.ts       # Timing protection
│   └── range.ts       # Range calculations
└── types/             # TypeScript definitions
```

## Security Considerations

### Privacy Protection
- All sensitive data is blurred by default
- Random delays prevent timing analysis
- Client-side encryption for temporary storage
- Hardware wallet required for trade execution

### Compliance
- ZK-proofs for regulatory reporting
- Time-locked data disclosure
- Selective privacy levels
- Audit trails without data exposure

## Development Notes

### Privacy Implementation Rules
1. Never show exact values by default
2. Add random delays to API responses
3. Implement progressive disclosure
4. Use qualitative indicators
5. Encrypt all client-side sensitive data

### Testing Strategy
- Unit tests for privacy components
- Timing analysis protection tests
- Hardware wallet integration tests
- ZK-proof generation tests

## Future Enhancements

- [ ] Multi-asset support
- [ ] Cross-chain privacy
- [ ] Advanced ZK features
- [ ] Mobile hardware support
- [ ] Regulatory evolution adaptation

## License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for privacy-preserving finance**
