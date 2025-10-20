from __future__ import annotations

from typing import Set, Dict
import threading

_vaults: Dict[str, str] = {}
_lock = threading.Lock()


def register(vault: str) -> None:
    """Register a vault id that should receive listener events."""
    if not vault:
        return
    key = vault.lower()
    with _lock:
        _vaults[key] = vault


def all_vaults() -> Set[str]:
    """Return a copy of all registered vault ids."""
    with _lock:
        return set(_vaults.values())


def clear() -> None:
    with _lock:
        _vaults.clear()
