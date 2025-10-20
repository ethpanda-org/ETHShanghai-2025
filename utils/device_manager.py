"""
设备管理模块
负责GPU/CPU设备的选择和管理
"""

import torch
import os
from typing import Optional, Dict, Any, List, Union
import warnings


class DeviceManager:
    """设备管理器"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.device = None
        self.device_info = {}
        self._setup_device()
    
    def _setup_device(self):
        """设置设备"""
        auto_select = self.config.get('auto_select', True)
        prefer_cuda = self.config.get('prefer_cuda', True)
        cuda_device = self.config.get('cuda_device', 0)
        
        if auto_select:
            self.device = self._auto_select_device(prefer_cuda, cuda_device)
        else:
            device_name = self.config.get('device', 'cpu')
            self.device = torch.device(device_name)
        
        self._setup_device_optimizations()
        self._get_device_info()
    
    def _auto_select_device(self, prefer_cuda: bool = True, cuda_device: int = 0) -> torch.device:
        """自动选择设备"""
        if prefer_cuda and torch.cuda.is_available():
            try:
                device = torch.device(f"cuda:{cuda_device}")
                # 测试设备是否可用
                test_tensor = torch.tensor([1.0], device=device)
                return device
            except Exception as e:
                warnings.warn(f"CUDA设备 {cuda_device} 不可用: {e}")
                return torch.device("cpu")
        else:
            return torch.device("cpu")
    
    def _setup_device_optimizations(self):
        """设置设备优化选项"""
        if self.device.type == "cuda":
            try:
                # 启用cudnn benchmark
                if self.config.get('enable_benchmark', True):
                    torch.backends.cudnn.benchmark = True
                
                # 启用TF32（如果支持）
                if self.config.get('enable_tf32', True):
                    torch.backends.cuda.matmul.allow_tf32 = True
                    torch.backends.cudnn.allow_tf32 = True
                
                # 设置matmul精度
                try:
                    precision = self.config.get('precision', 'fp32')
                    if precision == 'high':
                        torch.set_float32_matmul_precision('high')
                except Exception:
                    pass
                
                print(f"✓ CUDA优化已启用")
                
            except Exception as e:
                warnings.warn(f"CUDA优化设置失败: {e}")
    
    def _get_device_info(self):
        """获取设备信息"""
        self.device_info = {
            'device': str(self.device),
            'type': self.device.type,
            'index': self.device.index if self.device.index is not None else 0
        }
        
        if self.device.type == "cuda":
            try:
                self.device_info.update({
                    'cuda_available': torch.cuda.is_available(),
                    'cuda_version': torch.version.cuda,
                    'device_count': torch.cuda.device_count(),
                    'current_device': torch.cuda.current_device(),
                    'device_name': torch.cuda.get_device_name(self.device.index or 0),
                    'memory_allocated': torch.cuda.memory_allocated(self.device.index or 0),
                    'memory_reserved': torch.cuda.memory_reserved(self.device.index or 0),
                    'max_memory': torch.cuda.max_memory_allocated(self.device.index or 0)
                })
            except Exception as e:
                warnings.warn(f"获取CUDA设备信息失败: {e}")
    
    def get_device(self) -> torch.device:
        """获取当前设备"""
        return self.device
    
    def get_device_info(self) -> Dict[str, Any]:
        """获取设备信息"""
        return self.device_info.copy()
    
    def print_device_info(self):
        """打印设备信息"""
        print("=" * 50)
        print("设备信息")
        print("=" * 50)
        print(f"当前设备: {self.device_info['device']}")
        print(f"设备类型: {self.device_info['type']}")
        
        if self.device_info['type'] == 'cuda':
            print(f"CUDA版本: {self.device_info.get('cuda_version', 'N/A')}")
            print(f"设备数量: {self.device_info.get('device_count', 'N/A')}")
            print(f"当前设备索引: {self.device_info.get('current_device', 'N/A')}")
            print(f"设备名称: {self.device_info.get('device_name', 'N/A')}")
            print(f"已分配内存: {self.device_info.get('memory_allocated', 0) / 1024**3:.2f} GB")
            print(f"已保留内存: {self.device_info.get('memory_reserved', 0) / 1024**3:.2f} GB")
        
        print("=" * 50)
    
    def get_memory_info(self) -> Dict[str, float]:
        """获取内存信息（GB）"""
        if self.device.type == "cuda":
            try:
                allocated = torch.cuda.memory_allocated(self.device.index or 0) / 1024**3
                reserved = torch.cuda.memory_reserved(self.device.index or 0) / 1024**3
                max_allocated = torch.cuda.max_memory_allocated(self.device.index or 0) / 1024**3
                
                return {
                    'allocated': allocated,
                    'reserved': reserved,
                    'max_allocated': max_allocated,
                    'free': reserved - allocated
                }
            except Exception:
                return {'allocated': 0, 'reserved': 0, 'max_allocated': 0, 'free': 0}
        else:
            return {'allocated': 0, 'reserved': 0, 'max_allocated': 0, 'free': 0}
    
    def clear_cache(self):
        """清理GPU缓存"""
        if self.device.type == "cuda":
            torch.cuda.empty_cache()
            print("✓ GPU缓存已清理")
    
    def set_device(self, device: Union[str, torch.device]):
        """设置设备"""
        if isinstance(device, str):
            device = torch.device(device)
        
        self.device = device
        self._setup_device_optimizations()
        self._get_device_info()
        print(f"✓ 设备已设置为: {device}")
    
    def list_available_devices(self) -> List[Dict[str, Any]]:
        """列出可用设备"""
        devices = []
        
        # CPU设备
        devices.append({
            'name': 'CPU',
            'device': 'cpu',
            'type': 'cpu',
            'available': True
        })
        
        # CUDA设备
        if torch.cuda.is_available():
            for i in range(torch.cuda.device_count()):
                try:
                    device_name = torch.cuda.get_device_name(i)
                    devices.append({
                        'name': device_name,
                        'device': f'cuda:{i}',
                        'type': 'cuda',
                        'index': i,
                        'available': True
                    })
                except Exception:
                    devices.append({
                        'name': f'CUDA Device {i}',
                        'device': f'cuda:{i}',
                        'type': 'cuda',
                        'index': i,
                        'available': False
                    })
        
        return devices
    
    def get_optimal_batch_size(self, model_size_mb: float = 100) -> int:
        """估算最优批次大小"""
        if self.device.type == "cuda":
            try:
                # 获取GPU内存信息
                memory_info = self.get_memory_info()
                free_memory_gb = memory_info['free']
                
                # 估算批次大小（保守估计）
                # 假设每个样本需要 model_size_mb * 4 的内存（前向+反向传播）
                estimated_memory_per_sample = model_size_mb * 4 / 1024  # GB
                
                if estimated_memory_per_sample > 0:
                    optimal_batch_size = int(free_memory_gb * 0.8 / estimated_memory_per_sample)
                    return max(1, min(optimal_batch_size, 10000))  # 限制在合理范围内
                else:
                    return 256  # 默认值
                    
            except Exception:
                return 256  # 默认值
        else:
            # CPU设备，使用较小的批次大小
            return 64


def select_device(device_config: Optional[Dict[str, Any]] = None) -> torch.device:
    """选择设备的便捷函数"""
    manager = DeviceManager(device_config)
    return manager.get_device()


def get_device_manager(device_config: Optional[Dict[str, Any]] = None) -> DeviceManager:
    """获取设备管理器实例"""
    return DeviceManager(device_config)


# 全局设备管理器
device_manager = DeviceManager()


def get_current_device() -> torch.device:
    """获取当前设备"""
    return device_manager.get_device()


def print_device_status():
    """打印设备状态"""
    device_manager.print_device_info()


def clear_gpu_cache():
    """清理GPU缓存"""
    device_manager.clear_cache()
