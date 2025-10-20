# Legacy Scripts & Tests

The following files remain for historical reference. They are not invoked by the new pipeline.

## Scripts
- `complete_feature_demo.py`, `interactive_demo_fixed.py`, `optimized_trading_system.py`, etc. — legacy demos that orchestrate the old strategy stack. Review before reuse; consider porting logic into `apps/` or `src/polymarket/` modules if still needed.
- `backup_cleanup/` — assorted diagnostic scripts. Treat these as reference when building new maintenance tooling.

## Tests
- `archive/legacy_tests/` contains the original unittest-based suites. Modern pytest equivalents now live under `tests/`.

If you migrate functionality back into the active codebase, delete the legacy copy or update this document to avoid confusion.
\n## Migration\n\nKey functionality is gradually ported into new entry points (e.g., `polymarket-simulate`). Remove or rewrite archived scripts before relying on them in production.\n
