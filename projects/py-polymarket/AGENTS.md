# Agents Guide for Py‑Polymarket

This repository builds an automated trading system for Polymarket’s Central Limit Order Book (CLOB): strategies → risk controls → execution → monitoring. Keep the background grounded in Polymarket’s official docs and use offline-first workflows by default.

## Polymarket Essentials (from official docs)
- Market model
  - Prices are bounded in [0, 1]. Yes/No complement: p(no) = 1 − p(yes).
  - CLOB matching with partial fills; maker/taker roles and fees apply. Always include fees/slippage in sizing and PnL.
- Endpoints
  - REST base: `https://clob.polymarket.com` (set via `CLOB_REST_URL`).
  - WebSocket: `wss://ws-subscriptions-clob.polymarket.com/ws` (set via `CLOB_WS_URL`).
  - Optional GraphQL exists but REST is primary for markets/order books.
- Authentication (two-tier)
  - L1: Sign requests with your Polygon private key to create/derive API creds.
  - L2: API key triplet `{key, secret, passphrase}` used on every authenticated call.
  - Official flows: `POST /auth/api-key`, `GET /auth/derive-api-key` or use `py_clob_client` to handle signing.
- Recommended client (py_clob_client, read-only quickstart)
  ```python
  from py_clob_client.client import ClobClient
  client = ClobClient("https://clob.polymarket.com", key="0x<polygon_private_key>", chain_id=137)
  api = client.create_or_derive_api_creds(); client.set_api_creds(api)
  ```
- Market data and books (typical client calls)
  - Sampled markets with pagination cursors (use provided helper in the client).
  - Best bid/ask, order book depth, last trade price per token (yes token id).
- Reliability and limits
  - Back off on HTTP 429/5xx, use exponential retries and jitter; prefer WS subscriptions for live updates.
  - Treat fees, min tick/lot size as venue-configurable; do not hardcode—source from docs/config.
  - Enable lightweight market streaming with `SERVICE_USE_WS=true`; detailed REST enrichment stays optional (`SERVICE_MARKET_ENRICH_DETAILS=true` only when needed).
  - Hot token registry env switches: `SERVICE_WS_ASSET_LIMIT` (cap), `SERVICE_WS_STATIC_ASSETS` (pinned list), `SERVICE_WS_MIN_SCORE` (volume/liquidity floor), `SERVICE_WS_HOT_STICKY_SECONDS` / `SERVICE_WS_HOT_TTL_SECONDS` (decay), `SERVICE_WS_HIT_BOOST` (recent-activity bonus).
  - REST fallback controls: `SERVICE_REST_MAX_CONCURRENCY` (semaphore) and `SERVICE_REST_RATE_LIMIT_PER_SEC` (pace requests); metrics flow into `reports/pipeline_status.json`.
  - Trade telemetry lives at `monitoring.trade_telemetry_path` (default `reports/fills.jsonl`) and captures fill price, slippage, fees, execution mode for audit/replay.

## Security & Compliance
- Never commit secrets. Load creds via environment and rotate on exposure.
- Respect Polymarket ToS/rate limits. Use WS where possible and throttle concurrency.

## Scope of this file
- Long‑lived rules and context only. One‑off or short‑term tasks must go to `todolist.md` (dated, check‑box style).
