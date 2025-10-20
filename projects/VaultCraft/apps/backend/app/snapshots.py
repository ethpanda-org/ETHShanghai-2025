from __future__ import annotations

from typing import Dict, List, Tuple
import time


class SnapshotStore:
    def __init__(self, capacity: int = 2048):
        self.capacity = capacity
        self._data: Dict[str, List[Tuple[float, float]]] = {}

    def add(self, vault: str, nav: float, ts: float | None = None) -> None:
        ts = ts if ts is not None else time.time()
        arr = self._data.setdefault(vault, [])
        arr.append((ts, nav))
        if len(arr) > self.capacity:
            # drop oldest
            overflow = len(arr) - self.capacity
            del arr[0:overflow]

    def get(self, vault: str, window: int = 60) -> List[Tuple[float, float]]:
        arr = self._data.get(vault, [])
        if window <= 0:
            return []
        return arr[-window:]

    def get_since(self, vault: str, since_ts: float) -> List[Tuple[float, float]]:
        arr = self._data.get(vault, [])
        return [item for item in arr if item[0] >= since_ts]

    def clear(self) -> None:
        self._data.clear()


store = SnapshotStore()
