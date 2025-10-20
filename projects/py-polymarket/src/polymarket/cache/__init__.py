#!/usr/bin/env python3
"""
缓存模块
Cache Module

提供智能缓存预取、多层缓存架构和缓存性能分析
"""

from .intelligent_prefetch import (
    IntelligentPrefetcher,
    PrefetchStrategy,
    PrefetchConfig,
    PatternAnalyzer,
    PopularityAnalyzer,
    SemanticAnalyzer,
    MLPredictor,
    AccessRecord,
    PrefetchCandidate,
    AccessPattern,
    create_intelligent_prefetcher
)

from .multi_layer_cache import (
    MultiLayerCache,
    CacheLayer,
    CacheLayerConfig,
    LayerType,
    CacheHierarchy,
    CacheCoordinator,
    LayerPerformance
)

from .cache_analyzer import (
    CachePerformanceAnalyzer,
    PerformanceMetric,
    CacheOptimizer,
    AnalysisReport,
    OptimizationRecommendation,
    MetricCollector
)

__all__ = [
    # 智能预取
    'IntelligentPrefetcher', 'PrefetchStrategy', 'PrefetchConfig', 
    'PatternAnalyzer', 'PopularityAnalyzer', 'SemanticAnalyzer', 'MLPredictor',
    'AccessRecord', 'PrefetchCandidate', 'AccessPattern', 'create_intelligent_prefetcher',
    
    # 多层缓存
    'MultiLayerCache', 'CacheLayer', 'CacheLayerConfig', 'LayerType',
    'CacheHierarchy', 'CacheCoordinator', 'LayerPerformance',
    
    # 缓存分析
    'CachePerformanceAnalyzer', 'PerformanceMetric', 'CacheOptimizer',
    'AnalysisReport', 'OptimizationRecommendation', 'MetricCollector'
]

__version__ = "1.0.0"