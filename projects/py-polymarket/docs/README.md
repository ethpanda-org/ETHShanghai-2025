# Usage and Testing Overview

## Quick Tasks

### Run Strategy Engine Smoke Test
```bash
pytest tests/test_strategy_engine.py -q
```

### Start Trading Loop
```bash
polymarket-launch trade --interval 60
```

### Launch Monitoring UI
```bash
polymarket-launch monitor --port 8888
```

### Reload Configuration
```bash
polymarket-launch config reload
```

## Repository Structure (simplified)
- `apps/` – entry points (`launcher`, `trader`, `monitor`).
- `src/polymarket/data/` – ingestion facade and providers.
- `src/polymarket/services/` – trading loop orchestrator.
- `src/polymarket/strategies/` – registry-based strategy engine.
- `config/` – runtime, strategies, and environment settings.
- Legacy archives have been removed; repository now contains only active modules and generated output directories (logs/, reports/).
- `docs/runbooks/` – operational guides.

## Runbooks
- `strategy_engine.md` — smoke testing the strategy engine.
- `deployment.md` — docker/k8s/monitoring walkthrough.



