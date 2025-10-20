"""Unified CLI launcher for the Polymarket trading system."""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
import time
from pathlib import Path
from typing import Any, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from config import reload_settings, settings  # noqa: E402
from polymarket.data.facade import DataIngestionFacade  # noqa: E402
# Lazily import WebMonitor to avoid importing heavy UI code when not needed
WebMonitor = None  # type: ignore
# Defer heavy service imports until command execution
main_loop = None  # type: ignore
OrderLifecycleStreamer = None  # type: ignore


def _configure_logging(level: str) -> None:
    logging.basicConfig(
        format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
        level=getattr(logging, level.upper(), logging.INFO),
    )


def _run_async(coro: Any) -> None:
    try:
        asyncio.run(coro)
    except KeyboardInterrupt:  # pragma: no cover - interactive use
        logging.getLogger(__name__).info("Interrupted by user")


def cmd_trade(args: argparse.Namespace) -> None:
    _configure_logging(args.log_level)
    logging.getLogger(__name__).info("Starting trading loop")
    global main_loop  # type: ignore
    if main_loop is None:
        from polymarket.services.runner import main_loop as _main_loop  # type: ignore
        main_loop = _main_loop  # type: ignore
    _run_async(main_loop(sleep_interval=args.interval))  # type: ignore


def cmd_monitor(args: argparse.Namespace) -> None:
    _configure_logging(args.log_level)
    global WebMonitor  # type: ignore
    if WebMonitor is None:
        # Delayed import to avoid importing UI code for non-monitor commands
        from polymarket.monitoring import WebMonitor as _WebMonitor  # type: ignore
        WebMonitor = _WebMonitor  # type: ignore
    monitor = WebMonitor(port=args.port, auto_open=not args.no_browser)  # type: ignore
    if args.background:
        logging.info("Launching monitor in background on port %s", args.port)
        monitor.start_background()
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:  # pragma: no cover - interactive use
            logging.info("Stopping monitoring dashboard")
            monitor.stop()
    else:
        logging.info("Launching monitor on port %s", args.port)
        monitor.start()


def cmd_config_show(args: argparse.Namespace) -> None:
    _configure_logging(args.log_level)
    snapshot = settings.as_dict()
    logging.info("Current configuration snapshot:")
    for key, value in snapshot.items():
        logging.info("  %s: %s", key, value)


def cmd_config_reload(args: argparse.Namespace) -> None:
    _configure_logging(args.log_level)
    reload_settings()
    logging.info("Configuration reloaded from disk and environment")


def cmd_probe_api(args: argparse.Namespace) -> None:
    _configure_logging(args.log_level)
    facade = DataIngestionFacade(ttl_seconds=0, limit=args.limit)
    try:
        markets = asyncio.run(facade.get_markets(force_refresh=True))
        logging.info("Fetched %s markets (limit=%s)", len(markets), args.limit)
        if markets:
            sample = markets[0]
            logging.info("Sample market: %s bid=%.3f ask=%.3f", sample.market_id, sample.bid, sample.ask)
    except Exception as exc:  # pragma: no cover - best effort diagnostics
        logging.error("API probe failed: %s", exc)
        if args.verbose:
            raise


def cmd_orders_ws(args: argparse.Namespace) -> None:
    _configure_logging(args.log_level)
    global OrderLifecycleStreamer  # type: ignore
    if OrderLifecycleStreamer is None:
        from polymarket.services.order_ws import OrderLifecycleStreamer as _OrderLifecycleStreamer  # type: ignore
        OrderLifecycleStreamer = _OrderLifecycleStreamer  # type: ignore
    streamer = OrderLifecycleStreamer()  # type: ignore
    async def _run() -> None:
        # Fetch a snapshot of markets to seed subscriptions
        svc = DataIngestionFacade(ttl_seconds=0, limit=args.limit)
        try:
            markets = await svc.get_markets(force_refresh=True)
        except Exception as exc:
            logging.error("Failed to fetch markets for order WS: %s", exc)
            markets = []
        ids = [m.market_id for m in markets][: args.limit]
        await streamer.start(ids)
        logging.info("Order WS running for %d markets (SERVICE_USE_ORDER_WS=%s)", len(ids), getattr(settings, 'SERVICE_USE_ORDER_WS', False))
        try:
            while True:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            pass
    try:
        asyncio.run(_run())
    except KeyboardInterrupt:
        logging.info("Stopping order lifecycle streamer")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Polymarket unified command launcher")
    parser.set_defaults(func=None)

    subparsers = parser.add_subparsers(dest="command")

    trade = subparsers.add_parser("trade", help="Run the automated trading loop")
    trade.add_argument("--interval", type=int, default=60, help="Polling interval in seconds")
    trade.add_argument("--log-level", default="INFO", help="Logging level")
    trade.set_defaults(func=cmd_trade)

    monitor = subparsers.add_parser("monitor", help="Start the monitoring dashboard")
    monitor.add_argument("--port", type=int, default=settings.monitoring.port, help="Port to bind the web UI")
    monitor.add_argument("--background", action="store_true", help="Run in background thread")
    monitor.add_argument("--no-browser", action="store_true", help="Do not auto-open browser")
    monitor.add_argument("--log-level", default="INFO")
    monitor.set_defaults(func=cmd_monitor)

    config_parser = subparsers.add_parser("config", help="Inspect or reload configuration")
    config_parser.set_defaults(func=None)
    cfg_sub = config_parser.add_subparsers(dest="config_cmd")

    cfg_show = cfg_sub.add_parser("show", help="Display key configuration values")
    cfg_show.add_argument("--log-level", default="INFO")
    cfg_show.set_defaults(func=cmd_config_show)

    cfg_reload = cfg_sub.add_parser("reload", help="Reload configuration from disk")
    cfg_reload.add_argument("--log-level", default="INFO")
    cfg_reload.set_defaults(func=cmd_config_reload)

    probe = subparsers.add_parser("probe", help="Run quick diagnostics")
    probe.set_defaults(func=None)
    probe_sub = probe.add_subparsers(dest="probe_cmd")

    probe_api = probe_sub.add_parser("api", help="Fetch markets via data facade")
    probe_api.add_argument("--limit", type=int, default=5, help="Number of markets to request")
    probe_api.add_argument("--verbose", action="store_true", help="Raise on failure for debugging")
    probe_api.add_argument("--log-level", default="INFO")
    probe_api.set_defaults(func=cmd_probe_api)

    orders_ws = subparsers.add_parser("orders-ws", help="Start order lifecycle WebSocket streamer (writes JSONL)")
    orders_ws.add_argument("--limit", type=int, default=50, help="Max markets to subscribe")
    orders_ws.add_argument("--log-level", default="INFO")
    orders_ws.set_defaults(func=cmd_orders_ws)

    return parser


def main(argv: Optional[List[str]] = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not getattr(args, "func", None):
        parser.print_help()
        return
    args.func(args)


if __name__ == "__main__":
    main()


