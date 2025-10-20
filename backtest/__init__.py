"""
套利回测模块初始化文件
"""

from .strategy import (
    BaseStrategy,
    ArbitrageStrategy,
    CallableBondStrategy
)

from .engine import (
    BacktestEngine,
    PortfolioEngine
)

from .data_loader import (
    DataLoader,
    CSVDataLoader,
    SimulatedDataLoader
)

from .metrics import (
    FinancialMetrics,
    RiskMetrics,
    PerformanceMetrics
)

from .visualizer import (
    ResultVisualizer,
    PlotGenerator
)

# 工厂函数
def get_strategy(strategy_type: str, **kwargs):
    """获取策略"""
    if strategy_type == 'arbitrage':
        return ArbitrageStrategy(**kwargs)
    elif strategy_type == 'callable_bond':
        return CallableBondStrategy(**kwargs)
    else:
        raise ValueError(f"未知的策略类型: {strategy_type}")

# 数据加载器工厂
class DataLoaderFactory:
    """数据加载器工厂"""
    
    @staticmethod
    def create_loader(loader_type: str, **kwargs):
        """创建数据加载器"""
        if loader_type == 'simulated':
            return SimulatedDataLoader(**kwargs)
        elif loader_type == 'csv':
            return CSVDataLoader(**kwargs)
        else:
            raise ValueError(f"未知的加载器类型: {loader_type}")

__all__ = [
    'BaseStrategy',
    'ArbitrageStrategy',
    'CallableBondStrategy',
    'BacktestEngine',
    'PortfolioEngine',
    'DataLoader',
    'CSVDataLoader',
    'SimulatedDataLoader',
    'FinancialMetrics',
    'RiskMetrics',
    'PerformanceMetrics',
    'ResultVisualizer',
    'PlotGenerator',
    'get_strategy',
    'DataLoaderFactory'
]
