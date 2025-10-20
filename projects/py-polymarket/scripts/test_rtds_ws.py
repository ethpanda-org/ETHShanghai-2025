"""
Minimal RTDS WebSocket connectivity probe.

Purpose: verify if the current network can establish and maintain a WS
connection to Polymarket RTDS (wss://ws-live-data.polymarket.com).

Usage examples (PowerShell):
  .venv\.venv\Scripts\python.exe scripts\test_rtds_ws.py
  .venv\.venv\Scripts\python.exe scripts\test_rtds_ws.py --duration 20 --verbose
  .venv\.venv\Scripts\python.exe scripts\test_rtds_ws.py --proxy http://user:pass@host:port
  .venv\.venv\Scripts\python.exe scripts\test_rtds_ws.py --payload '{"type":"ping"}'

Notes:
- This script does not assume a particular RTDS subscription schema. If you
  know the subscription payload, pass it via --payload (JSON string).
- Without --payload, it will connect, send a lightweight text "PING" every
  10s, and print any server messages received (up to a limit) to validate WS
  traversal and TLS.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
from typing import Optional

import aiohttp


async def probe(
    url: str,
    *,
    proxy: Optional[str] = None,
    payload: Optional[str] = None,
    duration: float = 15.0,
    verbose: bool = False,
    heartbeat: float = 20.0,
) -> int:
    logging.basicConfig(
        format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
        level=logging.DEBUG if verbose else logging.INFO,
    )
    log = logging.getLogger("rtds-probe")
    timeout = aiohttp.ClientTimeout(total=None, sock_connect=10, sock_read=None)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        log.info("Connecting to %s (proxy=%s, hb=%ss)", url, "set" if proxy else "none", heartbeat)
        try:
            async with session.ws_connect(url, proxy=proxy, heartbeat=heartbeat) as ws:
                log.info("WebSocket handshake OK")
                # Optional: send provided JSON payload
                if payload:
                    try:
                        obj = json.loads(payload)
                        await ws.send_json(obj)
                        log.info("Sent JSON subscription payload")
                    except Exception as exc:
                        log.warning("Failed to parse/send payload as JSON (%s); sending as text", exc)
                        await ws.send_str(payload)

                async def _text_ping():
                    try:
                        while True:
                            await asyncio.sleep(10)
                            try:
                                await ws.send_str("PING")
                            except Exception:
                                break
                    except asyncio.CancelledError:
                        pass

                ping_task = asyncio.create_task(_text_ping())
                received = 0
                end = asyncio.get_event_loop().time() + max(1.0, duration)
                while asyncio.get_event_loop().time() < end:
                    try:
                        msg = await asyncio.wait_for(ws.receive(), timeout=1.0)
                    except asyncio.TimeoutError:
                        continue
                    if msg.type == aiohttp.WSMsgType.TEXT:
                        received += 1
                        snippet = msg.data
                        if len(snippet) > 500:
                            snippet = snippet[:500] + "..."
                        log.info("Message #%d: %s", received, snippet)
                    elif msg.type == aiohttp.WSMsgType.BINARY:
                        received += 1
                        log.info("Message #%d: <binary %d bytes>", received, len(msg.data) if msg.data else 0)
                    elif msg.type == aiohttp.WSMsgType.ERROR:
                        log.error("WS error: %s", msg.data)
                        ping_task.cancel()
                        return 3
                    elif msg.type in (aiohttp.WSMsgType.CLOSING, aiohttp.WSMsgType.CLOSED):
                        log.warning("WS closed by server (code=%s)", getattr(ws, "close_code", None))
                        ping_task.cancel()
                        return 4
                ping_task.cancel()
                log.info("Done. Received %d messages in %.1fs", received, duration)
                return 0 if received >= 0 else 5
        except Exception as exc:
            log.error("Handshake/stream failed: %s", exc)
            return 2


def main(argv: Optional[list[str]] = None) -> int:
    p = argparse.ArgumentParser(description="Polymarket RTDS WebSocket connectivity probe")
    p.add_argument("--url", default="wss://ws-live-data.polymarket.com", help="RTDS WebSocket URL")
    p.add_argument("--proxy", default=None, help="Optional HTTP proxy URL (e.g., http://user:pass@host:port)")
    p.add_argument("--payload", default=None, help="JSON subscription payload to send after connect")
    p.add_argument("--duration", type=float, default=15.0, help="Seconds to keep the socket open and read messages")
    p.add_argument("--heartbeat", type=float, default=20.0, help="WebSocket heartbeat interval (seconds)")
    p.add_argument("--verbose", action="store_true", help="Enable debug logging")
    args = p.parse_args(argv)
    return asyncio.run(
        probe(
            args.url,
            proxy=args.proxy,
            payload=args.payload,
            duration=args.duration,
            verbose=args.verbose,
            heartbeat=args.heartbeat,
        )
    )


if __name__ == "__main__":
    raise SystemExit(main())

