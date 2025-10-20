from .base import BaseStrategy


from src.polymarket.utils.logging_utils import get_logger, retry_on_failure, async_retry_on_failure, log_execution_time, async_log_execution_time
logger = get_logger(__name__)

class ArbitrageStrategy(BaseStrategy):
    """跨市场套利策略"""

    def __init__(self, threshold=0.05, balance=10000):
        super().__init__(balance)
        self.threshold = threshold

    @log_execution_time
    def find_opportunities(self, market_a, market_b):
        price_diff = market_a['price'] - market_b['price']

        if abs(price_diff) > self.threshold:
            buy_market = market_a if price_diff < 0 else market_b
            sell_market = market_b if price_diff < 0 else market_a

            return {
                'action': 'arbitrage',
                'buy_market': buy_market['market_id'],
                'buy_price': buy_market['price'],
                'sell_market': sell_market['market_id'],
                'sell_price': sell_market['price'],
                'spread': round(abs(price_diff), 4),
                'size': self._calculate_position_size()
            }

        return None

    def _calculate_position_size(self):
        return round(min(0.05 * self.balance, 500), 2)
