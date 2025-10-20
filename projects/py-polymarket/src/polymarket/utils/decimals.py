"""Helpers for converting between human-readable and base-unit token amounts."""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP, getcontext
from typing import Tuple

getcontext().prec = 28  # sufficient for 6-18 decimal token precision


def amount_to_base_units(amount: float, decimals: int = 6) -> int:
    """Convert a float/decimal amount into integer base units with rounding."""
    if amount is None:
        raise ValueError("amount is required")
    if decimals < 0:
        raise ValueError("decimals must be non-negative")
    dec_amount = Decimal(str(amount))
    if dec_amount < 0:
        raise ValueError("amount must be non-negative")
    scale = Decimal(10) ** decimals
    scaled = (dec_amount * scale).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(scaled)


def base_units_to_amount(value: int, decimals: int = 6) -> float:
    """Convert integer base units back to float."""
    if decimals < 0:
        raise ValueError("decimals must be non-negative")
    scale = Decimal(10) ** decimals
    return float(Decimal(int(value)) / scale)


def validate_amount_precision(amount: float, decimals: int = 6) -> Tuple[bool, float]:
    """Return True if amount fits within the token precision, along with absolute error."""
    canonical_units = amount_to_base_units(amount, decimals)
    canonical_amount = base_units_to_amount(canonical_units, decimals)
    error = abs(float(Decimal(str(amount)) - Decimal(str(canonical_amount))))
    tolerance = 1 / (10 ** decimals)
    return error <= tolerance, error


__all__ = ["amount_to_base_units", "base_units_to_amount", "validate_amount_precision"]
