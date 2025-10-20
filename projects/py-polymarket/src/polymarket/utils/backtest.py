import backtrader as bt

import numpy as np
import pandas as pd



from src.polymarket.utils.logging_utils import get_logger, retry_on_failure, async_retry_on_failure, log_execution_time, async_log_execution_time
logger = get_logger(__name__)

class PolymarketData(bt.feeds.PandasData):
    lines = ('yes_price', 'no_price', 'resolved', 'outcome')
    params = (('yes_price', -1), ('no_price', -1), ('resolved', -1), ('outcome', -1))


class PolymarketBacktestStrategy(bt.Strategy):
    params = dict(
        threshold=0.7,          # 做多 yes 的阈值
        short_threshold=0.3,    # 做空 yes 的阈值
        stake=100,              # 每次下注金额
        gas_fee=2               # 每次交易的 gas 成本（可设为0）
    )

    def __init__(self):
        self.order = None
        self.position_price = 0
        self.pnl = 0
        self.resolved = False
        self.total_cost = 0

    @log_execution_time
    def next(self):
        if self.data.resolved[0]:
            self.close()  # 强平所有仓位
            if self.position:
                # 结算 PnL（根据实际 outcome）
                outcome = int(self.data.outcome[0])
                if self.position.size > 0:
                    self.pnl += self.params.stake * (1.0 if outcome == 1 else 0.0) - self.position_price * self.params.stake
                elif self.position.size < 0:
                    self.pnl += self.params.stake * (1.0 if outcome == 0 else 0.0) - self.position_price * self.params.stake
            return

        yes_price = self.data.yes_price[0]
        no_price = self.data.no_price[0]

        # 风控：防止 near-0 或 near-1 出现错误交易
        if yes_price < 0.01 or yes_price > 0.99:
            return

        if not self.position:
            if yes_price < self.params.short_threshold:
                self.sell(size=self.params.stake)
                self.position_price = yes_price
                self.total_cost += self.params.gas_fee
            elif yes_price > self.params.threshold:
                self.buy(size=self.params.stake)
                self.position_price = yes_price
                self.total_cost += self.params.gas_fee

    @log_execution_time
    def stop(self):
        # 最终结算时考虑总成本
        self.pnl -= self.total_cost
        self.log(f"最终PNL: {self.pnl:.2f}, 总Gas成本: {self.total_cost:.2f}")

    @log_execution_time
    def log(self, txt):
        print(f"[策略日志] {txt}")


class BacktraderWrapper:
    @log_execution_time
    def run(self, strategy, data):
        cerebro = bt.Cerebro()
        cerebro.adddata(PolymarketData(dataname=data))
        cerebro.addstrategy(strategy)
        cerebro.broker.set_cash(10000)
        cerebro.addanalyzer(bt.analyzers.SharpeRatio, _name='sharpe')
        cerebro.addanalyzer(bt.analyzers.Returns, _name='returns')
        results = cerebro.run()
        sharpe = results[0].analyzers.sharpe.get_analysis().get('sharperatio', 0)
        total_return = results[0].analyzers.returns.get_analysis().get('rtot', 0)
        return {
            'sharpe': sharpe,
            'return': total_return
        }
