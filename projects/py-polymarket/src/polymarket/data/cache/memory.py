"""In-memory cache for market snapshots."""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Generic, List, Optional, Tuple, TypeVar

T = TypeVar("T")


@dataclass
class CacheEntry(Generic[T]):
    value: T
    timestamp: float


class TTLCache(Generic[T]):
    def __init__(self, ttl_seconds: int) -> None:
        self._ttl = max(0, ttl_seconds)
        self._entry: Optional[CacheEntry[T]] = None

    def set_ttl(self, ttl_seconds: int) -> None:
        self._ttl = max(0, ttl_seconds)
        if self._ttl == 0:
            self._entry = None

    def set(self, value: T) -> None:
        self._entry = CacheEntry(value=value, timestamp=time.monotonic())

    def get(self) -> Optional[T]:
        if self._entry is None:
            return None
        if self._ttl == 0:
            return None
        age = time.monotonic() - self._entry.timestamp
        if age > self._ttl:
            self._entry = None
            return None
        return self._entry.value

    def metadata(self) -> Optional[Tuple[float, float]]:
        if self._entry is None:
            return None
        age = time.monotonic() - self._entry.timestamp
        return (age, self._entry.timestamp)

    def clear(self) -> None:
        self._entry = None
