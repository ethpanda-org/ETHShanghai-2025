"""
机器学习模型基类
定义统一的模型接口和训练器基类
"""

import torch
import torch.nn as nn
import torch.optim as optim
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Tuple, List
import numpy as np
from tqdm import tqdm


class BaseModel(nn.Module, ABC):
    """机器学习模型基类"""
    
    def __init__(self, device: Optional[torch.device] = None):
        super().__init__()
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model_name = self.__class__.__name__
        self.training_history = {
            'train_loss': [],
            'val_loss': [],
            'train_metrics': [],
            'val_metrics': []
        }
    
    @abstractmethod
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """前向传播"""
        pass
    
    @abstractmethod
    def predict(self, x: torch.Tensor) -> torch.Tensor:
        """预测"""
        pass
    
    def get_model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        total_params = sum(p.numel() for p in self.parameters())
        trainable_params = sum(p.numel() for p in self.parameters() if p.requires_grad)
        
        return {
            'model_name': self.model_name,
            'total_parameters': total_params,
            'trainable_parameters': trainable_params,
            'device': str(self.device),
            'model_state': 'training' if self.training else 'eval'
        }
    
    def save_model(self, filepath: str, **kwargs):
        """保存模型"""
        save_dict = {
            'model_state_dict': self.state_dict(),
            'model_name': self.model_name,
            'model_info': self.get_model_info(),
            'training_history': self.training_history
        }
        save_dict.update(kwargs)
        torch.save(save_dict, filepath)
    
    def load_model(self, filepath: str, **kwargs):
        """加载模型"""
        checkpoint = torch.load(filepath, map_location=self.device)
        self.load_state_dict(checkpoint['model_state_dict'])
        
        if 'training_history' in checkpoint:
            self.training_history = checkpoint['training_history']
        
        return checkpoint


