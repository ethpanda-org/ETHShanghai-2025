# AquaFlux — Structured RWA Tri‑Token Protocol (ETHShanghai Hackathon)

> **One bond → three tokens (P/C/S)**. Split, compose, and route real‑world yield on DeFi rails with a built‑in first‑loss shield.

---

## TL;DR

* **Problem:** Traditional fixed‑income is rigid, slow (T+), and hard to compose on‑chain.
* **Solution:** AquaFlux **Tri‑Token model** splits an RWA unit into **P‑Token (Principal)**, **C‑Token (Coupon)**, and **S‑Token (Shield)** so users can pick risk/return like LEGO.
* **Why it wins:** Predictable cashflows, **first‑loss protection**, AMM/DeFi composability, and instant settlement. Built for **retail adoption** and **institutional risk controls**.

---

## Repository Layout

This project follows the recommended hackathon structure.

```
projects/[team]-[project]
├─ contracts/     # Solidity contracts, interfaces, libraries
├─ frontend/      # Next.js (or Vite) dApp
├─ backend/       # Node.js service: price/oracle adapters, safety metrics, APIs
├─ deployments/   # ABI + deployed addresses per network (json)
├─ scripts/       # deploy/split/merge/utility scripts
└─ docs/          # whitepaper, diagrams, assets, walkthroughs
```

**You are here:** projects/AquaFlux

---

## Core Concept (Tri‑Token Model)

* **P‑Token (Principal):** Capital‑protected tranche; aims to redeem **1:1** at maturity (subject to waterfall).
* **C‑Token (Coupon):** Streams/accumulates the bond’s coupon; freely tradable/composable.
* **S‑Token (Shield):** **First‑loss junior** tranche; absorbs defaults; captures protocol fees/incentives.

**Waterfall:** Losses hit **S → C → P**. Returns distribute **coupon to C**, fee/incentive share to **S**, and **principal to P** at maturity.

---

## What’s Implemented for ETHShanghai

* **ERC‑20 P/C/S tokens** with mint/burn hooks
* **Split & Merge Router**: `wrap()` RWA → `split()` to P/C/S → `merge()` back
* **Safety Vault (ERC‑4626‑style)** for S‑Token coverage accounting
* **Frontend dApp**: Mint demo RWA, split/merge, swap mock pools, visualize waterfall & coverage
* **Backend service**: Simple APIs for price feed, APY calc, and safety‑buffer metrics

> Note: Some components are mocked for hackathon speed. 

---

---

## Tests

```bash
cd contracts
pnpm hardhat test
# or: forge test
```

> Include unit tests for split/merge invariants and waterfall distribution.

---

## Security & Disclaimers

This is **experimental hackathon software**. **Not** audited, **not** production‑ready, **not** financial advice. Use on test networks only.

---

## Contributing

PRs & issues welcome. Please run tests and linting before submitting.

---

## License

MIT © AquaFlux contributors

---

## Team & Contact

* Team: **AquaFlux** — Structured RWA
* Contact: **[hi@aquaflux.pro](mailto:hi@aquaflux.pro)**

---

### Appendix: Directory Cheat‑Sheet

* `contracts/` — Solidity sources, `hardhat.config.ts`, test suite → [详细文档](./contracts/README.md)
* `frontend/` — React app, wagmi/viem hooks, ABI loaders from `deployments/`
* `backend/` — Express app, APIs, database → [详细文档](./backend/README.md)
* `deployments/` — ABIs + addresses by network
* `scripts/` — Deploy & demo flows
* `docs/` — **📚 [完整文档中心](./docs/README.md)** (架构、快速开始、FAQ)