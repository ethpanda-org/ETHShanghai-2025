from __future__ import annotations

from math import sqrt


def _daily_returns(nav: list[float]) -> list[float]:
    r = []
    for i in range(1, len(nav)):
        if nav[i - 1] == 0:
            continue
        r.append(nav[i] / nav[i - 1] - 1.0)
    return r


def _mean(x: list[float]) -> float:
    return sum(x) / len(x) if x else 0.0


def _std(x: list[float]) -> float:
    m = _mean(x)
    var = sum((v - m) ** 2 for v in x) / (len(x) - 1) if len(x) > 1 else 0.0
    return sqrt(var)


def compute_metrics(nav: list[float]) -> dict:
    """
    Compute basic metrics from NAV series (daily): annualized return, vol, sharpe (rf=0),
    max drawdown and recovery days.
    """
    if not nav or len(nav) < 2:
        return {
            "ann_return": 0.0,
            "ann_vol": 0.0,
            "sharpe": 0.0,
            "mdd": 0.0,
            "recovery_days": 0,
        }

    r = _daily_returns(nav)
    n = len(r)
    prod = 1.0
    for ri in r:
        prod *= (1.0 + ri)
    ann_return = prod ** (365.0 / n) - 1.0 if n > 0 else 0.0
    ann_vol = _std(r) * sqrt(365.0)
    sharpe = ann_return / ann_vol if ann_vol > 1e-12 else 0.0

    # max drawdown & recovery
    peak = nav[0]
    mdd = 0.0
    peak_idx = 0
    trough_idx = 0
    for i, v in enumerate(nav):
        if v > peak:
            peak = v
            peak_idx = i
        dd = (v / peak) - 1.0
        if dd < mdd:
            mdd = dd
            trough_idx = i
    # recovery days: from trough to first >= peak again
    recovery_days = 0
    if trough_idx > peak_idx:
        target = nav[peak_idx]
        for j in range(trough_idx, len(nav)):
            if nav[j] >= target:
                recovery_days = j - peak_idx
                break

    return {
        "ann_return": ann_return,
        "ann_vol": ann_vol,
        "sharpe": sharpe,
        "mdd": mdd,
        "recovery_days": recovery_days,
    }

