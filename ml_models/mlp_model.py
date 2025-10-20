"""
MLP模型实现
多层感知机用于Deep BSDE
"""

import torch
import torch.nn as nn
import torch.optim as optim
from typing import Dict, Any, Optional, Tuple
import numpy as np
from .base_model import BaseModel, BaseTrainer


class MLPModel(BaseModel):
    """MLP模型用于Deep BSDE"""
    
    def __init__(self,
                 input_dim: int = 2,  # S + t
                 hidden_dims: list = [64, 64],
                 output_dim: int = 1,
                 activation: str = 'relu',
                 dropout: float = 0.0,
                 device: Optional[torch.device] = None):
        super().__init__(device)
        
        self.input_dim = input_dim
        self.hidden_dims = hidden_dims
        self.output_dim = output_dim
        self.activation = activation
        self.dropout = dropout
        
        # 构建网络
        layers = []
        prev_dim = input_dim
        
        for hidden_dim in hidden_dims:
            layers.append(nn.Linear(prev_dim, hidden_dim))
            
            if activation == 'relu':
                layers.append(nn.ReLU())
            elif activation == 'tanh':
                layers.append(nn.Tanh())
            elif activation == 'sigmoid':
                layers.append(nn.Sigmoid())
            elif activation == 'leaky_relu':
                layers.append(nn.LeakyReLU())
            elif activation == 'elu':
                layers.append(nn.ELU())
            else:
                raise ValueError(f"Unknown activation: {activation}")
            
            if dropout > 0:
                layers.append(nn.Dropout(dropout))
            
            prev_dim = hidden_dim
        
        # 输出层
        layers.append(nn.Linear(prev_dim, output_dim))
        
        self.network = nn.Sequential(*layers)
        
        # 初始化权重
        self._initialize_weights()
    
    def _initialize_weights(self):
        """初始化权重"""
        for module in self.modules():
            if isinstance(module, nn.Linear):
                nn.init.xavier_uniform_(module.weight)
                if module.bias is not None:
                    nn.init.constant_(module.bias, 0)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """前向传播"""
        return self.network(x)
    
    def predict(self, x: torch.Tensor) -> torch.Tensor:
        """预测"""
        return self.forward(x)
    
    def get_model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        info = super().get_model_info()
        info.update({
            'input_dim': self.input_dim,
            'hidden_dims': self.hidden_dims,
            'output_dim': self.output_dim,
            'activation': self.activation,
            'dropout': self.dropout
        })
        return info


class DeepBSDE_MLP(BaseModel):
    """Deep BSDE MLP模型"""
    
    def __init__(self,
                 d: int = 1,  # 资产维度
                 N: int = 50,  # 时间步数
                 T: float = 1.0,  # 到期时间
                 r: float = 0.05,  # 无风险利率
                 hidden_size: int = 64,
                 device: Optional[torch.device] = None):
        super().__init__(device)
        
        self.d = d
        self.N = N
        self.T = T
        self.r = r
        self.dt = T / N
        
        # Y0参数
        self.Y0 = nn.Parameter(torch.tensor(0.0, device=self.device))
        
        # Z网络列表
        self.Znets = nn.ModuleList([
            ControlNet(d, hidden_size) for _ in range(N)
        ])
    
    def forward(self, S: torch.Tensor, dW: torch.Tensor) -> torch.Tensor:
        """前向传播"""
        batch_size = S.size(0)
        Y = self.Y0.expand(batch_size, 1).to(self.device)
        
        for t in range(self.N):
            Z = self.Znets[t](S[:, t, :], t * self.dt)
            Y = Y - self.r * Y * self.dt + (Z * dW[:, t, :]).sum(dim=1, keepdim=True)
        
        return Y
    
    def predict(self, S: torch.Tensor, dW: torch.Tensor) -> torch.Tensor:
        """预测"""
        return self.forward(S, dW)
    
    def get_model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        info = super().get_model_info()
        info.update({
            'd': self.d,
            'N': self.N,
            'T': self.T,
            'r': self.r,
            'dt': self.dt,
            'Y0': self.Y0.item()
        })
        return info


