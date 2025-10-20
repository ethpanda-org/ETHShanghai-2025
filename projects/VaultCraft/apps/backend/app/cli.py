from __future__ import annotations

import argparse
import json
import os
from typing import Dict

from .hyper_client import HyperHTTP, DEFAULT_API, DEFAULT_RPC
from .hyper_exec import HyperExecClient, Order
from .exec_service import ExecService
from .positions import get_profile, set_profile


def cmd_rpc_ping(args: argparse.Namespace) -> None:
    http = HyperHTTP(api_base=args.api, rpc_url=args.rpc)
    info = http.rpc_ping()
    print(json.dumps({
        "rpc": http.rpc_url,
        "chainId": info.chain_id,
        "blockNumber": info.block_number,
        "gasPriceWei": info.gas_price_wei,
    }, indent=2))


def cmd_build_open(args: argparse.Namespace) -> None:
    cli = HyperExecClient(base_url=args.api)
    payload = cli.build_open_order(Order(symbol=args.symbol, size=args.size, side=args.side, reduce_only=args.reduce, leverage=args.leverage))
    print(json.dumps(payload, indent=2))


def cmd_build_close(args: argparse.Namespace) -> None:
    cli = HyperExecClient(base_url=args.api)
    payload = cli.build_close_order(args.symbol, size=args.size)
    print(json.dumps(payload, indent=2))


def cmd_nav(args: argparse.Namespace) -> None:
    positions: Dict[str, float] = json.loads(args.positions)
    prices: Dict[str, float] = json.loads(args.prices)
    nav = HyperExecClient.pnl_to_nav(cash=args.cash, positions=positions, index_prices=prices)
    print(json.dumps({"nav": nav}, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(prog="vaultcraft-cli", description="VaultCraft backend demo CLI")
    parser.set_defaults(func=lambda _: parser.print_help())
    sub = parser.add_subparsers()

    p1 = sub.add_parser("rpc-ping", help="Ping Hyper EVM RPC (chainId, block, gas)")
    p1.add_argument("--rpc", default=os.getenv("HYPER_RPC_URL", DEFAULT_RPC))
    p1.add_argument("--api", default=os.getenv("HYPER_API_URL", DEFAULT_API))
    p1.set_defaults(func=cmd_rpc_ping)

    p2 = sub.add_parser("build-open", help="Build open order payload (dry-run)")
    p2.add_argument("symbol")
    p2.add_argument("size", type=float)
    p2.add_argument("side", choices=["buy","sell"])
    p2.add_argument("--reduce", action="store_true")
    p2.add_argument("--leverage", type=float, default=None)
    p2.add_argument("--api", default=os.getenv("HYPER_API_URL", DEFAULT_API))
    p2.set_defaults(func=cmd_build_open)

    p3 = sub.add_parser("build-close", help="Build close order payload (dry-run)")
    p3.add_argument("symbol")
    p3.add_argument("--size", type=float, default=None)
    p3.add_argument("--api", default=os.getenv("HYPER_API_URL", DEFAULT_API))
    p3.set_defaults(func=cmd_build_close)

    p4 = sub.add_parser("nav", help="Compute NAV from cash + positions + index prices")
    p4.add_argument("--cash", type=float, default=0.0)
    p4.add_argument("--positions", required=True, help='JSON dict, e.g. {"ETH":0.2,"BTC":-0.1}')
    p4.add_argument("--prices", required=True, help='JSON dict, e.g. {"ETH":3000,"BTC":60000}')
    p4.set_defaults(func=cmd_nav)

    # exec:open
    def cmd_exec_open(args: argparse.Namespace) -> None:
        svc = ExecService()
        out = svc.open(args.vault, Order(symbol=args.symbol, size=args.size, side=args.side, reduce_only=args.reduce, leverage=args.leverage))
        print(json.dumps(out, indent=2))

    p5 = sub.add_parser("exec-open", help="Execute open (live if enabled, else dry-run)")
    p5.add_argument("vault")
    p5.add_argument("symbol")
    p5.add_argument("size", type=float)
    p5.add_argument("side", choices=["buy","sell"])
    p5.add_argument("--reduce", action="store_true")
    p5.add_argument("--leverage", type=float, default=None)
    p5.set_defaults(func=cmd_exec_open)

    # exec:close
    def cmd_exec_close(args: argparse.Namespace) -> None:
        svc = ExecService()
        out = svc.close(args.vault, symbol=args.symbol, size=args.size)
        print(json.dumps(out, indent=2))

    p6 = sub.add_parser("exec-close", help="Execute close (live if enabled, else dry-run)")
    p6.add_argument("vault")
    p6.add_argument("symbol")
    p6.add_argument("--size", type=float, default=None)
    p6.set_defaults(func=cmd_exec_close)

    # positions:get
    def cmd_positions_get(args: argparse.Namespace) -> None:
        prof = get_profile(args.vault)
        print(json.dumps(prof, indent=2))

    p5 = sub.add_parser("positions:get", help="Get positions profile for a vault (cash, positions, denom)")
    p5.add_argument("vault")
    p5.set_defaults(func=cmd_positions_get)

    # positions:set
    def cmd_positions_set(args: argparse.Namespace) -> None:
        profile = json.loads(args.profile)
        set_profile(args.vault, profile)
        print(json.dumps({"ok": True}, indent=2))

    p6 = sub.add_parser("positions:set", help="Set positions profile JSON for a vault")
    p6.add_argument("vault")
    p6.add_argument("profile", help='JSON, e.g. {"cash":1000000,"positions":{"BTC":0.1,"ETH":2.0},"denom":1000000}')
    p6.set_defaults(func=cmd_positions_set)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
