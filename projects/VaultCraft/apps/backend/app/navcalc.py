from __future__ import annotations

from typing import Dict

from .positions import get_profile
from .price_provider import PriceRouter
from .hyper_exec import HyperExecClient
from .snapshots import store as snapshot_store


def compute_unit_nav(vault_id: str) -> float:
    prof = get_profile(vault_id)
    syms = list(prof.get("positions", {}).keys()) if prof else []
    router = PriceRouter()
    prices: Dict[str, float] = {}
    if syms:
        try:
            prices = router.get_index_prices(syms)
        except Exception:
            prices = {s: 1000.0 + 100.0 * i for i, s in enumerate(syms)}
    nav_val = HyperExecClient.pnl_to_nav(
        cash=prof.get("cash", 1_000_000.0), positions=prof.get("positions", {}), index_prices=prices
    )
    unit = nav_val / prof.get("denom", 1_000_000.0)
    return float(round(unit, 6))


def snapshot_now(vault_id: str) -> float:
    unit = compute_unit_nav(vault_id)
    snapshot_store.add(vault_id, unit, None)
    return unit

