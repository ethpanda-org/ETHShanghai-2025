# Changelog / Migration Notes

## Highlights
- Introduced dedicated CLI entry points for simulation, backtesting, and demos; outlined the supporting Make targets.
- Restructured `src/polymarket/` into clear domain packages (api, data, execution, monitoring, risk, services, strategies, utils). Legacy `core` modules were removed in favor of the registry-based strategy engine and the new risk/execution adapters.
- Added integration coverage for the simulation flow and eliminated deprecated UTC handling to keep the test suite warning-free.
- Archived experiments and historical assets have been removed; the project now ships without the former `archive/legacy_scripts/` tree.

## Migration Guidance
1. **Dependencies** – Install via:
   ```bash
   pip install -r requirements/base.txt
   pip install -e .
   ```
   For development extras run `pip install -r requirements/dev.txt`.

2. **CLI Entry Points** – Use the packaged commands:
   ```bash
   polymarket-launch trade --interval 60
   polymarket-monitor --port 8888
   polymarket-simulate --offline --markets 5
   polymarket-backtest --offline --markets 10 --output reports/backtest.json
   polymarket-demo --offline
   ```

3. **Make Targets** – Common workflows:
   ```bash
   make install
   make test
   make simulate
   make backtest
   make demo
   make docker-up
   ```

4. **Risk & Execution** – Replace imports from `polymarket.core.*` with:
   ```python
   from polymarket.risk import RiskEngine
   from polymarket.execution import ExecutionEngine
   ```

5. **Simulation API** – Programmatic usage:
   ```python
   from apps.simulation import simulate

   orders = asyncio.run(simulate(markets=5, offline=True, limit=20))
   ```

## Next Steps
- Expand integration coverage for monitoring endpoints once a mock server harness is available.
- Follow the README “Usage” section for production deployment guidance.
