"""
数据加载器实现
支持多种数据源：CSV文件、模拟数据、实时API（预留）
"""

import torch
import numpy as np
import pandas as pd
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Tuple, Union
import os
from datetime import datetime, timedelta
import requests
import json


class DataLoader(ABC):
    """数据加载器基类"""
    
    def __init__(self, device: Optional[torch.device] = None):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.data = None
        self.metadata = {}
    
    @abstractmethod
    def load_data(self, **kwargs) -> bool:
        """加载数据"""
        pass
    
    @abstractmethod
    def get_data(self) -> Union[torch.Tensor, np.ndarray]:
        """获取数据"""
        pass
    
    def get_metadata(self) -> Dict[str, Any]:
        """获取元数据"""
        return self.metadata.copy()


class CSVDataLoader(DataLoader):
    """CSV数据加载器"""
    
    def __init__(self, device: Optional[torch.device] = None):
        super().__init__(device)
        self.file_path = None
        self.has_header = False
        self.time_column = None
        self.price_columns = None
    
    def load_data(self, 
                 file_path: str,
                 has_header: bool = False,
                 time_column: Optional[str] = None,
                 price_columns: Optional[List[str]] = None,
                 **kwargs) -> bool:
        """加载CSV数据"""
        try:
            if not os.path.exists(file_path):
                print(f"❌ 文件不存在: {file_path}")
                return False
            
            # 读取CSV文件
            if has_header:
                df = pd.read_csv(file_path)
            else:
                df = pd.read_csv(file_path, header=None)
            
            self.file_path = file_path
            self.has_header = has_header
            
            # 处理时间列
            if time_column and time_column in df.columns:
                times = pd.to_datetime(df[time_column]).values
                df = df.drop(columns=[time_column])
            else:
                # 如果没有时间列，创建默认时间序列
                times = np.linspace(0, 1, len(df))
            
            # 处理价格列
            if price_columns:
                price_data = df[price_columns].values
            else:
                # 使用所有数值列
                numeric_columns = df.select_dtypes(include=[np.number]).columns
                price_data = df[numeric_columns].values
            
            # 转换为tensor
            self.data = torch.tensor(price_data, dtype=torch.float32, device=self.device)
            
            # 更新元数据
            self.metadata = {
                'file_path': file_path,
                'has_header': has_header,
                'data_shape': self.data.shape,
                'time_steps': len(times),
                'num_assets': price_data.shape[1] if len(price_data.shape) > 1 else 1,
                'times': times,
                'price_columns': price_columns or list(numeric_columns),
                'loaded_at': datetime.now().isoformat()
            }
            
            print(f"✓ 成功加载CSV数据: {file_path}")
            print(f"  数据形状: {self.data.shape}")
            print(f"  时间步数: {len(times)}")
            print(f"  资产数量: {self.metadata['num_assets']}")
            
            return True
            
        except Exception as e:
            print(f"❌ 加载CSV数据失败: {e}")
            return False
    
    def get_data(self) -> torch.Tensor:
        """获取数据"""
        if self.data is None:
            raise ValueError("数据未加载，请先调用load_data()")
        return self.data
    
    def get_times(self) -> np.ndarray:
        """获取时间序列"""
        return self.metadata.get('times', np.linspace(0, 1, self.data.shape[0]))


class SimulatedDataLoader(DataLoader):
    """模拟数据加载器"""
    
    def __init__(self, device: Optional[torch.device] = None):
        super().__init__(device)
        self.generator = None
        self.generator_params = {}
    
    def load_data(self, 
                 generator_type: str = 'gbm',
                 batch_size: int = 1000,
                 time_steps: int = 50,
                 num_assets: int = 1,
                 **generator_params) -> bool:
        """加载模拟数据"""
        try:
            from ..math_modeling import get_path_generator
            
            # 获取路径生成器
            self.generator = get_path_generator(generator_type, **generator_params)
            self.generator_params = generator_params.copy()
            
            # 生成数据
            paths, times = self.generator.generate_paths(batch_size, **generator_params)
            
            # 转换为tensor
            self.data = paths
            
            # 更新元数据
            self.metadata = {
                'generator_type': generator_type,
                'batch_size': batch_size,
                'time_steps': time_steps,
                'num_assets': num_assets,
                'generator_params': self.generator_params,
                'data_shape': self.data.shape,
                'times': times.cpu().numpy() if isinstance(times, torch.Tensor) else times,
                'generated_at': datetime.now().isoformat()
            }
            
            print(f"✓ 成功生成模拟数据")
            print(f"  生成器类型: {generator_type}")
            print(f"  数据形状: {self.data.shape}")
            print(f"  时间步数: {time_steps}")
            print(f"  资产数量: {num_assets}")
            
            return True
            
        except Exception as e:
            print(f"❌ 生成模拟数据失败: {e}")
            return False
    
    def get_data(self) -> torch.Tensor:
        """获取数据"""
        if self.data is None:
            raise ValueError("数据未生成，请先调用load_data()")
        return self.data
    
    def get_times(self) -> np.ndarray:
        """获取时间序列"""
        return self.metadata.get('times', np.linspace(0, 1, self.data.shape[1]))


