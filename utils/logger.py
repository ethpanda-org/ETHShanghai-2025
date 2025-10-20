"""
日志系统模块
提供统一的日志管理功能
"""

import logging
import os
import sys
from datetime import datetime
from typing import Optional, Dict, Any
from pathlib import Path
import logging.handlers


class ColoredFormatter(logging.Formatter):
    """彩色日志格式化器"""
    
    COLORS = {
        'DEBUG': '\033[36m',    # 青色
        'INFO': '\033[32m',     # 绿色
        'WARNING': '\033[33m',  # 黄色
        'ERROR': '\033[31m',    # 红色
        'CRITICAL': '\033[35m', # 紫色
        'RESET': '\033[0m'      # 重置
    }
    
    def format(self, record):
        # 添加颜色
        if record.levelname in self.COLORS:
            record.levelname = f"{self.COLORS[record.levelname]}{record.levelname}{self.COLORS['RESET']}"
        
        return super().format(record)


def setup_logger(name: str = 'deep_bsde',
                level: str = 'INFO',
                log_file: Optional[str] = None,
                log_format: Optional[str] = None,
                max_size: int = 10 * 1024 * 1024,  # 10MB
                backup_count: int = 5,
                console_output: bool = True) -> logging.Logger:
    """设置日志器"""
    
    # 创建日志器
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper()))
    
    # 清除现有的处理器
    logger.handlers.clear()
    
    # 设置格式
    if log_format is None:
        log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    formatter = logging.Formatter(log_format)
    colored_formatter = ColoredFormatter(log_format)
    
    # 控制台处理器
    if console_output:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(colored_formatter)
        logger.addHandler(console_handler)
    
    # 文件处理器
    if log_file:
        # 确保日志目录存在
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 使用RotatingFileHandler支持日志轮转
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=max_size,
            backupCount=backup_count,
            encoding='utf-8'
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    # 防止日志重复
    logger.propagate = False
    
    return logger


def get_logger(name: str = 'deep_bsde') -> logging.Logger:
    """获取日志器"""
    return logging.getLogger(name)


