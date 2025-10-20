"""
路径生成器模块
支持多种随机过程路径生成：GBM、FBM、Vasicek等
"""

import torch
import numpy as np
from abc import ABC, abstractmethod
from typing import Tuple, Optional, Dict, Any
import warnings


class BasePathGenerator(ABC):
    """路径生成器基类"""
    
    def __init__(self, device: Optional[torch.device] = None):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.params = {}
    
    @abstractmethod
    def generate_paths(self, batch_size: int, **kwargs) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        生成价格路径
        
        Args:
            batch_size: 路径数量
            **kwargs: 其他参数
            
        Returns:
            paths: 价格路径 (batch_size, time_steps, d)
            times: 时间网格 (time_steps,)
        """
        pass
    
    def set_params(self, **params):
        """设置参数"""
        self.params.update(params)
    
    def get_params(self) -> Dict[str, Any]:
        """获取参数"""
        return self.params.copy()


class GBMGenerator(BasePathGenerator):
    """几何布朗运动路径生成器"""
    
    def __init__(self, 
                 T: float = 1.0,
                 N: int = 50,
                 d: int = 1,
                 r: float = 0.05,
                 sigma: float = 0.2,
                 S0: float = 100.0,
                 device: Optional[torch.device] = None):
        super().__init__(device)
        self.set_params(T=T, N=N, d=d, r=r, sigma=sigma, S0=S0)
    
    def generate_paths(self, batch_size: int, **kwargs) -> Tuple[torch.Tensor, torch.Tensor]:
        """生成GBM路径"""
        # 更新参数
        params = self.params.copy()
        params.update(kwargs)
        
        T = params['T']
        N = params['N']
        d = params['d']
        r = params['r']
        sigma = params['sigma']
        S0 = params['S0']
        
        dt = T / N
        sqrt_dt = torch.sqrt(torch.tensor(dt, device=self.device))
        
        # 生成布朗运动增量
        dW = torch.randn(batch_size, N, d, device=self.device) * sqrt_dt
        W = torch.cumsum(dW, dim=1)  # (batch, N, d)
        W0 = torch.zeros(batch_size, 1, d, device=self.device)
        W_full = torch.cat([W0, W], dim=1)  # (batch, N+1, d)
        
        # 构建时间网格和漂移项
        t_grid = torch.linspace(0.0, T, N+1, device=self.device).view(1, N+1, 1)
        drift = (r - 0.5 * sigma**2) * t_grid
        
        # GBM 显式公式
        S = torch.tensor(S0, device=self.device) * torch.exp(drift + sigma * W_full)
        
        # 生成时间网格
        times = torch.linspace(0.0, T, N+1, device=self.device)
        
        return S, times


class FBMGenerator(BasePathGenerator):
    """分数布朗运动路径生成器"""
    
    def __init__(self,
                 T: float = 1.0,
                 N: int = 50,
                 d: int = 1,
                 H: float = 0.7,  # Hurst指数
                 sigma: float = 0.2,
                 S0: float = 100.0,
                 device: Optional[torch.device] = None):
        super().__init__(device)
        self.set_params(T=T, N=N, d=d, H=H, sigma=sigma, S0=S0)
    
    def generate_paths(self, batch_size: int, **kwargs) -> Tuple[torch.Tensor, torch.Tensor]:
        """生成FBM路径"""
        params = self.params.copy()
        params.update(kwargs)
        
        T = params['T']
        N = params['N']
        d = params['d']
        H = params['H']
        sigma = params['sigma']
        S0 = params['S0']
        
        dt = T / N
        times = torch.linspace(0.0, T, N+1, device=self.device)
        
        # 生成FBM路径（简化实现）
        # 注意：这里使用近似方法，实际应用中可能需要更精确的FBM生成算法
        warnings.warn("FBM实现使用近似方法，生产环境建议使用专业FBM库")
        
        # 使用Cholesky分解生成相关的高斯过程
        cov_matrix = self._generate_fbm_covariance(N, H, dt)
        L = torch.linalg.cholesky(cov_matrix)
        
        # 生成独立的高斯随机变量
        Z = torch.randn(batch_size, N+1, d, device=self.device)
        
        # 应用Cholesky分解得到相关的FBM增量
        # 重塑Z为(batch_size * d, N+1)以便与协方差矩阵相乘
        Z_reshaped = Z.permute(0, 2, 1).contiguous().view(-1, N+1)  # (batch_size * d, N+1)
        FBM_increments_reshaped = torch.matmul(Z_reshaped, L.T)  # (batch_size * d, N+1)
        FBM_increments = FBM_increments_reshaped.view(batch_size, d, N+1).permute(0, 2, 1)  # (batch_size, N+1, d)
        
        # 构建价格路径
        S = torch.zeros(batch_size, N+1, d, device=self.device)
        S[:, 0, :] = S0
        
        for t in range(1, N+1):
            S[:, t, :] = S[:, t-1, :] * torch.exp(sigma * FBM_increments[:, t, :])
        
        return S, times
    
    def _generate_fbm_covariance(self, N: int, H: float, dt: float) -> torch.Tensor:
        """生成FBM协方差矩阵"""
        times = torch.arange(N+1, device=self.device) * dt
        cov_matrix = torch.zeros(N+1, N+1, device=self.device)
        
        for i in range(N+1):
            for j in range(N+1):
                cov_matrix[i, j] = 0.5 * (times[i]**(2*H) + times[j]**(2*H) - 
                                         torch.abs(times[i] - times[j])**(2*H))
        
        # 添加正则化项确保矩阵正定
        regularization = 1e-6 * torch.eye(N+1, device=self.device)
        cov_matrix = cov_matrix + regularization
        
        return cov_matrix


class VasicekGenerator(BasePathGenerator):
    """Vasicek利率模型路径生成器"""
    
    def __init__(self,
                 T: float = 1.0,
                 N: int = 50,
                 d: int = 1,
                 kappa: float = 0.1,  # 均值回归速度
                 theta: float = 0.05,  # 长期均值
                 sigma: float = 0.02,  # 波动率
                 r0: float = 0.03,  # 初始利率
                 device: Optional[torch.device] = None):
        super().__init__(device)
        self.set_params(T=T, N=N, d=d, kappa=kappa, theta=theta, sigma=sigma, r0=r0)
    
    def generate_paths(self, batch_size: int, **kwargs) -> Tuple[torch.Tensor, torch.Tensor]:
        """生成Vasicek利率路径"""
        params = self.params.copy()
        params.update(kwargs)
        
        T = params['T']
        N = params['N']
        d = params['d']
        kappa = params['kappa']
        theta = params['theta']
        sigma = params['sigma']
        r0 = params['r0']
        
        dt = T / N
        sqrt_dt = torch.sqrt(torch.tensor(dt, device=self.device))
        times = torch.linspace(0.0, T, N+1, device=self.device)
        
        # 生成Vasicek路径
        r = torch.zeros(batch_size, N+1, d, device=self.device)
        r[:, 0, :] = r0
        
        for t in range(N):
            dW = torch.randn(batch_size, d, device=self.device) * sqrt_dt
            dr = kappa * (theta - r[:, t, :]) * dt + sigma * dW
            r[:, t+1, :] = r[:, t, :] + dr
        
        return r, times


class JumpDiffusionGenerator(BasePathGenerator):
    """跳跃扩散模型路径生成器"""
    
    def __init__(self,
                 T: float = 1.0,
                 N: int = 50,
                 d: int = 1,
                 r: float = 0.05,
                 sigma: float = 0.2,
                 lambda_jump: float = 0.1,  # 跳跃强度
                 mu_jump: float = 0.0,  # 跳跃均值
                 sigma_jump: float = 0.1,  # 跳跃波动率
                 S0: float = 100.0,
                 device: Optional[torch.device] = None):
        super().__init__(device)
        self.set_params(T=T, N=N, d=d, r=r, sigma=sigma, 
                       lambda_jump=lambda_jump, mu_jump=mu_jump, 
                       sigma_jump=sigma_jump, S0=S0)
    
    def generate_paths(self, batch_size: int, **kwargs) -> Tuple[torch.Tensor, torch.Tensor]:
        """生成跳跃扩散路径"""
        params = self.params.copy()
        params.update(kwargs)
        
        T = params['T']
        N = params['N']
        d = params['d']
        r = params['r']
        sigma = params['sigma']
        lambda_jump = params['lambda_jump']
        mu_jump = params['mu_jump']
        sigma_jump = params['sigma_jump']
        S0 = params['S0']
        
        dt = T / N
        sqrt_dt = torch.sqrt(torch.tensor(dt, device=self.device))
        times = torch.linspace(0.0, T, N+1, device=self.device)
        
        # 生成路径
        S = torch.zeros(batch_size, N+1, d, device=self.device)
        S[:, 0, :] = S0
        
        for t in range(N):
            # 布朗运动部分
            dW = torch.randn(batch_size, d, device=self.device) * sqrt_dt
            
            # 跳跃部分
            jump_mask = torch.rand(batch_size, d, device=self.device) < lambda_jump * dt
            jump_sizes = torch.randn(batch_size, d, device=self.device) * sigma_jump + mu_jump
            jumps = jump_mask.float() * jump_sizes
            
            # 更新价格
            dS = r * dt + sigma * dW + jumps
            S[:, t+1, :] = S[:, t, :] * torch.exp(dS)
        
        return S, times


# 路径生成器注册表
PATH_GENERATORS = {
    'gbm': GBMGenerator,
    'fbm': FBMGenerator,
    'vasicek': VasicekGenerator,
    'jump_diffusion': JumpDiffusionGenerator
}


def get_path_generator(name: str, **kwargs) -> BasePathGenerator:
    """获取路径生成器实例"""
    if name not in PATH_GENERATORS:
        raise ValueError(f"Unknown path generator: {name}. Available: {list(PATH_GENERATORS.keys())}")
    
    return PATH_GENERATORS[name](**kwargs)


def list_available_generators() -> list:
    """列出可用的路径生成器"""
    return list(PATH_GENERATORS.keys())
