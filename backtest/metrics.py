"""
金融指标计算模块
包含各种风险指标和性能指标
"""

import torch
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from scipy import stats
import math


class FinancialMetrics:
    """金融指标计算器"""
    
    def __init__(self):
        pass
    
    def calculate_sharpe_ratio(self, returns: List[float], risk_free_rate: float = 0.0) -> float:
        """计算夏普比率"""
        if len(returns) < 2:
            return 0.0
        
        returns_array = np.array(returns)
        excess_returns = returns_array - risk_free_rate
        
        if np.std(excess_returns) == 0:
            return 0.0
        
        return np.mean(excess_returns) / np.std(excess_returns) * np.sqrt(252)  # 年化
    
    def calculate_sortino_ratio(self, returns: List[float], risk_free_rate: float = 0.0) -> float:
        """计算Sortino比率"""
        if len(returns) < 2:
            return 0.0
        
        returns_array = np.array(returns)
        excess_returns = returns_array - risk_free_rate
        
        # 只考虑下行风险
        downside_returns = excess_returns[excess_returns < 0]
        
        if len(downside_returns) == 0 or np.std(downside_returns) == 0:
            return 0.0
        
        return np.mean(excess_returns) / np.std(downside_returns) * np.sqrt(252)
    
    def calculate_calmar_ratio(self, returns: List[float]) -> float:
        """计算Calmar比率"""
        if len(returns) < 2:
            return 0.0
        
        annual_return = np.mean(returns) * 252
        max_drawdown = self.calculate_max_drawdown(returns)
        
        return annual_return / abs(max_drawdown) if max_drawdown != 0 else 0.0
    
    def calculate_max_drawdown(self, returns: List[float]) -> float:
        """计算最大回撤"""
        if len(returns) < 2:
            return 0.0
        
        cumulative = np.cumprod(1 + np.array(returns))
        running_max = np.maximum.accumulate(cumulative)
        drawdown = (cumulative - running_max) / running_max
        
        return np.min(drawdown)
    
    def calculate_volatility(self, returns: List[float], annualized: bool = True) -> float:
        """计算波动率"""
        if len(returns) < 2:
            return 0.0
        
        volatility = np.std(returns)
        
        if annualized:
            volatility *= np.sqrt(252)
        
        return volatility
    
    def calculate_beta(self, asset_returns: List[float], market_returns: List[float]) -> float:
        """计算Beta系数"""
        if len(asset_returns) != len(market_returns) or len(asset_returns) < 2:
            return 0.0
        
        asset_array = np.array(asset_returns)
        market_array = np.array(market_returns)
        
        covariance = np.cov(asset_array, market_array)[0, 1]
        market_variance = np.var(market_array)
        
        return covariance / market_variance if market_variance != 0 else 0.0
    
    def calculate_alpha(self, asset_returns: List[float], market_returns: List[float], 
                       risk_free_rate: float = 0.0) -> float:
        """计算Alpha"""
        if len(asset_returns) != len(market_returns) or len(asset_returns) < 2:
            return 0.0
        
        beta = self.calculate_beta(asset_returns, market_returns)
        asset_mean = np.mean(asset_returns)
        market_mean = np.mean(market_returns)
        
        alpha = asset_mean - risk_free_rate - beta * (market_mean - risk_free_rate)
        return alpha * 252  # 年化


