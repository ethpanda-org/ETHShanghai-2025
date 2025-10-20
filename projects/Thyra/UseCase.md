Use cases

Use Case 1: Unified, Programmable Limit Orders
Pain: Liquidity is fragmented; stateless routers only optimize instant price; cross-chain messaging is unsuitable for real-time control; advanced order semantics are hard to express across venues.
Goal: As an institution, deploy a single interface for limit/TWAP/DCA across DEX/lending/perp without changing existing UX and while retaining full control.
Existing Solutions
● DEX Aggregators / RFQ: Single-shot price; no long-horizon, condition-aware orders.
● Per-Protocol Order Modules: Siloed features; brittle maintenance and limited composability.
● Centralized Keepers/Bots: Custodial/trust assumptions; opaque lifecycle.
● Cross-Chain Messaging: Latency/trust models unsuitable for real-time order management.
Specific examples
● Perp limit with oracle guard.
● Split venue order across Uniswap/Curve/Balancer with max slippage and TIF.
● TWAP slices with volatility bands.
Impact: Faster time-to-market, lower operational cost, and higher execution quality—without changing UX or surrendering custody.

Use Case 2: Yield Optimization
Pain: Fragmented yields and manual hopping cause missed compounding; hard to reason net APY after gas and price impact.
Goal: As a user, automatically earn the highest risk‑adjusted net yield with set‑and‑forget control and full self‑custody.
Existing Solutions
● Vault aggregators: Pre‑packaged and opaque; limited per‑user policy.
● Manual dashboards: Operationally heavy; human latency; inconsistent cadence.
● Generic automation: Single‑trigger; no stateful portfolio policy or adaptive reasoning.
Specific examples
● Stablecoin ladder among DSR/Aave/Morpho based on net APY.
● LST/LRT rotation when premium/depeg constraints are satisfied.
Example:
A user sets simple policies; the system rebalances only when net APY delta justifies gas, pausing during high gas windows.

Use Case 3: Execution‑Capable Agents
Pain: Most AI agent stacks (e.g., Olas, Virtuals) emphasize coordination and ownership but stop at simulation or read‑only actions; without a trusted path to on‑chain execution, agents cannot deploy liquidity, trade, manage vaults, or rebalance autonomously.
Goal: Enable agents to execute pre‑approved on‑chain actions safely and autonomously on behalf of users or DAOs, with revocability and full auditability.
Existing Solutions
● Simulation‑only agents: No trusted path to on‑chain execution.
● Wallet delegation services: Centralized middleware; limited accountability.
● General automation protocols: Recurring triggers, not continuous reasoning.
Specific examples
● Cross‑framework trigger: a minimal adapter lets Olas/Virtuals agents emit SIR intents to call SEE strategies; execution remains on‑chain, non‑custodial, and revocable.
● Multi‑agent handoff: agents coordinate via SIR/SEE events; role‑scoped `ThyraAccount` pre‑authorizations, budget quotas, and rate limits bound risk; deterministic logs and revert‑on‑conflict semantics provide end‑to‑end accountability.
Impact: Unlocks autonomous execution while preserving self‑custody, reducing human latency, and strengthening accountability.

Use Case 4: Advanced Trading Tool
Pain: Pro/quant traders on DeFi lack CeFi‑grade EMS/OMS: fragmented liquidity, limited order types (no iceberg/bracket/OCO/TIF), variable latency, MEV exposure, inconsistent venue APIs, and hard‑to‑enforce risk controls across chains.
Goal: As a professional trader or team, achieve CeFi‑like institutional execution and risk tooling across DEX/derivatives/lending while remaining fully self‑custodial.
Existing Solutions
● DEX aggregators / RFQ: Single‑shot best price; no OMS/algos, portfolio‑level risk controls, or long‑horizon plans.
● CEX EMS / prime brokers: Rich tooling but custodial and opaque, with counterparty and rehypothecation risk.
● Custom quant infra: Costly to build/maintain; brittle across venues/chains; difficult auditability.
Specific examples
● VWAP/TWAP/iceberg with volatility bands, TIF, and budgeted slippage; MEV‑aware routing and gas‑adjusted venue scoring.
● Cross‑venue smart order routing across Uniswap/Curve/Balancer/RFQ desks with explicit price‑impact/gas/MEV costs.
● Bracket/OCO with oracle guards and kill‑switch; dynamic partial fills and protective price bands.
● Portfolio‑level circuit breakers via Thyra VM events; per‑strategy spend/rate limits enforced by ThyraAccount Merkle pre‑authorization; deterministic logs for replay/audit via SIR.
Impact: CeFi‑like execution quality (lower slippage, fewer adverse selections), faster time‑to‑market, and transparent audit/replay—without surrendering custody.
