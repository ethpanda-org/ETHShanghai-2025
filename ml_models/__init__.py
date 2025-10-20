"""
机器学习模块初始化文件
"""

from .base_model import BaseModel, BaseTrainer, ModelFactory
from .mlp_model import MLPModel, MLPTrainer
from .rnn_model import RNNModel, RNNTrainer
from .transformer_model import TransformerModel, TransformerTrainer

# 注册模型到工厂
ModelFactory.register_model('mlp', MLPModel, MLPTrainer)
ModelFactory.register_model('rnn', RNNModel, RNNTrainer)
ModelFactory.register_model('transformer', TransformerModel, TransformerTrainer)

# 尝试注册Deep BSDE模型（如果存在）
try:
    from .mlp_model import DeepBSDE_MLP, DeepBSDE_MLPTrainer
    ModelFactory.register_model('deep_bsde_mlp', DeepBSDE_MLP, DeepBSDE_MLPTrainer)
except ImportError:
    pass

try:
    from .rnn_model import DeepBSDE_RNN, DeepBSDE_RNNTrainer
    ModelFactory.register_model('deep_bsde_rnn', DeepBSDE_RNN, DeepBSDE_RNNTrainer)
except ImportError:
    pass

__all__ = [
    'BaseModel',
    'BaseTrainer',
    'ModelFactory',
    'MLPModel',
    'MLPTrainer',
    'RNNModel', 
    'RNNTrainer',
    'TransformerModel',
    'TransformerTrainer'
]
