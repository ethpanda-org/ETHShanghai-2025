"""
RNN/LSTM模型实现
用于序列数据的Deep BSDE
"""

import torch
import torch.nn as nn
import torch.optim as optim
from typing import Dict, Any, Optional, Tuple
import numpy as np
from .base_model import BaseModel, BaseTrainer


class RNNModel(BaseModel):
    """RNN模型用于Deep BSDE"""
    
    def __init__(self,
                 input_dim: int = 1,
                 hidden_dim: int = 64,
                 num_layers: int = 2,
                 rnn_type: str = 'lstm',  # 'rnn', 'lstm', 'gru'
                 dropout: float = 0.0,
                 bidirectional: bool = False,
                 output_dim: int = 1,
                 device: Optional[torch.device] = None):
        super().__init__(device)
        
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.rnn_type = rnn_type
        self.dropout = dropout
        self.bidirectional = bidirectional
        self.output_dim = output_dim
        
        # RNN层
        if rnn_type.lower() == 'lstm':
            self.rnn = nn.LSTM(
                input_dim, hidden_dim, num_layers,
                batch_first=True, dropout=dropout if num_layers > 1 else 0,
                bidirectional=bidirectional
            )
        elif rnn_type.lower() == 'gru':
            self.rnn = nn.GRU(
                input_dim, hidden_dim, num_layers,
                batch_first=True, dropout=dropout if num_layers > 1 else 0,
                bidirectional=bidirectional
            )
        elif rnn_type.lower() == 'rnn':
            self.rnn = nn.RNN(
                input_dim, hidden_dim, num_layers,
                batch_first=True, dropout=dropout if num_layers > 1 else 0,
                bidirectional=bidirectional
            )
        else:
            raise ValueError(f"Unknown RNN type: {rnn_type}")
        
        # 输出层
        rnn_output_dim = hidden_dim * (2 if bidirectional else 1)
        self.output_layer = nn.Linear(rnn_output_dim, output_dim)
        
        # Dropout层
        if dropout > 0:
            self.dropout_layer = nn.Dropout(dropout)
        else:
            self.dropout_layer = None
        
        # 初始化权重
        self._initialize_weights()
    
    def _initialize_weights(self):
        """初始化权重"""
        for name, param in self.rnn.named_parameters():
            if 'weight' in name:
                nn.init.xavier_uniform_(param)
            elif 'bias' in name:
                nn.init.constant_(param, 0)
        
        nn.init.xavier_uniform_(self.output_layer.weight)
        if self.output_layer.bias is not None:
            nn.init.constant_(self.output_layer.bias, 0)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """前向传播"""
        # x: (batch_size, seq_len, input_dim)
        rnn_out, _ = self.rnn(x)  # (batch_size, seq_len, hidden_dim)
        
        if self.dropout_layer is not None:
            rnn_out = self.dropout_layer(rnn_out)
        
        # 输出层
        output = self.output_layer(rnn_out)  # (batch_size, seq_len, output_dim)
        
        return output
    
    def predict(self, x: torch.Tensor) -> torch.Tensor:
        """预测"""
        return self.forward(x)
    
    def get_model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        info = super().get_model_info()
        info.update({
            'input_dim': self.input_dim,
            'hidden_dim': self.hidden_dim,
            'num_layers': self.num_layers,
            'rnn_type': self.rnn_type,
            'dropout': self.dropout,
            'bidirectional': self.bidirectional,
            'output_dim': self.output_dim
        })
        return info