class RiskMetrics:
    """风险指标计算器"""
    
    def __init__(self):
        pass
    
    def calculate_var(self, returns: List[float], confidence_level: float = 0.05) -> float:
        """计算风险价值(VaR)"""
        if len(returns) < 2:
            return 0.0
        
        return np.percentile(returns, confidence_level * 100)
    
    def calculate_expected_shortfall(self, returns: List[float], confidence_level: float = 0.05) -> float:
        """计算期望损失(ES)"""
        if len(returns) < 2:
            return 0.0
        
        var = self.calculate_var(returns, confidence_level)
        tail_returns = [r for r in returns if r <= var]
        
        return np.mean(tail_returns) if tail_returns else var
    
    def calculate_max_drawdown(self, returns: List[float]) -> float:
        """计算最大回撤"""
        if len(returns) < 2:
            return 0.0
        
        cumulative = np.cumprod(1 + np.array(returns))
        running_max = np.maximum.accumulate(cumulative)
        drawdown = (cumulative - running_max) / running_max
        
        return np.min(drawdown)
    
    def calculate_drawdown_duration(self, returns: List[float]) -> float:
        """计算回撤持续时间"""
        if len(returns) < 2:
            return 0.0
        
        cumulative = np.cumprod(1 + np.array(returns))
        running_max = np.maximum.accumulate(cumulative)
        drawdown = (cumulative - running_max) / running_max
        
        # 计算连续回撤期间
        in_drawdown = drawdown < 0
        drawdown_periods = []
        current_period = 0
        
        for is_dd in in_drawdown:
            if is_dd:
                current_period += 1
            else:
                if current_period > 0:
                    drawdown_periods.append(current_period)
                    current_period = 0
        
        if current_period > 0:
            drawdown_periods.append(current_period)
        
        return max(drawdown_periods) if drawdown_periods else 0
    
    def calculate_skewness(self, returns: List[float]) -> float:
        """计算偏度"""
        if len(returns) < 3:
            return 0.0
        
        return stats.skew(returns)
    
    def calculate_kurtosis(self, returns: List[float]) -> float:
        """计算峰度"""
        if len(returns) < 4:
            return 0.0
        
        return stats.kurtosis(returns)
    
    def calculate_information_ratio(self, asset_returns: List[float], benchmark_returns: List[float]) -> float:
        """计算信息比率"""
        if len(asset_returns) != len(benchmark_returns) or len(asset_returns) < 2:
            return 0.0
        
        active_returns = np.array(asset_returns) - np.array(benchmark_returns)
        
        if np.std(active_returns) == 0:
            return 0.0
        
        return np.mean(active_returns) / np.std(active_returns) * np.sqrt(252)
    
    def calculate_tracking_error(self, asset_returns: List[float], benchmark_returns: List[float]) -> float:
        """计算跟踪误差"""
        if len(asset_returns) != len(benchmark_returns) or len(asset_returns) < 2:
            return 0.0
        
        active_returns = np.array(asset_returns) - np.array(benchmark_returns)
        return np.std(active_returns) * np.sqrt(252)


class PerformanceMetrics:
    """性能指标计算器"""
    
    def __init__(self):
        pass
    
    def calculate_total_return(self, returns: List[float]) -> float:
        """计算总收益率"""
        if not returns:
            return 0.0
        
        return np.prod(1 + np.array(returns)) - 1
    
    def calculate_annualized_return(self, returns: List[float], periods_per_year: int = 252) -> float:
        """计算年化收益率"""
        if not returns:
            return 0.0
        
        total_return = self.calculate_total_return(returns)
        years = len(returns) / periods_per_year
        
        return (1 + total_return) ** (1 / years) - 1 if years > 0 else 0.0
    
    def calculate_win_rate(self, returns: List[float]) -> float:
        """计算胜率"""
        if not returns:
            return 0.0
        
        positive_returns = sum(1 for r in returns if r > 0)
        return positive_returns / len(returns)
    
    def calculate_profit_factor(self, returns: List[float]) -> float:
        """计算盈利因子"""
        if not returns:
            return 0.0
        
        positive_returns = [r for r in returns if r > 0]
        negative_returns = [abs(r) for r in returns if r < 0]
        
        if not negative_returns:
            return float('inf') if positive_returns else 0.0
        
        total_profit = sum(positive_returns)
        total_loss = sum(negative_returns)
        
        return total_profit / total_loss if total_loss > 0 else 0.0
    
    def calculate_recovery_factor(self, returns: List[float]) -> float:
        """计算恢复因子"""
        if not returns:
            return 0.0
        
        total_return = self.calculate_total_return(returns)
        max_drawdown = RiskMetrics().calculate_max_drawdown(returns)
        
        return total_return / abs(max_drawdown) if max_drawdown != 0 else 0.0
    
    def calculate_sterling_ratio(self, returns: List[float]) -> float:
        """计算Sterling比率"""
        if not returns:
            return 0.0
        
        annual_return = np.mean(returns) * 252
        avg_drawdown = self.calculate_average_drawdown(returns)
        
        return annual_return / abs(avg_drawdown) if avg_drawdown != 0 else 0.0
    
    def calculate_average_drawdown(self, returns: List[float]) -> float:
        """计算平均回撤"""
        if len(returns) < 2:
            return 0.0
        
        cumulative = np.cumprod(1 + np.array(returns))
        running_max = np.maximum.accumulate(cumulative)
        drawdown = (cumulative - running_max) / running_max
        
        # 计算所有回撤期间的平均值
        drawdown_periods = []
        current_drawdown = 0
        
        for dd in drawdown:
            if dd < 0:
                current_drawdown = min(current_drawdown, dd)
            else:
                if current_drawdown < 0:
                    drawdown_periods.append(current_drawdown)
                    current_drawdown = 0
        
        if current_drawdown < 0:
            drawdown_periods.append(current_drawdown)
        
        return np.mean(drawdown_periods) if drawdown_periods else 0.0
    
    def calculate_omega_ratio(self, returns: List[float], threshold: float = 0.0) -> float:
        """计算Omega比率"""
        if not returns:
            return 0.0
        
        returns_array = np.array(returns)
        excess_returns = returns_array - threshold
        
        positive_excess = excess_returns[excess_returns > 0]
        negative_excess = excess_returns[excess_returns < 0]
        
        if len(negative_excess) == 0:
            return float('inf') if len(positive_excess) > 0 else 0.0
        
        return sum(positive_excess) / abs(sum(negative_excess))
    
    def calculate_calmar_ratio(self, returns: List[float]) -> float:
        """计算Calmar比率"""
        if not returns:
            return 0.0
        
        annual_return = np.mean(returns) * 252
        max_drawdown = RiskMetrics().calculate_max_drawdown(returns)
        
        return annual_return / abs(max_drawdown) if max_drawdown != 0 else 0.0
    
    def calculate_sortino_ratio(self, returns: List[float], risk_free_rate: float = 0.0) -> float:
        """计算Sortino比率"""
        if len(returns) < 2:
            return 0.0
        
        returns_array = np.array(returns)
        excess_returns = returns_array - risk_free_rate
        
        # 只考虑下行风险
        downside_returns = excess_returns[excess_returns < 0]
        
        if len(downside_returns) == 0 or np.std(downside_returns) == 0:
            return 0.0
        
        return np.mean(excess_returns) / np.std(downside_returns) * np.sqrt(252)


