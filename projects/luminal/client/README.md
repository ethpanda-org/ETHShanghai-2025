# Luminial Client

Frontend for the privacy-preserving AMM described in `Nora.md`. The client keeps all AMM maths, poseidon commitments, and Groth16 proof generation inside the browser and only submits a succinct proof + new commitment on-chain.

## Highlights

- **Uniswap-inspired UI** for a single ETH/USDC pool (swap only).
- **End-to-end zk flow** – computes state deltas, builds the circuit witness, runs `groth16.fullProve`, then pushes calldata to the AMM contract.
- **Viewing-key aware state cache** – decrypts the latest pool state via local storage or an optional remote service before every quote.
- **Wallet-native UX** using RainbowKit + Wagmi for Sepolia (configurable).
- Includes pre-built circuit artifacts (`swap_circuit.wasm`, `swap_circuit_final.zkey`) in `public/circuits/`.

## Quickstart

```bash
cd client
npm install
npm run dev
```

The dev server defaults to `http://localhost:5173`.

## Environment variables

Create a `.env` (or `.env.local`) in `client/` with at least the following:

```bash
VITE_AMM_CONTRACT_ADDRESS=0x...
VITE_VAULT_CONTRACT_ADDRESS=0x...
VITE_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/<key>
VITE_WALLETCONNECT_PROJECT_ID=<walletconnect_project_id>
VITE_VIEWING_KEY=public-development-viewing-key-not-for-production
# Optional: serve decrypted pool states from a service
VITE_STATE_SERVICE_URL=https://state.luminial.xyz
# Optional: target a different chain ("anvil" selects http://127.0.0.1:8545)
VITE_CHAIN=anvil
# Optional: bypass WalletConnect entirely (use injected wallets only)
VITE_DISABLE_WALLETCONNECT=true

# Required once contracts are deployed
VITE_AMM_CONTRACT_ADDRESS=0x...
VITE_VAULT_CONTRACT_ADDRESS=0x...
```

If `VITE_VAULT_CONTRACT_ADDRESS` is omitted the client will fetch it from the AMM contract via `vault()`.

When targeting a local Anvil node, set `VITE_CHAIN=anvil` (and optionally override `VITE_PUBLIC_RPC_URL` with your custom host/port). If you don't have a WalletConnect project id, set `VITE_DISABLE_WALLETCONNECT=true` so RainbowKit only exposes browser-injected wallets (e.g. MetaMask) without attempting to hit WalletConnect RPC endpoints. Finally, point `VITE_AMM_CONTRACT_ADDRESS` (and optionally `VITE_VAULT_CONTRACT_ADDRESS`) to your freshly deployed contracts so the client can fetch the latest commitment.

## Project layout

```
src/
  components/   # Uniswap-style widgets and status timeline
  hooks/        # Pool state query + swap execution hook
  lib/          # Poseidon commitments, math helpers, prover wrapper
  abis/         # PrivacyAMM & GlobalVault ABIs for viem/wagmi
public/
  circuits/     # swap_circuit.wasm + swap_circuit_final.zkey
```

## Swap flow recap

1. Read the latest vault commitment, decrypt the pool state (fallback cache if needed).
2. When the user enters an amount, compute Δin/Δout locally and preview price impact.
3. On confirmation:
   - Build the witness + circuit inputs.
   - Execute `groth16.fullProve` in browser (using the bundled wasm & zkey).
   - Convert the proof into Solidity calldata and send `swap(...)` to the AMM.
4. After confirmation, store the new plain-text state locally keyed by the new commitment.

## Testing & linting

- `npm run lint` – TypeScript + ESLint rules
- `npm run build` – Vite build with `tsc`

The repo does not commit `node_modules`; install dependencies before running the commands above.

## Notes

- This is a hackathon-grade prototype. The viewing key is assumed public and the fallback state cache ships with demo reserves.
- Poseidon is provided by `circomlibjs`; ensure the bundler can load WebAssembly (Vite handles this out of the box).
- WalletConnect requires a valid project id for production use.
