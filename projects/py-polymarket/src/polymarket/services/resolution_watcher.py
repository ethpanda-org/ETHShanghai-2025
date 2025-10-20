"""Resolution watcher for Polymarket markets.

Polls market metadata to detect resolution and realizes PnL for open
positions. Prefer REST/WS via py_clob_client; GraphQL is a fallback.

This module is intentionally minimal and not yet wired into the main loop.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List, Optional

from config import settings
from polymarket.services.market_service import MarketDataService


logger = logging.getLogger(__name__)


@dataclass
class ResolutionEvent:
    market_id: str
    resolved: bool
    winning_outcome: Optional[str]
    resolved_at: Optional[str]


class ResolutionWatcher:
    """Periodically checks market states and emits resolution events."""

    def __init__(self, interval_seconds: int = 60, service: Optional[MarketDataService] = None) -> None:
        self._interval = max(10, interval_seconds)
        self._svc = service or MarketDataService()
        self._seen_resolved: Dict[str, bool] = {}

    def _parse_resolution_from_raw(self, raw: Dict[str, object]) -> ResolutionEvent:
        mid = str(raw.get("market_id") or raw.get("id") or raw.get("condition_id") or "")
        # Broad set of flags commonly seen across sources
        status = str(raw.get("status") or "").lower()
        active = bool(raw.get("active", True))
        accepting = bool(raw.get("accepting_orders", True))
        resolved_flag = bool(raw.get("resolved", False)) or bool(raw.get("is_resolved", False))
        resolved_flag = resolved_flag or (status in {"resolved", "closed", "finalized"})
        resolved_flag = resolved_flag or (not active and not accepting)
        # winner keys
        winner = raw.get("winning_outcome") or raw.get("winner") or raw.get("finalOutcome") or raw.get("outcome")
        if isinstance(winner, str):
            winner = winner.lower()
            if winner in {"yes", "no"}:
                winning_outcome = winner
            elif winner in {"1", "true", "win", "y"}:
                winning_outcome = "yes"
            elif winner in {"0", "false", "n"}:
                winning_outcome = "no"
            else:
                winning_outcome = None
        else:
            winning_outcome = None
        ts = raw.get("resolved_at") or raw.get("finalized_at") or raw.get("closed_at")
        ts = str(ts) if ts else datetime.now(timezone.utc).isoformat()
        return ResolutionEvent(market_id=mid, resolved=bool(resolved_flag), winning_outcome=winning_outcome, resolved_at=ts)

    async def _try_fetch_winner_rest(self, market_id: str) -> Optional[ResolutionEvent]:
        """Attempt to use the underlying REST client (py_clob_client) to fetch richer market metadata.

        This function is best-effort and resilient to attribute differences across client versions.
        """
        try:
            # Reach underlying rest client
            ingestion = getattr(self._svc, "_ingestion", None)
            rest = getattr(ingestion, "_rest_provider", None)
            client = getattr(rest, "_client", None)
            if client is None:
                return None
            # Try common method names dynamically
            cand = [
                "get_market",
                "get_market_by_id",
                "get_market_info",
                "get_market_details",
            ]
            data = None
            for name in cand:
                func = getattr(client, name, None)
                if func is None:
                    continue
                try:
                    res = func(market_id)
                    if isinstance(res, dict) and res:
                        data = res
                        break
                    # some clients may return objects with __dict__
                    if hasattr(res, "__dict__"):
                        data = dict(res.__dict__)
                        break
                except Exception:
                    continue
            if not data:
                return None
            ev = self._parse_resolution_from_raw(data)
            return ev if ev.resolved else None
        except Exception:
            return None

    async def poll_once(self, candidates: List[str]) -> List[ResolutionEvent]:
        if not candidates:
            return []
        # Best-effort: fetch snapshots and infer resolution from flags present
        try:
            snaps = await self._svc.get_snapshots(force_refresh=True)
        except Exception as exc:  # pragma: no cover - network issues
            logger.warning("Resolution poll failed: %s", exc)
            return []
        snap_map = {s.market_id: s for s in snaps}
        events: List[ResolutionEvent] = []
        for mid in candidates:
            s = snap_map.get(mid)
            if s:
                ev = self._parse_resolution_from_raw(s.raw)
                if ev.resolved and not self._seen_resolved.get(mid):
                    self._seen_resolved[mid] = True
                    # If winner unknown, attempt REST enrichment
                    if not ev.winning_outcome:
                        rest_ev = await self._try_fetch_winner_rest(mid)
                        if rest_ev and rest_ev.winning_outcome:
                            ev = rest_ev
                    events.append(ev)
            else:
                # As last resort, try REST lookup even when snapshot missing
                rest_ev = await self._try_fetch_winner_rest(mid)
                if rest_ev and rest_ev.resolved and not self._seen_resolved.get(mid):
                    self._seen_resolved[mid] = True
                    events.append(rest_ev)
        return events

    async def run(self, get_open_markets_cb) -> None:  # pragma: no cover - background task
        while True:
            try:
                mids: List[str] = list(get_open_markets_cb())
                events = await self.poll_once(mids)
                for ev in events:
                    logger.info("[resolution] market=%s resolved=%s winning=%s", ev.market_id, ev.resolved, ev.winning_outcome)
            except Exception as exc:
                logger.warning("Resolution watcher loop error: %s", exc)
            await asyncio.sleep(self._interval)


__all__ = ["ResolutionWatcher", "ResolutionEvent"]
