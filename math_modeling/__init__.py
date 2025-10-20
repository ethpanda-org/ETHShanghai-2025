"""
数学建模模块初始化文件
"""

from .path_generators import (
    BasePathGenerator,
    GBMGenerator,
    FBMGenerator,
    VasicekGenerator
)

from .models import (
    BaseModel,
    BSDE,
    BlackScholes
)

from .utils import (
    compute_returns,
    compute_volatility,
    normalize_paths
)

# 工厂函数
def get_path_generator(generator_type: str, **kwargs):
    """获取路径生成器"""
    if generator_type == 'gbm':
        return GBMGenerator(**kwargs)
    elif generator_type == 'fbm':
        return FBMGenerator(**kwargs)
    elif generator_type == 'vasicek':
        return VasicekGenerator(**kwargs)
    else:
        raise ValueError(f"未知的生成器类型: {generator_type}")

def get_model(model_type: str, **kwargs):
    """获取模型"""
    if model_type == 'bsde':
        return BSDE(**kwargs)
    elif model_type == 'black_scholes':
        return BlackScholes(**kwargs)
    else:
        raise ValueError(f"未知的模型类型: {model_type}")

__all__ = [
    'BasePathGenerator',
    'GBMGenerator', 
    'FBMGenerator',
    'VasicekGenerator',
    'BaseModel',
    'BSDE',
    'BlackScholes',
    'compute_returns',
    'compute_volatility', 
    'normalize_paths',
    'get_path_generator',
    'get_model'
]
