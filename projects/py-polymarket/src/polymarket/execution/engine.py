"""Trade execution engine for the Polymarket deployment.

By default runs in simulation (offline or dry-run) and only attempts on-chain
submission when explicitly configured with a private key and not in dry-run.
"""

from __future__ import annotations

import logging
from typing import Any, Optional, Tuple

from web3 import Web3

from config import settings
from polymarket.utils.decimals import amount_to_base_units, base_units_to_amount, validate_amount_precision
from .fees import get_fee_manager
from .order_tracker import ExecutionReport

logger = logging.getLogger(__name__)


def _to_float(value: Any) -> Optional[float]:
    try:
        if value is None:
            return None
        result = float(value)
        if result != result:  # NaN check
            return None
        return result
    except (TypeError, ValueError):
        return None


class ExecutionEngine:
    """Interact with the on-chain Polymarket smart contract or simulate fills."""

    def __init__(self) -> None:
        self.w3: Optional[Web3] = None
        self.account = None
        self.read_only = True
        self.execution_mode = "simulation"
        self._fees = get_fee_manager()
        try:
            self._slippage_model = getattr(settings.execution, "slippage_model", "taker")
        except Exception:
            self._slippage_model = "taker"

        try:
            dry_run_flag = getattr(settings, "DRY_RUN", None)
            if dry_run_flag is None:
                dry_run_flag = getattr(settings.trading, "dry_run", False)
            dry_run = bool(dry_run_flag)
        except Exception:
            dry_run = False
        base_token_decimals = 6
        try:
            base_token_decimals = int(getattr(settings.execution, "base_token_decimals", 6))
        except Exception:
            base_token_decimals = 6
        self._base_token_decimals = max(0, base_token_decimals)

        if settings.OFFLINE_MODE or dry_run:
            mode = "offline" if settings.OFFLINE_MODE else "dry-run"
            self.execution_mode = mode
            logger.info("ExecutionEngine running in %s simulation mode", mode)
            return

        self.w3 = Web3(Web3.HTTPProvider(settings.POLYGON_RPC))
        if not self.w3.is_connected():
            logger.error("Unable to reach Polygon RPC endpoint %s", settings.POLYGON_RPC)
            raise ConnectionError("Polygon RPC connection failed")

        private_key = getattr(settings, "POLY_PRIVATE_KEY", None)
        if private_key:
            self.account = self.w3.eth.account.from_key(private_key)
            self.read_only = False
            self.execution_mode = "live"
            logger.info("Execution account: %s", self.account.address)
        else:
            logger.warning("POLY_PRIVATE_KEY missing - execution engine in read-only mode")
            self.execution_mode = "read-only"

    def _resolve_price_and_liquidity(
        self,
        action: str,
        market_snapshot: Optional[dict],
    ) -> Tuple[float, Optional[float]]:
        if market_snapshot is None:
            return 0.5, None
        bid = _to_float(market_snapshot.get("bid"))
        ask = _to_float(market_snapshot.get("ask"))
        yes_price = _to_float(market_snapshot.get("yes_price"))
        no_price = _to_float(market_snapshot.get("no_price"))
        liquidity = _to_float(market_snapshot.get("liquidity"))

        action_norm = action.lower()
        if action_norm == "yes":
            price = ask if ask is not None else yes_price
            if price is None and bid is not None:
                price = min(0.99, max(0.01, bid + 0.01))
            if price is None:
                price = 0.5
            liquidity_shares = _to_float(market_snapshot.get("liquidity_yes")) or liquidity
        else:
            price = bid if bid is not None else yes_price
            if price is None:
                price = 0.5
            liquidity_shares = _to_float(market_snapshot.get("liquidity_no")) or liquidity

        if liquidity_shares is not None and liquidity_shares < 0:
            liquidity_shares = 0.0
        return float(max(0.01, min(0.99, price))), liquidity_shares

    def _simulate_fill_shares(self, requested_shares: float, liquidity_shares: Optional[float]) -> float:
        if requested_shares <= 0:
            return 0.0
        if liquidity_shares is None or liquidity_shares <= 0:
            return requested_shares
        return min(requested_shares, liquidity_shares)

    def _fee_rate(self) -> float:
        model = str(self._slippage_model).lower()
        if model.startswith("maker"):
            return max(0.0, self._fees.maker_fee)
        return max(0.0, self._fees.taker_fee)

    def execute_trade(
        self,
        market_id: str,
        action: str,
        amount: float,
        market_snapshot: Optional[dict] = None,
    ) -> ExecutionReport:
        """Submit a trade or simulate the resulting fills."""

        amount = float(amount or 0.0)
        price, liquidity_shares = self._resolve_price_and_liquidity(action, market_snapshot)
        requested_shares = amount / price if price > 0 else 0.0
        fee_rate = self._fee_rate()

        if self.read_only or not self.w3 or not self.account:
            filled_shares = self._simulate_fill_shares(requested_shares, liquidity_shares)
            filled_notional = filled_shares * price
            # Guard against rounding undershoot when we expect full fill
            if filled_notional <= 0 and amount > 0:
                filled_notional = amount
                filled_shares = requested_shares
            status = "filled" if filled_notional + 1e-8 >= amount else "partial"
            fees = filled_notional * fee_rate
            logger.info(
                "[SIM] %s %s size=%.4f price=%.4f filled=%.4f status=%s",
                market_id,
                action,
                amount,
                price,
                filled_notional,
                status,
            )
            return ExecutionReport.build(
                order_id=None,
                market_id=market_id,
                action=action,
                requested_notional=amount,
                requested_shares=requested_shares,
                filled_notional=filled_notional,
                filled_shares=filled_shares,
                average_price=price,
                fees=fees,
                status=status,
                execution_mode=self.execution_mode,
                metadata={
                    "price": price,
                    "liquidity_shares": liquidity_shares,
                    "mode": "simulated",
                    "fee_rate": fee_rate,
                },
            )

        logger.info("Submitting trade %s %s size=%.4f", market_id, action, amount)
        outcome = 1 if action.lower() == "yes" else 0
        contract = self.w3.eth.contract(address=settings.POLYMARKET_CONTRACT, abi=settings.ABI)
        try:
            base_amount = amount_to_base_units(amount, self._base_token_decimals)
        except ValueError as exc:
            raise ValueError(f"invalid trade amount {amount}: {exc}") from exc
        precise_amount = base_units_to_amount(base_amount, self._base_token_decimals)
        ok, error = validate_amount_precision(amount, self._base_token_decimals)
        if not ok:
            logger.warning(
                "Amount %.10f exceeds precision for %s decimals; rounding to %.10f (error %.6g)",
                amount,
                self._base_token_decimals,
                precise_amount,
                error,
            )
        amount = precise_amount

        tx = contract.functions.trade(market_id, outcome, base_amount).buildTransaction(
            {
                "from": self.account.address,
                "nonce": self.w3.eth.get_transaction_count(self.account.address),
                "gas": 250_000,
                "gasPrice": self.w3.toWei("50", "gwei"),
            }
        )

        signed_tx = self.account.sign_transaction(tx)
        try:
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            logger.info("Trade submitted: %s", tx_hash.hex())
            return ExecutionReport.build(
                order_id=None,
                market_id=market_id,
                action=action,
                requested_notional=amount,
                requested_shares=requested_shares,
                filled_notional=amount,
                filled_shares=requested_shares,
                average_price=price,
                fees=amount * fee_rate,
                status="submitted",
                execution_mode=self.execution_mode,
                metadata={"tx_hash": tx_hash.hex(), "price": price, "fee_rate": fee_rate},
            )
        except Exception as exc:  # pragma: no cover - network failure
            logger.error("Trade submission failed: %s", exc)
            return ExecutionReport.build(
                order_id=None,
                market_id=market_id,
                action=action,
                requested_notional=amount,
                requested_shares=requested_shares,
                filled_notional=0.0,
                filled_shares=0.0,
                average_price=price,
                fees=0.0,
                status="failed",
                execution_mode=self.execution_mode,
                metadata={"error": str(exc), "fee_rate": fee_rate},
            )


__all__ = ["ExecutionEngine", "ExecutionReport"]
