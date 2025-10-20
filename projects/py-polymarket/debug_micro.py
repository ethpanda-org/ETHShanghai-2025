import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[0]
SRC = ROOT / "src"
if SRC.exists():
    sys.path.insert(0, str(SRC))

from polymarket.strategies.simple import MicroArbitrageStrategy

strategy = MicroArbitrageStrategy(
    min_confidence=0.0,
    min_local_liquidity=1000.0,
    min_net_edge=0.01,
    min_spread=0.05,
)
market = {
    'external_real': True,
    'bid': 0.40,
    'ask': 0.44,
    'external_bid': 0.50,
    'external_ask': 0.43,
    'order_liquidity': 5000.0,
}
print('evaluate', strategy.evaluate(market))
from inspect import getsource
print(getsource(MicroArbitrageStrategy._evaluate_external_market))
