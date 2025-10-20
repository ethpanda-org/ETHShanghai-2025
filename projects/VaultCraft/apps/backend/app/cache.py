from __future__ import annotations

import time
from typing import Dict, Generic, Hashable, Tuple, TypeVar, Optional


K = TypeVar("K", bound=Hashable)
V = TypeVar("V")


class TTLCache(Generic[K, V]):
    def __init__(self, ttl_seconds: float):
        self.ttl = float(ttl_seconds)
        self._store: Dict[K, Tuple[float, V]] = {}

    def get(self, key: K) -> Optional[V]:
        now = time.time()
        item = self._store.get(key)
        if not item:
            return None
        exp, val = item
        if exp < now:
            # expired
            self._store.pop(key, None)
            return None
        return val

    def set(self, key: K, value: V) -> None:
        exp = time.time() + self.ttl
        self._store[key] = (exp, value)

    def clear(self) -> None:
        self._store.clear()

