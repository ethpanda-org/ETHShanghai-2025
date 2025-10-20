"""
通用工具模块初始化文件
"""

from .device_manager import DeviceManager, select_device
from .logger import setup_logger, get_logger

# 添加缺失的函数
def log_system_info():
    """记录系统信息"""
    import sys
    import torch
    import numpy as np
    from datetime import datetime
    
    logger = setup_logger('system_info')
    logger.info("=" * 60)
    logger.info("系统信息")
    logger.info("=" * 60)
    logger.info(f"Python版本: {sys.version}")
    logger.info(f"PyTorch版本: {torch.__version__}")
    logger.info(f"NumPy版本: {np.__version__}")
    logger.info(f"CUDA可用: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        logger.info(f"CUDA版本: {torch.version.cuda}")
        logger.info(f"GPU数量: {torch.cuda.device_count()}")
    logger.info(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("=" * 60)

__all__ = [
    'DeviceManager',
    'select_device',
    'setup_logger',
    'get_logger',
    'log_system_info'
]
