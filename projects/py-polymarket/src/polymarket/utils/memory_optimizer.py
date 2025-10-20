#!/usr/bin/env python3
"""
内存使用优化器
Memory Usage Optimizer

智能内存管理和优化系统，减少内存占用并提高性能
"""

import asyncio
import gc
import os
import psutil
import sys
import time
import tracemalloc
import weakref
from collections import defaultdict, deque
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple, Any, Union
import logging

from .logging_utils import get_logger, log_execution_time, async_log_execution_time

logger = get_logger(__name__)

@dataclass
class MemorySnapshot:
    """内存快照"""
    timestamp: datetime
    rss_mb: float  # 驻留集大小
    vms_mb: float  # 虚拟内存大小
    percent: float  # 内存使用百分比
    available_mb: float  # 可用内存
    python_objects: int  # Python对象数量
    tracemalloc_current: int = 0  # tracemalloc当前内存
    tracemalloc_peak: int = 0  # tracemalloc峰值内存

@dataclass
class MemoryLeakInfo:
    """内存泄漏信息"""
    object_type: str
    count: int
    size_bytes: int
    growth_rate: float  # 每分钟增长率
    first_seen: datetime
    last_seen: datetime

@dataclass 
class CacheConfig:
    """缓存配置"""
    max_size: int = 1000
    ttl_seconds: int = 300  # 5分钟
    cleanup_interval: int = 60  # 清理间隔

class MemoryAwareCache:
    """内存感知缓存"""
    
    def __init__(self, config: CacheConfig):
        self.config = config
        self.cache = {}
        self.access_times = {}
        self.creation_times = {}
        self.memory_pressure_threshold = 0.85  # 85%内存使用率
        self.last_cleanup = time.time()
        
    def get(self, key: str) -> Optional[Any]:
        """获取缓存项"""
        if key in self.cache:
            self.access_times[key] = time.time()
            return self.cache[key]
        return None
    
    def set(self, key: str, value: Any) -> bool:
        """设置缓存项"""
        current_time = time.time()
        
        # 检查内存压力
        if self._is_memory_pressure():
            self._aggressive_cleanup()
        
        # 检查大小限制
        if len(self.cache) >= self.config.max_size:
            self._evict_lru()
        
        self.cache[key] = value
        self.access_times[key] = current_time
        self.creation_times[key] = current_time
        
        return True
    
    def _is_memory_pressure(self) -> bool:
        """检查是否有内存压力"""
        try:
            memory_percent = psutil.virtual_memory().percent
            return memory_percent / 100 > self.memory_pressure_threshold
        except:
            return False
    
    def _evict_lru(self):
        """LRU驱逐策略"""
        if not self.access_times:
            return
            
        # 找到最久未访问的键
        lru_key = min(self.access_times.items(), key=lambda x: x[1])[0]
        self._remove_key(lru_key)
    
    def _aggressive_cleanup(self):
        """积极清理策略"""
        current_time = time.time()
        keys_to_remove = []
        
        # 清理过期项
        for key, creation_time in self.creation_times.items():
            if current_time - creation_time > self.config.ttl_seconds:
                keys_to_remove.append(key)
        
        # 如果内存压力仍然很大，清理最久未访问的项
        if self._is_memory_pressure() and len(keys_to_remove) < len(self.cache) * 0.3:
            # 按访问时间排序，清理最旧的30%
            sorted_by_access = sorted(self.access_times.items(), key=lambda x: x[1])
            num_to_remove = len(self.cache) // 3
            keys_to_remove.extend([key for key, _ in sorted_by_access[:num_to_remove]])
        
        for key in keys_to_remove:
            self._remove_key(key)
        
        if keys_to_remove:
            logger.info(f"[MEMORY_CACHE] 内存压力清理：移除了 {len(keys_to_remove)} 个缓存项")
    
    def _remove_key(self, key: str):
        """移除键及其相关数据"""
        self.cache.pop(key, None)
        self.access_times.pop(key, None)
        self.creation_times.pop(key, None)
    
    def cleanup_expired(self):
        """清理过期项"""
        current_time = time.time()
        
        if current_time - self.last_cleanup < self.config.cleanup_interval:
            return
        
        keys_to_remove = []
        for key, creation_time in self.creation_times.items():
            if current_time - creation_time > self.config.ttl_seconds:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            self._remove_key(key)
        
        self.last_cleanup = current_time
        
        if keys_to_remove:
            logger.debug(f"[MEMORY_CACHE] 定期清理：移除了 {len(keys_to_remove)} 个过期缓存项")

