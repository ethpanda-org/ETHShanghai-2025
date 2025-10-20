"""Summarize simulation_report_*.json files."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

REPORTS_DIR = Path(__file__).resolve().parents[1] / "reports"


@dataclass
class Summary:
    files: int
    orders: int
    approved: int

    @property
    def approval_rate(self) -> float:
        return (self.approved / self.orders) if self.orders else 0.0


def iter_reports() -> Iterable[Path]:
    yield from sorted(REPORTS_DIR.glob("simulation_report_*.json"))


def summarize() -> Summary:
    files = 0
    orders = 0
    approved = 0
    for path in iter_reports():
        files += 1
        payload = json.loads(path.read_text(encoding="utf-8"))
        for order in payload:
            orders += 1
            risk = order.get("risk_metadata", {})
            if risk.get("approved") is True:
                approved += 1
    return Summary(files=files, orders=orders, approved=approved)


def main() -> None:
    summary = summarize()
    if summary.files == 0:
        print("No simulation_report_*.json files found in reports/ directory.")
        return
    print(f"Processed {summary.files} files, {summary.orders} orders")
    print(f"Approved: {summary.approved} ({summary.approval_rate:.1%})")


if __name__ == "__main__":
    main()
