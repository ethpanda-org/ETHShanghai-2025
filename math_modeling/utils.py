"""
数学工具函数模块
"""

import torch
import numpy as np
from typing import Tuple, Optional


def compute_returns(prices: torch.Tensor, method: str = 'log') -> torch.Tensor:
    """
    计算收益率
    
    Args:
        prices: 价格序列 (batch_size, time_steps, d) 或 (time_steps,)
        method: 计算方法 ('log', 'simple', 'percentage')
    
    Returns:
        returns: 收益率序列
    """
    if method == 'log':
        # 对数收益率
        if len(prices.shape) == 3:
            returns = torch.log(prices[:, 1:] / prices[:, :-1])
        else:
            returns = torch.log(prices[1:] / prices[:-1])
    elif method == 'simple':
        # 简单收益率
        if len(prices.shape) == 3:
            returns = (prices[:, 1:] - prices[:, :-1]) / prices[:, :-1]
        else:
            returns = (prices[1:] - prices[:-1]) / prices[:-1]
    elif method == 'percentage':
        # 百分比收益率
        if len(prices.shape) == 3:
            returns = (prices[:, 1:] - prices[:, :-1]) / prices[:, :-1] * 100
        else:
            returns = (prices[1:] - prices[:-1]) / prices[:-1] * 100
    else:
        raise ValueError(f"Unknown method: {method}")
    
    return returns


def compute_volatility(returns: torch.Tensor, window: Optional[int] = None) -> torch.Tensor:
    """
    计算波动率
    
    Args:
        returns: 收益率序列
        window: 滚动窗口大小，None表示使用全部数据
    
    Returns:
        volatility: 波动率
    """
    if window is None:
        return torch.std(returns, dim=-1)
    else:
        # 滚动波动率
        if len(returns.shape) == 3:
            batch_size, time_steps, d = returns.shape
            volatilities = torch.zeros(batch_size, time_steps - window + 1, d, device=returns.device)
            for i in range(time_steps - window + 1):
                volatilities[:, i, :] = torch.std(returns[:, i:i+window, :], dim=1)
        else:
            time_steps = returns.shape[0]
            volatilities = torch.zeros(time_steps - window + 1, device=returns.device)
            for i in range(time_steps - window + 1):
                volatilities[i] = torch.std(returns[i:i+window])
        
        return volatilities


def normalize_paths(paths: torch.Tensor, method: str = 'zscore') -> Tuple[torch.Tensor, dict]:
    """
    标准化价格路径
    
    Args:
        paths: 价格路径 (batch_size, time_steps, d)
        method: 标准化方法 ('zscore', 'minmax', 'robust')
    
    Returns:
        normalized_paths: 标准化后的路径
        stats: 统计信息字典
    """
    stats = {}
    
    if method == 'zscore':
        # Z-score标准化
        mean = torch.mean(paths, dim=(0, 1), keepdim=True)
        std = torch.std(paths, dim=(0, 1), keepdim=True)
        normalized_paths = (paths - mean) / (std + 1e-8)
        stats = {'mean': mean, 'std': std}
    
    elif method == 'minmax':
        # Min-Max标准化
        min_val = torch.min(paths, dim=(0, 1), keepdim=True)[0]
        max_val = torch.max(paths, dim=(0, 1), keepdim=True)[0]
        normalized_paths = (paths - min_val) / (max_val - min_val + 1e-8)
        stats = {'min': min_val, 'max': max_val}
    
    elif method == 'robust':
        # 鲁棒标准化（使用中位数和MAD）
        median = torch.median(paths, dim=(0, 1), keepdim=True)[0]
        mad = torch.median(torch.abs(paths - median), dim=(0, 1), keepdim=True)[0]
        normalized_paths = (paths - median) / (mad + 1e-8)
        stats = {'median': median, 'mad': mad}
    
    else:
        raise ValueError(f"Unknown normalization method: {method}")
    
    return normalized_paths, stats


def denormalize_paths(normalized_paths: torch.Tensor, stats: dict, method: str = 'zscore') -> torch.Tensor:
    """
    反标准化价格路径
    
    Args:
        normalized_paths: 标准化后的路径
        stats: 统计信息字典
        method: 标准化方法
    
    Returns:
        original_paths: 原始路径
    """
    if method == 'zscore':
        mean = stats['mean']
        std = stats['std']
        original_paths = normalized_paths * std + mean
    
    elif method == 'minmax':
        min_val = stats['min']
        max_val = stats['max']
        original_paths = normalized_paths * (max_val - min_val) + min_val
    
    elif method == 'robust':
        median = stats['median']
        mad = stats['mad']
        original_paths = normalized_paths * mad + median
    
    else:
        raise ValueError(f"Unknown normalization method: {method}")
    
    return original_paths


def compute_correlation_matrix(returns: torch.Tensor) -> torch.Tensor:
    """
    计算相关系数矩阵
    
    Args:
        returns: 收益率序列 (batch_size, time_steps, d)
    
    Returns:
        correlation_matrix: 相关系数矩阵 (d, d)
    """
    # 重塑为 (batch_size * time_steps, d)
    returns_flat = returns.view(-1, returns.shape[-1])
    
    # 计算相关系数矩阵
    correlation_matrix = torch.corrcoef(returns_flat.T)
    
    return correlation_matrix


