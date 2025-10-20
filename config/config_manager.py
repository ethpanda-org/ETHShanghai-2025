"""
配置管理器
负责配置的加载、保存、验证和更新
"""

import json
import os
from typing import Dict, Any, Optional, List, Union
from pathlib import Path
import copy

# 可选依赖
try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False
    print("警告: yaml未安装，YAML配置文件将不可用")


class ConfigManager:
    """配置管理器"""
    
    def __init__(self, config_file: Optional[str] = None):
        self.config_file = config_file
        self.config = {}
        self.validation_rules = {}
        
        # 加载默认配置
        from .default_config import DEFAULT_CONFIG, CONFIG_VALIDATION_RULES
        self.config = copy.deepcopy(DEFAULT_CONFIG)
        self.validation_rules = CONFIG_VALIDATION_RULES
        
        # 如果指定了配置文件，加载它
        if config_file and os.path.exists(config_file):
            self.load_config(config_file)
    
    def load_config(self, config_file: str) -> bool:
        """加载配置文件"""
        try:
            file_path = Path(config_file)
            
            if file_path.suffix.lower() == '.json':
                with open(config_file, 'r', encoding='utf-8') as f:
                    loaded_config = json.load(f)
            elif file_path.suffix.lower() in ['.yml', '.yaml']:
                if HAS_YAML:
                    with open(config_file, 'r', encoding='utf-8') as f:
                        loaded_config = yaml.safe_load(f)
                else:
                    raise ImportError("yaml未安装，无法加载YAML配置文件")
            else:
                print(f"❌ 不支持的配置文件格式: {file_path.suffix}")
                return False
            
            # 验证配置
            if self.validate_config(loaded_config):
                # 深度合并配置
                self.config = self._deep_merge(self.config, loaded_config)
                self.config_file = config_file
                print(f"✓ 成功加载配置文件: {config_file}")
                return True
            else:
                print(f"❌ 配置文件验证失败: {config_file}")
                return False
                
        except Exception as e:
            print(f"❌ 加载配置文件失败: {e}")
            return False
    
    def save_config(self, config_file: str, format: str = 'json') -> bool:
        """保存配置文件"""
        try:
            file_path = Path(config_file)
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            if format.lower() == 'json':
                with open(config_file, 'w', encoding='utf-8') as f:
                    json.dump(self.config, f, indent=2, ensure_ascii=False)
            elif format.lower() in ['yml', 'yaml']:
                if HAS_YAML:
                    with open(config_file, 'w', encoding='utf-8') as f:
                        yaml.dump(self.config, f, default_flow_style=False, allow_unicode=True)
                else:
                    raise ImportError("yaml未安装，无法保存YAML配置文件")
            else:
                print(f"❌ 不支持的保存格式: {format}")
                return False
            
            print(f"✓ 成功保存配置文件: {config_file}")
            return True
            
        except Exception as e:
            print(f"❌ 保存配置文件失败: {e}")
            return False
    
    def get_config(self, key: Optional[str] = None) -> Union[Dict[str, Any], Any]:
        """获取配置"""
        if key is None:
            return self.config.copy()
        
        return self._get_nested_value(self.config, key)
    
    def get(self, key: str, default=None):
        """获取配置值（兼容方法）"""
        result = self.get_config(key)
        return result if result is not None else default
    
    def set(self, key: str, value: Any) -> bool:
        """设置配置值（兼容方法）"""
        return self.set_config(key, value)
    
    def set_config(self, key: str, value: Any) -> bool:
        """设置配置"""
        try:
            # 验证单个配置项
            if key in self.validation_rules:
                if not self._validate_single_value(value, self.validation_rules[key]):
                    print(f"❌ 配置验证失败: {key} = {value}")
                    return False
            
            # 设置配置
            self._set_nested_value(self.config, key, value)
            return True
            
        except Exception as e:
            print(f"❌ 设置配置失败: {e}")
            return False
    
    def update_config(self, updates: Dict[str, Any]) -> bool:
        """批量更新配置"""
        try:
            for key, value in updates.items():
                if not self.set_config(key, value):
                    return False
            
            print(f"✓ 成功更新 {len(updates)} 个配置项")
            return True
            
        except Exception as e:
            print(f"❌ 批量更新配置失败: {e}")
            return False
    
    def validate_config(self, config: Dict[str, Any]) -> bool:
        """验证配置"""
        try:
            for rule_key, rule in self.validation_rules.items():
                value = self._get_nested_value(config, rule_key)
                if value is not None:
                    if not self._validate_single_value(value, rule):
                        print(f"❌ 配置验证失败: {rule_key} = {value}")
                        return False
            
            return True
            
        except Exception as e:
            print(f"❌ 配置验证过程出错: {e}")
            return False
    
    def _validate_single_value(self, value: Any, rule: Dict[str, Any]) -> bool:
        """验证单个值"""
        # 类型检查
        if 'type' in rule:
            if not isinstance(value, rule['type']):
                return False
        
        # 最小值检查
        if 'min' in rule:
            if value < rule['min']:
                return False
        
        # 最大值检查
        if 'max' in rule:
            if value > rule['max']:
                return False
        
        # 枚举值检查
        if 'choices' in rule:
            if value not in rule['choices']:
                return False
        
        return True
    
    def _get_nested_value(self, config: Dict[str, Any], key: str) -> Any:
        """获取嵌套值"""
        keys = key.split('.')
        value = config
        
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return None
        
        return value
    
    def _set_nested_value(self, config: Dict[str, Any], key: str, value: Any):
        """设置嵌套值"""
        keys = key.split('.')
        current = config
        
        for k in keys[:-1]:
            if k not in current:
                current[k] = {}
            current = current[k]
        
        current[keys[-1]] = value
    
    def _deep_merge(self, base: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, Any]:
        """深度合并字典"""
        result = copy.deepcopy(base)
        
        for key, value in update.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = copy.deepcopy(value)
        
        return result
    
    def get_module_config(self, module: str) -> Dict[str, Any]:
        """获取模块配置"""
        return self.get_config(module) or {}
    
    def set_module_config(self, module: str, config: Dict[str, Any]) -> bool:
        """设置模块配置"""
        return self.set_config(module, config)
    
    def reset_to_default(self):
        """重置为默认配置"""
        from .default_config import DEFAULT_CONFIG
        self.config = copy.deepcopy(DEFAULT_CONFIG)
        print("✓ 已重置为默认配置")
    
    def export_config(self, file_path: str, format: str = 'json') -> bool:
        """导出配置"""
        return self.save_config(file_path, format)
    
    def import_config(self, file_path: str) -> bool:
        """导入配置"""
        return self.load_config(file_path)
    
    def list_config_keys(self) -> List[str]:
        """列出所有配置键"""
        def _get_keys(d: Dict[str, Any], prefix: str = '') -> List[str]:
            keys = []
            for k, v in d.items():
                current_key = f"{prefix}.{k}" if prefix else k
                if isinstance(v, dict):
                    keys.extend(_get_keys(v, current_key))
                else:
                    keys.append(current_key)
            return keys
        
        return _get_keys(self.config)
    
    def get_config_summary(self) -> Dict[str, Any]:
        """获取配置摘要"""
        summary = {
            'total_keys': len(self.list_config_keys()),
            'modules': list(self.config.keys()),
            'config_file': self.config_file,
            'validation_rules': len(self.validation_rules)
        }
        
        return summary


# 全局配置管理器实例
config_manager = ConfigManager()


def get_config(key: Optional[str] = None) -> Union[Dict[str, Any], Any]:
    """获取配置的便捷函数"""
    return config_manager.get_config(key)


def set_config(key: str, value: Any) -> bool:
    """设置配置的便捷函数"""
    return config_manager.set_config(key, value)


def update_config(updates: Dict[str, Any]) -> bool:
    """更新配置的便捷函数"""
    return config_manager.update_config(updates)
