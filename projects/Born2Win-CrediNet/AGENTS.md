# Repository Guidelines

## Project Structure & Module Organization
- `backend/` hosts the Rust Axum service. Core modules live under `src/` (`auth/`, `did/`, `identity/`, `authorization/`, `credit/`, `sbt/`, `api/`, `shared/`), reusable SQLx fixtures sit in `tests/`, and helper scripts such as `service.sh` and `run_tests.sh` wrap common tasks.
- `contracts/` contains the Hardhat workspace. Solidity sources are under `contracts/`, deployment logic under `scripts/`, reusable mocks in `test/`, and the optional Agent service in `agent-service/`.
- `frontend/` is a Vite + React + TypeScript client. Keep components in `src/components/`, pages in `src/pages/`, hooks in `src/hooks/`, and API adapters in `src/services/` and `src/contracts/`.
- `docs/` aggregates handover notes, deployment playbooks, and status summaries; consult `README.md` and `README_HANDOVER.md` before architectural changes.

## Build, Test & Development Commands
- Backend: `cd backend && cargo run` for local dev, or `./service.sh start` to run with logging helpers. Use `cargo check` before committing and `./run_tests.sh auth` (module name optional) for integration suites.
- Contracts: `cd contracts && npm install` once, then `npx hardhat compile` to build, `npm test` for the Hardhat test suite, and `npm run deploy:sepolia` once RPC URLs and keys are in place.
- Frontend: `cd frontend && npm install`, `npm run dev` for hot reload at port 3001, `npm run build` for production bundles, and `npm run lint` to enforce ESLint + TypeScript rules.

## Coding Style & Naming Conventions
- Rust code follows `rustfmt` defaults (4-space indent); crate modules use snake_case, structs/enums PascalCase, and shared helpers live in `backend/src/shared/`.
- TypeScript follows ESLint + Prettier defaults (2-space indent). Name React components and context providers in PascalCase, hooks with a `use` prefix, and utility modules in camelCase.
- Solidity adheres to Hardhat defaults; maintain SPDX headers, use 4-space indent, match contract and filename casing, and prefer explicit visibility and NatSpec comments for public methods.

## Testing Guidelines
- Backend tests run via `cargo test` for unit coverage and `backend/run_tests.sh all` for end-to-end flows; ensure a seeded `backend/.env` and reachable SQLite database before execution.
- Smart-contract tests live in `contracts/test/` using Mocha/Chai; add regression cases alongside the contract under change and run with `npm test -- --grep "<feature>"` when scoping.
- Frontend currently ships without automated UI tests; at minimum attach screen captures of wallet connection, dashboard load, and SBT issuance when verifying UX changes.

## Commit & Pull Request Guidelines
- Follow Conventional Commits: `<type>(optional scope): <imperative summary>`, e.g., `feat(contracts): add uups upgrade path` or `docs: update deployment guide`. Keep bodies concise and note breaking changes with `BREAKING CHANGE:`.
- Each PR should explain the problem, summarize the solution, list validation steps (`cargo test`, `npm test`, screenshots), and reference related issues or deployment links.
- Rebase before requesting review; avoid bundling unrelated backend, contract, and frontend updates in a single PR unless needed for an atomic change.

## Configuration & Security Tips
- Never commit secrets. Copy `backend/env.example`, `contracts/.env.example`, and `frontend/.env.example` into local `.env` files and populate keys such as `DATABASE_URL`, `SEPOLIA_RPC_URL`, and wallet private keys by hand.
- Default SQLite (`backend/credinet.db`) is for local smoke tests only; rotate to a managed database before staging deployments and update `sqlx` migrations accordingly.
