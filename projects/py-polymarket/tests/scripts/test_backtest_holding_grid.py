from scripts.backtest_holding_grid import HorizonResult, pareto_frontier


def test_pareto_frontier_filters_dominated_points():
    results = [
        HorizonResult(60, 10, 0.55, 0.02, 200.0, 190.0, 10.0, 12, 0.0, 0.0),
        HorizonResult(180, 12, 0.60, 0.03, 300.0, 285.0, 15.0, 14, 0.0, 0.0),
        HorizonResult(300, 9, 0.50, 0.01, 100.0, 90.0, 10.0, 11, 0.0, 0.0),
        HorizonResult(600, 8, 0.62, 0.028, 280.0, 265.0, 15.0, 10, 0.0, 0.0),
    ]
    frontier = pareto_frontier(results)
    seconds = [item.holding_seconds for item in frontier]
    assert 60 not in seconds
    assert 300 not in seconds
    assert 180 in seconds
    assert 600 in seconds