class ControlNet(nn.Module):
    """控制网络"""
    
    def __init__(self, d: int, hidden_size: int = 64):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(d + 1, hidden_size),  # S + t
            nn.ReLU(),
            nn.Linear(hidden_size, hidden_size),
            nn.ReLU(),
            nn.Linear(hidden_size, d)
        )
    
    def forward(self, S: torch.Tensor, t: torch.Tensor) -> torch.Tensor:
        """前向传播"""
        batch_size = S.size(0)
        t_input = torch.full((batch_size, 1), t, device=S.device)
        x = torch.cat([S, t_input], dim=1)
        return self.net(x)


class MLPTrainer(BaseTrainer):
    """MLP训练器"""
    
    def __init__(self,
                 model: MLPModel,
                 learning_rate: float = 1e-3,
                 weight_decay: float = 0.0,
                 device: Optional[torch.device] = None,
                 precision: str = 'fp32'):
        super().__init__(model, device, precision)
        self.learning_rate = learning_rate
        self.weight_decay = weight_decay
    
    def setup_optimizer(self, **kwargs):
        """设置优化器"""
        lr = kwargs.get('learning_rate', self.learning_rate)
        wd = kwargs.get('weight_decay', self.weight_decay)
        
        self.optimizer = optim.Adam(
            self.model.parameters(),
            lr=lr,
            weight_decay=wd
        )
    
    def setup_loss_function(self, **kwargs):
        """设置损失函数"""
        loss_type = kwargs.get('loss_type', 'mse')
        
        if loss_type == 'mse':
            self.loss_fn = nn.MSELoss()
        elif loss_type == 'mae':
            self.loss_fn = nn.L1Loss()
        elif loss_type == 'huber':
            delta = kwargs.get('huber_delta', 1.0)
            self.loss_fn = nn.HuberLoss(delta=delta)
        elif loss_type == 'smooth_l1':
            self.loss_fn = nn.SmoothL1Loss()
        else:
            raise ValueError(f"Unknown loss type: {loss_type}")
    
    def train_epoch(self, dataloader, **kwargs) -> Dict[str, float]:
        """训练一个epoch"""
        self.model.train()
        total_loss = 0.0
        num_batches = 0
        
        for batch in dataloader:
            if isinstance(batch, (list, tuple)) and len(batch) >= 2:
                x, y = batch[0], batch[1]
            else:
                raise ValueError("Dataloader should return (input, target) pairs")
            
            x = x.to(self.device)
            y = y.to(self.device)
            
            self.optimizer.zero_grad(set_to_none=True)
            
            # 前向传播
            if self.use_amp:
                with torch.amp.autocast("cuda", enabled=True, dtype=self.amp_dtype):
                    pred = self.model(x)
                    loss = self.loss_fn(pred, y)
            else:
                pred = self.model(x)
                loss = self.loss_fn(pred, y)
            
            # 反向传播
            if self.scaler is not None:
                self.scaler.scale(loss).backward()
                self.scaler.step(self.optimizer)
                self.scaler.update()
            else:
                loss.backward()
                self.optimizer.step()
            
            # 梯度裁剪
            if kwargs.get('grad_clip', 0) > 0:
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), kwargs['grad_clip'])
            
            total_loss += loss.item()
            num_batches += 1
        
        avg_loss = total_loss / num_batches if num_batches > 0 else 0.0
        
        return {'loss': avg_loss}
    
    def validate_epoch(self, dataloader, **kwargs) -> Dict[str, float]:
        """验证一个epoch"""
        self.model.eval()
        total_loss = 0.0
        num_batches = 0
        
        with torch.no_grad():
            for batch in dataloader:
                if isinstance(batch, (list, tuple)) and len(batch) >= 2:
                    x, y = batch[0], batch[1]
                else:
                    raise ValueError("Dataloader should return (input, target) pairs")
                
                x = x.to(self.device)
                y = y.to(self.device)
                
                if self.use_amp:
                    with torch.amp.autocast("cuda", enabled=True, dtype=self.amp_dtype):
                        pred = self.model(x)
                        loss = self.loss_fn(pred, y)
                else:
                    pred = self.model(x)
                    loss = self.loss_fn(pred, y)
                
                total_loss += loss.item()
                num_batches += 1
        
        avg_loss = total_loss / num_batches if num_batches > 0 else 0.0
        
        return {'loss': avg_loss}


