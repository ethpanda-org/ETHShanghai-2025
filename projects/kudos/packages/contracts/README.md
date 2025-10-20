# Contracts Package

This folder hosts the Foundry workspace for the reputation system smart contracts.

- Solidity sources live under `src/`.
- Tests and fixtures live under `test/`.
- Operational scripts live under `script/`.
- Compiled artefacts and deploy traces stay within `out/` and `broadcast/`.

Run most commands from the repo root (e.g., `forge test`, `make build`) because `foundry.toml` already points into this package.

## Scripts

Scripts are executed with `forge script` and rely on standard Foundry environment variables.

- `DeployReputation.s.sol` – deploys the full reputation stack (identity, badge, registry, data feed, marketplace, mock settlement token) to the target network. Example:
  ```bash
  forge script packages/contracts/script/DeployReputation.s.sol:DeployReputation \
    --rpc-url $SEPOLIA_RPC_URL \
    --broadcast \
    --private-key $PRIVATE_KEY
  ```
- `ListWorkDebug.s.sol` – lets you broadcast a `listWork` transaction for manual debugging while printing identity/badge state for the creator. Required variables: `MARKETPLACE_ADDRESS`, `CREATOR_PRIVATE_KEY`, `LIST_PRICE`; optional `WORK_SLUG` (defaults to `debug-work`). Example:
  ```bash
  forge script packages/contracts/script/ListWorkDebug.s.sol:ListWorkDebug \
    --rpc-url $RPC_URL \
    --broadcast
  ```
