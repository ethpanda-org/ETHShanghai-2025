# Alpha Builder Ethereum Layer

This package contains the smart-contract layer used by the Alpha Builder stack. Alongside the existing `AlphaVault` treasury, the repo now ships a comprehensive account abstraction toolchain featuring a highly-configurable AA wallet, module framework, social recovery, policy engine, session keys, a deterministic factory, and a sponsor-aware verifying paymaster.

## Stack

- **Hardhat + TypeScript** for compilation, testing, and deployment
- **AlphaVault.sol** – minimal treasury contract with admin/operator roles
- **account-abstraction/AlphaAAWallet.sol** – multi-owner AA wallet with guardian recovery, session keys, policy enforcement, and module orchestration
- **account-abstraction/modules/** – Guardian, session-key, and policy mixins, plus the module management interface
- **account-abstraction/paymaster/AlphaVerifyingPaymaster.sol** – verifying paymaster with sponsor budgets and signature-based approvals
- **account-abstraction/factory/AlphaAAFactory.sol** – CREATE2 factory for deterministic wallet deployment
- Deployments target the same ZeroDev RPC configured for the existing AA wallets

## Getting Started

```bash
pnpm install
pnpm build
pnpm test
```

Populate `.env` from `.env.example` with the ZeroDev RPC URL, chain id, and the deployer key (a funded account on the chosen testnet). Then deploy:

```bash
pnpm deploy --network zerodev
```

The deployment script prints the contract address; register it in the backend config so the frontend can consume it.

## Contract Overview

### AlphaVault

- `deposit(address owner)` – payable entry to credit the specified AA wallet
- `withdraw(address owner, address recipient, uint256 amount)` – lets the owner or operators release funds
- `balanceOf(address)` – off-chain read helper for the backend/frontend

Events:

- `Deposit(owner, amount, newBalance)`
- `Withdrawal(owner, recipient, amount, newBalance)`

### AlphaAAWallet Highlights

- Threshold-based multi-owner signatures (`OwnerSignature[]`) with weight accounting
- Guardian-driven social recovery (`GuardianManager`) with quorum, timelocks, and salt-based replay protection
- Session key registry with per-function permissions, usage caps, and optional policy bindings
- Pluggable modules (`ModuleManager`) that can extend validation or execution paths
- Policy registry allowing value/function selectors to be constrained and referenced by signatures or session keys
- Deterministic nonce management supporting arbitrary nonce keys (useful for batched flows)

### AlphaVerifyingPaymaster

- Sponsor-configurable daily budgets, operation counts, and cooldowns
- Trusted signer network for off-chain approval workflows
- Policy hooks surfaced through `paymasterAndData` encoding to gate certain sponsored ops

### AlphaAAFactory

- Deterministic `CREATE2` deployment of wallets with arbitrary owner/guardian compositions
- Address prediction helper to pre-compute AA wallet addresses before deployment

## Next Steps

- Extend with ERC20 support if required
- Plug in role management (e.g. admin multisig)
- Configure backend cron/watchers to reconcile vault balances with on-chain state
- Implement custom modules by inheriting `IAAWalletModule` and installing them through an owner-approved self-call
- Add end-to-end tests covering session key consumption, guardian recovery, and paymaster budget exhaustion scenarios
