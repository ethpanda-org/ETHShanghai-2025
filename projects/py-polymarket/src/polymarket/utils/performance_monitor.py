#!/usr/bin/env python3
"""
性能监控基础设施
Performance Monitoring Infrastructure

提供系统性能指标收集、分析和可视化功能
"""

import json
import os
import psutil
import time
from collections import defaultdict, deque
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from pathlib import Path
from threading import Lock, Thread
from typing import Dict, List, Optional

from src.polymarket.utils.logging_utils import get_logger

logger = get_logger(__name__)


@dataclass
class PerformanceMetrics:
    """性能指标数据类"""
    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    memory_mb: float
    disk_read_mb: float
    disk_write_mb: float
    network_sent_mb: float
    network_recv_mb: float
    active_threads: int
    open_files: int


@dataclass
class ApplicationMetrics:
    """应用程序指标数据类"""
    timestamp: datetime
    active_trades: int
    total_requests: int
    failed_requests: int
    average_response_time: float
    success_rate: float
    balance: float
    positions_count: int


class SystemMonitor:
    """系统性能监控器"""
    
    def __init__(self, collection_interval: int = 30):
        self.collection_interval = collection_interval
        self.is_running = False
        self.monitor_thread = None
        self.metrics_history = deque(maxlen=2880)  # 24小时数据 (30秒间隔)
        self.lock = Lock()
        
        # 初始值
        self.last_disk_read = 0
        self.last_disk_write = 0
        self.last_network_sent = 0
        self.last_network_recv = 0
    
    def collect_system_metrics(self) -> PerformanceMetrics:
        """收集系统性能指标"""
        try:
            # CPU和内存
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            
            # 磁盘IO
            disk_io = psutil.disk_io_counters()
            disk_read_mb = (disk_io.read_bytes - self.last_disk_read) / 1024 / 1024
            disk_write_mb = (disk_io.write_bytes - self.last_disk_write) / 1024 / 1024
            self.last_disk_read = disk_io.read_bytes
            self.last_disk_write = disk_io.write_bytes
            
            # 网络IO
            network_io = psutil.net_io_counters()
            network_sent_mb = (network_io.bytes_sent - self.last_network_sent) / 1024 / 1024
            network_recv_mb = (network_io.bytes_recv - self.last_network_recv) / 1024 / 1024
            self.last_network_sent = network_io.bytes_sent
            self.last_network_recv = network_io.bytes_recv
            
            # 进程信息
            process = psutil.Process()
            active_threads = process.num_threads()
            try:
                open_files = len(process.open_files())
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                open_files = 0
            
            return PerformanceMetrics(
                timestamp=datetime.now(),
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                memory_mb=memory.used / 1024 / 1024,
                disk_read_mb=disk_read_mb,
                disk_write_mb=disk_write_mb,
                network_sent_mb=network_sent_mb,
                network_recv_mb=network_recv_mb,
                active_threads=active_threads,
                open_files=open_files
            )
            
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")
            return None
    
    def start_monitoring(self):
        """开始监控"""
        if self.is_running:
            return
        
        self.is_running = True
        self.monitor_thread = Thread(target=self._monitoring_loop, daemon=True)
        self.monitor_thread.start()
        logger.info("System monitoring started")
    
    def stop_monitoring(self):
        """停止监控"""
        self.is_running = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        logger.info("System monitoring stopped")
    
    def _monitoring_loop(self):
        """监控循环"""
        while self.is_running:
            try:
                metrics = self.collect_system_metrics()
                if metrics:
                    with self.lock:
                        self.metrics_history.append(metrics)
                
                time.sleep(self.collection_interval)
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                time.sleep(self.collection_interval)
    
    def get_recent_metrics(self, minutes: int = 30) -> List[PerformanceMetrics]:
        """获取最近的指标"""
        cutoff_time = datetime.now() - timedelta(minutes=minutes)
        
        with self.lock:
            return [m for m in self.metrics_history if m.timestamp >= cutoff_time]
    
    def get_performance_summary(self) -> Dict:
        """获取性能摘要"""
        with self.lock:
            if not self.metrics_history:
                return {}
            
            recent_metrics = list(self.metrics_history)[-60:]  # 最近30分钟
            
            return {
                "current": {
                    "cpu_percent": recent_metrics[-1].cpu_percent,
                    "memory_percent": recent_metrics[-1].memory_percent,
                    "memory_mb": recent_metrics[-1].memory_mb,
                    "active_threads": recent_metrics[-1].active_threads,
                    "open_files": recent_metrics[-1].open_files
                },
                "averages": {
                    "cpu_percent": sum(m.cpu_percent for m in recent_metrics) / len(recent_metrics),
                    "memory_percent": sum(m.memory_percent for m in recent_metrics) / len(recent_metrics),
                    "memory_mb": sum(m.memory_mb for m in recent_metrics) / len(recent_metrics),
                },
                "peaks": {
                    "max_cpu": max(m.cpu_percent for m in recent_metrics),
                    "max_memory": max(m.memory_percent for m in recent_metrics),
                    "max_threads": max(m.active_threads for m in recent_metrics),
                },
                "totals": {
                    "disk_read_mb": sum(m.disk_read_mb for m in recent_metrics),
                    "disk_write_mb": sum(m.disk_write_mb for m in recent_metrics),
                    "network_sent_mb": sum(m.network_sent_mb for m in recent_metrics),
                    "network_recv_mb": sum(m.network_recv_mb for m in recent_metrics),
                }
            }


