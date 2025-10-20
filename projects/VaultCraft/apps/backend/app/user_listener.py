from __future__ import annotations

import threading
from typing import Any, Dict, List, Tuple
import time

from .settings import Settings
from .navcalc import snapshot_now
from .events import store as event_store
from .listener_registry import all_vaults

_last_ws_event: Dict[str, float] = {}


def _extract_fills(evt: Dict[str, Any]) -> List[Tuple[str, str, float]]:
    """Best-effort extraction of fills from a Hyper user event.

    Returns list of (symbol, side, size). side is 'buy' or 'sell'.
    Accepts multiple shapes to keep tests offline and robust to minor SDK changes.
    """
    out: List[Tuple[str, str, float]] = []
    # Common shapes
    if isinstance(evt.get("fills"), list):
        for f in evt["fills"]:
            name = str(f.get("name") or f.get("symbol") or f.get("coin") or "")
            sz = f.get("sz") or f.get("size") or f.get("qty") or 0.0
            side = f.get("side")
            if side is None:
                is_buy = f.get("dir") or f.get("is_buy")
                side = "buy" if bool(is_buy) else "sell"
            try:
                s = float(sz)
            except Exception:
                continue
            if name and s > 0:
                out.append((name, side, s))
    else:
        # Single fill event
        name = str(evt.get("name") or evt.get("symbol") or evt.get("coin") or "")
        sz = evt.get("sz") or evt.get("size") or evt.get("qty") or 0.0
        side = evt.get("side")
        if side is None:
            is_buy = evt.get("dir") or evt.get("is_buy")
            side = "buy" if bool(is_buy) else "sell"
        try:
            s = float(sz)
        except Exception:
            s = 0.0
        if name and s > 0:
            out.append((name, side, s))
    return out


def process_user_event(vault: str, evt: Dict[str, Any]) -> None:
    """Apply user event fills to positions, snapshot NAV, and log events."""
    fills = _extract_fills(evt)
    if not fills:
        return
    now = time.time()
    targets = all_vaults()
    if not targets:
        targets = {vault}
    for name, side, sz in fills:
        for target in targets:
            try:
                unit = None
                try:
                    unit = snapshot_now(target)
                except Exception:
                    unit = None
                event_store.add(
                    target,
                    {
                        "type": "fill",
                        "status": "applied",
                        "source": "ws",
                        "symbol": name,
                        "side": side,
                        "size": sz,
                        **({"unitNav": unit} if unit is not None else {}),
                    },
                )
                _last_ws_event[target] = now
            except Exception as e:
                event_store.add(target, {"type": "fill", "status": "error", "error": str(e), "symbol": name})
                _last_ws_event.setdefault(target, now)


def last_ws_event(vault: str | None = None) -> float | Dict[str, float] | None:
    """Return last ws fill timestamp (per vault or dict)."""
    if vault is None:
        return dict(_last_ws_event)
    return _last_ws_event.get(vault)


class UserEventsListener:
    def __init__(self, vault: str):
        self._vault = vault
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._info = None

    def _ensure_info(self):
        if self._info is not None:
            return self._info
        env = Settings()
        try:
            from hyperliquid.info import Info  # type: ignore
            from hyperliquid.utils.types import UserEventsSubscription  # type: ignore
        except Exception as e:  # pragma: no cover
            raise RuntimeError("hyperliquid SDK not available for listener") from e
        info = Info(base_url=env.HYPER_API_URL, skip_ws=False, timeout=10)
        self._Info = Info
        self._UserEventsSubscription = UserEventsSubscription
        self._info = info
        return info

    def _callback(self, msg: Any):
        try:
            if isinstance(msg, dict):
                process_user_event(self._vault, msg)
            elif isinstance(msg, list):
                for item in msg:
                    if isinstance(item, dict):
                        process_user_event(self._vault, item)
        except Exception:
            pass

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        env = Settings()
        if not (env.ENABLE_LIVE_EXEC and env.ENABLE_USER_WS_LISTENER):
            return
        sub_user = env.ADDRESS or ""
        if not sub_user:
            # Derive from private key as a convenience when ADDRESS is not set
            try:
                from eth_account import Account  # type: ignore
                pk = env.HYPER_TRADER_PRIVATE_KEY or env.PRIVATE_KEY
                if pk:
                    t = str(pk).strip().strip('"').strip("'")
                    if not t.startswith("0x") and len(t) == 64:
                        t = "0x" + t
                    sub_user = Account.from_key(t).address
            except Exception:
                pass
        # Start thread to manage subscription with simple reconnect
        def run():
            backoff = 1.0
            while not self._stop.is_set():
                try:
                    info = self._ensure_info()
                    sub = self._UserEventsSubscription(user=sub_user)
                    info.subscribe(sub, self._callback)
                    # Main loop
                    backoff = 1.0
                    while not self._stop.is_set():
                        self._stop.wait(1.0)
                    # on stop, disconnect
                    try:
                        info.disconnect_websocket()
                    except Exception:
                        pass
                except Exception:
                    # reconnect with capped backoff
                    self._stop.wait(backoff)
                    backoff = min(backoff * 2.0, 30.0)
                    self._info = None
        self._stop.clear()
        self._thread = threading.Thread(target=run, daemon=True)
        self._thread.start()

    def stop(self):
        self._stop.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)

    def is_running(self) -> bool:
        return bool(self._thread and self._thread.is_alive())
