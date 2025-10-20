# Py-Polymarket

A Python-based trading bot and analysis toolkit for Polymarket’s Central Limit Order Book (CLOB).

## Features

- Real-time market data ingestion (REST sampling + optional order-book enrichment).
- Strategy engine with multi-strategy aggregation (mean reversion, momentum scalping, event-driven; cross-market arb currently weighted 0 pending external feed integration).
- Risk controls and execution sizing.
- Backtesting and offline simulations.
- Monitoring dashboard with live web UI (execution telemetry, exit analytics, sentiment telemetry, event-driven exits).

## Installation

```bash
pip install -r requirements/base.txt
pip install -e .
```

For development tooling:

```bash
pip install -r requirements/dev.txt
```

## API Credential Setup

Polymarket’s CLOB API uses a two-layer authentication model:

- **L1 Polygon private key** – signs requests that create or derive API keys.
- **L2 API credentials** – `{key, secret, passphrase}` returned by the auth API and required for each private request.

### Recommended: `py_clob_client`

```python
from py_clob_client.client import ClobClient

HOST = "https://clob.polymarket.com"
PRIVATE_KEY = "0xYOUR_POLYGON_PRIVATE_KEY"

client = ClobClient(HOST, key=PRIVATE_KEY, chain_id=137)
api_creds = client.create_or_derive_api_creds()
client.set_api_creds(api_creds)
```

The helper signs the request with your Polygon key and returns the API key triplet. Treat the response as secret material.

### Manual HTTP Endpoints

If you prefer custom signing, call the official endpoints directly:

- `POST /auth/api-key`
- `GET /auth/derive-api-key`

Both respond with:

```json
{
  "key": "uuid",
  "secret": "hmac_secret",
  "passphrase": "string"
}
```

### Environment Variables

Populate `.env` or your shell environment:

```
POLY_OFFLINE_MODE=false
POLY_DRY_RUN=true
POLYMARKET_API_KEY=<key>
POLYMARKET_API_SECRET=<secret>
POLYMARKET_API_PASSPHRASE=<passphrase>
POLY_PRIVATE_KEY=<0x polygon private key>
CLOB_REST_URL=https://clob.polymarket.com
CLOB_WS_URL=wss://ws-subscriptions-clob.polymarket.com/ws
POLYGON_RPC_URL=<your polygon rpc>
# Optional: live sentiment sources for event-driven strategy
NEWSAPI_KEY=<your newsapi key>
TWITTER_BEARER_TOKEN=<your twitter bearer token>
# Optional proxy for HTTP APIs (sentiment providers, etc.)
PROXY_ENABLED=true
PROXY_URL=http://user:pass@host:port
```

> **Security:** never commit these secrets. Store them in a secure vault and rotate immediately if exposed.

## Usage

```python
from polymarket import PolymarketBot
bot = PolymarketBot()
bot.run()
```

### CLI launchers

```bash
polymarket-launch trade --interval 60
polymarket-backtest --offline --markets 10
polymarket-demo --offline
```

> `python -m apps.trader` and `python -m apps.monitor` delegate to the `polymarket-launch` commands above so that flags and logging stay consistent in one place.

### One-click start/stop (Windows PowerShell)

- Unified trader + monitor launcher (paper-trading by default)
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts\launch_online_stack.ps1 -Port 8888 -Interval 60 -Markets 5 -Limit 20
  ```
  Add `-Live` to enable signing/on-chain submission, `-Detach` to spawn separate PowerShell windows (legacy `start_trade_stack.ps1` now forwards here), `-UseWs` to opt into live WebSocket subscriptions, and `-OpenBrowser` if you want the dashboard to auto-open.
- Batch shortcut (for Windows Task Scheduler or desktop shortcuts)
  ```powershell
  scripts\start_online_stack.bat -Port 8888 -Interval 60
  ```
- Stop services
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts\stop_stack.ps1 -Port 8888
  ```
- Live backtest with rolling PnL:
  ```powershell
powershell -ExecutionPolicy Bypass -File scripts\run_backtest_live.ps1 -Markets 10 -Limit 20 -HoldingSeconds 60
powershell -ExecutionPolicy Bypass -File scripts\summarize_backtest.ps1
python scripts/run_backtest_attribution.py  # aggregate archived runs and write diversification summary
  ```

### Verification tips

