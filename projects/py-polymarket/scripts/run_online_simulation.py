"""Continuous online simulation runner."""

from __future__ import annotations

import argparse
import signal
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
REPORTS_DIR = PROJECT_ROOT / "reports"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Loop polymarket-simulate to collect reports")
    parser.add_argument("--markets", type=int, default=10, help="Number of markets per run")
    parser.add_argument("--limit", type=int, default=50, help="Fetch limit per run")
    parser.add_argument("--interval", type=int, default=300, help="Seconds between runs")
    parser.add_argument("--once", action="store_true", help="Run a single iteration then exit")
    return parser.parse_args()


def build_command(markets: int, limit: int, output: Path) -> list[str]:
    return [
        "polymarket-simulate",
        "--markets",
        str(markets),
        "--limit",
        str(limit),
        "--output",
        str(output),
    ]


def run_iteration(markets: int, limit: int) -> None:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    output = REPORTS_DIR / f"simulation_report_{timestamp}.json"
    cmd = build_command(markets, limit, output)
    subprocess.run(cmd, check=False)


def main() -> None:
    args = parse_args()
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    running = True

    def handle_stop(signum: int, frame: object) -> None:
        nonlocal running
        running = False

    signal.signal(signal.SIGINT, handle_stop)
    signal.signal(signal.SIGTERM, handle_stop)

    while running:
        run_iteration(args.markets, args.limit)
        if args.once:
            break
        for _ in range(args.interval):
            if not running:
                break
            time.sleep(1)


if __name__ == "__main__":
    if "polymarket-simulate" not in sys.modules:
        pass
    main()