class DeepBSDE_MLPTrainer(BaseTrainer):
    """Deep BSDE MLP训练器"""
    
    def __init__(self,
                 model: DeepBSDE_MLP,
                 learning_rate: float = 1e-3,
                 device: Optional[torch.device] = None,
                 precision: str = 'fp32'):
        super().__init__(model, device, precision)
        self.learning_rate = learning_rate
    
    def setup_optimizer(self, **kwargs):
        """设置优化器"""
        lr = kwargs.get('learning_rate', self.learning_rate)
        
        # Deep BSDE需要优化Y0参数
        params = list(self.model.parameters()) + [self.model.Y0]
        self.optimizer = optim.Adam(params, lr=lr)
    
    def setup_loss_function(self, **kwargs):
        """设置损失函数"""
        self.loss_fn = nn.MSELoss()
    
    def train_epoch(self, dataloader, **kwargs) -> Dict[str, float]:
        """训练一个epoch"""
        self.model.train()
        total_loss = 0.0
        num_batches = 0
        
        for batch in dataloader:
            if isinstance(batch, (list, tuple)) and len(batch) >= 3:
                S, dW, target = batch[0], batch[1], batch[2]
            else:
                raise ValueError("Dataloader should return (S, dW, target) tuples")
            
            S = S.to(self.device)
            dW = dW.to(self.device)
            target = target.to(self.device)
            
            self.optimizer.zero_grad(set_to_none=True)
            
            # 前向传播
            if self.use_amp:
                with torch.amp.autocast("cuda", enabled=True, dtype=self.amp_dtype):
                    pred = self.model(S, dW)
                    loss = self.loss_fn(pred, target)
            else:
                pred = self.model(S, dW)
                loss = self.loss_fn(pred, target)
            
            # 反向传播
            if self.scaler is not None:
                self.scaler.scale(loss).backward()
                self.scaler.step(self.optimizer)
                self.scaler.update()
            else:
                loss.backward()
                self.optimizer.step()
            
            # 梯度裁剪
            if kwargs.get('grad_clip', 0) > 0:
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), kwargs['grad_clip'])
            
            total_loss += loss.item()
            num_batches += 1
        
        avg_loss = total_loss / num_batches if num_batches > 0 else 0.0
        
        return {'loss': avg_loss}
    
    def validate_epoch(self, dataloader, **kwargs) -> Dict[str, float]:
        """验证一个epoch"""
        self.model.eval()
        total_loss = 0.0
        num_batches = 0
        
        with torch.no_grad():
            for batch in dataloader:
                if isinstance(batch, (list, tuple)) and len(batch) >= 3:
                    S, dW, target = batch[0], batch[1], batch[2]
                else:
                    raise ValueError("Dataloader should return (S, dW, target) tuples")
                
                S = S.to(self.device)
                dW = dW.to(self.device)
                target = target.to(self.device)
                
                if self.use_amp:
                    with torch.amp.autocast("cuda", enabled=True, dtype=self.amp_dtype):
                        pred = self.model(S, dW)
                        loss = self.loss_fn(pred, target)
                else:
                    pred = self.model(S, dW)
                    loss = self.loss_fn(pred, target)
                
                total_loss += loss.item()
                num_batches += 1
        
        avg_loss = total_loss / num_batches if num_batches > 0 else 0.0
        
        return {'loss': avg_loss}