- Monitor UI: `http://localhost:8888`
- API JSON: `http://localhost:8888/api/data`
- Logs: `logs/polymarket.log` (look for `[sizing]` lines to confirm runtime sizing)
- Loop counters: `reports/pipeline_status.json`
- Sentiment/Events: if configured, `/api/data` includes `pipeline.sentiment` (source/freshness/fallback), and an `event_driven` summary (wins/losses/win_rate/avg_holding/slippage/fees). The dashboard shows “Sentiment Telemetry” and “Event‑Driven Exits”.
- Order/trade persistence: new JSONL ledgers are written to `reports/orders.jsonl` (order submissions/rejections) and `reports/trades.jsonl` (fills). A compact preview is also embedded in `reports/pipeline_status.json` under `order_store`.
- Kill-switch cooldown: configure `trading.daily_loss_enabled`, `trading.daily_loss_limit_pct`, `trading.daily_loss_cooldown_minutes`, `trading.daily_loss_reset_hour`, and `trading.daily_loss_recovery_ratio` to pause after drawdowns and restart with reduced sizing. The state file lives at `reports/kill_switch_state.json`.
- Order frequency guard: tune `trading.order_frequency` (`enabled`, `max_orders`, `interval_seconds`) to cap approvals per rolling window (e.g., 30 orders per minute) when running live.
- Per‑strategy rate limits: optionally configure `trading.strategy_order_frequency` to limit approvals per strategy (and per market). Rejections are recorded in `reports/orders.jsonl` with reason `strategy_rate_limit`. See sample config below.
  - Also supports per‑side and per‑market‑side caps via `per_side` and `per_market_side`.
- Proxy: BrightData proxy is **enabled by default** (`config/runtime.yaml`). To run without it, set `PROXY_ENABLED=false` in the environment before starting the stack.
- REST load tuning: by default the CLOB sampler only pulls summary fields to avoid heavy REST loops. Set `SERVICE_MARKET_ENRICH_DETAILS=true` if you explicitly need per-market order book enrichment.
- WebSocket streaming: set `SERVICE_USE_WS=true` to enable market pushes. The hot-asset registry keeps the subscription list focused; tune via:
  - `SERVICE_WS_ASSET_LIMIT` – max token ids to subscribe (0 = no cap).
  - `SERVICE_WS_STATIC_ASSETS` – comma-separated token ids that are always pinned.
  - `SERVICE_WS_MIN_SCORE` – minimum combined volume/liquidity score required before a token is auto-subscribed.
  - `SERVICE_WS_HOT_STICKY_SECONDS` / `SERVICE_WS_HOT_TTL_SECONDS` – how long recent hits stay pinned vs. when stale entries expire.
  - `SERVICE_WS_HIT_BOOST` – bonus applied when a token produces live traffic, keeping it in the hot set if volume is temporarily low.
- REST fallback pacing: `SERVICE_REST_MAX_CONCURRENCY` caps simultaneous REST calls (default 4) and `SERVICE_REST_RATE_LIMIT_PER_SEC` spaces requests; ingest latency/429 metrics are written to `reports/pipeline_status.json`.
- Source freshness: `pipeline_status.json.fetch_info.sources` includes `ws_age_seconds` and `rest_age_seconds` (age of last WS message/REST fetch) to help judge quote freshness and auto-fallback behavior.
- Trade telemetry: JSONL fills are written to the path in `monitoring.trade_telemetry_path` (default `reports/fills.jsonl`) and now include fill price, slippage, fees, and execution mode for each entry/exit. The monitoring dashboard displays these data as live entries/exits, slippage (bps), average notional, execution-mode counts, and total fees in the “Execution Telemetry” panel.
- Strategy exits: micro‑arbitrage now exits when the external net edge is at/below cost (taker fee): `reason = micro_arbitrage_external_edge_cost`.
- Exit analytics: run `python scripts/analyze_exit_reasons.py --window-hours 24` to refresh `reports/exit_analytics.json`, then view the Exit Analytics dashboard section for tp/sl share and worst-market summaries.
- Event‑driven analytics: run `python scripts/analyze_event_driven.py --hours 24` to write `reports/_analysis_event_driven_last24h.json` (sources/markets/exit reasons/win rate/avg holding/slippage/fees). The dashboard will consume it if present.
- Dynamic spread tiers: adjust `strategy.spread_volume_tiers` in `config/runtime.yaml` to scale the spread gate by 24h volume (high-volume markets enforce tighter `max_spread_bps`).
- Configuration loader: PyYAML is required for `config.settings`. If you are running inside a fresh virtualenv, install it with `pip install PyYAML` before launching any CLI (including the monitor).

### Optional configuration: strategy order frequency

Add per‑strategy (and per‑market) rolling caps in `config/runtime.yaml`:

```yaml
trading:
  # Global cap (already supported)
  order_frequency:
    enabled: true
    max_orders: 30
    interval_seconds: 60

  # New: per‑strategy caps
  strategy_order_frequency:
    micro_arbitrage:
      max_orders: 3
      interval_seconds: 60
      # Per‑market cap: use the same limits…
      per_market: true
      # …or specify explicit market‑level limits
      # per_market:
      #   max_orders: 1
      #   interval_seconds: 60
      # Optional: per‑side caps (yes/no)
      per_side: true  # or { max_orders: 2, interval_seconds: 30 }
      # Optional: per‑market × side caps
      # per_market_side: true  # or { max_orders: 1, interval_seconds: 60 }
    mean_reversion:
      max_orders: 2
      interval_seconds: 30
      per_market: true
      per_side: { max_orders: 2, interval_seconds: 30 }

### Optional configuration: strategy behavior under ingest fallback

When market ingest is degraded (e.g., stale WS), `fetch_info.fallback=true` with `reason` (e.g., `stale_ws`). You can:

- Halt entirely (already supported): set `STRATEGY_HALT_ON_FALLBACK=true`.
- Skip specific strategies while allowing others:

```yaml
STRATEGY_SKIP_ON_FALLBACK:
  - micro_arbitrage
  - momentum_scalping
