from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Dict, List, Any
import time

from .alerts import manager as alert_manager


class EventStore:
    def __init__(self, log_file: str | None = None, capacity: int = 2000):
        self._events: Dict[str, List[Dict[str, Any]]] = {}
        self._log_file = log_file
        self._capacity = capacity

    def add(self, vault: str, event: Dict[str, Any]) -> None:
        arr = self._events.setdefault(vault, [])
        event.setdefault("ts", time.time())
        arr.append(event)
        if len(arr) > self._capacity:
            del arr[0 : len(arr) - self._capacity]
        if self._log_file:
            try:
                p = Path(self._log_file)
                p.parent.mkdir(parents=True, exist_ok=True)
                with p.open("a", encoding="utf-8") as f:
                    f.write(json.dumps({"vault": vault, **event}, ensure_ascii=False) + "\n")
            except Exception:
                pass
        try:
            alert_manager.on_event(vault, event)
        except Exception:
            pass

    def list(
        self,
        vault: str,
        limit: int | None = None,
        since: float | None = None,
        types: List[str] | None = None,
    ) -> List[Dict[str, Any]]:
        arr = list(self._events.get(vault, []))
        if since is not None:
            arr = [e for e in arr if float(e.get("ts", 0)) >= float(since)]
        if types:
            tset = set(types)
            arr = [e for e in arr if str(e.get("type")) in tset]
        if limit is not None and limit >= 0:
            return arr[-limit:]
        return arr


EVENT_LOG_FILE = os.getenv("EVENT_LOG_FILE") or None
store = EventStore(log_file=EVENT_LOG_FILE)
