"""
配置管理模块初始化文件
"""

from .default_config import DEFAULT_CONFIG
from .config_manager import ConfigManager

# 全局配置管理器实例
_config_manager = None

def get_config_manager():
    """获取全局配置管理器实例"""
    global _config_manager
    if _config_manager is None:
        _config_manager = ConfigManager()
    return _config_manager

def get_config(key: str = None, default=None):
    """获取配置值"""
    config_manager = get_config_manager()
    if key is None:
        return config_manager.get_config()
    return config_manager.get(key, default)

def set_config(key: str, value):
    """设置配置值"""
    config_manager = get_config_manager()
    config_manager.set(key, value)

__all__ = [
    'DEFAULT_CONFIG',
    'ConfigManager',
    'get_config_manager',
    'get_config',
    'set_config'
]