class MemoryPoolManager:
    """内存池管理器"""
    
    def __init__(self):
        self.pools = {}
        self.active_objects = weakref.WeakSet()
        
    def get_pool(self, object_type: str, initial_size: int = 10):
        """获取或创建对象池"""
        if object_type not in self.pools:
            self.pools[object_type] = deque(maxlen=initial_size * 2)
        return self.pools[object_type]
    
    def acquire(self, object_type: str, factory_func):
        """从池中获取对象"""
        pool = self.get_pool(object_type)
        
        if pool:
            obj = pool.popleft()
            self.active_objects.add(obj)
            return obj
        else:
            obj = factory_func()
            self.active_objects.add(obj)
            return obj
    
    def release(self, object_type: str, obj):
        """将对象归还到池中"""
        pool = self.get_pool(object_type)
        
        # 重置对象状态（如果需要）
        if hasattr(obj, 'reset'):
            obj.reset()
        
        pool.append(obj)
        
        # 从活跃对象集合中移除
        try:
            self.active_objects.remove(obj)
        except KeyError:
            pass

class MemoryUsageOptimizer:
    """内存使用优化器主类"""
    
    def __init__(self, 
                 monitoring_interval: int = 60,
                 optimization_threshold: float = 0.8,
                 enable_tracemalloc: bool = True):
        """
        初始化内存优化器
        
        Args:
            monitoring_interval: 监控间隔（秒）
            optimization_threshold: 触发优化的内存使用阈值
            enable_tracemalloc: 是否启用tracemalloc
        """
        self.monitoring_interval = monitoring_interval
        self.optimization_threshold = optimization_threshold
        self.enable_tracemalloc = enable_tracemalloc
        
        # 内存监控数据
        self.memory_snapshots: deque = deque(maxlen=1440)  # 保留24小时数据
        self.leak_detection_data = defaultdict(list)
        self.memory_pressure_events = []
        
        # 优化组件
        self.memory_pool = MemoryPoolManager()
        self.caches = {}
        
        # 统计信息
        self.optimization_stats = {
            'gc_runs': 0,
            'cache_cleanups': 0,
            'memory_pressure_events': 0,
            'objects_pooled': 0,
            'bytes_freed': 0
        }
        
        # 监控状态
        self.monitoring_active = False
        self.monitoring_task = None
        
        if self.enable_tracemalloc:
            tracemalloc.start()
            
        logger.info("内存使用优化器初始化完成")
    
    def create_memory_aware_cache(self, name: str, config: CacheConfig = None) -> MemoryAwareCache:
        """创建内存感知缓存"""
        if config is None:
            config = CacheConfig()
        
        cache = MemoryAwareCache(config)
        self.caches[name] = cache
        
        logger.info(f"创建内存感知缓存: {name} (max_size={config.max_size}, ttl={config.ttl_seconds}s)")
        return cache
    
    @log_execution_time
    def take_memory_snapshot(self) -> MemorySnapshot:
        """拍摄内存快照"""
        try:
            # 获取进程内存信息
            process = psutil.Process()
            memory_info = process.memory_info()
            system_memory = psutil.virtual_memory()
            
            # 获取Python对象数量
            python_objects = len(gc.get_objects())
            
            # 获取tracemalloc信息
            tracemalloc_current = 0
            tracemalloc_peak = 0
            if self.enable_tracemalloc:
                try:
                    current, peak = tracemalloc.get_traced_memory()
                    tracemalloc_current = current
                    tracemalloc_peak = peak
                except:
                    pass
            
            snapshot = MemorySnapshot(
                timestamp=datetime.now(),
                rss_mb=memory_info.rss / 1024 / 1024,
                vms_mb=memory_info.vms / 1024 / 1024,
                percent=system_memory.percent,
                available_mb=system_memory.available / 1024 / 1024,
                python_objects=python_objects,
                tracemalloc_current=tracemalloc_current,
                tracemalloc_peak=tracemalloc_peak
            )
            
            self.memory_snapshots.append(snapshot)
            
            # 检查内存压力
            if snapshot.percent > self.optimization_threshold * 100:
                self._handle_memory_pressure(snapshot)
            
            return snapshot
            
        except Exception as e:
            logger.error(f"拍摄内存快照失败: {e}")
            return None
    
    def _handle_memory_pressure(self, snapshot: MemorySnapshot):
        """处理内存压力"""
        self.optimization_stats['memory_pressure_events'] += 1
        self.memory_pressure_events.append(snapshot.timestamp)
        
        logger.warning(f"检测到内存压力: {snapshot.percent:.1f}% (RSS: {snapshot.rss_mb:.1f}MB)")
        
        # 触发优化措施
        self.trigger_memory_optimization()
    
    @log_execution_time
    def trigger_memory_optimization(self):
        """触发内存优化"""
        logger.info("开始内存优化...")
        
        bytes_before = self._get_current_memory_usage()
        
        # 1. 清理所有缓存
        self._cleanup_all_caches()
        
        # 2. 强制垃圾回收
        self._force_garbage_collection()
        
        # 3. 清理临时对象
        self._cleanup_temporary_objects()
        
        bytes_after = self._get_current_memory_usage()
        bytes_freed = bytes_before - bytes_after
        self.optimization_stats['bytes_freed'] += max(0, bytes_freed)
        
        logger.info(f"内存优化完成，释放了 {bytes_freed / 1024 / 1024:.1f}MB 内存")
    
    def _get_current_memory_usage(self) -> int:
        """获取当前内存使用量"""
        try:
            process = psutil.Process()
            return process.memory_info().rss
        except:
            return 0
    
    def _cleanup_all_caches(self):
        """清理所有缓存"""
        for name, cache in self.caches.items():
            cache_size_before = len(cache.cache)
            cache._aggressive_cleanup()
            cache_size_after = len(cache.cache)
            
            if cache_size_before > cache_size_after:
                logger.debug(f"清理缓存 {name}: {cache_size_before} -> {cache_size_after}")
        
        self.optimization_stats['cache_cleanups'] += 1
    
    def _force_garbage_collection(self):
        """强制垃圾回收"""
        # 多次垃圾回收以确保彻底清理
        for i in range(3):
            collected = gc.collect()
            if collected > 0:
                logger.debug(f"垃圾回收第 {i+1} 轮：回收了 {collected} 个对象")
        
        self.optimization_stats['gc_runs'] += 1
    
    def _cleanup_temporary_objects(self):
        """清理临时对象"""
        # 清理weakref中的死亡引用
        try:
            import weakref
            if hasattr(weakref, '_remove_dead_weakref'):
                weakref._remove_dead_weakref()
        except:
            pass
    
    @async_log_execution_time
    async def start_monitoring(self):
        """启动内存监控"""
        if self.monitoring_active:
            logger.warning("内存监控已经在运行")
            return
        
        self.monitoring_active = True
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        
        logger.info(f"内存监控已启动，监控间隔: {self.monitoring_interval}秒")
    
    async def stop_monitoring(self):
        """停止内存监控"""
        if not self.monitoring_active:
            return
        
        self.monitoring_active = False
        
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        
        logger.info("内存监控已停止")
    
    async def _monitoring_loop(self):
        """监控循环"""
        try:
            while self.monitoring_active:
                # 拍摄内存快照
                snapshot = self.take_memory_snapshot()
                
                # 清理过期缓存
                for cache in self.caches.values():
                    cache.cleanup_expired()
                
                # 检测内存泄漏
                self._detect_memory_leaks()
                
                await asyncio.sleep(self.monitoring_interval)
                
        except asyncio.CancelledError:
            logger.debug("内存监控循环被取消")
        except Exception as e:
            logger.error(f"内存监控循环异常: {e}")
    
    def _detect_memory_leaks(self):
        """检测内存泄漏"""
        try:
            # 获取当前对象计数
            object_counts = defaultdict(int)
            for obj in gc.get_objects():
                obj_type = type(obj).__name__
                object_counts[obj_type] += 1
            
            current_time = datetime.now()
            
            # 记录对象计数历史
            for obj_type, count in object_counts.items():
                self.leak_detection_data[obj_type].append((current_time, count))
                
                # 只保留最近1小时的数据
                cutoff_time = current_time - timedelta(hours=1)
                self.leak_detection_data[obj_type] = [
                    (time, count) for time, count in self.leak_detection_data[obj_type]
                    if time > cutoff_time
                ]
            
            # 分析增长趋势
            for obj_type, history in self.leak_detection_data.items():
                if len(history) >= 10:  # 至少需要10个数据点
                    growth_rate = self._calculate_growth_rate(history)
                    
                    # 如果增长率过高，记录潜在泄漏
                    if growth_rate > 100:  # 每分钟增长100个对象
                        logger.warning(f"检测到潜在内存泄漏: {obj_type} (增长率: {growth_rate:.1f}对象/分钟)")
                        
        except Exception as e:
            logger.error(f"内存泄漏检测失败: {e}")
    
    def _calculate_growth_rate(self, history: List[Tuple[datetime, int]]) -> float:
        """计算增长率（对象/分钟）"""
        if len(history) < 2:
            return 0
        
        # 使用线性回归计算趋势
        times = [(t - history[0][0]).total_seconds() / 60 for t, _ in history]  # 转换为分钟
        counts = [count for _, count in history]
        
        if len(times) != len(counts) or len(times) < 2:
            return 0
        
        # 简单线性回归
        n = len(times)
        sum_x = sum(times)
        sum_y = sum(counts)
        sum_xy = sum(x * y for x, y in zip(times, counts))
        sum_x2 = sum(x * x for x in times)
        
        if n * sum_x2 - sum_x * sum_x == 0:
            return 0
        
        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
        return slope
    
    @contextmanager
    def memory_efficient_context(self, cache_name: str = None):
        """内存高效上下文管理器"""
        # 在进入时拍摄快照
        snapshot_before = self.take_memory_snapshot()
        
        try:
            yield
        finally:
            # 在退出时清理并拍摄快照
            if cache_name and cache_name in self.caches:
                self.caches[cache_name].cleanup_expired()
            
            # 强制垃圾回收
            gc.collect()
            
            snapshot_after = self.take_memory_snapshot()
            
            if snapshot_before and snapshot_after:
                memory_diff = snapshot_after.rss_mb - snapshot_before.rss_mb
                if memory_diff > 0:
                    logger.debug(f"内存上下文: 增加了 {memory_diff:.1f}MB")
                else:
                    logger.debug(f"内存上下文: 释放了 {abs(memory_diff):.1f}MB")
    
    @log_execution_time
    def get_memory_report(self) -> Dict[str, Any]:
        """获取内存使用报告"""
        if not self.memory_snapshots:
            return {"error": "没有可用的内存快照数据"}
        
        latest_snapshot = self.memory_snapshots[-1]
        
        # 计算趋势
        if len(self.memory_snapshots) >= 2:
            first_snapshot = self.memory_snapshots[0]
            memory_trend = latest_snapshot.rss_mb - first_snapshot.rss_mb
            time_diff = (latest_snapshot.timestamp - first_snapshot.timestamp).total_seconds() / 3600
            memory_trend_per_hour = memory_trend / max(time_diff, 1)
        else:
            memory_trend_per_hour = 0
        
        # 缓存统计
        cache_stats = {}
        for name, cache in self.caches.items():
            cache_stats[name] = {
                'size': len(cache.cache),
                'max_size': cache.config.max_size,
                'utilization': len(cache.cache) / cache.config.max_size
            }
        
        report = {
            "current_memory": {
                "rss_mb": latest_snapshot.rss_mb,
                "vms_mb": latest_snapshot.vms_mb,
                "percent": latest_snapshot.percent,
                "available_mb": latest_snapshot.available_mb,
                "python_objects": latest_snapshot.python_objects
            },
            "trends": {
                "memory_trend_mb_per_hour": memory_trend_per_hour,
                "memory_pressure_events_last_hour": len([
                    t for t in self.memory_pressure_events
                    if t > datetime.now() - timedelta(hours=1)
                ])
            },
            "optimization_stats": self.optimization_stats,
            "cache_stats": cache_stats,
            "recommendations": self._generate_memory_recommendations()
        }
        
        return report
    
    def _generate_memory_recommendations(self) -> List[str]:
        """生成内存优化建议"""
        recommendations = []
        
        if not self.memory_snapshots:
            return recommendations
        
        latest_snapshot = self.memory_snapshots[-1]
        
        # 基于当前内存使用情况的建议
        if latest_snapshot.percent > 90:
            recommendations.append("内存使用率过高（>90%），建议立即清理缓存和执行垃圾回收")
        elif latest_snapshot.percent > 80:
            recommendations.append("内存使用率较高（>80%），建议优化缓存策略")
        
        # 基于Python对象数量的建议
        if latest_snapshot.python_objects > 500000:
            recommendations.append("Python对象数量过多，可能存在对象积累，建议检查循环引用")
        
        # 基于缓存使用的建议
        for name, cache in self.caches.items():
            utilization = len(cache.cache) / cache.config.max_size
            if utilization > 0.9:
                recommendations.append(f"缓存 {name} 使用率过高（{utilization:.1%}），建议增加大小或减少TTL")
        
        # 基于内存趋势的建议
        if len(self.memory_snapshots) >= 2:
            first_snapshot = self.memory_snapshots[0]
            memory_growth = latest_snapshot.rss_mb - first_snapshot.rss_mb
            if memory_growth > 100:  # 增长超过100MB
                recommendations.append("内存持续增长，建议检查是否存在内存泄漏")
        
        if not recommendations:
            recommendations.append("内存使用情况良好，无需特殊优化")
        
        return recommendations
    
    async def cleanup(self):
        """清理资源"""
        try:
            # 停止监控
            await self.stop_monitoring()
            
            # 清理所有缓存
            self._cleanup_all_caches()
            
            # 强制垃圾回收
            self._force_garbage_collection()
            
            # 停止tracemalloc
            if self.enable_tracemalloc:
                try:
                    tracemalloc.stop()
                except:
                    pass
            
            logger.info("内存优化器清理完成")
            
        except Exception as e:
            logger.error(f"内存优化器清理失败: {e}")