def compute_sharpe_ratio(returns: torch.Tensor, risk_free_rate: float = 0.0) -> torch.Tensor:
    """
    计算夏普比率
    
    Args:
        returns: 收益率序列
        risk_free_rate: 无风险利率
    
    Returns:
        sharpe_ratio: 夏普比率
    """
    excess_returns = returns - risk_free_rate
    mean_return = torch.mean(excess_returns, dim=-1)
    std_return = torch.std(excess_returns, dim=-1)
    
    sharpe_ratio = mean_return / (std_return + 1e-8)
    
    return sharpe_ratio


def compute_max_drawdown(prices: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
    """
    计算最大回撤
    
    Args:
        prices: 价格序列 (batch_size, time_steps, d) 或 (time_steps,)
    
    Returns:
        max_drawdown: 最大回撤
        drawdown_duration: 回撤持续时间
    """
    if len(prices.shape) == 3:
        batch_size, time_steps, d = prices.shape
        max_drawdowns = torch.zeros(batch_size, d, device=prices.device)
        drawdown_durations = torch.zeros(batch_size, d, device=prices.device)
        
        for b in range(batch_size):
            for dim in range(d):
                price_path = prices[b, :, dim]
                peak = torch.cummax(price_path, dim=0)[0]
                drawdown = (peak - price_path) / peak
                max_drawdowns[b, dim] = torch.max(drawdown)
                
                # 计算回撤持续时间
                drawdown_mask = drawdown > 0
                if torch.any(drawdown_mask):
                    drawdown_durations[b, dim] = torch.max(torch.cumsum(drawdown_mask, dim=0) * drawdown_mask)
        
        return max_drawdowns, drawdown_durations
    
    else:
        peak = torch.cummax(prices, dim=0)[0]
        drawdown = (peak - prices) / peak
        max_drawdown = torch.max(drawdown)
        
        # 计算回撤持续时间
        drawdown_mask = drawdown > 0
        if torch.any(drawdown_mask):
            drawdown_duration = torch.max(torch.cumsum(drawdown_mask, dim=0) * drawdown_mask)
        else:
            drawdown_duration = torch.tensor(0.0, device=prices.device)
        
        return max_drawdown, drawdown_duration


def compute_var(returns: torch.Tensor, confidence_level: float = 0.05) -> torch.Tensor:
    """
    计算风险价值(VaR)
    
    Args:
        returns: 收益率序列
        confidence_level: 置信水平
    
    Returns:
        var: 风险价值
    """
    return torch.quantile(returns, confidence_level, dim=-1)


def compute_expected_shortfall(returns: torch.Tensor, confidence_level: float = 0.05) -> torch.Tensor:
    """
    计算期望损失(ES)
    
    Args:
        returns: 收益率序列
        confidence_level: 置信水平
    
    Returns:
        es: 期望损失
    """
    var = compute_var(returns, confidence_level)
    
    if len(returns.shape) == 3:
        batch_size, time_steps, d = returns.shape
        es = torch.zeros(batch_size, d, device=returns.device)
        
        for b in range(batch_size):
            for dim in range(d):
                returns_path = returns[b, :, dim]
                var_val = var[b, dim]
                tail_returns = returns_path[returns_path <= var_val]
                es[b, dim] = torch.mean(tail_returns) if len(tail_returns) > 0 else var_val
        
        return es
    
    else:
        tail_returns = returns[returns <= var]
        es = torch.mean(tail_returns) if len(tail_returns) > 0 else var
        return es


def compute_portfolio_metrics(returns: torch.Tensor, weights: Optional[torch.Tensor] = None) -> dict:
    """
    计算投资组合指标
    
    Args:
        returns: 收益率序列 (batch_size, time_steps, d)
        weights: 权重向量 (d,) 或 (batch_size, d)
    
    Returns:
        metrics: 指标字典
    """
    if weights is None:
        weights = torch.ones(returns.shape[-1], device=returns.device) / returns.shape[-1]
    
    # 确保权重形状正确
    if len(weights.shape) == 1:
        weights = weights.unsqueeze(0).expand(returns.shape[0], -1)
    
    # 计算投资组合收益率
    portfolio_returns = torch.sum(returns * weights.unsqueeze(1), dim=-1)
    
    # 计算各种指标
    metrics = {
        'mean_return': torch.mean(portfolio_returns, dim=-1),
        'volatility': torch.std(portfolio_returns, dim=-1),
        'sharpe_ratio': compute_sharpe_ratio(portfolio_returns),
        'var': compute_var(portfolio_returns),
        'expected_shortfall': compute_expected_shortfall(portfolio_returns),
        'skewness': torch.mean((portfolio_returns - torch.mean(portfolio_returns, dim=-1, keepdim=True))**3, dim=-1) / torch.std(portfolio_returns, dim=-1)**3,
        'kurtosis': torch.mean((portfolio_returns - torch.mean(portfolio_returns, dim=-1, keepdim=True))**4, dim=-1) / torch.std(portfolio_returns, dim=-1)**4 - 3
    }
    
    return metrics
