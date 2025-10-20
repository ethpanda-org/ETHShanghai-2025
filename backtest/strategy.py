"""
套利策略实现
包含多种套利策略
"""

import torch
import numpy as np
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Tuple
from scipy.stats import norm
import math


class BaseStrategy(ABC):
    """套利策略基类"""
    
    def __init__(self, device: Optional[torch.device] = None):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.params = {}
    
    @abstractmethod
    def execute(self, price_path: torch.Tensor, **kwargs) -> Dict[str, Any]:
        """执行策略"""
        pass
    
    def set_params(self, **params):
        """设置参数"""
        self.params.update(params)
    
    def get_params(self) -> Dict[str, Any]:
        """获取参数"""
        return self.params.copy()


class ArbitrageStrategy(BaseStrategy):
    """基于Deep BSDE的套利策略"""
    
    def __init__(self,
                 strike_price: float = 100.0,
                 initial_capital: float = 10000.0,
                 risk_free_rate: float = 0.05,
                 transaction_cost: float = 0.001,
                 sigma: float = 0.2,
                 device: Optional[torch.device] = None):
        super().__init__(device)
        self.set_params(
            strike_price=strike_price,
            initial_capital=initial_capital,
            risk_free_rate=risk_free_rate,
            transaction_cost=transaction_cost,
            sigma=sigma
        )
    
    def calculate_black_scholes_price(self, S: float, K: float, T: float, 
                                    r: float, sigma: float) -> float:
        """计算Black-Scholes期权价格"""
        if T <= 0:
            return max(S - K, 0)
        
        d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
        d2 = d1 - sigma * np.sqrt(T)
        
        call_price = S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
        return call_price
    
    def calculate_delta(self, S: float, K: float, T: float, 
                       r: float, sigma: float) -> float:
        """计算Delta对冲比率"""
        if T <= 0:
            return 1.0 if S > K else 0.0
        
        d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
        return norm.cdf(d1)
    
    def calculate_optimal_stopping_time(self, Y_seq: torch.Tensor) -> int:
        """计算最优停时"""
        return torch.argmax(Y_seq).item()
    
    def execute(self, price_path: torch.Tensor, Y_seq: Optional[torch.Tensor] = None, **kwargs) -> Dict[str, Any]:
        """执行套利策略"""
        params = self.params.copy()
        params.update(kwargs)
        
        strike_price = params['strike_price']
        initial_capital = params['initial_capital']
        risk_free_rate = params['risk_free_rate']
        transaction_cost = params['transaction_cost']
        sigma = params['sigma']
        
        # 转换为numpy数组
        if isinstance(price_path, torch.Tensor):
            try:
                price_path = price_path.cpu().numpy()
            except RuntimeError as e:
                if "Numpy is not available" in str(e):
                    # 处理NumPy兼容性问题
                    price_path = np.array(price_path.cpu().tolist())
                else:
                    raise e
        if Y_seq is not None and isinstance(Y_seq, torch.Tensor):
            try:
                Y_seq = Y_seq.cpu().numpy()
            except RuntimeError as e:
                if "Numpy is not available" in str(e):
                    # 处理NumPy兼容性问题
                    Y_seq = np.array(Y_seq.cpu().tolist())
                else:
                    raise e
        
        time_steps = len(price_path)
        dt = 1.0 / (time_steps - 1)  # 假设时间归一化到[0,1]
        
        # 计算最优停时
        if Y_seq is not None:
            optimal_time_idx = self.calculate_optimal_stopping_time(torch.tensor(Y_seq))
            optimal_value = Y_seq[optimal_time_idx]
        else:
            # 使用Black-Scholes理论价格作为替代
            optimal_time_idx = time_steps - 1
            optimal_value = self.calculate_black_scholes_price(
                price_path[0], strike_price, 1.0, risk_free_rate, sigma
            )
        
        # 初始化记录
        positions = []
        hedge_positions = []
        cash = []
        portfolio_values = []
        pnl = []
        hedge_ratios = []
        option_values = []
        
        # 初始状态
        current_cash = initial_capital
        current_option_position = 0.0
        current_hedge_position = 0.0
        
        for t in range(time_steps):
            current_price = price_path[t]
            current_time = t * dt
            remaining_time = 1.0 - current_time
            
            # 计算期权价值和对冲比率
            option_value = self.calculate_black_scholes_price(
                current_price, strike_price, remaining_time, risk_free_rate, sigma
            )
            hedge_ratio = self.calculate_delta(
                current_price, strike_price, remaining_time, risk_free_rate, sigma
            )
            
            option_values.append(option_value)
            hedge_ratios.append(hedge_ratio)
            
            # 策略逻辑
            if t == 0:
                # 初始建仓：买入期权（以模型预测价值的折扣价格）
                option_cost = optimal_value * 0.8  # 以预测价值的80%买入
                current_option_position = 1.0
                current_cash -= option_cost
                
                # 初始对冲
                hedge_amount = hedge_ratio * current_price
                current_hedge_position = -hedge_ratio
                current_cash += hedge_amount
                
            elif t < optimal_time_idx:
                # 动态调整对冲
                target_hedge = hedge_ratio
                hedge_adjustment = target_hedge - current_hedge_position
                
                if abs(hedge_adjustment) > 0.01:
                    hedge_cost = hedge_adjustment * current_price * (1 + transaction_cost)
                    current_hedge_position = target_hedge
                    current_cash -= hedge_cost
                    
            elif t == optimal_time_idx:
                # 最优停时：平仓
                option_payoff = max(current_price - strike_price, 0)
                current_cash += option_payoff * current_option_position
                current_option_position = 0.0
                
                hedge_value = current_hedge_position * current_price
                current_cash += hedge_value
                current_hedge_position = 0.0
                
            else:
                # 最优停时之后：保持现金
                pass
            
            # 记录当前状态
            positions.append(current_option_position)
            hedge_positions.append(current_hedge_position)
            cash.append(current_cash)
            
            # 计算组合价值
            portfolio_value = (current_cash + 
                              current_option_position * max(current_price - strike_price, 0) + 
                              current_hedge_position * current_price)
            portfolio_values.append(portfolio_value)
            
            # 计算损益
            current_pnl = portfolio_value - initial_capital
            pnl.append(current_pnl)
        
        # 计算金融指标
        final_pnl = pnl[-1]
        max_drawdown = min(pnl) if pnl else 0
        sharpe_ratio = self.calculate_sharpe_ratio(pnl)
        
        return {
            'time_steps': np.arange(time_steps),
            'times': np.linspace(0, 1, time_steps),
            'prices': price_path,
            'Y_values': Y_seq if Y_seq is not None else np.zeros(time_steps),
            'positions': positions,
            'hedge_positions': hedge_positions,
            'cash': cash,
            'portfolio_values': portfolio_values,
            'pnl': pnl,
            'hedge_ratios': hedge_ratios,
            'option_values': option_values,
            'optimal_time': optimal_time_idx,
            'optimal_value': optimal_value,
            'final_pnl': final_pnl,
            'max_drawdown': max_drawdown,
            'sharpe_ratio': sharpe_ratio,
            'win_rate': 1.0 if final_pnl > 0 else 0.0
        }
    
    def calculate_sharpe_ratio(self, pnl: List[float]) -> float:
        """计算夏普比率"""
        if len(pnl) < 2:
            return 0.0
        
        pnl_returns = np.diff(pnl)
        if len(pnl_returns) == 0 or np.std(pnl_returns) == 0:
            return 0.0
        
        return np.mean(pnl_returns) / np.std(pnl_returns) * np.sqrt(252)  # 年化夏普比率