class RNN_Z_Net(BaseModel):
    """RNN Z网络用于Deep BSDE"""
    
    def __init__(self,
                 input_dim: int = 1,
                 hidden_dim: int = 64,
                 num_layers: int = 2,
                 rnn_type: str = 'lstm',
                 dropout: float = 0.0,
                 device: Optional[torch.device] = None):
        super().__init__(device)
        
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.rnn_type = rnn_type
        self.dropout = dropout
        
        # RNN层
        if rnn_type.lower() == 'lstm':
            self.rnn = nn.LSTM(
                input_dim, hidden_dim, num_layers,
                batch_first=True, dropout=dropout if num_layers > 1 else 0,
                bidirectional=False
            )
        elif rnn_type.lower() == 'gru':
            self.rnn = nn.GRU(
                input_dim, hidden_dim, num_layers,
                batch_first=True, dropout=dropout if num_layers > 1 else 0,
                bidirectional=False
            )
        else:
            raise ValueError(f"Unknown RNN type: {rnn_type}")
        
        # 输出层
        self.head = nn.Linear(hidden_dim, 1)
        
        # Dropout层
        if dropout > 0:
            self.dropout_layer = nn.Dropout(dropout)
        else:
            self.dropout_layer = None
        
        # 初始化权重
        self._initialize_weights()
    
    def _initialize_weights(self):
        """初始化权重"""
        for name, param in self.rnn.named_parameters():
            if 'weight' in name:
                nn.init.xavier_uniform_(param)
            elif 'bias' in name:
                nn.init.constant_(param, 0)
        
        nn.init.xavier_uniform_(self.head.weight)
        if self.head.bias is not None:
            nn.init.constant_(self.head.bias, 0)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """前向传播"""
        # x: (batch_size, seq_len, input_dim)
        out, _ = self.rnn(x)  # out: (batch_size, seq_len, hidden_dim)
        
        if self.dropout_layer is not None:
            out = self.dropout_layer(out)
        
        z = self.head(out)  # (batch_size, seq_len, 1)
        return z
    
    def predict(self, x: torch.Tensor) -> torch.Tensor:
        """预测"""
        return self.forward(x)
    
    def get_model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        info = super().get_model_info()
        info.update({
            'input_dim': self.input_dim,
            'hidden_dim': self.hidden_dim,
            'num_layers': self.num_layers,
            'rnn_type': self.rnn_type,
            'dropout': self.dropout
        })
        return info


class DeepBSDE_RNN(BaseModel):
    """Deep BSDE RNN模型"""
    
    def __init__(self,
                 input_dim: int = 1,
                 hidden_dim: int = 64,
                 num_layers: int = 2,
                 rnn_type: str = 'lstm',
                 dropout: float = 0.0,
                 device: Optional[torch.device] = None):
        super().__init__(device)
        
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.rnn_type = rnn_type
        self.dropout = dropout
        
        # RNN Z网络
        self.z_net = RNN_Z_Net(input_dim, hidden_dim, num_layers, rnn_type, dropout, device)
        
        # Y0参数
        self.Y0 = nn.Parameter(torch.tensor(0.0, device=self.device))
    
    def forward(self, log_returns: torch.Tensor, paths: torch.Tensor, 
                dS: torch.Tensor, dt_arr: torch.Tensor, r: float = 0.03) -> Tuple[torch.Tensor, torch.Tensor]:
        """前向传播"""
        batch_size, seq_len = log_returns.shape[:2]
        
        # 预测Z序列
        Z_pred = self.z_net(log_returns)  # (batch_size, seq_len, 1)
        Z_use = Z_pred[:, :-1, :]  # 使用前seq_len-1个Z值
        
        # 前向BSDE
        Y = self.Y0.expand(batch_size, 1).to(self.device)
        Y_seq = [Y.clone()]
        
        for i in range(seq_len - 1):
            Z_i = Z_use[:, i, :]  # (batch_size, 1)
            f_val = -r * Y
            dS_i = dS[:, i].unsqueeze(1)  # (batch_size, 1)
            if isinstance(dt_arr, torch.Tensor):
                if dt_arr.dim() == 0:  # 0维tensor
                    dt_i = dt_arr.item()
                elif dt_arr.dim() == 1:  # 1维tensor
                    dt_i = dt_arr[i]
                else:  # 2维tensor (batch_size, seq_len)
                    dt_i = dt_arr[:, i].unsqueeze(1)  # 确保维度匹配
            else:
                dt_i = dt_arr
            
            # BSDE更新：Y = Y - f_val * dt_i + Z_i * dS_i
            # 确保所有操作都是标量或正确维度的tensor
            if isinstance(dt_i, (int, float)):
                dt_i = torch.tensor(dt_i, device=self.device)
            
            # 确保dt_i是标量或(batch_size, 1)
            if dt_i.dim() == 0:
                dt_i = dt_i.unsqueeze(0).unsqueeze(1).expand(batch_size, 1)
            elif dt_i.dim() == 1:
                dt_i = dt_i.unsqueeze(1)
            
            # 执行BSDE更新
            Y_new = Y - f_val * dt_i + Z_i * dS_i
            
            # 确保Y_new保持(batch_size, 1)的维度
            if Y_new.dim() != 2 or Y_new.shape != (batch_size, 1):
                # 先展平，然后重塑
                Y_new = Y_new.flatten()[:batch_size].unsqueeze(1)
            
            Y = Y_new
            Y_seq.append(Y.clone())
        
        Y_T = Y
        
        # 调试信息
        print(f"Y_seq lengths: {[y.shape for y in Y_seq]}")
        
        # 确保所有tensor的维度一致
        Y_seq_processed = []
        for i, y in enumerate(Y_seq):
            if y.dim() == 3:
                y = y.squeeze(-1)  # 从(batch_size, 1, 1)变为(batch_size, 1)
            elif y.dim() == 1:
                y = y.unsqueeze(1)  # 从(batch_size,)变为(batch_size, 1)
            Y_seq_processed.append(y)
        
        Y_seq_tensor = torch.cat(Y_seq_processed, dim=1)  # (batch_size, seq_len)
        
        return Y_T, Y_seq_tensor
    
    def predict(self, log_returns: torch.Tensor, paths: torch.Tensor,
                dS: torch.Tensor, dt_arr: torch.Tensor, r: float = 0.03) -> Tuple[torch.Tensor, torch.Tensor]:
        """预测"""
        return self.forward(log_returns, paths, dS, dt_arr, r)
    
    def get_model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        info = super().get_model_info()
        info.update({
            'input_dim': self.input_dim,
            'hidden_dim': self.hidden_dim,
            'num_layers': self.num_layers,
            'rnn_type': self.rnn_type,
            'dropout': self.dropout,
            'Y0': self.Y0.item()
        })
        return info


