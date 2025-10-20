# Simulation & Diagnostics

## Offline Simulation

```bash
polymarket-simulate --offline --markets 5 --output reports/simulation.json
```

Generates strategy outputs using mock data. Inspect the JSON for order/risk metadata.

## Future migration tips

- Legacy simulation demos have been removed; implement any advanced flows by composing helpers under `src/polymarket/` with `StrategyEngine`.
- Avoid embedding credentials. Consume `.env` variables and rely on the new configuration layer.

