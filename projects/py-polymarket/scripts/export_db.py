#!/usr/bin/env python3
"""Export structured tables (orders/trades/positions/realized) to CSV/Parquet.

Usage:
  python scripts/export_db.py --tables orders trades --out-dir exports --format csv
  python scripts/export_db.py --tables positions realized --format parquet --out-dir exports
"""
from __future__ import annotations

import argparse
from pathlib import Path
from typing import List
import pandas as pd
from sqlalchemy.orm import sessionmaker

from polymarket.utils.database import DatabaseManager, OrderEvent, TradeEvent, PositionSnapshot, RealizedExit


TABLES = {
    "orders": OrderEvent,
    "trades": TradeEvent,
    "positions": PositionSnapshot,
    "realized": RealizedExit,
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Export DB tables to CSV/Parquet")
    parser.add_argument("--tables", nargs="+", choices=list(TABLES.keys()), required=True)
    parser.add_argument("--format", choices=["csv", "parquet"], default="csv")
    parser.add_argument("--out-dir", default="exports")
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    db = DatabaseManager()
    Session = sessionmaker(bind=db.engine)
    session = Session()
    for name in args.tables:
        model = TABLES[name]
        rows = session.query(model).all()
        if not rows:
            continue
        # Convert to DataFrame via __dict__ while dropping SA internals
        recs: List[dict] = []
        for row in rows:
            d = {k: v for k, v in row.__dict__.items() if not k.startswith("_")}
            recs.append(d)
        df = pd.DataFrame(recs)
        out_path = out_dir / f"{name}.{args.format}"
        if args.format == "csv":
            df.to_csv(out_path, index=False)
        else:
            try:
                df.to_parquet(out_path, index=False)
            except Exception as exc:
                print(f"parquet export failed for {name}: {exc}")
                # Fallback to CSV
                df.to_csv(out_dir / f"{name}.csv", index=False)


if __name__ == "__main__":
    main()

