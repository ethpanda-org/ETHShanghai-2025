#!/usr/bin/env python3
"""
统一日志和错误处理系统
Unified Logging and Error Handling System

提供项目范围内的标准化日志记录和错误处理功能
"""

import json
import logging
import logging.handlers
import os
import sys
import traceback
from datetime import datetime
from functools import wraps
from pathlib import Path
from typing import Any, Callable, Dict, Optional, Union

from config.settings import get_config


class ColoredFormatter(logging.Formatter):
    """彩色日志格式化器"""
    
    # ANSI颜色代码
    COLORS = {
        'DEBUG': '\033[36m',     # 青色
        'INFO': '\033[32m',      # 绿色
        'WARNING': '\033[33m',   # 黄色
        'ERROR': '\033[31m',     # 红色
        'CRITICAL': '\033[35m',  # 紫色
        'RESET': '\033[0m'       # 重置
    }
    
    def format(self, record):
        # 添加颜色
        if record.levelname in self.COLORS and hasattr(sys.stderr, 'isatty') and sys.stderr.isatty():
            record.levelname = f"{self.COLORS[record.levelname]}{record.levelname}{self.COLORS['RESET']}"
        
        return super().format(record)


class LogManager:
    """日志管理器"""
    
    def __init__(self):
        self.config = get_config()
        self.loggers = {}
        self._setup_root_logger()
    
    def _setup_root_logger(self):
        """设置根日志记录器"""
        root_logger = logging.getLogger()
        root_logger.setLevel(getattr(logging, self.config.logging.level))
        
        # 清除现有处理器
        root_logger.handlers.clear()
        
        # 文件处理器
        self._add_file_handler(root_logger)
        
        # 控制台处理器
        if self.config.logging.enable_console:
            self._add_console_handler(root_logger)
    
    def _add_file_handler(self, logger: logging.Logger):
        """添加文件处理器"""
        log_dir = Path(self.config.logging.file_path).parent
        log_dir.mkdir(parents=True, exist_ok=True)
        
        # 使用RotatingFileHandler进行日志轮转
        file_handler = logging.handlers.RotatingFileHandler(
            self.config.logging.file_path,
            maxBytes=self.config.logging.max_file_size,
            backupCount=self.config.logging.backup_count,
            encoding='utf-8'
        )
        
        file_formatter = logging.Formatter(self.config.logging.format)
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)
    
    def _add_console_handler(self, logger: logging.Logger):
        """添加控制台处理器"""
        console_handler = logging.StreamHandler()
        
        # 使用彩色格式化器
        console_formatter = ColoredFormatter(self.config.logging.format)
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)
    
    def get_logger(self, name: str) -> logging.Logger:
        """获取指定名称的日志记录器"""
        if name not in self.loggers:
            logger = logging.getLogger(name)
            self.loggers[name] = logger
        
        return self.loggers[name]


