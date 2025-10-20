#!/usr/bin/env python3
"""
Utility to generate micro arbitrage reference mappings for runtime config.

The script prefers offline inputs (JSON or JSONL snapshots) but can optionally
attempt a live GraphQL fetch when explicitly requested.  Output is written into
`config/runtime.yaml` (or another file when `--runtime` is provided) by
updating the `strategy.micro_arbitrage_reference_pairs` mapping.

Example usage:

    python scripts/build_micro_arbitrage_pairs.py \
        --input reports/markets_snapshot.json \
        --runtime config/runtime.yaml

    python scripts/build_micro_arbitrage_pairs.py --fetch --dry-run
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

import yaml


DEFAULT_INPUT = Path("reports") / "markets_snapshot.json"
DEFAULT_RUNTIME = Path("config") / "runtime.yaml"
DEFAULT_GRAPHQL_URL = "https://gamma-api.polymarket.com/graphql"


def _log(message: str) -> None:
    sys.stdout.write(f"{message}\n")


def _load_json_lines(path: Path) -> Iterable[Mapping[str, object]]:
    text = path.read_text(encoding="utf-8").strip()
    if not text:
        return []
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        payload = None
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("markets", "data", "items"):
            maybe = payload.get(key)
            if isinstance(maybe, list):
                return maybe
    # Treat file as JSONL
    rows: List[Mapping[str, object]] = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows


def _fetch_graphql_markets(url: str, limit: int, offset: int) -> Sequence[Mapping[str, object]]:
    try:
        import requests
    except ImportError as exc:  # pragma: no cover - dependency guard
        raise RuntimeError("requests is required for --fetch but is not installed") from exc

    query = {
        "query": """
        query Markets($limit: Int!, $offset: Int!) {
          markets(limit: $limit, offset: $offset) {
            marketId
            conditionId
            slug
            status
          }
        }
        """,
        "variables": {"limit": limit, "offset": offset},
    }
    response = requests.post(url, json=query, timeout=30)
    if response.status_code >= 400:
        raise RuntimeError(f"GraphQL request failed ({response.status_code}): {response.text}")
    payload = response.json()
    data = payload.get("data", {})
    markets = data.get("markets")
    if not isinstance(markets, list):
        raise RuntimeError(f"Unexpected GraphQL response structure: {payload}")
    return markets


def _load_markets(args: argparse.Namespace) -> Sequence[Mapping[str, object]]:
    if args.fetch:
        _log(f"Fetching markets via GraphQL ({args.graphql_url}) ...")
        all_markets: List[Mapping[str, object]] = []
        offset = 0
        while True:
            chunk = _fetch_graphql_markets(args.graphql_url, args.fetch_batch_size, offset)
            if not chunk:
                break
            all_markets.extend(chunk)
            offset += len(chunk)
            if len(chunk) < args.fetch_batch_size:
                break
        _log(f"Fetched {len(all_markets)} markets from GraphQL.")
        return all_markets

    input_path = Path(args.input)
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")
    _log(f"Loading markets from {input_path} ...")
    markets = list(_load_json_lines(input_path))
    _log(f"Loaded {len(markets)} markets from snapshot.")
    return markets


def _normalise_market(record: Mapping[str, object]) -> Tuple[Optional[str], Optional[str]]:
    def _get(key_variants: Sequence[str]) -> Optional[str]:
        for key in key_variants:
            value = record.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip().lower()
            if isinstance(value, int):
                return str(value).lower()
        return None

    market_id = _get(("market_id", "marketId", "id"))
    condition_id = _get(("condition_id", "conditionId"))
    return market_id, condition_id


def _build_mapping(
    markets: Sequence[Mapping[str, object]],
    min_group_size: int,
    include_closed: bool = True,
) -> Dict[str, List[str]]:
    groups: Dict[str, List[str]] = defaultdict(list)
    for record in markets:
        market_id, condition_id = _normalise_market(record)
        if not market_id or not condition_id:
            continue
        if not include_closed:
            status = record.get("status")
            if isinstance(status, str) and status.lower() in {"closed", "resolved"}:
                continue
        if market_id not in groups[condition_id]:
            groups[condition_id].append(market_id)

    mapping: Dict[str, List[str]] = {}
    for condition_id, ids in groups.items():
        if len(ids) < min_group_size:
            continue
        ids_sorted = sorted(set(ids))
        mapping[condition_id] = ids_sorted
    return mapping


def _update_runtime(runtime_path: Path, mapping: Dict[str, List[str]], dry_run: bool) -> None:
    runtime = yaml.safe_load(runtime_path.read_text(encoding="utf-8"))
    strategy_block = runtime.setdefault("strategy", {})
    old_mapping = strategy_block.get("micro_arbitrage_reference_pairs") or {}
    if old_mapping == mapping:
        _log("micro_arbitrage_reference_pairs already up to date; no changes required.")
        return
    strategy_block["micro_arbitrage_reference_pairs"] = mapping
    if dry_run:
        _log("[dry-run] Skipping runtime.yaml write.")
        return
    runtime_path.write_text(yaml.safe_dump(runtime, sort_keys=False), encoding="utf-8")
    _log(f"Updated micro_arbitrage_reference_pairs in {runtime_path}")


def main(argv: Optional[Sequence[str]] = None) -> None:
    parser = argparse.ArgumentParser(description="Build micro arbitrage reference pairs.")
    parser.add_argument(
        "--input",
        default=str(DEFAULT_INPUT),
        help="Path to local markets snapshot (JSON or JSONL). Default: %(default)s",
    )
    parser.add_argument(
        "--fetch",
        action="store_true",
        help="Fetch markets from the Polymarket GraphQL endpoint instead of reading a local file.",
    )
    parser.add_argument(
        "--graphql-url",
        default=DEFAULT_GRAPHQL_URL,
        help="GraphQL endpoint to query when using --fetch. Default: %(default)s",
    )
    parser.add_argument(
        "--fetch-batch-size",
        type=int,
        default=200,
        help="Batch size for GraphQL pagination when using --fetch. Default: %(default)s",
    )
    parser.add_argument(
        "--min-group-size",
        type=int,
        default=2,
        help="Minimum number of markets that must share a condition before generating a mapping entry. Default: %(default)s",
    )
    parser.add_argument(
        "--runtime",
        default=str(DEFAULT_RUNTIME),
        help="Path to runtime YAML to update. Default: %(default)s",
    )
    parser.add_argument(
        "--output",
        help="Optional path to write the generated mapping as JSON (without mutating runtime config).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Generate mapping but do not write to runtime config.",
    )
    parser.add_argument(
        "--exclude-closed",
        action="store_true",
        help="Ignore markets marked as closed/resolved when building the mapping.",
    )
    args = parser.parse_args(argv)

    try:
        markets = _load_markets(args)
    except Exception as exc:
        parser.error(str(exc))

    mapping = _build_mapping(
        markets,
        min_group_size=max(2, args.min_group_size),
        include_closed=not args.exclude_closed,
    )

    if not mapping:
        _log("No qualifying condition groups were found. No changes applied.")
        return

    _log(f"Identified {len(mapping)} condition groups for micro arbitrage references.")

    if args.output:
        output_path = Path(args.output)
        output_path.write_text(json.dumps(mapping, indent=2), encoding="utf-8")
        _log(f"Wrote mapping JSON to {output_path}")

    runtime_path = Path(args.runtime)
    if runtime_path.exists():
        _update_runtime(runtime_path, mapping, args.dry_run)
    else:
        _log(f"Runtime file {runtime_path} not found; skipping update.")


if __name__ == "__main__":
    main()