class CallableBondStrategy(BaseStrategy):
    """可赎回债券策略"""
    
    def __init__(self,
                 face_value: float = 100.0,
                 coupon_rate: float = 0.03,
                 call_times: Optional[List[float]] = None,
                 call_prices: Optional[List[float]] = None,
                 risk_free_rate: float = 0.05,
                 device: Optional[torch.device] = None):
        super().__init__(device)
        
        if call_times is None:
            call_times = [0.5, 1.0]
        if call_prices is None:
            call_prices = [102.0, 100.0]
        
        self.set_params(
            face_value=face_value,
            coupon_rate=coupon_rate,
            call_times=call_times,
            call_prices=call_prices,
            risk_free_rate=risk_free_rate
        )
    
    def execute(self, price_path: torch.Tensor, Y_seq: Optional[torch.Tensor] = None, **kwargs) -> Dict[str, Any]:
        """执行可赎回债券策略"""
        params = self.params.copy()
        params.update(kwargs)
        
        face_value = params['face_value']
        coupon_rate = params['coupon_rate']
        call_times = params['call_times']
        call_prices = params['call_prices']
        risk_free_rate = params['risk_free_rate']
        
        # 转换为numpy数组
        if isinstance(price_path, torch.Tensor):
            try:
                price_path = price_path.cpu().numpy()
            except RuntimeError as e:
                if "Numpy is not available" in str(e):
                    # 处理NumPy兼容性问题
                    price_path = np.array(price_path.cpu().tolist())
                else:
                    raise e
        if Y_seq is not None and isinstance(Y_seq, torch.Tensor):
            try:
                Y_seq = Y_seq.cpu().numpy()
            except RuntimeError as e:
                if "Numpy is not available" in str(e):
                    # 处理NumPy兼容性问题
                    Y_seq = np.array(Y_seq.cpu().tolist())
                else:
                    raise e
        
        time_steps = len(price_path)
        times = np.linspace(0, 1, time_steps)
        
        # 构建现金流
        cashflows = np.zeros(time_steps)
        
        # 添加息票支付
        for i, t in enumerate(times[:-1]):  # 不包括到期日
            if i % (time_steps // len(call_times)) == 0:  # 简化的息票时间
                cashflows[i] += face_value * coupon_rate
        
        # 到期本金
        cashflows[-1] += face_value
        
        # 发行人赎回决策
        alive = True
        call_decisions = []
        
        for call_time, call_price in zip(call_times, call_prices):
            if not alive:
                break
            
            # 找到最接近的时间索引
            call_idx = int(call_time * (time_steps - 1))
            call_idx = min(call_idx, time_steps - 1)
            
            # 使用模型预测的Y序列作为继续持有价值
            if Y_seq is not None and call_idx < len(Y_seq):
                continuation_value = Y_seq[call_idx]
            else:
                # 使用简化的现值计算
                remaining_cashflows = cashflows[call_idx:]
                remaining_times = times[call_idx:]
                continuation_value = np.sum(remaining_cashflows * np.exp(-risk_free_rate * remaining_times))
            
            # 赎回决策
            should_call = continuation_value > call_price
            
            if should_call:
                # 执行赎回
                cashflows[call_idx] += call_price
                # 清零后续现金流
                cashflows[call_idx+1:] = 0.0
                alive = False
                call_decisions.append({
                    'time': call_time,
                    'call_price': call_price,
                    'continuation_value': continuation_value,
                    'called': True
                })
            else:
                call_decisions.append({
                    'time': call_time,
                    'call_price': call_price,
                    'continuation_value': continuation_value,
                    'called': False
                })
        
        # 计算现值
        present_value = np.sum(cashflows * np.exp(-risk_free_rate * times))
        
        # 计算收益率
        if face_value > 0:
            yield_to_maturity = (present_value / face_value - 1) * 100
        else:
            yield_to_maturity = 0.0
        
        return {
            'time_steps': np.arange(time_steps),
            'times': times,
            'prices': price_path,
            'Y_values': Y_seq if Y_seq is not None else np.zeros(time_steps),
            'cashflows': cashflows,
            'call_decisions': call_decisions,
            'present_value': present_value,
            'yield_to_maturity': yield_to_maturity,
            'final_cashflow': cashflows[-1],
            'total_coupons': np.sum(cashflows[:-1]),
            'called': any(decision['called'] for decision in call_decisions)
        }


class MeanReversionStrategy(BaseStrategy):
    """均值回归策略"""
    
    def __init__(self,
                 lookback_window: int = 20,
                 threshold: float = 2.0,
                 position_size: float = 1.0,
                 transaction_cost: float = 0.001,
                 device: Optional[torch.device] = None):
        super().__init__(device)
        self.set_params(
            lookback_window=lookback_window,
            threshold=threshold,
            position_size=position_size,
            transaction_cost=transaction_cost
        )
    
    def execute(self, price_path: torch.Tensor, **kwargs) -> Dict[str, Any]:
        """执行均值回归策略"""
        params = self.params.copy()
        params.update(kwargs)
        
        lookback_window = params['lookback_window']
        threshold = params['threshold']
        position_size = params['position_size']
        transaction_cost = params['transaction_cost']
        
        # 转换为numpy数组
        if isinstance(price_path, torch.Tensor):
            price_path = price_path.cpu().numpy()
        
        time_steps = len(price_path)
        
        # 计算移动平均和标准差
        positions = []
        portfolio_values = []
        pnl = []
        
        initial_capital = 10000.0
        current_capital = initial_capital
        current_position = 0.0
        
        for t in range(lookback_window, time_steps):
            # 计算过去lookback_window期的统计量
            recent_prices = price_path[t-lookback_window:t]
            mean_price = np.mean(recent_prices)
            std_price = np.std(recent_prices)
            
            current_price = price_path[t]
            z_score = (current_price - mean_price) / (std_price + 1e-8)
            
            # 交易信号
            if z_score > threshold and current_position <= 0:
                # 卖出信号
                target_position = -position_size
            elif z_score < -threshold and current_position >= 0:
                # 买入信号
                target_position = position_size
            else:
                # 平仓信号
                target_position = 0.0
            
            # 执行交易
            position_change = target_position - current_position
            if abs(position_change) > 0.01:
                trade_cost = abs(position_change) * current_price * transaction_cost
                current_capital -= trade_cost
                current_position = target_position
            
            # 计算组合价值
            portfolio_value = current_capital + current_position * current_price
            current_pnl = portfolio_value - initial_capital
            
            positions.append(current_position)
            portfolio_values.append(portfolio_value)
            pnl.append(current_pnl)
        
        # 填充前面的数据
        positions = [0.0] * lookback_window + positions
        portfolio_values = [initial_capital] * lookback_window + portfolio_values
        pnl = [0.0] * lookback_window + pnl
        
        return {
            'time_steps': np.arange(time_steps),
            'times': np.linspace(0, 1, time_steps),
            'prices': price_path,
            'positions': positions,
            'portfolio_values': portfolio_values,
            'pnl': pnl,
            'final_pnl': pnl[-1],
            'max_drawdown': min(pnl) if pnl else 0,
            'sharpe_ratio': self.calculate_sharpe_ratio(pnl)
        }
    
    def calculate_sharpe_ratio(self, pnl: List[float]) -> float:
        """计算夏普比率"""
        if len(pnl) < 2:
            return 0.0
        
        pnl_returns = np.diff(pnl)
        if len(pnl_returns) == 0 or np.std(pnl_returns) == 0:
            return 0.0
        
        return np.mean(pnl_returns) / np.std(pnl_returns) * np.sqrt(252)


# 策略注册表
STRATEGIES = {
    'arbitrage': ArbitrageStrategy,
    'callable_bond': CallableBondStrategy,
    'mean_reversion': MeanReversionStrategy
}


def get_strategy(name: str, **kwargs) -> BaseStrategy:
    """获取策略实例"""
    if name not in STRATEGIES:
        raise ValueError(f"Unknown strategy: {name}. Available: {list(STRATEGIES.keys())}")
    
    return STRATEGIES[name](**kwargs)


def list_available_strategies() -> List[str]:
    """列出可用策略"""
    return list(STRATEGIES.keys())
