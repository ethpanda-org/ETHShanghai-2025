# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a frontend implementation of a dark pool trading system with privacy-preserving features. The project focuses on creating a UI/UX that fundamentally differs from traditional exchanges by prioritizing privacy through strategic information minimization, obfuscation, and zero-knowledge principles.

### Core Philosophy
- **Privacy over Transparency**: Every UI decision prioritizes user privacy while maintaining functionality
- **Mathematical Identity over Legal Identity**: Wallet-based authentication without KYC
- **Verifiable Compliance over Full Disclosure**: ZK-proofs for regulatory reporting
- **Hardware Security over Convenience**: Mandatory hardware wallet confirmation for trades

## Frontend Architecture

### Technology Stack (Recommended)
- **Framework**: React 18+ with TypeScript
- **State Management**: Zustand or Redux Toolkit with privacy-aware patterns
- **Styling**: Tailwind CSS with custom obfuscation utilities
- **Web3**: ethers.js or viem for wallet integration
- **Hardware Wallet**: @ledgerhq/hw-transport-webhid, @zondax/ledger-ethers
- **ZK Proofs**: snarkjs or circomlib for client-side proof generation

### Key Privacy Patterns

#### 1. Information Obfuscation
```typescript
// Blur sensitive values by default
<BlurredBalance
  value={balance}
  blurLevel="high"
  revealOnHover={false}
  requiresAuth={true}
/>

// Display ranges instead of exact values
<RangeDisplay
  min="0.1"
  max="10"
  unit="ETH"
  precision="low"
/>
```

#### 2. Delayed Feedback
```typescript
// Intentionally delay trading status updates
const useDelayedOrderStatus = (orderId: string) => {
  const [status, setStatus] = useState<'pending' | 'matching' | 'executed'>('pending');

  // Add random delay to prevent timing analysis
  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus('matching');
    }, 1000 + Math.random() * 2000);

    return () => clearTimeout(timer);
  }, [orderId]);
};
```

#### 3. Layered Disclosure
```typescript
// Multi-level privacy disclosure
<PrivatePortfolio>
  <Level1>Asset existence only</Level1>
  <Level2 requiresClick>Aggregated values</Level2>
  <Level3 requiresHardwareAuth>Detailed positions</Level3>
</PrivatePortfolio>
```

## Core UI Components

### 1. Authentication Flow
```typescript
// DarkIdentityInit.tsx
<DarkIdentityInit>
  <WalletConnect providers={['metamask', 'walletconnect']} />
  <SignMessageModal message="Generate anonymous identity" />
  <KeyGenerationAnimation />
  <HardwareSecurityCheck />
</DarkIdentityInit>
```

### 2. Trading Interface
```typescript
// DarkTradingView.tsx
<DarkTradingView>
  <MarketOverview
    symbol="ETH-USD"
    price="****"
    change="+*.*%"
    liquidityIndicator="high" // qualitative, not quantitative
  />

  <OrderForm
    amount={<BlurredInput />}
    price={<RangeInput min="100" max="105" />}
    type="limit"
  />

  <PrivateOrderBlotter>
    <Order size="***" status="Matching" />
  </PrivateOrderBlotter>
</DarkTradingView>
```

### 3. Hardware Confirmation
```typescript
// HardwareConfirmation.tsx
<HardwareConfirmation>
  <LedgerConnectionStatus />
  <TransactionSummary
    action="Dark Pool Trade"
    amount="*** ETH"
    recipient="Dark Pool Contract"
  />
  <HardwarePrompt>
    <DeviceAnimation device="ledger" />
    <Instruction>Confirm transaction on your Ledger device</Instruction>
  </HardwarePrompt>
</HardwareConfirmation>
```

### 4. Compliance Dashboard
```typescript
// ComplianceDashboard.tsx
<ComplianceDashboard>
  <RegulatoryDisclosure>
    <DisclosureScope>
      <Option>Total P&L only</Option>
      <Option>Counterparties (obfuscated)</Option>
      <Option>Full history (encrypted)</Option>
    </DisclosureScope>

    <GenerateProof onClick={generateZkProof}>
      Generate Verifiable Tax Report
    </GenerateProof>
  </RegulatoryDisclosure>

  <AuditorAccess>
    <TimeLockedAccess unlockDate="2024-12-31">
      Regulatory key auto-decrypts at specified time
    </TimeLockedAccess>
  </AuditorAccess>
</ComplianceDashboard>
```

## Backend API Integration

### Authentication Endpoints
```typescript
// POST /api/auth/init
interface AuthInitRequest {
  walletAddress: string;
  signature: string;
  message: string;
}

interface AuthInitResponse {
  anonymousId: string;
  sessionToken: string;
  expiresAt: string;
}
```

