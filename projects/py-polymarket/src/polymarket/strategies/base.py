
from src.polymarket.utils.logging_utils import get_logger, retry_on_failure, async_retry_on_failure, log_execution_time, async_log_execution_time
logger = get_logger(__name__)

class BaseStrategy:
    def __init__(self, balance=10000):
        self.balance = balance

    @retry_on_failure(max_retries=3)
    @log_execution_time
    def generate_orders(self, market_data):
        """生成下单信号"""
        raise NotImplementedError("必须由子类实现 generate_orders 方法")