class ApplicationMonitor:
    """应用程序性能监控器"""
    
    def __init__(self):
        self.metrics_history = deque(maxlen=2880)  # 24小时数据
        self.lock = Lock()
        
        # 实时计数器
        self.counters = {
            "total_requests": 0,
            "failed_requests": 0,
            "active_trades": 0,
            "positions_count": 0
        }
        
        # 响应时间跟踪
        self.response_times = deque(maxlen=1000)
        
        # 状态信息
        self.current_balance = 0.0
    
    def record_request(self, success: bool = True, response_time: float = 0.0):
        """记录请求"""
        with self.lock:
            self.counters["total_requests"] += 1
            if not success:
                self.counters["failed_requests"] += 1
            
            if response_time > 0:
                self.response_times.append(response_time)
    
    def update_trading_status(self, active_trades: int, balance: float, positions_count: int):
        """更新交易状态"""
        with self.lock:
            self.counters["active_trades"] = active_trades
            self.current_balance = balance
            self.counters["positions_count"] = positions_count
    
    def collect_application_metrics(self) -> ApplicationMetrics:
        """收集应用程序指标"""
        with self.lock:
            # 计算平均响应时间
            avg_response_time = 0.0
            if self.response_times:
                avg_response_time = sum(self.response_times) / len(self.response_times)
            
            # 计算成功率
            success_rate = 1.0
            if self.counters["total_requests"] > 0:
                success_rate = 1 - (self.counters["failed_requests"] / self.counters["total_requests"])
            
            metrics = ApplicationMetrics(
                timestamp=datetime.now(),
                active_trades=self.counters["active_trades"],
                total_requests=self.counters["total_requests"],
                failed_requests=self.counters["failed_requests"],
                average_response_time=avg_response_time,
                success_rate=success_rate,
                balance=self.current_balance,
                positions_count=self.counters["positions_count"]
            )
            
            self.metrics_history.append(metrics)
            return metrics
    
    def get_application_summary(self) -> Dict:
        """获取应用程序摘要"""
        with self.lock:
            if not self.metrics_history:
                return {}
            
            latest = self.metrics_history[-1]
            
            return {
                "current": asdict(latest),
                "uptime_minutes": len(self.metrics_history) * 5,  # 假设5分钟收集一次
                "status": "healthy" if latest.success_rate > 0.95 else "warning"
            }