class ExternalAPIDataLoader(DataLoader):
    """外部API数据加载器（预留接口）"""
    
    def __init__(self, 
                 api_url: str,
                 api_key: Optional[str] = None,
                 device: Optional[torch.device] = None):
        super().__init__(device)
        self.api_url = api_url
        self.api_key = api_key
        self.session = requests.Session()
        
        if api_key:
            self.session.headers.update({'Authorization': f'Bearer {api_key}'})
    
    def load_data(self, 
                 symbol: str,
                 start_date: str,
                 end_date: str,
                 interval: str = '1d',
                 **kwargs) -> bool:
        """从外部API加载数据"""
        try:
            # 构建请求参数
            params = {
                'symbol': symbol,
                'start_date': start_date,
                'end_date': end_date,
                'interval': interval
            }
            params.update(kwargs)
            
            # 发送请求
            response = self.session.get(self.api_url, params=params)
            response.raise_for_status()
            
            # 解析响应
            data = response.json()
            
            # 转换为DataFrame
            df = pd.DataFrame(data.get('data', []))
            
            if df.empty:
                print("❌ API返回空数据")
                return False
            
            # 处理时间列
            if 'timestamp' in df.columns:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                times = df['timestamp'].values
                df = df.drop(columns=['timestamp'])
            else:
                times = np.linspace(0, 1, len(df))
            
            # 提取价格数据
            price_columns = ['open', 'high', 'low', 'close', 'volume']
            available_columns = [col for col in price_columns if col in df.columns]
            
            if not available_columns:
                print("❌ 未找到价格列")
                return False
            
            price_data = df[available_columns].values
            
            # 转换为tensor
            self.data = torch.tensor(price_data, dtype=torch.float32, device=self.device)
            
            # 更新元数据
            self.metadata = {
                'api_url': self.api_url,
                'symbol': symbol,
                'start_date': start_date,
                'end_date': end_date,
                'interval': interval,
                'data_shape': self.data.shape,
                'time_steps': len(times),
                'num_assets': price_data.shape[1],
                'times': times,
                'price_columns': available_columns,
                'loaded_at': datetime.now().isoformat()
            }
            
            print(f"✓ 成功从API加载数据")
            print(f"  标的: {symbol}")
            print(f"  数据形状: {self.data.shape}")
            print(f"  时间范围: {start_date} 到 {end_date}")
            
            return True
            
        except Exception as e:
            print(f"❌ 从API加载数据失败: {e}")
            return False
    
    def get_data(self) -> torch.Tensor:
        """获取数据"""
        if self.data is None:
            raise ValueError("数据未加载，请先调用load_data()")
        return self.data
    
    def get_times(self) -> np.ndarray:
        """获取时间序列"""
        return self.metadata.get('times', np.linspace(0, 1, self.data.shape[0]))


class DataLoaderFactory:
    """数据加载器工厂"""
    
    _loaders = {
        'csv': CSVDataLoader,
        'simulated': SimulatedDataLoader,
        'api': ExternalAPIDataLoader
    }
    
    @classmethod
    def create_loader(cls, loader_type: str, **kwargs) -> DataLoader:
        """创建数据加载器"""
        if loader_type not in cls._loaders:
            raise ValueError(f"Unknown loader type: {loader_type}. Available: {list(cls._loaders.keys())}")
        
        return cls._loaders[loader_type](**kwargs)
    
    @classmethod
    def list_available_loaders(cls) -> List[str]:
        """列出可用的数据加载器"""
        return list(cls._loaders.keys())


class DataPreprocessor:
    """数据预处理器"""
    
    @staticmethod
    def normalize_data(data: torch.Tensor, method: str = 'zscore') -> Tuple[torch.Tensor, Dict[str, Any]]:
        """标准化数据"""
        from ..math_modeling.utils import normalize_paths, denormalize_paths
        
        normalized_data, stats = normalize_paths(data, method)
        return normalized_data, stats
    
    @staticmethod
    def denormalize_data(normalized_data: torch.Tensor, stats: Dict[str, Any], method: str = 'zscore') -> torch.Tensor:
        """反标准化数据"""
        from ..math_modeling.utils import denormalize_paths
        
        return denormalize_paths(normalized_data, stats, method)
    
    @staticmethod
    def add_noise(data: torch.Tensor, noise_level: float = 0.01) -> torch.Tensor:
        """添加噪声"""
        noise = torch.randn_like(data) * noise_level
        return data + noise
    
    @staticmethod
    def smooth_data(data: torch.Tensor, window_size: int = 5) -> torch.Tensor:
        """平滑数据"""
        if len(data.shape) == 3:
            # 3D数据 (batch_size, time_steps, features)
            smoothed = torch.zeros_like(data)
            for i in range(data.shape[0]):
                for j in range(data.shape[2]):
                    smoothed[i, :, j] = torch.conv1d(
                        data[i, :, j].unsqueeze(0).unsqueeze(0),
                        torch.ones(1, 1, window_size) / window_size,
                        padding=window_size//2
                    ).squeeze()
        else:
            # 2D数据 (time_steps, features)
            smoothed = torch.zeros_like(data)
            for j in range(data.shape[1]):
                smoothed[:, j] = torch.conv1d(
                    data[:, j].unsqueeze(0).unsqueeze(0),
                    torch.ones(1, 1, window_size) / window_size,
                    padding=window_size//2
                ).squeeze()
        
        return smoothed
    
    @staticmethod
    def create_train_test_split(data: torch.Tensor, test_ratio: float = 0.2, random_seed: int = 42) -> Tuple[torch.Tensor, torch.Tensor]:
        """创建训练测试分割"""
        torch.manual_seed(random_seed)
        
        total_size = data.shape[0]
        test_size = int(total_size * test_ratio)
        
        indices = torch.randperm(total_size)
        test_indices = indices[:test_size]
        train_indices = indices[test_size:]
        
        train_data = data[train_indices]
        test_data = data[test_indices]
        
        return train_data, test_data