```

- Degrade order sizes per strategy instead of skipping:

```yaml
STRATEGY_SIZE_SCALES_ON_FALLBACK:
  micro_arbitrage: 0.0   # effectively skip
  momentum_scalping: 0.5 # halve sizes
  mean_reversion: 0.8
```

Status surfaces:
- `pipeline_status.json.fetch_info.current_source`: ws_live | ws_stale | ws_initialising | rest_only
- `ws_cooldown_remaining_seconds`: seconds remaining during WS backoff
```

Runtime visibility:
- `pipeline_status.json.strategy_order_frequency` shows per‑strategy windows.
- `pipeline_status.json.strategy_market_order_frequency` summarizes tracked market windows by strategy.

### Event‑Driven Strategy: configuration & behavior

- Parameters (see `config/strategies.yaml: strategies.event_driven.params`):
  - `require_true_source` (bool): require real sources (newsapi/twitter); otherwise treat as synthetic.
  - `non_news_conf_scale` (0..1): downscale confidence for synthetic sources.
  - `volume_threshold` (float): 24h volume threshold to detect activity spikes.
  - `sentiment_weight` / `sentiment_floor`: blend between sentiment and volume spike.
  - `max_age_seconds` / `decay_half_life_seconds`: freshness gate and time decay.
  - `volume_spike_multiplier_non_news`: boost for spikes when source is synthetic.
  - `allowed_risk_levels`: optional gate (e.g., `[LOW, MEDIUM]`).
- Ingest/enrichment:
  - Enrichment writes `sentiment`, `sentiment_confidence`, `sentiment_source`, and `sentiment_updated_at` for freshness/decay.
  - Sentiment provider honors `NEWSAPI_KEY` / `TWITTER_BEARER_TOKEN` and `PROXY_URL`, with retry+backoff and light rate limiting.

### Analytics & Scheduling

- Scripts:
  - `scripts/analyze_exit_reasons.py --window-hours 24` → `reports/exit_analytics.json` (tp/sl share, worst markets).
  - `scripts/analyze_event_driven.py --hours 24` → `reports/_analysis_event_driven_last24h.json` (sources/markets/exits/holding/slippage/fees).
  - `scripts/analyze_yesterday.py --date YYYY-MM-DD` → daily summary with `event_driven` section.
  - `scripts/strategy_markets_winrate.py --date YYYY-MM-DD` → weighted (confidence×size_hint) attribution and `exit_strategy_breakdown`.
- Scheduler:
  - `scripts/run_daily_analytics.ps1 -EveryMinutes 60 -WindowHours 24` runs exit‑reasons, event‑driven, and daily summaries on a cadence.
  - `scripts/register_scheduled_tasks.ps1 -AnalyticsEveryMinutes 60` registers Windows scheduled tasks to run analytics periodically.

## Project Structure

```
apps/                  CLI entry points (trade, monitor, simulate, backtest, demo)
config/                Environment variables, runtime config, strategy weights
docs/                  Documentation and runbooks
infra/                 Deployment assets (docker, k8s, monitoring)
logs/                  Runtime log output (gitignored)
reports/               Simulation/backtest exports (gitignored)
requirements/          Dependency sets (base/dev/monitoring)
scripts/               Operational utilities
src/polymarket/        Core library package
    api/               CLOB integration adapters
    data/              External data connectors and models
    execution/         Execution adapters
    monitoring/        Metrics and alerting helpers
    risk/              Risk engine
    services/          Service orchestration
    strategies/        Strategy implementations
    utils/             Shared utilities
tests/                 Automated test suite
```

## Development

```bash
make install   # install dependencies in editable mode
make test      # run pytest smoke suite
make simulate  # run offline simulation and write reports/simulation.json
make backtest  # export offline backtest results to reports/backtest.json
make demo      # interactive demo
```

## Testing

```bash
pytest tests -q
```

## Operations Guide

- See docs/OPERATIONS_GUIDE.md for end-to-end operations: install, env, quick start, WS/REST order streaming, dashboard panels (Order Lifecycle, Risk Audit, Ext Trend), JSONL outputs, replay tooling, and troubleshooting.

Formatting helpers:

```bash
black src/ tests/
isort src/ tests/
```

## License

MIT License
***