### Trading Endpoints
```typescript
// POST /api/orders/submit
interface OrderRequest {
  anonymousId: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: string; // Encrypted
  priceRange: {
    min: string;
    max: string;
  };
  expiration: number; // Unix timestamp
}

// GET /api/orders/status
interface OrderStatusResponse {
  orderId: string;
  status: 'pending' | 'matching' | 'executed' | 'expired';
  // Deliberately vague timing information
  estimatedCompletion: 'within 5 minutes' | 'within 30 minutes' | 'unknown';
}
```

### Market Data Endpoints
```typescript
// GET /api/market/overview
interface MarketOverviewResponse {
  symbol: string;
  price: '****'; // Always obscured
  change: '+*.*%'; // Percentage only, no absolute values
  liquidity: 'high' | 'medium' | 'low'; // Qualitative only
  spread: {
    min: string;
    max: string;
  };
}
```

### Compliance Endpoints
```typescript
// POST /api/compliance/proof
interface ComplianceProofRequest {
  anonymousId: string;
  period: {
    start: string;
    end: string;
  };
  disclosureLevel: 'pnl' | 'counterparties' | 'full';
}

interface ComplianceProofResponse {
  zkProof: string;
  encryptedData: string;
  verificationKey: string;
}
```

## Development Guidelines

### Privacy Implementation Rules
1. **Never show exact values by default** - Always use blurred or range displays
2. **Add random delays** to API responses to prevent timing analysis
3. **Implement progressive disclosure** - More details require more authentication
4. **Use qualitative indicators** - "High/Medium/Low" instead of numbers
5. **Encrypt all sensitive client-side data** - Even temporary states

### Security Best Practices
1. **Hardware wallet integration** - All trades must be confirmed on hardware
2. **Private key isolation** - Keys never touch browser memory
3. **Message signing for identity** - No personal information collection
4. **Session management** - Short-lived sessions with re-authentication
5. **Audit logging** - Privacy-preserving audit trails

### Testing Strategy
1. **Unit tests for privacy components** - Verify obfuscation works correctly
2. **Timing analysis tests** - Ensure no information leakage through response times
3. **Hardware wallet integration tests** - Mock hardware for CI/CD
4. **ZK-proof generation tests** - Verify proof correctness
5. **Usability tests** - Balance privacy with user experience

## Common Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run type checking
npm run type-check

# Run unit tests
npm run test

# Run integration tests with mocked hardware
npm run test:integration

# Build for production
npm run build

# Generate ZK circuits (if applicable)
npm run generate-circuits

# Lint code
npm run lint

# Format code
npm run format
```

## File Structure (Recommended)

```
src/
├── components/
│   ├── auth/
│   │   ├── DarkIdentityInit.tsx
│   │   ├── WalletConnect.tsx
│   │   └── HardwareSecurityCheck.tsx
│   ├── trading/
│   │   ├── DarkTradingView.tsx
│   │   ├── OrderForm.tsx
│   │   └── PrivateOrderBlotter.tsx
│   ├── privacy/
│   │   ├── BlurredBalance.tsx
│   │   ├── RangeDisplay.tsx
│   │   └── PrivatePortfolio.tsx
│   ├── hardware/
│   │   ├── HardwareConfirmation.tsx
│   │   ├── LedgerConnection.tsx
│   │   └── DeviceAnimation.tsx
│   └── compliance/
│       ├── ComplianceDashboard.tsx
│       ├── RegulatoryDisclosure.tsx
│       └── GenerateProof.tsx
├── hooks/
│   ├── useDelayedOrderStatus.ts
│   ├── useHardwareWallet.ts
│   ├── usePrivacyLevel.ts
│   └── useZkProof.ts
├── services/
│   ├── api.ts
│   ├── wallet.ts
│   ├── hardware.ts
│   └── zkproof.ts
├── utils/
│   ├── obfuscation.ts
│   ├── encryption.ts
│   ├── delay.ts
│   └── range.ts
└── types/
    ├── api.ts
    ├── privacy.ts
    └── hardware.ts
```

## Important Notes

1. **Never log sensitive information** - Use privacy-preserving logging
2. **Implement rate limiting** - Prevent enumeration attacks
3. **Use CSP headers** - Prevent XSS attacks on privacy data
4. **Regular security audits** - Focus on privacy leakage vectors
5. **User education** - Explain why information is hidden

## Future Considerations

1. **Multi-asset support** - Extend privacy features to other asset classes
2. **Cross-chain privacy** - Support for privacy-preserving cross-chain trades
3. **Advanced ZK features** - More sophisticated proof systems
4. **Mobile hardware support** - Hardware wallet integration on mobile
5. **Regulatory evolution** - Adapt to changing privacy regulations