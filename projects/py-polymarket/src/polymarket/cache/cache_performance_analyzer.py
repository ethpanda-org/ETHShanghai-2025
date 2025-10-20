#!/usr/bin/env python3
"""
缓存性能分析器
Cache Performance Analyzer

实现缓存性能监控、分析和优化建议，支持多层缓存架构的全面性能分析
"""

import asyncio
import json
import time
import statistics
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, deque
import threading
from concurrent.futures import ThreadPoolExecutor

from ..utils.logging_utils import get_logger
from ..distributed.distributed_cache import DistributedCacheManager
from .intelligent_prefetch import IntelligentPrefetcher
from .multi_layer_cache import MultiLayerCacheManager

logger = get_logger(__name__)

class MetricType(Enum):
    """指标类型"""
    HIT_RATE = "hit_rate"
    MISS_RATE = "miss_rate"
    LATENCY = "latency"
    THROUGHPUT = "throughput"
    MEMORY_USAGE = "memory_usage"
    EVICTION_RATE = "eviction_rate"
    PREFETCH_ACCURACY = "prefetch_accuracy"
    NETWORK_OVERHEAD = "network_overhead"

class AlertLevel(Enum):
    """告警级别"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class PerformanceIssueType(Enum):
    """性能问题类型"""
    LOW_HIT_RATE = "low_hit_rate"
    HIGH_LATENCY = "high_latency"
    MEMORY_PRESSURE = "memory_pressure"
    HOTSPOT = "hotspot"
    INEFFECTIVE_PREFETCH = "ineffective_prefetch"
    NETWORK_BOTTLENECK = "network_bottleneck"
    CACHE_THRASHING = "cache_thrashing"

@dataclass
class MetricSnapshot:
    """指标快照"""
    timestamp: datetime
    metric_type: MetricType
    value: float
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            'timestamp': self.timestamp.isoformat(),
            'metric_type': self.metric_type.value,
            'value': self.value,
            'metadata': self.metadata
        }

@dataclass
class PerformanceAlert:
    """性能告警"""
    alert_id: str
    issue_type: PerformanceIssueType
    level: AlertLevel
    title: str
    description: str
    timestamp: datetime
    affected_components: List[str] = field(default_factory=list)
    suggested_actions: List[str] = field(default_factory=list)
    metrics: Dict[str, float] = field(default_factory=dict)
    resolved: bool = False
    
    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            'alert_id': self.alert_id,
            'issue_type': self.issue_type.value,
            'level': self.level.value,
            'title': self.title,
            'description': self.description,
            'timestamp': self.timestamp.isoformat(),
            'affected_components': self.affected_components,
            'suggested_actions': self.suggested_actions,
            'metrics': self.metrics,
            'resolved': self.resolved
        }

@dataclass
class CacheAnalysisConfig:
    """缓存分析配置"""
    sampling_interval: int = 60  # 采样间隔（秒）
    analysis_window: int = 3600  # 分析窗口（秒）
    retention_days: int = 7  # 数据保留天数
    
    # 告警阈值
    min_hit_rate_threshold: float = 0.8
    max_latency_threshold: float = 100.0  # 毫秒
    max_memory_usage_threshold: float = 0.85  # 85%
    min_prefetch_accuracy_threshold: float = 0.6
    
    # 分析配置
    enable_trend_analysis: bool = True
    enable_anomaly_detection: bool = True
    enable_capacity_planning: bool = True
    
    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            'sampling_interval': self.sampling_interval,
            'analysis_window': self.analysis_window,
            'retention_days': self.retention_days,
            'min_hit_rate_threshold': self.min_hit_rate_threshold,
            'max_latency_threshold': self.max_latency_threshold,
            'max_memory_usage_threshold': self.max_memory_usage_threshold,
            'min_prefetch_accuracy_threshold': self.min_prefetch_accuracy_threshold,
            'enable_trend_analysis': self.enable_trend_analysis,
            'enable_anomaly_detection': self.enable_anomaly_detection,
            'enable_capacity_planning': self.enable_capacity_planning
        }

class MetricsCollector:
    """指标收集器"""
    
    def __init__(self, config: CacheAnalysisConfig):
        self.config = config
        self.metrics_buffer: Dict[MetricType, deque] = {
            metric_type: deque(maxlen=10000) for metric_type in MetricType
        }
        self.collection_lock = threading.Lock()
        
        logger.info("指标收集器初始化完成")
    
    def collect_metric(self, metric_type: MetricType, value: float, 
                      metadata: Dict[str, Any] = None):
        """收集指标"""
        try:
            snapshot = MetricSnapshot(
                timestamp=datetime.now(),
                metric_type=metric_type,
                value=value,
                metadata=metadata or {}
            )
            
            with self.collection_lock:
                self.metrics_buffer[metric_type].append(snapshot)
                
        except Exception as e:
            logger.error(f"收集指标失败: {e}")
    
    def get_metrics(self, metric_type: MetricType, 
                   time_window: timedelta = None) -> List[MetricSnapshot]:
        """获取指标"""
        try:
            with self.collection_lock:
                metrics = list(self.metrics_buffer[metric_type])
            
            if time_window:
                cutoff_time = datetime.now() - time_window
                metrics = [m for m in metrics if m.timestamp >= cutoff_time]
            
            return metrics
            
        except Exception as e:
            logger.error(f"获取指标失败: {e}")
            return []
    
    def get_aggregated_metrics(self, metric_type: MetricType,
                             time_window: timedelta = None) -> Dict[str, float]:
        """获取聚合指标"""
        try:
            metrics = self.get_metrics(metric_type, time_window)
            
            if not metrics:
                return {}
            
            values = [m.value for m in metrics]
            
            return {
                'count': len(values),
                'min': min(values),
                'max': max(values),
                'avg': statistics.mean(values),
                'median': statistics.median(values),
                'std': statistics.stdev(values) if len(values) > 1 else 0.0,
                'p95': np.percentile(values, 95),
                'p99': np.percentile(values, 99)
            }
            
        except Exception as e:
            logger.error(f"获取聚合指标失败: {e}")
            return {}

class TrendAnalyzer:
    """趋势分析器"""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics_collector = metrics_collector
        
        logger.info("趋势分析器初始化完成")
    
    def analyze_trend(self, metric_type: MetricType, 
                     time_window: timedelta = None) -> Dict[str, Any]:
        """分析趋势"""
        try:
            metrics = self.metrics_collector.get_metrics(metric_type, time_window)
            
            if len(metrics) < 2:
                return {'trend': 'insufficient_data'}
            
            # 计算趋势
            values = [m.value for m in metrics]
            timestamps = [(m.timestamp - metrics[0].timestamp).total_seconds() 
                         for m in metrics]
            
            # 线性回归计算趋势
            slope, intercept = np.polyfit(timestamps, values, 1)
            
            # 计算R²
            mean_value = np.mean(values)
            ss_tot = np.sum((values - mean_value) ** 2)
            ss_res = np.sum((values - (slope * np.array(timestamps) + intercept)) ** 2)
            r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
            
            # 分类趋势
            if abs(slope) < 0.001:
                trend_direction = 'stable'
            elif slope > 0:
                trend_direction = 'increasing'
            else:
                trend_direction = 'decreasing'
            
            return {
                'trend': trend_direction,
                'slope': slope,
                'intercept': intercept,
                'r_squared': r_squared,
                'confidence': min(r_squared, 1.0),
                'data_points': len(values),
                'time_span_seconds': timestamps[-1]
            }
            
        except Exception as e:
            logger.error(f"分析趋势失败: {e}")
            return {'trend': 'error'}
    
    def predict_future_value(self, metric_type: MetricType, 
                           prediction_minutes: int = 60) -> Optional[float]:
        """预测未来值"""
        try:
            trend_analysis = self.analyze_trend(metric_type, timedelta(hours=1))
            
            if trend_analysis['trend'] == 'insufficient_data':
                return None
            
            slope = trend_analysis['slope']
            intercept = trend_analysis['intercept']
            prediction_seconds = prediction_minutes * 60
            
            # 基于线性趋势预测
            predicted_value = slope * prediction_seconds + intercept
            
            return max(0.0, predicted_value)  # 确保非负
            
        except Exception as e:
            logger.error(f"预测未来值失败: {e}")
            return None

class AnomalyDetector:
    """异常检测器"""
    
    def __init__(self, metrics_collector: MetricsCollector):
        self.metrics_collector = metrics_collector
        
        # 异常检测参数
        self.outlier_threshold = 2.5  # 标准差倍数
        self.min_samples = 30
        
        logger.info("异常检测器初始化完成")
    
    def detect_anomalies(self, metric_type: MetricType, 
                        time_window: timedelta = None) -> List[Dict[str, Any]]:
        """检测异常"""
        try:
            metrics = self.metrics_collector.get_metrics(metric_type, time_window)
            
            if len(metrics) < self.min_samples:
                return []
            
            values = [m.value for m in metrics]
            mean_value = np.mean(values)
            std_value = np.std(values)
            
            if std_value == 0:
                return []
            
            anomalies = []
            for i, metric in enumerate(metrics):
                z_score = abs((metric.value - mean_value) / std_value)
                
                if z_score > self.outlier_threshold:
                    anomalies.append({
                        'timestamp': metric.timestamp.isoformat(),
                        'value': metric.value,
                        'z_score': z_score,
                        'deviation': metric.value - mean_value,
                        'metadata': metric.metadata
                    })
            
            return anomalies
            
        except Exception as e:
            logger.error(f"检测异常失败: {e}")
            return []
    
    def detect_pattern_anomalies(self, metric_type: MetricType) -> List[Dict[str, Any]]:
        """检测模式异常"""
        try:
            metrics = self.metrics_collector.get_metrics(
                metric_type, timedelta(hours=24)
            )
            
            if len(metrics) < 100:  # 需要足够的数据
                return []
            
            # 按小时分组
            hourly_groups = defaultdict(list)
            for metric in metrics:
                hour = metric.timestamp.hour
                hourly_groups[hour].append(metric.value)
            
            # 检测每小时的异常模式
            anomalies = []
            for hour, values in hourly_groups.items():
                if len(values) >= 3:
                    mean_val = np.mean(values)
                    std_val = np.std(values)
                    
                    # 与其他小时对比
                    other_hours_values = []
                    for other_hour, other_values in hourly_groups.items():
                        if other_hour != hour:
                            other_hours_values.extend(other_values)
                    
                    if other_hours_values:
                        overall_mean = np.mean(other_hours_values)
                        overall_std = np.std(other_hours_values)
                        
                        if overall_std > 0:
                            hour_z_score = abs((mean_val - overall_mean) / overall_std)
                            
                            if hour_z_score > 2.0:  # 小时异常阈值
                                anomalies.append({
                                    'type': 'hourly_pattern_anomaly',
                                    'hour': hour,
                                    'hour_mean': mean_val,
                                    'overall_mean': overall_mean,
                                    'z_score': hour_z_score,
                                    'severity': 'high' if hour_z_score > 3.0 else 'medium'
                                })
            
            return anomalies
            
        except Exception as e:
            logger.error(f"检测模式异常失败: {e}")
            return []

class CapacityPlanner:
    """容量规划器"""
    
    def __init__(self, metrics_collector: MetricsCollector, 
                 trend_analyzer: TrendAnalyzer):
        self.metrics_collector = metrics_collector
        self.trend_analyzer = trend_analyzer
        
        logger.info("容量规划器初始化完成")
    
    def analyze_capacity_usage(self) -> Dict[str, Any]:
        """分析容量使用情况"""
        try:
            # 分析内存使用趋势
            memory_trend = self.trend_analyzer.analyze_trend(
                MetricType.MEMORY_USAGE, timedelta(hours=6)
            )
            
            # 分析吞吐量趋势
            throughput_trend = self.trend_analyzer.analyze_trend(
                MetricType.THROUGHPUT, timedelta(hours=6)
            )
            
            # 获取当前指标
            current_memory = self.metrics_collector.get_aggregated_metrics(
                MetricType.MEMORY_USAGE, timedelta(minutes=10)
            )
            
            current_throughput = self.metrics_collector.get_aggregated_metrics(
                MetricType.THROUGHPUT, timedelta(minutes=10)
            )
            
            # 预测容量需求
            predictions = {}
            for hours in [6, 12, 24, 48]:
                memory_pred = self.trend_analyzer.predict_future_value(
                    MetricType.MEMORY_USAGE, hours * 60
                )
                throughput_pred = self.trend_analyzer.predict_future_value(
                    MetricType.THROUGHPUT, hours * 60
                )
                
                predictions[f"{hours}h"] = {
                    'memory_usage': memory_pred,
                    'throughput': throughput_pred
                }
            
            return {
                'current_usage': {
                    'memory': current_memory,
                    'throughput': current_throughput
                },
                'trends': {
                    'memory': memory_trend,
                    'throughput': throughput_trend
                },
                'predictions': predictions,
                'recommendations': self._generate_capacity_recommendations(
                    current_memory, current_throughput, predictions
                )
            }
            
        except Exception as e:
            logger.error(f"分析容量使用情况失败: {e}")
            return {}
    
    def _generate_capacity_recommendations(self, current_memory: Dict, 
                                         current_throughput: Dict,
                                         predictions: Dict) -> List[str]:
        """生成容量建议"""
        recommendations = []
        
        try:
            # 内存使用建议
            if current_memory.get('avg', 0) > 0.8:
                recommendations.append("当前内存使用率超过80%，建议考虑扩展缓存容量")
            
            # 检查预测的内存使用
            for period, pred in predictions.items():
                if pred.get('memory_usage', 0) > 0.9:
                    recommendations.append(f"预测{period}后内存使用率将超过90%，建议提前扩容")
            
            # 吞吐量建议
            throughput_trend = current_throughput.get('avg', 0)
            if throughput_trend > 0:
                for period, pred in predictions.items():
                    if pred.get('throughput') and pred['throughput'] > throughput_trend * 2:
                        recommendations.append(f"预测{period}后吞吐量将翻倍，建议优化缓存策略")
            
            if not recommendations:
                recommendations.append("当前容量使用正常，建议继续监控")
                
        except Exception as e:
            logger.error(f"生成容量建议失败: {e}")
        
        return recommendations

class PerformanceAnalyzer:
    """性能分析器"""
    
    def __init__(self, config: CacheAnalysisConfig):
        self.config = config
        self.metrics_collector = MetricsCollector(config)
        self.trend_analyzer = TrendAnalyzer(self.metrics_collector)
        self.anomaly_detector = AnomalyDetector(self.metrics_collector)
        self.capacity_planner = CapacityPlanner(self.metrics_collector, self.trend_analyzer)
        
        # 告警管理
        self.alerts: Dict[str, PerformanceAlert] = {}
        self.alert_history: List[PerformanceAlert] = []
        
        logger.info("性能分析器初始化完成")
    
    def analyze_cache_performance(self, cache_stats: Dict[str, Any]) -> Dict[str, Any]:
        """分析缓存性能"""
        try:
            analysis_results = {
                'timestamp': datetime.now().isoformat(),
                'overall_health': 'healthy',
                'metrics_summary': {},
                'trends': {},
                'anomalies': {},
                'capacity_analysis': {},
                'alerts': [],
                'recommendations': []
            }
            
            # 收集基础指标
            self._collect_basic_metrics(cache_stats)
            
            # 指标摘要
            for metric_type in MetricType:
                aggregated = self.metrics_collector.get_aggregated_metrics(
                    metric_type, timedelta(hours=1)
                )
                if aggregated:
                    analysis_results['metrics_summary'][metric_type.value] = aggregated
            
            # 趋势分析
            if self.config.enable_trend_analysis:
                for metric_type in [MetricType.HIT_RATE, MetricType.LATENCY, 
                                  MetricType.MEMORY_USAGE]:
                    trend = self.trend_analyzer.analyze_trend(metric_type)
                    analysis_results['trends'][metric_type.value] = trend
            
            # 异常检测
            if self.config.enable_anomaly_detection:
                for metric_type in MetricType:
                    anomalies = self.anomaly_detector.detect_anomalies(metric_type)
                    if anomalies:
                        analysis_results['anomalies'][metric_type.value] = anomalies
            
            # 容量分析
            if self.config.enable_capacity_planning:
                analysis_results['capacity_analysis'] = self.capacity_planner.analyze_capacity_usage()
            
            # 生成告警
            alerts = self._generate_alerts(analysis_results)
            analysis_results['alerts'] = [alert.to_dict() for alert in alerts]
            
            # 生成建议
            analysis_results['recommendations'] = self._generate_recommendations(analysis_results)
            
            # 计算整体健康状态
            analysis_results['overall_health'] = self._calculate_overall_health(analysis_results)
            
            return analysis_results
            
        except Exception as e:
            logger.error(f"分析缓存性能失败: {e}")
            return {}
    
    def _collect_basic_metrics(self, cache_stats: Dict[str, Any]):
        """收集基础指标"""
        try:
            # 缓存命中率
            if 'hits' in cache_stats and 'misses' in cache_stats:
                total_requests = cache_stats['hits'] + cache_stats['misses']
                if total_requests > 0:
                    hit_rate = cache_stats['hits'] / total_requests
                    self.metrics_collector.collect_metric(MetricType.HIT_RATE, hit_rate)
                    
                    miss_rate = cache_stats['misses'] / total_requests
                    self.metrics_collector.collect_metric(MetricType.MISS_RATE, miss_rate)
            
            # 内存使用
            if 'memory_usage_mb' in cache_stats and 'max_memory_mb' in cache_stats:
                if cache_stats['max_memory_mb'] > 0:
                    memory_usage = cache_stats['memory_usage_mb'] / cache_stats['max_memory_mb']
                    self.metrics_collector.collect_metric(MetricType.MEMORY_USAGE, memory_usage)
            
            # 延迟（从性能指标中获取）
            if 'avg_get_latency' in cache_stats:
                latency_ms = cache_stats['avg_get_latency'] * 1000  # 转换为毫秒
                self.metrics_collector.collect_metric(MetricType.LATENCY, latency_ms)
            
            # 吞吐量
            if 'requests_per_second' in cache_stats:
                self.metrics_collector.collect_metric(
                    MetricType.THROUGHPUT, cache_stats['requests_per_second']
                )
            
            # 淘汰率
            if 'evictions' in cache_stats:
                self.metrics_collector.collect_metric(
                    MetricType.EVICTION_RATE, cache_stats['evictions']
                )
            
            # 预取准确率（如果有预取统计）
            if 'prefetch_accuracy' in cache_stats:
                self.metrics_collector.collect_metric(
                    MetricType.PREFETCH_ACCURACY, cache_stats['prefetch_accuracy']
                )
                
        except Exception as e:
            logger.error(f"收集基础指标失败: {e}")
    
    def _generate_alerts(self, analysis_results: Dict[str, Any]) -> List[PerformanceAlert]:
        """生成告警"""
        alerts = []
        
        try:
            current_time = datetime.now()
            
            # 检查命中率告警
            hit_rate_metrics = analysis_results['metrics_summary'].get('hit_rate', {})
            if hit_rate_metrics.get('avg', 1.0) < self.config.min_hit_rate_threshold:
                alert = PerformanceAlert(
                    alert_id=f"low_hit_rate_{int(time.time())}",
                    issue_type=PerformanceIssueType.LOW_HIT_RATE,
                    level=AlertLevel.WARNING,
                    title="缓存命中率过低",
                    description=f"当前缓存命中率 {hit_rate_metrics.get('avg', 0):.1%} 低于阈值 {self.config.min_hit_rate_threshold:.1%}",
                    timestamp=current_time,
                    affected_components=["cache"],
                    suggested_actions=[
                        "检查缓存策略配置",
                        "考虑增加缓存容量",
                        "优化数据预取策略"
                    ],
                    metrics={'hit_rate': hit_rate_metrics.get('avg', 0)}
                )
                alerts.append(alert)
            
            # 检查延迟告警
            latency_metrics = analysis_results['metrics_summary'].get('latency', {})
            if latency_metrics.get('avg', 0) > self.config.max_latency_threshold:
                alert = PerformanceAlert(
                    alert_id=f"high_latency_{int(time.time())}",
                    issue_type=PerformanceIssueType.HIGH_LATENCY,
                    level=AlertLevel.ERROR,
                    title="缓存延迟过高",
                    description=f"当前平均延迟 {latency_metrics.get('avg', 0):.1f}ms 超过阈值 {self.config.max_latency_threshold}ms",
                    timestamp=current_time,
                    affected_components=["cache"],
                    suggested_actions=[
                        "检查网络连接",
                        "优化查询性能",
                        "考虑增加缓存节点"
                    ],
                    metrics={'avg_latency': latency_metrics.get('avg', 0)}
                )
                alerts.append(alert)
            
            # 检查内存压力告警
            memory_metrics = analysis_results['metrics_summary'].get('memory_usage', {})
            if memory_metrics.get('avg', 0) > self.config.max_memory_usage_threshold:
                alert = PerformanceAlert(
                    alert_id=f"memory_pressure_{int(time.time())}",
                    issue_type=PerformanceIssueType.MEMORY_PRESSURE,
                    level=AlertLevel.CRITICAL,
                    title="内存使用率过高",
                    description=f"当前内存使用率 {memory_metrics.get('avg', 0):.1%} 超过阈值 {self.config.max_memory_usage_threshold:.1%}",
                    timestamp=current_time,
                    affected_components=["cache", "memory"],
                    suggested_actions=[
                        "立即清理无用缓存",
                        "增加内存容量",
                        "调整缓存淘汰策略"
                    ],
                    metrics={'memory_usage': memory_metrics.get('avg', 0)}
                )
                alerts.append(alert)
            
            # 检查预取准确率告警
            prefetch_metrics = analysis_results['metrics_summary'].get('prefetch_accuracy', {})
            if prefetch_metrics.get('avg', 1.0) < self.config.min_prefetch_accuracy_threshold:
                alert = PerformanceAlert(
                    alert_id=f"ineffective_prefetch_{int(time.time())}",
                    issue_type=PerformanceIssueType.INEFFECTIVE_PREFETCH,
                    level=AlertLevel.WARNING,
                    title="预取准确率过低",
                    description=f"当前预取准确率 {prefetch_metrics.get('avg', 0):.1%} 低于阈值 {self.config.min_prefetch_accuracy_threshold:.1%}",
                    timestamp=current_time,
                    affected_components=["prefetch"],
                    suggested_actions=[
                        "调整预取算法参数",
                        "重新训练机器学习模型",
                        "分析访问模式变化"
                    ],
                    metrics={'prefetch_accuracy': prefetch_metrics.get('avg', 0)}
                )
                alerts.append(alert)
            
            # 将告警添加到历史记录
            for alert in alerts:
                self.alerts[alert.alert_id] = alert
                self.alert_history.append(alert)
            
            return alerts
            
        except Exception as e:
            logger.error(f"生成告警失败: {e}")
            return []
    
    def _generate_recommendations(self, analysis_results: Dict[str, Any]) -> List[str]:
        """生成优化建议"""
        recommendations = []
        
        try:
            # 基于指标的建议
            hit_rate_avg = analysis_results['metrics_summary'].get('hit_rate', {}).get('avg', 1.0)
            if hit_rate_avg < 0.9:
                recommendations.append("考虑优化缓存策略以提高命中率")
            
            latency_p99 = analysis_results['metrics_summary'].get('latency', {}).get('p99', 0)
            if latency_p99 > 200:  # 200ms
                recommendations.append("P99延迟较高，建议优化热点数据访问")
            
            # 基于趋势的建议
            memory_trend = analysis_results['trends'].get('memory_usage', {})
            if memory_trend.get('trend') == 'increasing':
                recommendations.append("内存使用呈上升趋势，建议监控并考虑扩容")
            
            # 基于异常的建议
            anomalies = analysis_results.get('anomalies', {})
            if anomalies:
                recommendations.append("检测到性能异常，建议深入分析根本原因")
            
            # 基于容量分析的建议
            capacity_recs = analysis_results.get('capacity_analysis', {}).get('recommendations', [])
            recommendations.extend(capacity_recs)
            
            if not recommendations:
                recommendations.append("缓存性能表现良好，建议继续监控")
            
        except Exception as e:
            logger.error(f"生成优化建议失败: {e}")
        
        return recommendations
    
    def _calculate_overall_health(self, analysis_results: Dict[str, Any]) -> str:
        """计算整体健康状态"""
        try:
            score = 100
            
            # 基于告警降分
            alerts = analysis_results.get('alerts', [])
            for alert in alerts:
                if alert['level'] == AlertLevel.CRITICAL.value:
                    score -= 30
                elif alert['level'] == AlertLevel.ERROR.value:
                    score -= 20
                elif alert['level'] == AlertLevel.WARNING.value:
                    score -= 10
            
            # 基于关键指标降分
            hit_rate = analysis_results['metrics_summary'].get('hit_rate', {}).get('avg', 1.0)
            if hit_rate < 0.8:
                score -= 15
            elif hit_rate < 0.9:
                score -= 5
            
            latency = analysis_results['metrics_summary'].get('latency', {}).get('avg', 0)
            if latency > 100:
                score -= 15
            elif latency > 50:
                score -= 5
            
            # 确定健康等级
            if score >= 90:
                return 'excellent'
            elif score >= 80:
                return 'good'
            elif score >= 70:
                return 'fair'
            elif score >= 50:
                return 'poor'
            else:
                return 'critical'
                
        except Exception as e:
            logger.error(f"计算整体健康状态失败: {e}")
            return 'unknown'

class CachePerformanceAnalyzer:
    """缓存性能分析器主类"""
    
    def __init__(self, config: CacheAnalysisConfig = None):
        """
        初始化缓存性能分析器
        
        Args:
            config: 分析配置
        """
        self.config = config or CacheAnalysisConfig()
        self.performance_analyzer = PerformanceAnalyzer(self.config)
        
        # 监控的缓存组件
        self.cache_components: Dict[str, Any] = {}
        
        # 后台任务
        self.analysis_task: Optional[asyncio.Task] = None
        self.sampling_task: Optional[asyncio.Task] = None
        
        # 分析历史
        self.analysis_history: List[Dict[str, Any]] = []
        
        logger.info("缓存性能分析器初始化完成")
    
    async def start(self):
        """启动性能分析器"""
        try:
            logger.info("启动缓存性能分析器...")
            
            # 启动采样任务
            self.sampling_task = asyncio.create_task(self._sampling_loop())
            
            # 启动分析任务
            self.analysis_task = asyncio.create_task(self._analysis_loop())
            
            logger.info("缓存性能分析器启动成功")
            
        except Exception as e:
            logger.error(f"启动缓存性能分析器失败: {e}")
            raise
    
    async def stop(self):
        """停止性能分析器"""
        try:
            logger.info("正在停止缓存性能分析器...")
            
            # 停止后台任务
            if self.sampling_task:
                self.sampling_task.cancel()
                try:
                    await self.sampling_task
                except asyncio.CancelledError:
                    pass
            
            if self.analysis_task:
                self.analysis_task.cancel()
                try:
                    await self.analysis_task
                except asyncio.CancelledError:
                    pass
            
            logger.info("缓存性能分析器已停止")
            
        except Exception as e:
            logger.error(f"停止缓存性能分析器失败: {e}")
    
    def register_cache_component(self, name: str, component: Any):
        """注册缓存组件"""
        try:
            self.cache_components[name] = component
            logger.info(f"注册缓存组件: {name}")
            
        except Exception as e:
            logger.error(f"注册缓存组件失败: {e}")
    
    async def _sampling_loop(self):
        """采样循环"""
        while True:
            try:
                await self._collect_all_metrics()
                await asyncio.sleep(self.config.sampling_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"采样循环异常: {e}")
                await asyncio.sleep(self.config.sampling_interval)
    
    async def _analysis_loop(self):
        """分析循环"""
        while True:
            try:
                await self._perform_comprehensive_analysis()
                await asyncio.sleep(self.config.analysis_window)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"分析循环异常: {e}")
                await asyncio.sleep(self.config.analysis_window)
    
    async def _collect_all_metrics(self):
        """收集所有指标"""
        try:
            for name, component in self.cache_components.items():
                try:
                    # 根据组件类型收集不同的指标
                    if hasattr(component, 'get_cache_stats'):
                        stats = component.get_cache_stats()
                        self.performance_analyzer._collect_basic_metrics(stats)
                    
                    if hasattr(component, 'get_prefetch_stats'):
                        prefetch_stats = component.get_prefetch_stats()
                        if 'prefetch_accuracy' in prefetch_stats:
                            self.performance_analyzer.metrics_collector.collect_metric(
                                MetricType.PREFETCH_ACCURACY,
                                prefetch_stats['prefetch_accuracy']
                            )
                    
                except Exception as e:
                    logger.debug(f"收集组件 {name} 指标失败: {e}")
                    
        except Exception as e:
            logger.error(f"收集所有指标失败: {e}")
    
    async def _perform_comprehensive_analysis(self):
        """执行综合分析"""
        try:
            # 合并所有组件的统计信息
            combined_stats = {}
            for name, component in self.cache_components.items():
                if hasattr(component, 'get_cache_stats'):
                    component_stats = component.get_cache_stats()
                    
                    # 合并统计信息
                    for key, value in component_stats.items():
                        if isinstance(value, (int, float)):
                            combined_stats[key] = combined_stats.get(key, 0) + value
                        elif key not in combined_stats:
                            combined_stats[key] = value
            
            # 执行性能分析
            analysis_result = self.performance_analyzer.analyze_cache_performance(combined_stats)
            
            # 保存分析历史
            self.analysis_history.append(analysis_result)
            
            # 限制历史记录数量
            max_history = 100
            if len(self.analysis_history) > max_history:
                self.analysis_history = self.analysis_history[-max_history:]
            
            # 记录关键发现
            if analysis_result.get('overall_health') in ['poor', 'critical']:
                logger.warning(f"缓存性能健康状态: {analysis_result['overall_health']}")
                
                alerts = analysis_result.get('alerts', [])
                for alert in alerts:
                    if alert['level'] in ['error', 'critical']:
                        logger.error(f"性能告警: {alert['title']} - {alert['description']}")
            
        except Exception as e:
            logger.error(f"执行综合分析失败: {e}")
    
    # 公共API方法
    def get_performance_report(self) -> Dict[str, Any]:
        """获取性能报告"""
        try:
            if not self.analysis_history:
                return {'status': 'no_data'}
            
            latest_analysis = self.analysis_history[-1]
            
            return {
                'timestamp': datetime.now().isoformat(),
                'latest_analysis': latest_analysis,
                'historical_trend': self._generate_historical_trend(),
                'component_status': self._get_component_status(),
                'optimization_suggestions': self._get_optimization_suggestions()
            }
            
        except Exception as e:
            logger.error(f"获取性能报告失败: {e}")
            return {'status': 'error', 'message': str(e)}
    
    def _generate_historical_trend(self) -> Dict[str, Any]:
        """生成历史趋势"""
        try:
            if len(self.analysis_history) < 2:
                return {'status': 'insufficient_data'}
            
            # 提取关键指标的历史数据
            hit_rates = []
            latencies = []
            memory_usage = []
            
            for analysis in self.analysis_history[-10:]:  # 最近10次分析
                metrics = analysis.get('metrics_summary', {})
                
                hit_rate = metrics.get('hit_rate', {}).get('avg')
                if hit_rate is not None:
                    hit_rates.append(hit_rate)
                
                latency = metrics.get('latency', {}).get('avg')
                if latency is not None:
                    latencies.append(latency)
                
                memory = metrics.get('memory_usage', {}).get('avg')
                if memory is not None:
                    memory_usage.append(memory)
            
            return {
                'hit_rate_trend': self._calculate_trend(hit_rates),
                'latency_trend': self._calculate_trend(latencies),
                'memory_trend': self._calculate_trend(memory_usage),
                'data_points': len(self.analysis_history)
            }
            
        except Exception as e:
            logger.error(f"生成历史趋势失败: {e}")
            return {'status': 'error'}
    
    def _calculate_trend(self, values: List[float]) -> str:
        """计算趋势方向"""
        if len(values) < 2:
            return 'insufficient_data'
        
        recent_avg = np.mean(values[-3:]) if len(values) >= 3 else values[-1]
        earlier_avg = np.mean(values[:-3]) if len(values) >= 6 else np.mean(values[:-1])
        
        if recent_avg > earlier_avg * 1.05:
            return 'increasing'
        elif recent_avg < earlier_avg * 0.95:
            return 'decreasing'
        else:
            return 'stable'
    
    def _get_component_status(self) -> Dict[str, str]:
        """获取组件状态"""
        status = {}
        
        for name, component in self.cache_components.items():
            try:
                if hasattr(component, 'get_cache_stats'):
                    stats = component.get_cache_stats()
                    
                    # 简单的健康检查
                    if stats.get('hits', 0) + stats.get('misses', 0) > 0:
                        hit_rate = stats.get('hits', 0) / (stats.get('hits', 0) + stats.get('misses', 1))
                        if hit_rate > 0.8:
                            status[name] = 'healthy'
                        elif hit_rate > 0.6:
                            status[name] = 'degraded'
                        else:
                            status[name] = 'unhealthy'
                    else:
                        status[name] = 'unknown'
                else:
                    status[name] = 'unknown'
                    
            except Exception as e:
                status[name] = 'error'
                logger.debug(f"获取组件 {name} 状态失败: {e}")
        
        return status
    
    def _get_optimization_suggestions(self) -> List[str]:
        """获取优化建议"""
        suggestions = []
        
        try:
            if self.analysis_history:
                latest = self.analysis_history[-1]
                suggestions.extend(latest.get('recommendations', []))
            
            # 基于组件状态的额外建议
            component_status = self._get_component_status()
            unhealthy_components = [
                name for name, status in component_status.items() 
                if status in ['degraded', 'unhealthy']
            ]
            
            if unhealthy_components:
                suggestions.append(f"检查以下组件的配置: {', '.join(unhealthy_components)}")
            
        except Exception as e:
            logger.error(f"获取优化建议失败: {e}")
        
        return suggestions[:10]  # 限制建议数量

# 便捷工厂函数
def create_cache_performance_analyzer(config: CacheAnalysisConfig = None) -> CachePerformanceAnalyzer:
    """创建缓存性能分析器"""
    return CachePerformanceAnalyzer(config)