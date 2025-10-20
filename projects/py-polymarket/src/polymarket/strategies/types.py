"""Common strategy data structures."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict


@dataclass
class StrategyDecision:
    """Normalized output produced by individual strategies."""

    bias: float  # -1.0 (strong sell) .. +1.0 (strong buy)
    confidence: float  # 0.0 .. 1.0
    size_hint: float  # relative sizing hint (0 .. 1 preferred)
    reason: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    def clamp(self) -> "StrategyDecision":
        self.bias = max(-1.0, min(1.0, float(self.bias)))
        self.confidence = max(0.0, min(1.0, float(self.confidence)))
        self.size_hint = max(0.0, min(1.0, float(self.size_hint)))
        return self


__all__ = ["StrategyDecision"]