class BaseTrainer(ABC):
    """训练器基类"""
    
    def __init__(self, 
                 model: BaseModel,
                 device: Optional[torch.device] = None,
                 precision: str = 'fp32'):
        self.model = model.to(device or torch.device("cuda" if torch.cuda.is_available() else "cpu"))
        self.device = self.model.device
        self.precision = precision
        
        # 设置混合精度
        self.use_amp = precision in ['fp16', 'bf16'] and self.device.type == 'cuda'
        self.amp_dtype = None
        if self.use_amp:
            if precision == 'bf16' and getattr(torch.cuda, 'is_bf16_supported', lambda: False)():
                self.amp_dtype = torch.bfloat16
            elif precision == 'fp16':
                self.amp_dtype = torch.float16
        
        # 初始化优化器和损失函数
        self.optimizer = None
        self.loss_fn = None
        self.scheduler = None
        
        # 梯度缩放器
        if self.use_amp:
            try:
                self.scaler = torch.amp.GradScaler("cuda", enabled=True)
            except Exception:
                self.scaler = torch.cuda.amp.GradScaler(enabled=True)
        else:
            self.scaler = None
    
    @abstractmethod
    def setup_optimizer(self, **kwargs):
        """设置优化器"""
        pass
    
    @abstractmethod
    def setup_loss_function(self, **kwargs):
        """设置损失函数"""
        pass
    
    @abstractmethod
    def train_epoch(self, dataloader, **kwargs) -> Dict[str, float]:
        """训练一个epoch"""
        pass
    
    @abstractmethod
    def validate_epoch(self, dataloader, **kwargs) -> Dict[str, float]:
        """验证一个epoch"""
        pass
    
    def train(self, 
              train_dataloader,
              val_dataloader=None,
              epochs: int = 100,
              save_path: Optional[str] = None,
              verbose: bool = True,
              **kwargs) -> Dict[str, List[float]]:
        """训练模型"""
        
        # 设置优化器和损失函数
        self.setup_optimizer(**kwargs)
        self.setup_loss_function(**kwargs)
        
        # 训练历史
        history = {
            'train_loss': [],
            'val_loss': [],
            'train_metrics': [],
            'val_metrics': []
        }
        
        best_val_loss = float('inf')
        
        if verbose:
            print(f"开始训练 {self.model.model_name}")
            print(f"设备: {self.device}")
            print(f"精度: {self.precision}")
            print(f"训练轮数: {epochs}")
            print("=" * 50)
        
        for epoch in tqdm(range(epochs), desc="训练进度", disable=not verbose):
            # 训练
            self.model.train()
            train_metrics = self.train_epoch(train_dataloader, **kwargs)
            history['train_loss'].append(train_metrics.get('loss', 0))
            history['train_metrics'].append(train_metrics)
            
            # 验证
            val_metrics = {}
            if val_dataloader is not None:
                self.model.eval()
                with torch.no_grad():
                    val_metrics = self.validate_epoch(val_dataloader, **kwargs)
                history['val_loss'].append(val_metrics.get('loss', 0))
                history['val_metrics'].append(val_metrics)
                
                # 保存最佳模型
                if val_metrics.get('loss', float('inf')) < best_val_loss:
                    best_val_loss = val_metrics['loss']
                    if save_path:
                        self.model.save_model(save_path, epoch=epoch, **val_metrics)
            
            # 学习率调度
            if self.scheduler is not None:
                if isinstance(self.scheduler, optim.lr_scheduler.ReduceLROnPlateau):
                    if val_dataloader is not None:
                        self.scheduler.step(val_metrics.get('loss', 0))
                    else:
                        self.scheduler.step(train_metrics.get('loss', 0))
                else:
                    self.scheduler.step()
            
            # 打印进度
            if verbose and (epoch % max(1, epochs // 10) == 0 or epoch == epochs - 1):
                print(f"Epoch {epoch:4d}/{epochs}")
                print(f"  训练损失: {train_metrics.get('loss', 0):.6f}")
                if val_dataloader is not None:
                    print(f"  验证损失: {val_metrics.get('loss', 0):.6f}")
                print("-" * 30)
        
        # 更新模型训练历史
        self.model.training_history = history
        
        if verbose:
            print("训练完成！")
            print(f"最佳验证损失: {best_val_loss:.6f}")
        
        return history
    
    def evaluate(self, dataloader, **kwargs) -> Dict[str, float]:
        """评估模型"""
        self.model.eval()
        with torch.no_grad():
            return self.validate_epoch(dataloader, **kwargs)
    
    def predict(self, dataloader, **kwargs) -> torch.Tensor:
        """预测"""
        self.model.eval()
        predictions = []
        
        with torch.no_grad():
            for batch in dataloader:
                if isinstance(batch, (list, tuple)):
                    x = batch[0]
                else:
                    x = batch
                
                x = x.to(self.device)
                pred = self.model.predict(x)
                predictions.append(pred.cpu())
        
        return torch.cat(predictions, dim=0)
    
    def get_training_info(self) -> Dict[str, Any]:
        """获取训练信息"""
        return {
            'model_info': self.model.get_model_info(),
            'device': str(self.device),
            'precision': self.precision,
            'use_amp': self.use_amp,
            'optimizer': str(self.optimizer.__class__.__name__) if self.optimizer else None,
            'loss_function': str(self.loss_fn.__class__.__name__) if self.loss_fn else None,
            'scheduler': str(self.scheduler.__class__.__name__) if self.scheduler else None
        }


class ModelFactory:
    """模型工厂类"""
    
    _models = {}
    _trainers = {}
    
    @classmethod
    def register_model(cls, name: str, model_class: type, trainer_class: type):
        """注册模型和训练器"""
        cls._models[name] = model_class
        cls._trainers[name] = trainer_class
    
    @classmethod
    def create_model(cls, name: str, **kwargs) -> BaseModel:
        """创建模型实例"""
        if name not in cls._models:
            raise ValueError(f"Unknown model: {name}. Available: {list(cls._models.keys())}")
        
        return cls._models[name](**kwargs)
    
    @classmethod
    def create_trainer(cls, name: str, model: BaseModel, **kwargs) -> BaseTrainer:
        """创建训练器实例"""
        if name not in cls._trainers:
            raise ValueError(f"Unknown trainer: {name}. Available: {list(cls._trainers.keys())}")
        
        return cls._trainers[name](model, **kwargs)
    
    @classmethod
    def list_models(cls) -> List[str]:
        """列出可用模型"""
        return list(cls._models.keys())


# 工具函数
def count_parameters(model: nn.Module) -> int:
    """计算模型参数数量"""
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


def get_model_size(model: nn.Module) -> str:
    """获取模型大小"""
    param_count = count_parameters(model)
    
    if param_count < 1e3:
        return f"{param_count} parameters"
    elif param_count < 1e6:
        return f"{param_count/1e3:.1f}K parameters"
    else:
        return f"{param_count/1e6:.1f}M parameters"


def initialize_weights(model: nn.Module, method: str = 'xavier_uniform'):
    """初始化模型权重"""
    for name, param in model.named_parameters():
        if 'weight' in name:
            if method == 'xavier_uniform':
                nn.init.xavier_uniform_(param)
            elif method == 'xavier_normal':
                nn.init.xavier_normal_(param)
            elif method == 'kaiming_uniform':
                nn.init.kaiming_uniform_(param)
            elif method == 'kaiming_normal':
                nn.init.kaiming_normal_(param)
            elif method == 'normal':
                nn.init.normal_(param, 0, 0.01)
            elif method == 'uniform':
                nn.init.uniform_(param, -0.01, 0.01)
        elif 'bias' in name:
            nn.init.constant_(param, 0)