class PortfolioMetrics:
    """投资组合指标计算器"""
    
    def __init__(self):
        pass
    
    def calculate_portfolio_return(self, weights: List[float], returns: List[List[float]]) -> List[float]:
        """计算投资组合收益率"""
        if len(weights) != len(returns) or not returns:
            return []
        
        portfolio_returns = []
        min_length = min(len(r) for r in returns)
        
        for t in range(min_length):
            portfolio_return = sum(w * r[t] for w, r in zip(weights, returns))
            portfolio_returns.append(portfolio_return)
        
        return portfolio_returns
    
    def calculate_portfolio_volatility(self, weights: List[float], returns: List[List[float]]) -> float:
        """计算投资组合波动率"""
        portfolio_returns = self.calculate_portfolio_return(weights, returns)
        
        if len(portfolio_returns) < 2:
            return 0.0
        
        return np.std(portfolio_returns) * np.sqrt(252)
    
    def calculate_portfolio_sharpe(self, weights: List[float], returns: List[List[float]], 
                                 risk_free_rate: float = 0.0) -> float:
        """计算投资组合夏普比率"""
        portfolio_returns = self.calculate_portfolio_return(weights, returns)
        
        if len(portfolio_returns) < 2:
            return 0.0
        
        excess_returns = np.array(portfolio_returns) - risk_free_rate
        
        if np.std(excess_returns) == 0:
            return 0.0
        
        return np.mean(excess_returns) / np.std(excess_returns) * np.sqrt(252)
    
    def calculate_diversification_ratio(self, weights: List[float], returns: List[List[float]]) -> float:
        """计算分散化比率"""
        if len(weights) != len(returns) or not returns:
            return 0.0
        
        # 计算加权平均波动率
        weighted_vol = sum(w * np.std(r) * np.sqrt(252) for w, r in zip(weights, returns))
        
        # 计算投资组合波动率
        portfolio_vol = self.calculate_portfolio_volatility(weights, returns)
        
        return weighted_vol / portfolio_vol if portfolio_vol > 0 else 0.0
    
    def calculate_maximum_drawdown(self, weights: List[float], returns: List[List[float]]) -> float:
        """计算投资组合最大回撤"""
        portfolio_returns = self.calculate_portfolio_return(weights, returns)
        
        if len(portfolio_returns) < 2:
            return 0.0
        
        cumulative = np.cumprod(1 + np.array(portfolio_returns))
        running_max = np.maximum.accumulate(cumulative)
        drawdown = (cumulative - running_max) / running_max
        
        return np.min(drawdown)