class LoggerMixin:
    """日志混入类"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.logger = get_logger(self.__class__.__name__)
    
    def log_info(self, message: str):
        """记录信息日志"""
        self.logger.info(message)
    
    def log_debug(self, message: str):
        """记录调试日志"""
        self.logger.debug(message)
    
    def log_warning(self, message: str):
        """记录警告日志"""
        self.logger.warning(message)
    
    def log_error(self, message: str):
        """记录错误日志"""
        self.logger.error(message)
    
    def log_critical(self, message: str):
        """记录严重错误日志"""
        self.logger.critical(message)


class PerformanceLogger:
    """性能日志记录器"""
    
    def __init__(self, logger: Optional[logging.Logger] = None):
        self.logger = logger or get_logger('performance')
        self.start_times = {}
    
    def start_timer(self, name: str):
        """开始计时"""
        self.start_times[name] = datetime.now()
        self.logger.debug(f"开始计时: {name}")
    
    def end_timer(self, name: str) -> float:
        """结束计时并返回耗时"""
        if name not in self.start_times:
            self.logger.warning(f"未找到计时器: {name}")
            return 0.0
        
        start_time = self.start_times[name]
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        del self.start_times[name]
        
        self.logger.info(f"计时结束: {name} - 耗时: {duration:.4f}秒")
        return duration
    
    def log_memory_usage(self, device: str = 'cuda'):
        """记录内存使用情况"""
        if device == 'cuda':
            try:
                import torch
                if torch.cuda.is_available():
                    allocated = torch.cuda.memory_allocated() / 1024**3
                    reserved = torch.cuda.memory_reserved() / 1024**3
                    self.logger.info(f"GPU内存使用 - 已分配: {allocated:.2f}GB, 已保留: {reserved:.2f}GB")
            except ImportError:
                pass


class TrainingLogger:
    """训练日志记录器"""
    
    def __init__(self, logger: Optional[logging.Logger] = None):
        self.logger = logger or get_logger('training')
        self.epoch_logs = []
    
    def log_epoch(self, epoch: int, train_loss: float, val_loss: Optional[float] = None, 
                 train_metrics: Optional[Dict[str, float]] = None,
                 val_metrics: Optional[Dict[str, float]] = None):
        """记录训练轮次"""
        log_data = {
            'epoch': epoch,
            'train_loss': train_loss,
            'val_loss': val_loss,
            'train_metrics': train_metrics or {},
            'val_metrics': val_metrics or {}
        }
        
        self.epoch_logs.append(log_data)
        
        # 格式化日志消息
        msg = f"Epoch {epoch:4d} - Train Loss: {train_loss:.6f}"
        if val_loss is not None:
            msg += f" - Val Loss: {val_loss:.6f}"
        
        if train_metrics:
            for key, value in train_metrics.items():
                msg += f" - Train {key}: {value:.4f}"
        
        if val_metrics:
            for key, value in val_metrics.items():
                msg += f" - Val {key}: {value:.4f}"
        
        self.logger.info(msg)
    
    def log_model_info(self, model_info: Dict[str, Any]):
        """记录模型信息"""
        self.logger.info("=" * 50)
        self.logger.info("模型信息")
        self.logger.info("=" * 50)
        
        for key, value in model_info.items():
            self.logger.info(f"{key}: {value}")
        
        self.logger.info("=" * 50)
    
    def log_training_start(self, config: Dict[str, Any]):
        """记录训练开始"""
        self.logger.info("开始训练")
        self.logger.info("=" * 50)
        
        for key, value in config.items():
            self.logger.info(f"{key}: {value}")
        
        self.logger.info("=" * 50)
    
    def log_training_end(self, final_metrics: Dict[str, float]):
        """记录训练结束"""
        self.logger.info("训练完成")
        self.logger.info("=" * 50)
        
        for key, value in final_metrics.items():
            self.logger.info(f"最终 {key}: {value:.6f}")
        
        self.logger.info("=" * 50)
    
    def get_epoch_logs(self) -> list:
        """获取训练日志"""
        return self.epoch_logs.copy()


class BacktestLogger:
    """回测日志记录器"""
    
    def __init__(self, logger: Optional[logging.Logger] = None):
        self.logger = logger or get_logger('backtest')
    
    def log_backtest_start(self, strategy_name: str, num_paths: int):
        """记录回测开始"""
        self.logger.info(f"开始回测 - 策略: {strategy_name}, 路径数: {num_paths}")
    
    def log_backtest_progress(self, current: int, total: int):
        """记录回测进度"""
        if current % max(1, total // 10) == 0 or current == total - 1:
            progress = (current + 1) / total * 100
            self.logger.info(f"回测进度: {current + 1}/{total} ({progress:.1f}%)")
    
    def log_backtest_result(self, result: Dict[str, Any]):
        """记录回测结果"""
        self.logger.info("回测结果:")
        self.logger.info("=" * 30)
        
        for key, value in result.items():
            if isinstance(value, float):
                self.logger.info(f"{key}: {value:.4f}")
            else:
                self.logger.info(f"{key}: {value}")
        
        self.logger.info("=" * 30)
    
    def log_strategy_comparison(self, comparison_results: Dict[str, Dict[str, Any]]):
        """记录策略对比结果"""
        self.logger.info("策略对比结果:")
        self.logger.info("=" * 50)
        
        for strategy_name, results in comparison_results.items():
            self.logger.info(f"{strategy_name}:")
            for metric, value in results.items():
                if isinstance(value, float):
                    self.logger.info(f"  {metric}: {value:.4f}")
                else:
                    self.logger.info(f"  {metric}: {value}")
            self.logger.info("-" * 30)


# 全局日志器
main_logger = setup_logger('deep_bsde')
performance_logger = PerformanceLogger()
training_logger = TrainingLogger()
backtest_logger = BacktestLogger()


def log_system_info():
    """记录系统信息"""
    import platform
    import torch
    
    main_logger.info("系统信息:")
    main_logger.info(f"  操作系统: {platform.system()} {platform.release()}")
    main_logger.info(f"  Python版本: {platform.python_version()}")
    main_logger.info(f"  PyTorch版本: {torch.__version__}")
    main_logger.info(f"  CUDA可用: {torch.cuda.is_available()}")
    
    if torch.cuda.is_available():
        main_logger.info(f"  CUDA版本: {torch.version.cuda}")
        main_logger.info(f"  GPU数量: {torch.cuda.device_count()}")
        for i in range(torch.cuda.device_count()):
            main_logger.info(f"  GPU {i}: {torch.cuda.get_device_name(i)}")
