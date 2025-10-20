from .base import BaseStrategy


from src.polymarket.utils.logging_utils import get_logger, retry_on_failure, async_retry_on_failure, log_execution_time, async_log_execution_time
logger = get_logger(__name__)

class MarketMakingStrategy(BaseStrategy):
    """简单做市策略"""

    def __init__(self, spread=0.02, balance=10000):
        super().__init__(balance)
        self.spread = spread

    @retry_on_failure(max_retries=3)
    @log_execution_time
    def generate_orders(self, market_data):
        mid_price = (market_data['bid'] + market_data['ask']) / 2
        size = self._calculate_position_size(market_data)

        return {
            'action': 'both',
            'bid': round(mid_price * (1 - self.spread), 4),
            'ask': round(mid_price * (1 + self.spread), 4),
            'size': size,
            'market_id': market_data.get('market_id', 'unknown')
        }

    def _calculate_position_size(self, data):
        volatility = max(data.get('high', 0) - data.get('low', 0), 1e-6)
        return round(min(0.1 * self.balance, 1000 / volatility), 2)
