# Strategy Engine Smoke Test

Run the registry-based strategy engine against sample market data to verify that the new pipeline is wired correctly.

```bash
pytest tests/test_strategy_engine.py -q
```

Expected behaviour:
- Combined signals produce actionable orders when confidence/weight thresholds are met.
- Low-confidence markets return a `hold` action with zero size.

This smoke test relies solely on the new `polymarket.strategies` package and does not touch the legacy `core.strategy` module.

## Legacy scripts

Legacy demos that previously lived under `archive/legacy_scripts/` have been removed. Recreate any advanced scenarios by composing the registry-based strategies instead of relying on `core.strategy`.


### CLI Simulation

You can also run `polymarket-simulate` (see README) to export aggregated orders as JSON for quick manual inspection.


