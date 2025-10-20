"""
Derive or create Polymarket CLOB API credentials from a Polygon private key.

Usage examples:

  # Read private key from env and print JSON + .env lines
  python scripts/derive_api_key.py

  # Provide key via flag
  python scripts/derive_api_key.py --private-key 0xYOUR_PRIVATE_KEY

  # Specify host/chain-id and emit only .env snippet
  python scripts/derive_api_key.py --host https://clob.polymarket.com --chain-id 137 --env-only

Never commit the output. Store credentials in a secure secrets manager.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Optional


def _derive(host: str, private_key: str, chain_id: int = 137) -> Optional[dict]:
    try:
        from py_clob_client.client import ClobClient
    except Exception as exc:  # pragma: no cover - dependency missing
        print("py_clob_client is required: pip install py_clob_client", file=sys.stderr)
        print(str(exc), file=sys.stderr)
        return None
    client = ClobClient(host, key=private_key, chain_id=chain_id)
    try:
        creds = client.create_or_derive_api_creds()
    except Exception:
        creds = client.derive_api_key()
    if not creds:
        return None
    return {
        "key": getattr(creds, "api_key", None) or getattr(creds, "key", None),
        "secret": getattr(creds, "api_secret", None) or getattr(creds, "secret", None),
        "passphrase": getattr(creds, "api_passphrase", None) or getattr(creds, "passphrase", None),
    }


def main(argv: Optional[list[str]] = None) -> int:
    p = argparse.ArgumentParser(description="Derive or create Polymarket API credentials")
    p.add_argument("--host", default=os.getenv("CLOB_REST_URL", "https://clob.polymarket.com"))
    p.add_argument("--private-key", dest="private_key", default=os.getenv("POLY_PRIVATE_KEY"))
    p.add_argument("--chain-id", dest="chain_id", type=int, default=int(os.getenv("POLYGON_CHAIN_ID", "137")))
    p.add_argument("--env-only", action="store_true", help="Print only .env lines for convenience")
    args = p.parse_args(argv)

    if not args.private_key:
        print("Missing --private-key or POLY_PRIVATE_KEY", file=sys.stderr)
        return 2

    creds = _derive(args.host, args.private_key, args.chain_id)
    if not creds:
        print("Failed to derive Polymarket API credentials", file=sys.stderr)
        return 1

    if not args.env_only:
        print(json.dumps(creds, indent=2))

    # Emit .env snippet (do not store automatically to disk)
    print("\n# .env snippet (do NOT commit)")
    print(f"POLYMARKET_API_KEY={creds['key']}")
    print(f"POLYMARKET_API_SECRET={creds['secret']}")
    print(f"POLYMARKET_API_PASSPHRASE={creds['passphrase']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

