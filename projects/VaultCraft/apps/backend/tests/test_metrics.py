from app.metrics import compute_metrics


def test_metrics_flat_nav():
    nav = [1.0] * 10
    m = compute_metrics(nav)
    assert abs(m["ann_return"]) < 1e-12
    assert abs(m["ann_vol"]) < 1e-12
    assert abs(m["sharpe"]) < 1e-12
    assert m["mdd"] == 0.0
    assert m["recovery_days"] == 0


def test_metrics_uptrend():
    nav = [1.0, 1.01, 1.02, 1.05, 1.10, 1.15]
    m = compute_metrics(nav)
    assert m["ann_return"] > 0
    assert m["ann_vol"] > 0
    assert m["sharpe"] > 0
    assert m["mdd"] == 0.0


def test_metrics_drawdown_and_recovery():
    nav = [1.0, 1.1, 1.2, 0.9, 0.95, 1.2]
    m = compute_metrics(nav)
    assert m["mdd"] < 0
    assert m["recovery_days"] > 0

