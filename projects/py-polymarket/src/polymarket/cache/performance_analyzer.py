#!/usr/bin/env python3
"""
缓存性能分析器
Cache Performance Analyzer

提供缓存系统性能监控、分析和优化建议的综合分析工具
"""

import asyncio
import json
import time
import statistics
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, deque
import psutil

from ..utils.logging_utils import get_logger
from .multi_layer_cache import MultiLayerCache, CacheHierarchy, LayerPerformance
from .intelligent_prefetch import IntelligentPrefetcher, PrefetchConfig

logger = get_logger(__name__)

class PerformanceMetric(Enum):
    """性能指标类型"""
    HIT_RATE = "hit_rate"
    LATENCY = "latency"
    THROUGHPUT = "throughput"
    MEMORY_USAGE = "memory_usage"
    EVICTION_RATE = "eviction_rate"
    PREFETCH_ACCURACY = "prefetch_accuracy"
    LOAD_DISTRIBUTION = "load_distribution"
    CACHE_EFFICIENCY = "cache_efficiency"

class AnalysisLevel(Enum):
    """分析级别"""
    BASIC = "basic"
    DETAILED = "detailed"
    COMPREHENSIVE = "comprehensive"
    REAL_TIME = "real_time"

class OptimizationPriority(Enum):
    """优化优先级"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class PerformanceSnapshot:
    """性能快照"""
    timestamp: datetime = field(default_factory=datetime.now)
    
    # 基础指标
    total_requests: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    hit_rate: float = 0.0
    
    # 延迟指标
    avg_latency: float = 0.0
    p50_latency: float = 0.0
    p95_latency: float = 0.0
    p99_latency: float = 0.0
    
    # 吞吐量指标
    requests_per_second: float = 0.0
    reads_per_second: float = 0.0
    writes_per_second: float = 0.0
    
    # 内存指标
    memory_usage_bytes: int = 0
    memory_usage_percentage: float = 0.0
    cache_size_bytes: int = 0
    
    # 淘汰指标
    evictions: int = 0
    eviction_rate: float = 0.0
    
    # 预取指标
    prefetch_hits: int = 0
    prefetch_misses: int = 0
    prefetch_accuracy: float = 0.0
    
    # 层级指标
    l1_hit_rate: float = 0.0
    l2_hit_rate: float = 0.0
    l3_hit_rate: float = 0.0
    
    def calculate_derived_metrics(self):
        """计算衍生指标"""
        total = self.cache_hits + self.cache_misses
        self.hit_rate = self.cache_hits / total if total > 0 else 0.0
        
        if self.evictions > 0 and self.total_requests > 0:
            self.eviction_rate = self.evictions / self.total_requests
        
        total_prefetch = self.prefetch_hits + self.prefetch_misses
        self.prefetch_accuracy = self.prefetch_hits / total_prefetch if total_prefetch > 0 else 0.0
    
    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            'timestamp': self.timestamp.isoformat(),
            'total_requests': self.total_requests,
            'cache_hits': self.cache_hits,
            'cache_misses': self.cache_misses,
            'hit_rate': self.hit_rate,
            'avg_latency': self.avg_latency,
            'p50_latency': self.p50_latency,
            'p95_latency': self.p95_latency,
            'p99_latency': self.p99_latency,
            'requests_per_second': self.requests_per_second,
            'reads_per_second': self.reads_per_second,
            'writes_per_second': self.writes_per_second,
            'memory_usage_bytes': self.memory_usage_bytes,
            'memory_usage_percentage': self.memory_usage_percentage,
            'cache_size_bytes': self.cache_size_bytes,
            'evictions': self.evictions,
            'eviction_rate': self.eviction_rate,
            'prefetch_hits': self.prefetch_hits,
            'prefetch_misses': self.prefetch_misses,
            'prefetch_accuracy': self.prefetch_accuracy,
            'l1_hit_rate': self.l1_hit_rate,
            'l2_hit_rate': self.l2_hit_rate,
            'l3_hit_rate': self.l3_hit_rate
        }

@dataclass
class OptimizationRecommendation:
    """优化建议"""
    category: str
    priority: OptimizationPriority
    title: str
    description: str
    expected_improvement: str
    implementation_cost: str
    metrics_affected: List[str] = field(default_factory=list)
    parameters: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            'category': self.category,
            'priority': self.priority.value,
            'title': self.title,
            'description': self.description,
            'expected_improvement': self.expected_improvement,
            'implementation_cost': self.implementation_cost,
            'metrics_affected': self.metrics_affected,
            'parameters': self.parameters
        }

@dataclass
class AnalysisConfig:
    """分析配置"""
    # 监控配置
    snapshot_interval: int = 60  # 快照间隔（秒）
    history_retention: int = 86400  # 历史保留时间（秒）
    
    # 分析配置
    analysis_level: AnalysisLevel = AnalysisLevel.DETAILED
    enable_real_time: bool = True
    enable_predictions: bool = True
    
    # 阈值配置
    low_hit_rate_threshold: float = 0.7
    high_latency_threshold: float = 100.0  # 毫秒
    high_memory_threshold: float = 0.8
    high_eviction_threshold: float = 0.1
    
    # 优化配置
    auto_optimization: bool = False
    optimization_interval: int = 3600  # 1小时
    
    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            'snapshot_interval': self.snapshot_interval,
            'history_retention': self.history_retention,
            'analysis_level': self.analysis_level.value,
            'enable_real_time': self.enable_real_time,
            'enable_predictions': self.enable_predictions,
            'low_hit_rate_threshold': self.low_hit_rate_threshold,
            'high_latency_threshold': self.high_latency_threshold,
            'high_memory_threshold': self.high_memory_threshold,
            'high_eviction_threshold': self.high_eviction_threshold,
            'auto_optimization': self.auto_optimization,
            'optimization_interval': self.optimization_interval
        }

class PerformanceAnalyzer:
    """缓存性能分析器"""
    
    def __init__(self, 
                 cache_system: MultiLayerCache,
                 prefetcher: Optional[IntelligentPrefetcher] = None,
                 config: Optional[AnalysisConfig] = None):
        """
        初始化性能分析器
        
        Args:
            cache_system: 多层缓存系统
            prefetcher: 智能预取器
            config: 分析配置
        """
        self.cache_system = cache_system
        self.prefetcher = prefetcher
        self.config = config or AnalysisConfig()
        
        # 性能数据存储
        self.snapshots: deque = deque(maxlen=1440)  # 24小时的分钟级快照
        self.latency_samples: deque = deque(maxlen=10000)  # 最近10000个延迟样本
        self.real_time_metrics: Dict[str, Any] = {}
        
        # 分析结果缓存
        self.analysis_cache: Dict[str, Any] = {}
        self.recommendations_cache: List[OptimizationRecommendation] = []
        self.last_analysis: Optional[datetime] = None
        
        # 后台任务
        self.monitoring_task: Optional[asyncio.Task] = None
        self.analysis_task: Optional[asyncio.Task] = None
        self.optimization_task: Optional[asyncio.Task] = None
        
        # 统计信息
        self.analyzer_stats = {
            'snapshots_taken': 0,
            'analyses_performed': 0,
            'recommendations_generated': 0,
            'optimizations_applied': 0
        }
        
        logger.info("缓存性能分析器初始化完成")
    
    async def start(self):
        """启动性能分析器"""
        try:
            logger.info("启动缓存性能分析器...")
            
            # 启动监控任务
            self.monitoring_task = asyncio.create_task(self._monitoring_loop())
            
            # 启动分析任务
            if self.config.analysis_level != AnalysisLevel.BASIC:
                self.analysis_task = asyncio.create_task(self._analysis_loop())
            
            # 启动优化任务
            if self.config.auto_optimization:
                self.optimization_task = asyncio.create_task(self._optimization_loop())
            
            logger.info("缓存性能分析器启动成功")
            
        except Exception as e:
            logger.error(f"启动缓存性能分析器失败: {e}")
            raise
    
    async def stop(self):
        """停止性能分析器"""
        try:
            logger.info("正在停止缓存性能分析器...")
            
            # 停止所有后台任务
            tasks = [self.monitoring_task, self.analysis_task, self.optimization_task]
            for task in tasks:
                if task and not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
            
            logger.info("缓存性能分析器已停止")
            
        except Exception as e:
            logger.error(f"停止缓存性能分析器失败: {e}")
    
    async def _monitoring_loop(self):
        """监控循环"""
        while True:
            try:
                await self._take_snapshot()
                await asyncio.sleep(self.config.snapshot_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"监控循环异常: {e}")
                await asyncio.sleep(self.config.snapshot_interval)
    
    async def _analysis_loop(self):
        """分析循环"""
        while True:
            try:
                # 每5分钟进行一次分析
                await asyncio.sleep(300)
                await self._perform_analysis()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"分析循环异常: {e}")
                await asyncio.sleep(300)
    
    async def _optimization_loop(self):
        """优化循环"""
        while True:
            try:
                await asyncio.sleep(self.config.optimization_interval)
                await self._apply_optimizations()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"优化循环异常: {e}")
                await asyncio.sleep(self.config.optimization_interval)
    
    async def _take_snapshot(self):
        """获取性能快照"""
        try:
            snapshot = PerformanceSnapshot()
            
            # 获取系统统计
            system_stats = self.cache_system.get_system_stats()
            
            if 'system_stats' in system_stats:
                coordinator_stats = system_stats['system_stats']
                hierarchy_stats = coordinator_stats.get('hierarchy_stats', {})
                
                # 基础统计
                total_requests = coordinator_stats.get('coordinated_reads', 0) + coordinator_stats.get('coordinated_writes', 0)
                snapshot.total_requests = total_requests
                
                # 层级统计
                layer_stats = hierarchy_stats.get('layer_stats', [])
                total_hits = 0
                total_misses = 0
                
                for i, layer_stat in enumerate(layer_stats):
                    perf = layer_stat.get('performance', {})
                    hits = perf.get('hits', 0)
                    misses = perf.get('misses', 0)
                    
                    total_hits += hits
                    total_misses += misses
                    
                    # 按层级记录命中率
                    layer_total = hits + misses
                    layer_hit_rate = hits / layer_total if layer_total > 0 else 0.0
                    
                    if i == 0:  # L1
                        snapshot.l1_hit_rate = layer_hit_rate
                    elif i == 1:  # L2
                        snapshot.l2_hit_rate = layer_hit_rate
                    elif i == 2:  # L3
                        snapshot.l3_hit_rate = layer_hit_rate
                
                snapshot.cache_hits = total_hits
                snapshot.cache_misses = total_misses
            
            # 获取预取统计
            if self.prefetcher:
                prefetch_stats = self.prefetcher.get_prefetch_stats()
                stats = prefetch_stats.get('stats', {})
                
                snapshot.prefetch_hits = stats.get('cache_hits_from_prefetch', 0)
                snapshot.prefetch_misses = stats.get('total_prefetches', 0) - snapshot.prefetch_hits
                snapshot.prefetch_accuracy = stats.get('prefetch_accuracy', 0.0)
            
            # 获取系统内存信息
            memory_info = psutil.virtual_memory()
            snapshot.memory_usage_bytes = memory_info.used
            snapshot.memory_usage_percentage = memory_info.percent
            
            # 计算衍生指标
            snapshot.calculate_derived_metrics()
            
            # 计算吞吐量（基于时间窗口）
            if len(self.snapshots) > 0:
                time_diff = (snapshot.timestamp - self.snapshots[-1].timestamp).total_seconds()
                if time_diff > 0:
                    req_diff = snapshot.total_requests - self.snapshots[-1].total_requests
                    snapshot.requests_per_second = req_diff / time_diff
            
            # 添加到历史记录
            self.snapshots.append(snapshot)
            self.analyzer_stats['snapshots_taken'] += 1
            
            # 更新实时指标
            self.real_time_metrics.update({
                'current_hit_rate': snapshot.hit_rate,
                'current_latency': snapshot.avg_latency,
                'current_rps': snapshot.requests_per_second,
                'current_memory_usage': snapshot.memory_usage_percentage,
                'last_update': snapshot.timestamp.isoformat()
            })
            
        except Exception as e:
            logger.error(f"获取性能快照失败: {e}")
    
    async def _perform_analysis(self):
        """执行性能分析"""
        try:
            if len(self.snapshots) < 2:
                return
            
            logger.debug("开始执行缓存性能分析")
            
            # 清空分析缓存
            self.analysis_cache.clear()
            
            # 基础分析
            await self._analyze_basic_metrics()
            
            if self.config.analysis_level in [AnalysisLevel.DETAILED, AnalysisLevel.COMPREHENSIVE]:
                # 详细分析
                await self._analyze_trends()
                await self._analyze_layer_performance()
                await self._analyze_prefetch_effectiveness()
            
            if self.config.analysis_level == AnalysisLevel.COMPREHENSIVE:
                # 综合分析
                await self._analyze_bottlenecks()
                await self._analyze_optimization_opportunities()
            
            # 生成优化建议
            await self._generate_recommendations()
            
            self.last_analysis = datetime.now()
            self.analyzer_stats['analyses_performed'] += 1
            
            logger.debug("缓存性能分析完成")
            
        except Exception as e:
            logger.error(f"执行性能分析失败: {e}")
    
    async def _analyze_basic_metrics(self):
        """分析基础指标"""
        try:
            recent_snapshots = list(self.snapshots)[-60:]  # 最近1小时
            if not recent_snapshots:
                return
            
            # 计算平均值
            avg_hit_rate = statistics.mean([s.hit_rate for s in recent_snapshots])
            avg_latency = statistics.mean([s.avg_latency for s in recent_snapshots if s.avg_latency > 0])
            avg_rps = statistics.mean([s.requests_per_second for s in recent_snapshots if s.requests_per_second > 0])
            avg_memory = statistics.mean([s.memory_usage_percentage for s in recent_snapshots])
            
            # 计算变异系数
            hit_rates = [s.hit_rate for s in recent_snapshots]
            hit_rate_cv = statistics.stdev(hit_rates) / avg_hit_rate if avg_hit_rate > 0 else 0
            
            self.analysis_cache['basic_metrics'] = {
                'avg_hit_rate': avg_hit_rate,
                'avg_latency': avg_latency,
                'avg_rps': avg_rps,
                'avg_memory_usage': avg_memory,
                'hit_rate_stability': 1 - hit_rate_cv,  # 稳定性评分
                'sample_size': len(recent_snapshots)
            }
            
        except Exception as e:
            logger.error(f"分析基础指标失败: {e}")
    
    async def _analyze_trends(self):
        """分析趋势"""
        try:
            if len(self.snapshots) < 10:
                return
            
            recent_snapshots = list(self.snapshots)[-30:]  # 最近30个快照
            
            # 提取时间序列数据
            timestamps = [(s.timestamp - recent_snapshots[0].timestamp).total_seconds() for s in recent_snapshots]
            hit_rates = [s.hit_rate for s in recent_snapshots]
            latencies = [s.avg_latency for s in recent_snapshots if s.avg_latency > 0]
            memory_usage = [s.memory_usage_percentage for s in recent_snapshots]
            
            trends = {}
            
            # 计算趋势斜率（简单线性回归）
            if len(timestamps) >= 2:
                # 命中率趋势
                hit_rate_trend = self._calculate_trend(timestamps, hit_rates)
                trends['hit_rate_trend'] = hit_rate_trend
                
                # 延迟趋势
                if latencies:
                    latency_trend = self._calculate_trend(timestamps, latencies)
                    trends['latency_trend'] = latency_trend
                
                # 内存使用趋势
                memory_trend = self._calculate_trend(timestamps, memory_usage)
                trends['memory_trend'] = memory_trend
            
            self.analysis_cache['trends'] = trends
            
        except Exception as e:
            logger.error(f"分析趋势失败: {e}")
    
    def _calculate_trend(self, x: List[float], y: List[float]) -> Dict[str, float]:
        """计算趋势"""
        try:
            if len(x) != len(y) or len(x) < 2:
                return {'slope': 0.0, 'confidence': 0.0}
            
            n = len(x)
            sum_x = sum(x)
            sum_y = sum(y)
            sum_xy = sum(x[i] * y[i] for i in range(n))
            sum_x2 = sum(xi * xi for xi in x)
            
            # 线性回归斜率
            slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
            
            # 相关系数作为置信度
            mean_x = sum_x / n
            mean_y = sum_y / n
            
            numerator = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
            denominator_x = sum((x[i] - mean_x) ** 2 for i in range(n))
            denominator_y = sum((y[i] - mean_y) ** 2 for i in range(n))
            
            if denominator_x > 0 and denominator_y > 0:
                correlation = numerator / (denominator_x * denominator_y) ** 0.5
                confidence = abs(correlation)
            else:
                confidence = 0.0
            
            return {
                'slope': slope,
                'confidence': confidence,
                'direction': 'increasing' if slope > 0 else 'decreasing' if slope < 0 else 'stable'
            }
            
        except Exception as e:
            logger.error(f"计算趋势失败: {e}")
            return {'slope': 0.0, 'confidence': 0.0}
    
    async def _analyze_layer_performance(self):
        """分析层级性能"""
        try:
            recent_snapshots = list(self.snapshots)[-30:]
            if not recent_snapshots:
                return
            
            # 计算各层平均命中率
            l1_hit_rates = [s.l1_hit_rate for s in recent_snapshots if s.l1_hit_rate > 0]
            l2_hit_rates = [s.l2_hit_rate for s in recent_snapshots if s.l2_hit_rate > 0]
            l3_hit_rates = [s.l3_hit_rate for s in recent_snapshots if s.l3_hit_rate > 0]
            
            layer_analysis = {
                'l1': {
                    'avg_hit_rate': statistics.mean(l1_hit_rates) if l1_hit_rates else 0.0,
                    'sample_count': len(l1_hit_rates)
                },
                'l2': {
                    'avg_hit_rate': statistics.mean(l2_hit_rates) if l2_hit_rates else 0.0,
                    'sample_count': len(l2_hit_rates)
                },
                'l3': {
                    'avg_hit_rate': statistics.mean(l3_hit_rates) if l3_hit_rates else 0.0,
                    'sample_count': len(l3_hit_rates)
                }
            }
            
            # 计算层级效率
            total_layers = sum(1 for layer in layer_analysis.values() if layer['avg_hit_rate'] > 0)
            if total_layers > 0:
                hierarchy_efficiency = sum(
                    layer['avg_hit_rate'] for layer in layer_analysis.values()
                ) / total_layers
            else:
                hierarchy_efficiency = 0.0
            
            layer_analysis['hierarchy_efficiency'] = hierarchy_efficiency
            
            self.analysis_cache['layer_performance'] = layer_analysis
            
        except Exception as e:
            logger.error(f"分析层级性能失败: {e}")
    
    async def _analyze_prefetch_effectiveness(self):
        """分析预取效果"""
        try:
            if not self.prefetcher:
                return
            
            recent_snapshots = list(self.snapshots)[-30:]
            prefetch_accuracies = [s.prefetch_accuracy for s in recent_snapshots if s.prefetch_accuracy > 0]
            
            if not prefetch_accuracies:
                return
            
            avg_accuracy = statistics.mean(prefetch_accuracies)
            accuracy_trend = self._calculate_trend(
                list(range(len(prefetch_accuracies))),
                prefetch_accuracies
            )
            
            # 获取策略性能
            prefetch_stats = self.prefetcher.get_prefetch_stats()
            strategy_performance = prefetch_stats.get('stats', {}).get('strategy_performance', {})
            
            prefetch_analysis = {
                'avg_accuracy': avg_accuracy,
                'accuracy_trend': accuracy_trend,
                'strategy_performance': dict(strategy_performance),
                'total_prefetches': prefetch_stats.get('stats', {}).get('total_prefetches', 0)
            }
            
            self.analysis_cache['prefetch_effectiveness'] = prefetch_analysis
            
        except Exception as e:
            logger.error(f"分析预取效果失败: {e}")
    
    async def _analyze_bottlenecks(self):
        """分析瓶颈"""
        try:
            bottlenecks = []
            
            basic_metrics = self.analysis_cache.get('basic_metrics', {})
            trends = self.analysis_cache.get('trends', {})
            
            # 命中率瓶颈
            if basic_metrics.get('avg_hit_rate', 0) < self.config.low_hit_rate_threshold:
                bottlenecks.append({
                    'type': 'low_hit_rate',
                    'severity': 'high',
                    'description': f"平均命中率 {basic_metrics.get('avg_hit_rate', 0):.2%} 低于阈值 {self.config.low_hit_rate_threshold:.2%}",
                    'impact': 'increased_latency_and_load'
                })
            
            # 延迟瓶颈
            if basic_metrics.get('avg_latency', 0) > self.config.high_latency_threshold:
                bottlenecks.append({
                    'type': 'high_latency',
                    'severity': 'medium',
                    'description': f"平均延迟 {basic_metrics.get('avg_latency', 0):.2f}ms 高于阈值 {self.config.high_latency_threshold}ms",
                    'impact': 'poor_user_experience'
                })
            
            # 内存瓶颈
            if basic_metrics.get('avg_memory_usage', 0) > self.config.high_memory_threshold * 100:
                bottlenecks.append({
                    'type': 'high_memory_usage',
                    'severity': 'critical',
                    'description': f"内存使用率 {basic_metrics.get('avg_memory_usage', 0):.1f}% 高于阈值 {self.config.high_memory_threshold * 100}%",
                    'impact': 'system_instability'
                })
            
            # 趋势瓶颈
            hit_rate_trend = trends.get('hit_rate_trend', {})
            if (hit_rate_trend.get('direction') == 'decreasing' and 
                hit_rate_trend.get('confidence', 0) > 0.7):
                bottlenecks.append({
                    'type': 'declining_hit_rate',
                    'severity': 'medium',
                    'description': f"命中率呈下降趋势，置信度 {hit_rate_trend.get('confidence', 0):.2%}",
                    'impact': 'performance_degradation'
                })
            
            self.analysis_cache['bottlenecks'] = bottlenecks
            
        except Exception as e:
            logger.error(f"分析瓶颈失败: {e}")
    
    async def _analyze_optimization_opportunities(self):
        """分析优化机会"""
        try:
            opportunities = []
            
            layer_performance = self.analysis_cache.get('layer_performance', {})
            prefetch_effectiveness = self.analysis_cache.get('prefetch_effectiveness', {})
            
            # L1缓存优化机会
            l1_hit_rate = layer_performance.get('l1', {}).get('avg_hit_rate', 0)
            if l1_hit_rate < 0.8:
                opportunities.append({
                    'type': 'l1_optimization',
                    'potential_improvement': 'high',
                    'description': f"L1缓存命中率仅 {l1_hit_rate:.2%}，可通过增加容量或改进淘汰策略提升",
                    'recommended_actions': ['increase_l1_size', 'tune_eviction_policy']
                })
            
            # 预取优化机会
            if self.prefetcher:
                prefetch_accuracy = prefetch_effectiveness.get('avg_accuracy', 0)
                if prefetch_accuracy < 0.6:
                    opportunities.append({
                        'type': 'prefetch_optimization',
                        'potential_improvement': 'medium',
                        'description': f"预取准确率仅 {prefetch_accuracy:.2%}，可通过调整预取策略提升",
                        'recommended_actions': ['tune_prefetch_algorithms', 'adjust_confidence_threshold']
                    })
            
            # 层级结构优化
            hierarchy_efficiency = layer_performance.get('hierarchy_efficiency', 0)
            if hierarchy_efficiency < 0.7:
                opportunities.append({
                    'type': 'hierarchy_optimization',
                    'potential_improvement': 'medium',
                    'description': f"缓存层级效率 {hierarchy_efficiency:.2%} 较低，考虑重新设计层级结构",
                    'recommended_actions': ['redesign_hierarchy', 'balance_layer_sizes']
                })
            
            self.analysis_cache['optimization_opportunities'] = opportunities
            
        except Exception as e:
            logger.error(f"分析优化机会失败: {e}")
    
    async def _generate_recommendations(self):
        """生成优化建议"""
        try:
            recommendations = []
            
            bottlenecks = self.analysis_cache.get('bottlenecks', [])
            opportunities = self.analysis_cache.get('optimization_opportunities', [])
            basic_metrics = self.analysis_cache.get('basic_metrics', {})
            
            # 基于瓶颈生成建议
            for bottleneck in bottlenecks:
                if bottleneck['type'] == 'low_hit_rate':
                    recommendations.append(OptimizationRecommendation(
                        category='cache_sizing',
                        priority=OptimizationPriority.HIGH,
                        title='增加缓存容量',
                        description='当前命中率较低，建议增加L1缓存容量以减少缓存未命中',
                        expected_improvement='命中率提升15-25%，延迟降低20-30%',
                        implementation_cost='中等 - 需要调整配置并可能增加内存使用',
                        metrics_affected=['hit_rate', 'latency', 'memory_usage'],
                        parameters={'l1_size_multiplier': 1.5, 'expected_hit_rate_improvement': 0.2}
                    ))
                
                elif bottleneck['type'] == 'high_latency':
                    recommendations.append(OptimizationRecommendation(
                        category='performance',
                        priority=OptimizationPriority.MEDIUM,
                        title='优化缓存访问路径',
                        description='延迟较高，建议优化缓存层级访问路径和减少网络开销',
                        expected_improvement='平均延迟降低30-40%',
                        implementation_cost='低 - 主要是算法优化',
                        metrics_affected=['latency', 'throughput'],
                        parameters={'enable_parallel_lookup': True, 'optimize_network_calls': True}
                    ))
            
            # 基于优化机会生成建议
            for opportunity in opportunities:
                if opportunity['type'] == 'prefetch_optimization':
                    recommendations.append(OptimizationRecommendation(
                        category='prefetch',
                        priority=OptimizationPriority.MEDIUM,
                        title='调整预取策略',
                        description='预取准确率较低，建议调整预取算法参数以提高效率',
                        expected_improvement='预取准确率提升20-30%，命中率提升5-10%',
                        implementation_cost='低 - 参数调整',
                        metrics_affected=['prefetch_accuracy', 'hit_rate'],
                        parameters={
                            'confidence_threshold': 0.7,
                            'prefetch_window': 300,
                            'strategy_weights': {'pattern': 0.4, 'ml': 0.3, 'popularity': 0.3}
                        }
                    ))
            
            # 通用性能建议
            if basic_metrics.get('hit_rate_stability', 1.0) < 0.8:
                recommendations.append(OptimizationRecommendation(
                    category='stability',
                    priority=OptimizationPriority.HIGH,
                    title='提高缓存性能稳定性',
                    description='缓存命中率波动较大，建议启用自适应缓存策略',
                    expected_improvement='性能稳定性提升40-50%',
                    implementation_cost='中等 - 需要实现自适应算法',
                    metrics_affected=['hit_rate', 'stability'],
                    parameters={'enable_adaptive_sizing': True, 'stability_window': 300}
                ))
            
            # 按优先级排序
            recommendations.sort(key=lambda r: ['low', 'medium', 'high', 'critical'].index(r.priority.value), reverse=True)
            
            self.recommendations_cache = recommendations
            self.analyzer_stats['recommendations_generated'] += len(recommendations)
            
        except Exception as e:
            logger.error(f"生成优化建议失败: {e}")
    
    async def _apply_optimizations(self):
        """应用优化"""
        try:
            if not self.config.auto_optimization or not self.recommendations_cache:
                return
            
            applied_count = 0
            
            for recommendation in self.recommendations_cache:
                # 只应用低风险的优化
                if (recommendation.priority in [OptimizationPriority.LOW, OptimizationPriority.MEDIUM] and
                    recommendation.implementation_cost in ['低', '低 - 参数调整', '低 - 主要是算法优化']):
                    
                    success = await self._apply_single_optimization(recommendation)
                    if success:
                        applied_count += 1
            
            if applied_count > 0:
                self.analyzer_stats['optimizations_applied'] += applied_count
                logger.info(f"自动应用了 {applied_count} 个优化建议")
            
        except Exception as e:
            logger.error(f"应用优化失败: {e}")
    
    async def _apply_single_optimization(self, recommendation: OptimizationRecommendation) -> bool:
        """应用单个优化"""
        try:
            # 这里实现具体的优化逻辑
            # 实际应用中需要根据recommendation的category和parameters来执行相应的优化
            
            logger.info(f"应用优化: {recommendation.title}")
            
            if recommendation.category == 'prefetch' and self.prefetcher:
                # 调整预取参数
                params = recommendation.parameters
                if 'confidence_threshold' in params:
                    self.prefetcher.config.min_confidence_threshold = params['confidence_threshold']
                if 'prefetch_window' in params:
                    self.prefetcher.config.prefetch_ahead_window = params['prefetch_window']
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"应用优化失败 {recommendation.title}: {e}")
            return False
    
    # 公共API方法
    def get_current_snapshot(self) -> Optional[PerformanceSnapshot]:
        """获取当前性能快照"""
        return self.snapshots[-1] if self.snapshots else None
    
    def get_historical_snapshots(self, hours: int = 1) -> List[PerformanceSnapshot]:
        """获取历史快照"""
        if not self.snapshots:
            return []
        
        cutoff_time = datetime.now() - timedelta(hours=hours)
        return [s for s in self.snapshots if s.timestamp >= cutoff_time]
    
    def get_real_time_metrics(self) -> Dict[str, Any]:
        """获取实时指标"""
        return dict(self.real_time_metrics)
    
    def get_analysis_results(self) -> Dict[str, Any]:
        """获取分析结果"""
        return {
            'basic_metrics': self.analysis_cache.get('basic_metrics', {}),
            'trends': self.analysis_cache.get('trends', {}),
            'layer_performance': self.analysis_cache.get('layer_performance', {}),
            'prefetch_effectiveness': self.analysis_cache.get('prefetch_effectiveness', {}),
            'bottlenecks': self.analysis_cache.get('bottlenecks', []),
            'optimization_opportunities': self.analysis_cache.get('optimization_opportunities', []),
            'last_analysis': self.last_analysis.isoformat() if self.last_analysis else None,
            'analyzer_stats': dict(self.analyzer_stats)
        }
    
    def get_recommendations(self) -> List[Dict[str, Any]]:
        """获取优化建议"""
        return [rec.to_dict() for rec in self.recommendations_cache]
    
    def get_performance_report(self) -> Dict[str, Any]:
        """获取性能报告"""
        current_snapshot = self.get_current_snapshot()
        analysis_results = self.get_analysis_results()
        recommendations = self.get_recommendations()
        
        return {
            'report_timestamp': datetime.now().isoformat(),
            'current_performance': current_snapshot.to_dict() if current_snapshot else {},
            'analysis': analysis_results,
            'recommendations': recommendations,
            'config': self.config.to_dict()
        }
    
    async def record_latency(self, latency_ms: float):
        """记录延迟样本"""
        try:
            self.latency_samples.append({
                'timestamp': time.time(),
                'latency': latency_ms
            })
            
        except Exception as e:
            logger.error(f"记录延迟样本失败: {e}")
    
    async def trigger_analysis(self) -> Dict[str, Any]:
        """手动触发分析"""
        try:
            await self._perform_analysis()
            return self.get_analysis_results()
            
        except Exception as e:
            logger.error(f"手动触发分析失败: {e}")
            return {}

# 便捷工厂函数
async def create_performance_analyzer(
    cache_system: MultiLayerCache,
    prefetcher: Optional[IntelligentPrefetcher] = None,
    config: Optional[AnalysisConfig] = None
) -> PerformanceAnalyzer:
    """创建性能分析器"""
    analyzer = PerformanceAnalyzer(cache_system, prefetcher, config)
    await analyzer.start()
    return analyzer