class PerformanceReporter:
    """性能报告生成器"""
    
    def __init__(self, system_monitor: SystemMonitor, app_monitor: ApplicationMonitor):
        self.system_monitor = system_monitor
        self.app_monitor = app_monitor
        self.reports_dir = Path("logs/performance")
        self.reports_dir.mkdir(parents=True, exist_ok=True)
    
    def generate_performance_report(self, hours: int = 1) -> Dict:
        """生成性能报告"""
        report = {
            "report_time": datetime.now().isoformat(),
            "time_range_hours": hours,
            "system_performance": self.system_monitor.get_performance_summary(),
            "application_performance": self.app_monitor.get_application_summary(),
            "alerts": self._check_performance_alerts(),
            "recommendations": self._generate_recommendations()
        }
        
        return report
    
    def _check_performance_alerts(self) -> List[Dict]:
        """检查性能警报"""
        alerts = []
        
        system_summary = self.system_monitor.get_performance_summary()
        app_summary = self.app_monitor.get_application_summary()
        
        # 系统资源警报
        if system_summary.get("current", {}).get("cpu_percent", 0) > 80:
            alerts.append({
                "type": "high_cpu",
                "severity": "warning",
                "message": f"CPU使用率过高: {system_summary['current']['cpu_percent']:.1f}%"
            })
        
        if system_summary.get("current", {}).get("memory_percent", 0) > 85:
            alerts.append({
                "type": "high_memory",
                "severity": "warning", 
                "message": f"内存使用率过高: {system_summary['current']['memory_percent']:.1f}%"
            })
        
        # 应用程序警报
        if app_summary.get("current", {}).get("success_rate", 1.0) < 0.95:
            alerts.append({
                "type": "low_success_rate",
                "severity": "error",
                "message": f"请求成功率过低: {app_summary['current']['success_rate']:.1%}"
            })
        
        return alerts
    
    def _generate_recommendations(self) -> List[str]:
        """生成性能优化建议"""
        recommendations = []
        
        system_summary = self.system_monitor.get_performance_summary()
        
        # 基于当前性能指标生成建议
        if system_summary.get("averages", {}).get("cpu_percent", 0) > 70:
            recommendations.append("考虑优化CPU密集型操作或增加并发处理能力")
        
        if system_summary.get("averages", {}).get("memory_percent", 0) > 75:
            recommendations.append("检查内存泄漏，考虑增加内存或优化内存使用")
        
        if system_summary.get("peaks", {}).get("max_threads", 0) > 100:
            recommendations.append("线程数过多，考虑使用连接池或异步处理")
        
        return recommendations
    
    def save_report(self, report: Dict, filename: Optional[str] = None):
        """保存报告到文件"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"performance_report_{timestamp}.json"
        
        report_path = self.reports_dir / filename
        
        try:
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Performance report saved: {report_path}")
            
        except Exception as e:
            logger.error(f"Failed to save performance report: {e}")


class PerformanceManager:
    """性能管理器 - 统一管理所有性能监控功能"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        
        self.system_monitor = SystemMonitor(collection_interval=30)
        self.app_monitor = ApplicationMonitor()
        self.reporter = PerformanceReporter(self.system_monitor, self.app_monitor)
        self._initialized = True
        
        logger.info("Performance manager initialized")
    
    def start_monitoring(self):
        """开始性能监控"""
        self.system_monitor.start_monitoring()
        logger.info("Performance monitoring started")
    
    def stop_monitoring(self):
        """停止性能监控"""
        self.system_monitor.stop_monitoring()
        logger.info("Performance monitoring stopped")
    
    def record_request(self, success: bool = True, response_time: float = 0.0):
        """记录请求 - 便捷方法"""
        self.app_monitor.record_request(success, response_time)
    
    def update_trading_status(self, active_trades: int, balance: float, positions_count: int):
        """更新交易状态 - 便捷方法"""
        self.app_monitor.update_trading_status(active_trades, balance, positions_count)
    
    def generate_report(self, hours: int = 1, save: bool = True) -> Dict:
        """生成性能报告 - 便捷方法"""
        report = self.reporter.generate_performance_report(hours)
        
        if save:
            self.reporter.save_report(report)
        
        return report
    
    def get_health_status(self) -> Dict:
        """获取健康状态"""
        alerts = self.reporter._check_performance_alerts()
        
        return {
            "status": "healthy" if not alerts else "warning",
            "alerts_count": len(alerts),
            "alerts": alerts,
            "last_check": datetime.now().isoformat()
        }


# 全局性能管理器实例
performance_manager = PerformanceManager()


def get_performance_manager() -> PerformanceManager:
    """获取性能管理器实例"""
    return performance_manager


def main():
    """演示和测试功能"""
    # 启动监控
    manager = get_performance_manager()
    manager.start_monitoring()
    
    try:
        # 模拟一些活动
        for i in range(10):
            manager.record_request(success=(i % 7 != 0), response_time=0.1 + i * 0.01)
            manager.update_trading_status(active_trades=i, balance=10000 + i * 100, positions_count=i // 2)
            time.sleep(1)
        
        # 生成报告
        report = manager.generate_report()
        print("性能报告已生成")
        
        # 显示健康状态
        health = manager.get_health_status()
        print(f"系统健康状态: {health['status']}")
        
    finally:
        manager.stop_monitoring()


if __name__ == "__main__":
    main()