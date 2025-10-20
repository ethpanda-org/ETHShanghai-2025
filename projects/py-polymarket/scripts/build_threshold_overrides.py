"""
Build per‑market threshold overrides from live REST markets.

Generates a YAML snippet mapping top‑N markets (by 24h volume) to
signal/consensus thresholds, so you can paste it under
`strategy.threshold_overrides` in config/runtime.yaml.

Usage:
  python scripts/build_threshold_overrides.py --top 15 --signal 0.23 --consensus 2 \
      --output reports/threshold_overrides.yaml

Set SERVICE_USE_WS=false for predictable behavior.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple

import sys
from pathlib import Path as _P

root = _P(__file__).resolve().parents[1]
src = root / "src"
for p in (str(root), str(src)):
    if p not in sys.path:
        sys.path.insert(0, p)

from config import settings  # type: ignore
from polymarket.data.facade import DataIngestionFacade  # type: ignore


def _as_float(v: Any) -> float:
    try:
        return float(v)
    except Exception:
        return 0.0


def fetch_markets(limit: int) -> List[Dict[str, Any]]:
    settings.OFFLINE_MODE = False
    facade = DataIngestionFacade(use_graphql=False, ttl_seconds=0, limit=limit, proxy_url=settings.PROXY_URL)
    try:
        tickers = settings  # silence linter; settings accessed by facade
        markets = []
        # One shot fetch; rest-only behavior controlled via env SERVICE_USE_WS=false
        for t in __import__("asyncio").get_event_loop().run_until_complete(facade.get_markets(force_refresh=True)):
            markets.append(t.raw)
        return markets
    finally:
        # ensure cleanup
        try:
            __import__("asyncio").get_event_loop().run_until_complete(facade.close())
        except Exception:
            pass


def build_overrides(markets: List[Dict[str, Any]], top: int, signal: float, consensus: int) -> List[Tuple[str, Dict[str, Any]]]:
    scored: List[Tuple[str, float]] = []
    for m in markets:
        mid = str(m.get("market_id") or m.get("id") or "").strip()
        if not mid:
            continue
        vol = _as_float(m.get("volume_24h") or m.get("volume") or 0.0)
        scored.append((mid, vol))
    scored.sort(key=lambda kv: kv[1], reverse=True)
    picks = scored[: max(0, int(top))]
    return [(mid, {"signal_floor": float(signal), "consensus_min": int(consensus)}) for mid, _ in picks]


def to_yaml_snippet(pairs: List[Tuple[str, Dict[str, Any]]]) -> str:
    lines = ["threshold_overrides:"]
    for mid, cfg in pairs:
        lines.append(f"  '{mid}': {{ signal_floor: {cfg['signal_floor']}, consensus_min: {cfg['consensus_min']} }}")
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Build per-market threshold overrides YAML from live REST markets")
    parser.add_argument("--top", type=int, default=10, help="Top N markets by 24h volume")
    parser.add_argument("--limit", type=int, default=100, help="Fetch limit for markets")
    parser.add_argument("--signal", type=float, default=0.23, help="signal_floor to apply to selected markets")
    parser.add_argument("--consensus", type=int, default=2, help="consensus_min to apply to selected markets")
    parser.add_argument("--output", type=Path, default=Path("reports/threshold_overrides.yaml"))
    args = parser.parse_args()

    import os
    os.environ.setdefault("SERVICE_USE_WS", "false")

    markets = fetch_markets(args.limit)
    overrides = build_overrides(markets, args.top, args.signal, args.consensus)
    yaml_snippet = to_yaml_snippet(overrides)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(yaml_snippet, encoding="utf-8")
    print(yaml_snippet)


if __name__ == "__main__":
    main()