class ErrorHandler:
    """错误处理器"""
    
    def __init__(self, logger: Optional[logging.Logger] = None):
        self.logger = logger or log_manager.get_logger(__name__)
        self.error_stats = {
            "total_errors": 0,
            "error_types": {},
            "last_error": None
        }
    
    def handle_exception(self, exc_type, exc_value, exc_traceback):
        """全局异常处理"""
        if issubclass(exc_type, KeyboardInterrupt):
            # 用户中断，不记录为错误
            sys.__excepthook__(exc_type, exc_value, exc_traceback)
            return
        
        error_info = {
            "type": exc_type.__name__,
            "message": str(exc_value),
            "traceback": traceback.format_exception(exc_type, exc_value, exc_traceback),
            "timestamp": datetime.now().isoformat()
        }
        
        # 记录错误
        self.logger.critical(
            f"Uncaught exception: {error_info['type']}: {error_info['message']}",
            exc_info=(exc_type, exc_value, exc_traceback)
        )
        
        # 更新统计
        self._update_error_stats(error_info)
        
        # 保存错误详情
        self._save_error_details(error_info)
    
    def _update_error_stats(self, error_info: Dict):
        """更新错误统计"""
        self.error_stats["total_errors"] += 1
        error_type = error_info["type"]
        
        if error_type not in self.error_stats["error_types"]:
            self.error_stats["error_types"][error_type] = 0
        
        self.error_stats["error_types"][error_type] += 1
        self.error_stats["last_error"] = error_info["timestamp"]
    
    def _save_error_details(self, error_info: Dict):
        """保存错误详情到文件"""
        try:
            error_log_dir = Path("logs/errors")
            error_log_dir.mkdir(parents=True, exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            error_file = error_log_dir / f"error_{timestamp}.json"
            
            with open(error_file, 'w', encoding='utf-8') as f:
                json.dump(error_info, f, indent=2, ensure_ascii=False)
        
        except Exception as e:
            self.logger.error(f"Failed to save error details: {e}")


def retry_on_failure(max_retries: int = 3, delay: float = 1.0, 
                    exceptions: tuple = (Exception,)):
    """重试装饰器"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            logger = log_manager.get_logger(func.__module__)
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_retries:
                        logger.error(
                            f"Function {func.__name__} failed after {max_retries} retries: {e}"
                        )
                        raise
                    else:
                        logger.warning(
                            f"Function {func.__name__} failed (attempt {attempt + 1}/{max_retries + 1}): {e}"
                        )
                        if delay > 0:
                            import time
                            time.sleep(delay)
            
        return wrapper
    return decorator


def async_retry_on_failure(max_retries: int = 3, delay: float = 1.0,
                          exceptions: tuple = (Exception,)):
    """异步重试装饰器"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            logger = log_manager.get_logger(func.__module__)
            
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_retries:
                        logger.error(
                            f"Async function {func.__name__} failed after {max_retries} retries: {e}"
                        )
                        raise
                    else:
                        logger.warning(
                            f"Async function {func.__name__} failed (attempt {attempt + 1}/{max_retries + 1}): {e}"
                        )
                        if delay > 0:
                            import asyncio
                            await asyncio.sleep(delay)
            
        return wrapper
    return decorator


def log_execution_time(func: Callable = None, *, level: str = "INFO"):
    """执行时间记录装饰器"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            logger = log_manager.get_logger(func.__module__)
            start_time = datetime.now()
            
            try:
                result = func(*args, **kwargs)
                execution_time = (datetime.now() - start_time).total_seconds()
                
                log_level = getattr(logging, level.upper())
                logger.log(log_level, f"Function {func.__name__} executed in {execution_time:.3f}s")
                
                return result
            except Exception as e:
                execution_time = (datetime.now() - start_time).total_seconds()
                logger.error(f"Function {func.__name__} failed after {execution_time:.3f}s: {e}")
                raise
        
        return wrapper
    
    if func is None:
        return decorator
    else:
        return decorator(func)


def async_log_execution_time(func: Callable = None, *, level: str = "INFO"):
    """异步执行时间记录装饰器"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            logger = log_manager.get_logger(func.__module__)
            start_time = datetime.now()
            
            try:
                result = await func(*args, **kwargs)
                execution_time = (datetime.now() - start_time).total_seconds()
                
                log_level = getattr(logging, level.upper())
                logger.log(log_level, f"Async function {func.__name__} executed in {execution_time:.3f}s")
                
                return result
            except Exception as e:
                execution_time = (datetime.now() - start_time).total_seconds()
                logger.error(f"Async function {func.__name__} failed after {execution_time:.3f}s: {e}")
                raise
        
        return wrapper
    
    if func is None:
        return decorator
    else:
        return decorator(func)


class ContextLogger:
    """上下文日志记录器"""
    
    def __init__(self, logger: logging.Logger, context: Dict[str, Any]):
        self.logger = logger
        self.context = context
    
    def _format_message(self, message: str) -> str:
        """格式化消息，添加上下文信息"""
        context_str = " | ".join([f"{k}={v}" for k, v in self.context.items()])
        return f"[{context_str}] {message}"
    
    def debug(self, message: str, *args, **kwargs):
        self.logger.debug(self._format_message(message), *args, **kwargs)
    
    def info(self, message: str, *args, **kwargs):
        self.logger.info(self._format_message(message), *args, **kwargs)
    
    def warning(self, message: str, *args, **kwargs):
        self.logger.warning(self._format_message(message), *args, **kwargs)
    
    def error(self, message: str, *args, **kwargs):
        self.logger.error(self._format_message(message), *args, **kwargs)
    
    def critical(self, message: str, *args, **kwargs):
        self.logger.critical(self._format_message(message), *args, **kwargs)


class SafeExecutor:
    """安全执行器 - 提供异常安全的函数执行"""
    
    def __init__(self, logger: Optional[logging.Logger] = None):
        self.logger = logger or log_manager.get_logger(__name__)
    
    def safe_call(self, func: Callable, *args, default_return=None, 
                  log_errors: bool = True, **kwargs) -> Any:
        """安全调用函数，捕获并记录异常"""
        try:
            return func(*args, **kwargs)
        except Exception as e:
            if log_errors:
                self.logger.error(f"Safe call failed for {func.__name__}: {e}", exc_info=True)
            return default_return
    
    async def async_safe_call(self, func: Callable, *args, default_return=None,
                             log_errors: bool = True, **kwargs) -> Any:
        """异步安全调用函数"""
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            if log_errors:
                self.logger.error(f"Async safe call failed for {func.__name__}: {e}", exc_info=True)
            return default_return


def setup_global_error_handling():
    """设置全局错误处理"""
    error_handler = ErrorHandler()
    sys.excepthook = error_handler.handle_exception


def create_context_logger(name: str, **context) -> ContextLogger:
    """创建上下文日志记录器"""
    logger = log_manager.get_logger(name)
    return ContextLogger(logger, context)


# 全局实例
log_manager = LogManager()
safe_executor = SafeExecutor()

# 设置全局错误处理
setup_global_error_handling()


def get_logger(name: str) -> logging.Logger:
    """获取日志记录器的便捷函数"""
    return log_manager.get_logger(name)


def main():
    """测试和演示功能"""
    # 演示不同级别的日志
    logger = get_logger(__name__)
    
    logger.debug("这是一个调试信息")
    logger.info("这是一个信息消息")
    logger.warning("这是一个警告")
    logger.error("这是一个错误")
    
    # 演示上下文日志
    ctx_logger = create_context_logger(__name__, user_id="123", session="abc")
    ctx_logger.info("用户执行了操作")
    
    # 演示重试装饰器
    @retry_on_failure(max_retries=2, delay=0.1)
    def flaky_function():
        import random
        if random.random() < 0.7:
            raise ValueError("随机失败")
        return "成功"
    
    try:
        result = flaky_function()
        logger.info(f"函数执行结果: {result}")
    except Exception as e:
        logger.error(f"函数最终失败: {e}")
    
    # 演示执行时间记录
    @log_execution_time
    def slow_function():
        import time
        time.sleep(0.1)
        return "完成"
    
    slow_function()
    
    logger.info("日志和错误处理系统演示完成")


if __name__ == "__main__":
    main()