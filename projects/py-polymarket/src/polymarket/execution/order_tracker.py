"""Order lifecycle tracking utilities for trade execution."""

from __future__ import annotations
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _round(value: float, places: int = 6) -> float:
    return round(float(value), places)


@dataclass
class ExecutionReport:
    """Summary of a single order submission/initial fill."""

    order_id: str
    market_id: str
    action: str
    requested_notional: float
    requested_shares: float
    filled_notional: float
    filled_shares: float
    average_price: float
    fees: float
    status: str
    execution_mode: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=_now_iso)

    @property
    def remaining_notional(self) -> float:
        return max(0.0, self.requested_notional - self.filled_notional)

    @property
    def remaining_shares(self) -> float:
        return max(0.0, self.requested_shares - self.filled_shares)

    @property
    def is_filled(self) -> bool:
        return self.remaining_notional <= 1e-8

    @classmethod
    def build(
        cls,
        *,
        order_id: Optional[str],
        market_id: str,
        action: str,
        requested_notional: float,
        requested_shares: float,
        filled_notional: float,
        filled_shares: float,
        average_price: float,
        fees: float,
        status: str,
        execution_mode: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> "ExecutionReport":
        if not order_id:
            order_id = uuid.uuid4().hex
        return cls(
            order_id=order_id,
            market_id=market_id,
            action=action,
            requested_notional=_round(requested_notional),
            requested_shares=_round(requested_shares),
            filled_notional=_round(filled_notional),
            filled_shares=_round(filled_shares),
            average_price=_round(average_price) if filled_shares > 0 else 0.0,
            fees=_round(fees),
            status=status,
            execution_mode=execution_mode,
            metadata=dict(metadata or {}),
        )


@dataclass
class FillUpdate:
    """External fill update applied after initial submission."""

    order_id: str
    notional: float
    shares: float
    price: float
    fees: float
    execution_mode: str
    source: str = "external"
    timestamp: str = field(default_factory=_now_iso)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class OrderState:
    """Aggregated order lifecycle state."""

    order_id: str
    market_id: str
    action: str
    requested_notional: float
    requested_shares: float
    execution_mode: str
    status: str = "pending"
    filled_notional: float = 0.0
    filled_shares: float = 0.0
    average_price: float = 0.0
    fees_total: float = 0.0
    fills: List[FillUpdate] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=_now_iso)
    updated_at: str = field(default_factory=_now_iso)

    def record_fill(
        self,
        *,
        notional: float,
        shares: float,
        price: float,
        fees: float,
        execution_mode: Optional[str] = None,
        source: str = "simulation",
        timestamp: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        if shares <= 0 or notional <= 0:
            return
        self.filled_notional = _round(self.filled_notional + notional)
        self.filled_shares = _round(self.filled_shares + shares)
        weight_total = max(self.filled_shares, 1e-12)
        # Weighted average price using existing aggregate price and new fill
        previous_contrib = self.average_price * (self.filled_shares - shares)
        new_contrib = price * shares
        self.average_price = _round((previous_contrib + new_contrib) / weight_total)
        self.fees_total = _round(self.fees_total + fees)
        if execution_mode:
            self.execution_mode = execution_mode
        update = FillUpdate(
            order_id=self.order_id,
            notional=_round(notional),
            shares=_round(shares),
            price=_round(price),
            fees=_round(fees),
            execution_mode=self.execution_mode,
            source=source,
            timestamp=timestamp or _now_iso(),
            metadata=dict(metadata or {}),
        )
        self.fills.append(update)
        self.updated_at = update.timestamp
        if self.filled_notional + 1e-8 >= self.requested_notional or self.filled_shares + 1e-8 >= self.requested_shares:
            self.status = "filled"
        else:
            self.status = "partial"

    @property
    def remaining_notional(self) -> float:
        return max(0.0, self.requested_notional - self.filled_notional)

    @property
    def remaining_shares(self) -> float:
        return max(0.0, self.requested_shares - self.filled_shares)

    @property
    def filled_ratio(self) -> float:
        if self.requested_notional <= 0:
            return 0.0
        return max(0.0, min(1.0, self.filled_notional / self.requested_notional))


class OrderLifecycleTracker:
    """Track lifecycle of submitted orders and downstream fill updates."""

    def __init__(self) -> None:
        self._orders: Dict[str, OrderState] = {}
        self._market_index: Dict[str, List[str]] = {}

    def register(self, report: ExecutionReport) -> OrderState:
        """Register an execution report and seed initial fill state."""
        state = OrderState(
            order_id=report.order_id,
            market_id=report.market_id,
            action=report.action,
            requested_notional=_round(report.requested_notional),
            requested_shares=_round(report.requested_shares),
            execution_mode=report.execution_mode,
            status=report.status,
            metadata=dict(report.metadata or {}),
            created_at=report.timestamp,
            updated_at=report.timestamp,
        )
        if report.filled_shares > 0 and report.filled_notional > 0:
            state.record_fill(
                notional=report.filled_notional,
                shares=report.filled_shares,
                price=report.average_price if report.average_price else report.metadata.get("price", 0.0),
                fees=report.fees,
                execution_mode=report.execution_mode,
                source="initial",
                timestamp=report.timestamp,
                metadata=report.metadata,
            )
        self._orders[state.order_id] = state
        self._market_index.setdefault(report.market_id, []).append(state.order_id)
        return state

    def apply_external_fill(self, update: FillUpdate) -> Optional[OrderState]:
        """Apply an external fill update (e.g., from CLOB reconciliation)."""
        state = self._orders.get(update.order_id)
        if not state:
            return None
        state.record_fill(
            notional=update.notional,
            shares=update.shares,
            price=update.price,
            fees=update.fees,
            execution_mode=update.execution_mode,
            source=update.source,
            timestamp=update.timestamp,
            metadata=update.metadata,
        )
        return state

    def get(self, order_id: str) -> Optional[OrderState]:
        return self._orders.get(order_id)

    def by_market(self, market_id: str) -> Iterable[OrderState]:
        for order_id in self._market_index.get(market_id, []):
            state = self._orders.get(order_id)
            if state is not None:
                yield state

    def pending_orders(self) -> Iterable[OrderState]:
        return (state for state in self._orders.values() if state.status in {"pending", "partial"})

    def finalise(self, order_id: str) -> None:
        state = self._orders.get(order_id)
        if not state:
            return
        state.status = "filled" if state.filled_notional + 1e-8 >= state.requested_notional else "cancelled"
        state.updated_at = _now_iso()

    def prune_completed(self, *, keep_latest: bool = False) -> None:
        """Remove completed orders to keep tracker compact."""
        removable: List[str] = []
        for order_id, state in self._orders.items():
            if state.status not in {"filled", "cancelled"}:
                continue
            removable.append(order_id)
        if keep_latest and removable:
            removable = removable[:-1]
        for order_id in removable:
            state = self._orders.pop(order_id, None)
            if not state:
                continue
            ids = self._market_index.get(state.market_id)
            if not ids:
                continue
            try:
                ids.remove(order_id)
            except ValueError:
                pass
            if not ids:
                self._market_index.pop(state.market_id, None)

    def summary(self, limit: int = 5) -> Dict[str, Any]:
        """Return aggregate statistics for monitoring and diagnostics."""
        counts: Dict[str, int] = {"pending": 0, "partial": 0, "filled": 0, "cancelled": 0}
        pending: List[Dict[str, Any]] = []
        most_recent: Optional[OrderState] = None
        for state in sorted(self._orders.values(), key=lambda s: s.created_at):
            counts[state.status] = counts.get(state.status, 0) + 1
            if most_recent is None or state.created_at >= most_recent.created_at:
                most_recent = state
            if state.status in {"pending", "partial"}:
                pending.append(
                    {
                        "order_id": state.order_id,
                        "market_id": state.market_id,
                        "action": state.action,
                        "requested_notional": state.requested_notional,
                        "filled_notional": state.filled_notional,
                        "remaining_notional": state.remaining_notional,
                        "requested_shares": state.requested_shares,
                        "filled_shares": state.filled_shares,
                        "status": state.status,
                        "created_at": state.created_at,
                        "updated_at": state.updated_at,
                    }
                )
        if pending:
            pending.sort(key=lambda item: item["created_at"], reverse=True)
            if limit and limit > 0 and len(pending) > limit:
                pending = pending[:limit]
        latest_payload: Optional[Dict[str, Any]] = None
        if most_recent is not None:
            latest_payload = {
                "order_id": most_recent.order_id,
                "market_id": most_recent.market_id,
                "action": most_recent.action,
                "status": most_recent.status,
                "requested_notional": most_recent.requested_notional,
                "filled_notional": most_recent.filled_notional,
                "created_at": most_recent.created_at,
                "updated_at": most_recent.updated_at,
            }
        return {
            "total_tracked": len(self._orders),
            "counts": counts,
            "pending": pending,
            "latest_order": latest_payload,
        }


__all__ = ["ExecutionReport", "OrderLifecycleTracker", "OrderState", "FillUpdate"]