# 全局内存优化器实例
_global_memory_optimizer = None

def get_memory_optimizer() -> MemoryUsageOptimizer:
    """获取全局内存优化器实例"""
    global _global_memory_optimizer
    
    if _global_memory_optimizer is None:
        _global_memory_optimizer = MemoryUsageOptimizer()
    
    return _global_memory_optimizer

@contextmanager
def memory_efficient_operation(operation_name: str = "operation"):
    """内存高效操作上下文管理器"""
    optimizer = get_memory_optimizer()
    
    with optimizer.memory_efficient_context():
        logger.debug(f"开始内存高效操作: {operation_name}")
        try:
            yield optimizer
        finally:
            logger.debug(f"完成内存高效操作: {operation_name}")

def main():
    """主函数：演示内存优化器"""
    
    async def run_demo():
        print("=== 内存使用优化器演示 ===")
        print(f"启动时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        try:
            # 创建内存优化器
            optimizer = MemoryUsageOptimizer(
                monitoring_interval=5,  # 演示用短间隔
                optimization_threshold=0.7
            )
            
            print("[1] 内存优化器初始化完成")
            
            # 创建内存感知缓存
            cache_config = CacheConfig(max_size=100, ttl_seconds=30)
            cache = optimizer.create_memory_aware_cache("demo_cache", cache_config)
            print("[2] 创建内存感知缓存")
            
            # 启动监控
            await optimizer.start_monitoring()
            print("[3] 启动内存监控")
            
            # 模拟一些操作
            print("[4] 模拟内存密集操作...")
            
            # 填充缓存
            for i in range(150):
                cache.set(f"key_{i}", f"value_{i}" * 100)
            
            # 等待几秒钟让监控运行
            await asyncio.sleep(10)
            
            # 触发内存优化
            print("[5] 触发内存优化...")
            optimizer.trigger_memory_optimization()
            
            # 获取内存报告
            print("[6] 生成内存报告...")
            report = optimizer.get_memory_report()
            
            print(f"当前内存使用: {report['current_memory']['rss_mb']:.1f}MB")
            print(f"Python对象数量: {report['current_memory']['python_objects']:,}")
            print(f"优化统计: {report['optimization_stats']}")
            
            # 展示建议
            print("\n优化建议:")
            for rec in report['recommendations']:
                print(f"  - {rec}")
            
            # 清理
            await optimizer.cleanup()
            
        except Exception as e:
            print(f"演示失败: {e}")
            import traceback
            traceback.print_exc()
        
        print("\n=== 内存优化器演示完成 ===")
        print()
        print("功能总结:")
        print("✓ 实时内存监控和快照")
        print("✓ 智能内存感知缓存")
        print("✓ 内存泄漏检测")
        print("✓ 自动内存优化")
        print("✓ 内存压力响应")
        print("✓ 对象池管理")
        print("✓ 垃圾回收优化")
        print("✓ 内存使用报告和建议")
    
    asyncio.run(run_demo())

if __name__ == "__main__":
    main()