from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Dict, Any


def _repo_root() -> Path:
    root = Path(__file__).resolve()
    for _ in range(10):
        if (root / ".git").exists() or (root / "README.md").exists():
            break
        if root.parent == root:
            break
        root = root.parent
    return root


def _positions_path() -> Path:
    p = os.getenv("POSITIONS_FILE") or "deployments/positions.json"
    path = Path(p)
    if not path.is_absolute():
        path = _repo_root() / path
    return path


def _read_all() -> Dict[str, Any]:
    p = _positions_path()
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text() or "{}")
    except Exception:
        return {}


def _write_all(data: Dict[str, Any]) -> None:
    p = _positions_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False))


def get_profile(vault_id: str) -> Dict[str, Any]:
    """Return profile dict: {cash: float, positions: {sym: delta}, denom: float}."""
    data = _read_all()
    prof = data.get(vault_id)
    if isinstance(prof, dict) and "positions" in prof:
        # Normalize numeric fields
        cash = float(prof.get("cash", 0.0))
        denom = float(prof.get("denom", max(cash, 1.0)))
        positions = {str(k): float(v) for k, v in dict(prof.get("positions", {})).items()}
        return {"cash": cash, "positions": positions, "denom": denom}
    # Fallback to default
    return {"cash": 1_000_000.0, "positions": {}, "denom": 1_000_000.0}


def set_profile(vault_id: str, profile: Dict[str, Any]) -> None:
    cash = float(profile.get("cash", 0.0))
    denom = float(profile.get("denom", max(cash, 1.0)))
    positions = {str(k): float(v) for k, v in dict(profile.get("positions", {})).items()}
    data = _read_all()
    data[vault_id] = {"cash": cash, "positions": positions, "denom": denom}
    _write_all(data)


def apply_fill(vault_id: str, symbol: str, size: float, side: str) -> Dict[str, Any]:
    """Apply a filled order to positions and persist profile.

    side: 'buy' increases delta; 'sell' decreases delta.
    Returns updated profile.
    """
    prof = get_profile(vault_id)
    pos = dict(prof.get("positions", {}))
    cur = float(pos.get(symbol, 0.0))
    delta = float(size) if side == "buy" else -float(size)
    pos[symbol] = cur + delta
    prof["positions"] = pos
    set_profile(vault_id, prof)
    return prof


def apply_close(vault_id: str, symbol: str, size: float | None = None) -> Dict[str, Any]:
    """Reduce exposure towards zero. If size is None, fully close the symbol.
    Returns updated profile.
    """
    prof = get_profile(vault_id)
    pos = dict(prof.get("positions", {}))
    cur = float(pos.get(symbol, 0.0))
    if size is None:
        pos[symbol] = 0.0
    else:
        s = float(size)
        if cur > 0:
            pos[symbol] = max(0.0, cur - s)
        elif cur < 0:
            pos[symbol] = min(0.0, cur + s)
        else:
            pos[symbol] = 0.0
    prof["positions"] = pos
    set_profile(vault_id, prof)
    return prof
