"""
数学模型定义模块
包含BSDE、Black-Scholes等数学模型
"""

import torch
import numpy as np
from abc import ABC, abstractmethod
from typing import Tuple, Optional, Dict, Any
from scipy.stats import norm


class BaseModel(ABC):
    """数学模型基类"""
    
    def __init__(self, device: Optional[torch.device] = None):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.params = {}
    
    @abstractmethod
    def compute_payoff(self, S_T: torch.Tensor, **kwargs) -> torch.Tensor:
        """计算到期收益"""
        pass
    
    @abstractmethod
    def compute_delta(self, S: torch.Tensor, t: torch.Tensor, **kwargs) -> torch.Tensor:
        """计算Delta对冲比率"""
        pass
    
    def set_params(self, **params):
        """设置参数"""
        self.params.update(params)
    
    def get_params(self) -> Dict[str, Any]:
        """获取参数"""
        return self.params.copy()


class BSDE(BaseModel):
    """后向随机微分方程模型"""
    
    def __init__(self, 
                 r: float = 0.05,
                 sigma: float = 0.2,
                 device: Optional[torch.device] = None):
        super().__init__(device)
        self.set_params(r=r, sigma=sigma)
    
    def compute_payoff(self, S_T: torch.Tensor, strike: float = 100.0, **kwargs) -> torch.Tensor:
        """计算欧式看涨期权收益"""
        return torch.clamp(S_T - strike, min=0.0)
    
    def compute_delta(self, S: torch.Tensor, t: torch.Tensor, 
                     strike: float = 100.0, T: float = 1.0, **kwargs) -> torch.Tensor:
        """计算Delta对冲比率"""
        r = self.params['r']
        sigma = self.params['sigma']
        
        if isinstance(t, (int, float)):
            t = torch.tensor(t, device=self.device)
        
        tau = T - t
        tau = torch.clamp(tau, min=1e-6)  # 避免除零
        
        d1 = (torch.log(S / strike) + (r + 0.5 * sigma**2) * tau) / (sigma * torch.sqrt(tau))
        delta = torch.exp(-r * tau) * self._norm_cdf(d1)
        
        return delta
    
    def _norm_cdf(self, x: torch.Tensor) -> torch.Tensor:
        """正态分布累积分布函数"""
        return 0.5 * (1 + torch.erf(x / torch.sqrt(torch.tensor(2.0, device=self.device))))


class BlackScholes(BaseModel):
    """Black-Scholes模型"""
    
    def __init__(self,
                 r: float = 0.05,
                 sigma: float = 0.2,
                 device: Optional[torch.device] = None):
        super().__init__(device)
        self.set_params(r=r, sigma=sigma)
    
    def compute_payoff(self, S_T: torch.Tensor, strike: float = 100.0, **kwargs) -> torch.Tensor:
        """计算欧式看涨期权收益"""
        return torch.clamp(S_T - strike, min=0.0)
    
    def compute_option_price(self, S: torch.Tensor, strike: float, 
                           T: float, option_type: str = 'call') -> torch.Tensor:
        """计算期权价格"""
        r = self.params['r']
        sigma = self.params['sigma']
        
        d1 = (torch.log(S / strike) + (r + 0.5 * sigma**2) * T) / (sigma * torch.sqrt(T))
        d2 = d1 - sigma * torch.sqrt(T)
        
        if option_type.lower() == 'call':
            price = S * self._norm_cdf(d1) - strike * torch.exp(-r * T) * self._norm_cdf(d2)
        else:  # put
            price = strike * torch.exp(-r * T) * self._norm_cdf(-d2) - S * self._norm_cdf(-d1)
        
        return price
    
    def compute_delta(self, S: torch.Tensor, strike: float, T: float, 
                     option_type: str = 'call') -> torch.Tensor:
        """计算Delta"""
        r = self.params['r']
        sigma = self.params['sigma']
        
        d1 = (torch.log(S / strike) + (r + 0.5 * sigma**2) * T) / (sigma * torch.sqrt(T))
        
        if option_type.lower() == 'call':
            delta = self._norm_cdf(d1)
        else:  # put
            delta = self._norm_cdf(d1) - 1
        
        return delta
    
    def compute_gamma(self, S: torch.Tensor, strike: float, T: float) -> torch.Tensor:
        """计算Gamma"""
        r = self.params['r']
        sigma = self.params['sigma']
        
        d1 = (torch.log(S / strike) + (r + 0.5 * sigma**2) * T) / (sigma * torch.sqrt(T))
        gamma = self._norm_pdf(d1) / (S * sigma * torch.sqrt(T))
        
        return gamma
    
    def compute_theta(self, S: torch.Tensor, strike: float, T: float, 
                     option_type: str = 'call') -> torch.Tensor:
        """计算Theta"""
        r = self.params['r']
        sigma = self.params['sigma']
        
        d1 = (torch.log(S / strike) + (r + 0.5 * sigma**2) * T) / (sigma * torch.sqrt(T))
        d2 = d1 - sigma * torch.sqrt(T)
        
        theta_term1 = -S * self._norm_pdf(d1) * sigma / (2 * torch.sqrt(T))
        
        if option_type.lower() == 'call':
            theta_term2 = -r * strike * torch.exp(-r * T) * self._norm_cdf(d2)
        else:  # put
            theta_term2 = r * strike * torch.exp(-r * T) * self._norm_cdf(-d2)
        
        theta = theta_term1 + theta_term2
        return theta
    
    def compute_vega(self, S: torch.Tensor, strike: float, T: float) -> torch.Tensor:
        """计算Vega"""
        d1 = (torch.log(S / strike) + (self.params['r'] + 0.5 * self.params['sigma']**2) * T) / (self.params['sigma'] * torch.sqrt(T))
        vega = S * self._norm_pdf(d1) * torch.sqrt(T)
        return vega
    
    def _norm_cdf(self, x: torch.Tensor) -> torch.Tensor:
        """正态分布累积分布函数"""
        return 0.5 * (1 + torch.erf(x / torch.sqrt(torch.tensor(2.0, device=self.device))))
    
    def _norm_pdf(self, x: torch.Tensor) -> torch.Tensor:
        """正态分布概率密度函数"""
        return torch.exp(-0.5 * x**2) / torch.sqrt(2 * torch.pi * torch.tensor(1.0, device=self.device))