class RNNTrainer(BaseTrainer):
    """RNN训练器"""
    
    def __init__(self,
                 model: RNNModel,
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


class DeepBSDE_RNNTrainer(BaseTrainer):
    """Deep BSDE RNN训练器"""
    
    def __init__(self,
                 model: DeepBSDE_RNN,
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
            if isinstance(batch, (list, tuple)) and len(batch) >= 4:
                log_returns, paths, dS, target = batch[0], batch[1], batch[2], batch[3]
                dt_arr = kwargs.get('dt_arr', torch.tensor(0.02))  # 默认dt
                r = kwargs.get('r', 0.03)  # 默认无风险利率
            else:
                raise ValueError("Dataloader should return (log_returns, paths, dS, target) tuples")
            
            log_returns = log_returns.to(self.device)
            paths = paths.to(self.device)
            dS = dS.to(self.device)
            target = target.to(self.device)
            
            self.optimizer.zero_grad(set_to_none=True)
            
            # 前向传播
            if self.use_amp:
                with torch.amp.autocast("cuda", enabled=True, dtype=self.amp_dtype):
                    Y_T_pred, _ = self.model(log_returns, paths, dS, dt_arr, r)
                    loss = self.loss_fn(Y_T_pred, target)
            else:
                Y_T_pred, _ = self.model(log_returns, paths, dS, dt_arr, r)
                loss = self.loss_fn(Y_T_pred, target)
            
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
                if isinstance(batch, (list, tuple)) and len(batch) >= 4:
                    log_returns, paths, dS, target = batch[0], batch[1], batch[2], batch[3]
                    dt_arr = kwargs.get('dt_arr', torch.tensor(0.02))
                    r = kwargs.get('r', 0.03)
                else:
                    raise ValueError("Dataloader should return (log_returns, paths, dS, target) tuples")
                
                log_returns = log_returns.to(self.device)
                paths = paths.to(self.device)
                dS = dS.to(self.device)
                target = target.to(self.device)
                
                if self.use_amp:
                    with torch.amp.autocast("cuda", enabled=True, dtype=self.amp_dtype):
                        Y_T_pred, _ = self.model(log_returns, paths, dS, dt_arr, r)
                        loss = self.loss_fn(Y_T_pred, target)
                else:
                    Y_T_pred, _ = self.model(log_returns, paths, dS, dt_arr, r)
                    loss = self.loss_fn(Y_T_pred, target)
                
                total_loss += loss.item()
                num_batches += 1
        
        avg_loss = total_loss / num_batches if num_batches > 0 else 0.0
        
        return {'loss': avg_loss}
