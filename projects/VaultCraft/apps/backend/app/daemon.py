from __future__ import annotations

import threading
import time
from typing import Callable, List

from .navcalc import snapshot_now


class SnapshotDaemon:
    def __init__(self, list_vaults: Callable[[], List[str]], interval_sec: float = 15.0):
        self._list_vaults = list_vaults
        self._interval = interval_sec
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def tick(self) -> None:
        ids = self._list_vaults()
        for vid in ids:
            try:
                snapshot_now(vid)
            except Exception:
                pass

    def run(self) -> None:
        while not self._stop.is_set():
            self.tick()
            self._stop.wait(self._interval)

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self.run, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)

    def is_running(self) -> bool:
        return bool(self._thread and self._thread.is_alive())