class HestonModel(BaseModel):
    """Heston随机波动率模型"""
    
    def __init__(self,
                 r: float = 0.05,
                 kappa: float = 2.0,  # 波动率均值回归速度
                 theta: float = 0.04,  # 长期波动率
                 sigma_v: float = 0.3,  # 波动率的波动率
                 rho: float = -0.7,  # 价格与波动率的相关性
                 v0: float = 0.04,  # 初始波动率
                 device: Optional[torch.device] = None):
        super().__init__(device)
        self.set_params(r=r, kappa=kappa, theta=theta, sigma_v=sigma_v, 
                       rho=rho, v0=v0)
    
    def compute_payoff(self, S_T: torch.Tensor, strike: float = 100.0, **kwargs) -> torch.Tensor:
        """计算欧式看涨期权收益"""
        return torch.clamp(S_T - strike, min=0.0)
    
    def compute_delta(self, S: torch.Tensor, t: torch.Tensor, 
                     strike: float = 100.0, T: float = 1.0, **kwargs) -> torch.Tensor:
        """计算Delta（简化实现）"""
        # 这里使用Black-Scholes近似，实际应用中需要更复杂的计算
        bs_model = BlackScholes(r=self.params['r'], sigma=torch.sqrt(self.params['v0']), device=self.device)
        return bs_model.compute_delta(S, strike, T-t)


class CallableBond(BaseModel):
    """可赎回债券模型"""
    
    def __init__(self,
                 r: float = 0.05,
                 sigma: float = 0.2,
                 coupon_rate: float = 0.03,
                 call_times: Optional[list] = None,
                 call_prices: Optional[list] = None,
                 face_value: float = 100.0,
                 device: Optional[torch.device] = None):
        super().__init__(device)
        if call_times is None:
            call_times = [0.5, 1.0]
        if call_prices is None:
            call_prices = [102.0, 100.0]
        
        self.set_params(r=r, sigma=sigma, coupon_rate=coupon_rate,
                       call_times=call_times, call_prices=call_prices,
                       face_value=face_value)
    
    def compute_payoff(self, S_T: torch.Tensor, **kwargs) -> torch.Tensor:
        """计算债券到期收益"""
        face_value = self.params['face_value']
        return torch.full_like(S_T, face_value)
    
    def compute_continuation_value(self, S: torch.Tensor, t: torch.Tensor,
                                 Y_seq: torch.Tensor, **kwargs) -> torch.Tensor:
        """计算继续持有价值"""
        # 使用模型预测的Y序列作为继续持有价值
        return Y_seq
    
    def should_call(self, continuation_value: torch.Tensor, 
                   call_price: float, **kwargs) -> torch.Tensor:
        """判断是否应该赎回"""
        return continuation_value > call_price


# 模型注册表
MODELS = {
    'bsde': BSDE,
    'black_scholes': BlackScholes,
    'heston': HestonModel,
    'callable_bond': CallableBond
}


def get_model(name: str, **kwargs) -> BaseModel:
    """获取模型实例"""
    if name not in MODELS:
        raise ValueError(f"Unknown model: {name}. Available: {list(MODELS.keys())}")
    
    return MODELS[name](**kwargs)


def list_available_models() -> list:
    """列出可用的模型"""
    return list(MODELS.keys())
