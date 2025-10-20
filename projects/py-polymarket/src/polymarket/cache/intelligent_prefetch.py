#!/usr/bin/env python3
"""
智能缓存预取系统
Intelligent Cache Prefetching System

基于机器学习和访问模式分析的智能数据预取，提升缓存命中率和系统性能
"""

import asyncio
import json
import time
import hashlib
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, deque
import pickle
import threading
from concurrent.futures import ThreadPoolExecutor

from ..utils.logging_utils import get_logger
from ..distributed.distributed_cache import DistributedCacheManager, CacheConfig

logger = get_logger(__name__)

class PrefetchStrategy(Enum):
    """预取策略"""
    SEQUENTIAL = "sequential"          # 序列预取
    PATTERN_BASED = "pattern_based"    # 模式预取
    POPULARITY = "popularity"          # 热度预取
    TEMPORAL = "temporal"             # 时间预取
    SEMANTIC = "semantic"             # 语义预取
    ML_PREDICTED = "ml_predicted"     # 机器学习预测
    HYBRID = "hybrid"                 # 混合策略

class AccessPattern(Enum):
    """访问模式"""
    SEQUENTIAL = "sequential"
    RANDOM = "random"
    TEMPORAL = "temporal"
    BURST = "burst"
    CYCLICAL = "cyclical"

@dataclass
class AccessRecord:
    """访问记录"""
    key: str
    timestamp: datetime
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    access_type: str = "read"
    context: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            'key': self.key,
            'timestamp': self.timestamp.isoformat(),
            'user_id': self.user_id,
            'session_id': self.session_id,
            'access_type': self.access_type,
            'context': self.context
        }

@dataclass
class PrefetchCandidate:
    """预取候选"""
    key: str
    confidence: float
    priority: int
    strategy: PrefetchStrategy
    estimated_access_time: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __lt__(self, other):
        # 优先级队列排序（优先级高的先执行）
        return self.priority > other.priority

@dataclass
class PrefetchConfig:
    """预取配置"""
    max_prefetch_queue_size: int = 1000
    max_concurrent_prefetches: int = 10
    prefetch_ahead_window: int = 300  # 5分钟
    min_confidence_threshold: float = 0.6
    
    # 模式分析配置
    pattern_analysis_window: int = 3600  # 1小时
    min_pattern_length: int = 3
    max_pattern_length: int = 10
    
    # ML模型配置
    model_training_interval: int = 1800  # 30分钟
    feature_window_size: int = 100
    prediction_horizon: int = 5
    
    # 热度分析配置
    popularity_decay_factor: float = 0.9
    popularity_threshold: float = 0.1
    
    def to_dict(self) -> Dict:
        """转换为字典"""
        return {
            'max_prefetch_queue_size': self.max_prefetch_queue_size,
            'max_concurrent_prefetches': self.max_concurrent_prefetches,
            'prefetch_ahead_window': self.prefetch_ahead_window,
            'min_confidence_threshold': self.min_confidence_threshold,
            'pattern_analysis_window': self.pattern_analysis_window,
            'min_pattern_length': self.min_pattern_length,
            'max_pattern_length': self.max_pattern_length,
            'model_training_interval': self.model_training_interval,
            'feature_window_size': self.feature_window_size,
            'prediction_horizon': self.prediction_horizon,
            'popularity_decay_factor': self.popularity_decay_factor,
            'popularity_threshold': self.popularity_threshold
        }

class PatternAnalyzer:
    """访问模式分析器"""
    
    def __init__(self, config: PrefetchConfig):
        self.config = config
        self.access_sequences: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.patterns: Dict[str, Dict] = {}  # 发现的模式
        self.pattern_confidence: Dict[str, float] = {}
        
        # 时间窗口分析
        self.time_windows = {}
        self.cyclical_patterns = {}
        
        logger.info("访问模式分析器初始化完成")
    
    def record_access(self, record: AccessRecord):
        """记录访问"""
        try:
            # 按用户/会话记录序列
            session_key = record.session_id or record.user_id or "global"
            self.access_sequences[session_key].append({
                'key': record.key,
                'timestamp': record.timestamp,
                'context': record.context
            })
            
            # 更新时间窗口统计
            self._update_time_window_stats(record)
            
        except Exception as e:
            logger.error(f"记录访问失败: {e}")
    
    def _update_time_window_stats(self, record: AccessRecord):
        """更新时间窗口统计"""
        try:
            # 按小时统计
            hour_key = record.timestamp.replace(minute=0, second=0, microsecond=0)
            if hour_key not in self.time_windows:
                self.time_windows[hour_key] = defaultdict(int)
            self.time_windows[hour_key][record.key] += 1
            
            # 检测周期性模式
            day_of_week = record.timestamp.weekday()
            hour_of_day = record.timestamp.hour
            cyclical_key = f"{day_of_week}_{hour_of_day}"
            
            if cyclical_key not in self.cyclical_patterns:
                self.cyclical_patterns[cyclical_key] = defaultdict(int)
            self.cyclical_patterns[cyclical_key][record.key] += 1
            
        except Exception as e:
            logger.error(f"更新时间窗口统计失败: {e}")
    
    def analyze_sequential_patterns(self, session_key: str = None) -> Dict[str, List]:
        """分析序列模式"""
        try:
            patterns = {}
            
            # 分析指定会话或所有会话
            sequences_to_analyze = [self.access_sequences[session_key]] if session_key else self.access_sequences.values()
            
            for sequence in sequences_to_analyze:
                if len(sequence) < self.config.min_pattern_length:
                    continue
                
                # 提取访问键序列
                keys = [access['key'] for access in sequence]
                
                # 寻找重复模式
                for pattern_len in range(self.config.min_pattern_length, 
                                       min(len(keys) // 2, self.config.max_pattern_length) + 1):
                    
                    for i in range(len(keys) - pattern_len * 2 + 1):
                        pattern = tuple(keys[i:i + pattern_len])
                        next_pattern = tuple(keys[i + pattern_len:i + pattern_len * 2])
                        
                        if pattern == next_pattern:
                            pattern_str = "->".join(pattern)
                            if pattern_str not in patterns:
                                patterns[pattern_str] = []
                            
                            # 记录模式及其后续元素
                            if i + pattern_len * 2 < len(keys):
                                next_key = keys[i + pattern_len * 2]
                                patterns[pattern_str].append(next_key)
            
            return patterns
            
        except Exception as e:
            logger.error(f"分析序列模式失败: {e}")
            return {}
    
    def analyze_temporal_patterns(self) -> Dict[str, Any]:
        """分析时间模式"""
        try:
            temporal_patterns = {
                'hourly': {},
                'daily': {},
                'weekly': {},
                'cyclical': {}
            }
            
            # 分析每小时访问模式
            for hour_key, accesses in self.time_windows.items():
                hour = hour_key.hour
                if hour not in temporal_patterns['hourly']:
                    temporal_patterns['hourly'][hour] = defaultdict(int)
                
                for key, count in accesses.items():
                    temporal_patterns['hourly'][hour][key] += count
            
            # 分析周期性模式
            for cyclical_key, accesses in self.cyclical_patterns.items():
                temporal_patterns['cyclical'][cyclical_key] = dict(accesses)
            
            return temporal_patterns
            
        except Exception as e:
            logger.error(f"分析时间模式失败: {e}")
            return {}
    
    def get_pattern_predictions(self, current_sequence: List[str]) -> List[str]:
        """基于模式获取预测"""
        try:
            predictions = []
            
            # 检查当前序列是否匹配已知模式
            for pattern_len in range(self.config.min_pattern_length, 
                                   min(len(current_sequence), self.config.max_pattern_length) + 1):
                
                if pattern_len > len(current_sequence):
                    continue
                
                current_pattern = tuple(current_sequence[-pattern_len:])
                pattern_str = "->".join(current_pattern)
                
                if pattern_str in self.patterns:
                    # 根据历史数据预测下一个可能的访问
                    next_keys = self.patterns[pattern_str]
                    
                    # 计算每个候选的置信度
                    key_counts = defaultdict(int)
                    for key in next_keys:
                        key_counts[key] += 1
                    
                    total_count = len(next_keys)
                    for key, count in key_counts.items():
                        confidence = count / total_count
                        if confidence >= self.config.min_confidence_threshold:
                            predictions.append((key, confidence))
            
            # 按置信度排序
            predictions.sort(key=lambda x: x[1], reverse=True)
            return [key for key, _ in predictions[:5]]  # 返回前5个预测
            
        except Exception as e:
            logger.error(f"获取模式预测失败: {e}")
            return []

class PopularityAnalyzer:
    """热度分析器"""
    
    def __init__(self, config: PrefetchConfig):
        self.config = config
        self.popularity_scores: Dict[str, float] = defaultdict(float)
        self.access_counts: Dict[str, int] = defaultdict(int)
        self.last_update = datetime.now()
        
        logger.info("热度分析器初始化完成")
    
    def record_access(self, key: str):
        """记录访问"""
        try:
            self.access_counts[key] += 1
            self._update_popularity_scores()
            
        except Exception as e:
            logger.error(f"记录访问失败: {e}")
    
    def _update_popularity_scores(self):
        """更新热度分数"""
        try:
            current_time = datetime.now()
            time_diff = (current_time - self.last_update).total_seconds() / 3600  # 小时
            
            if time_diff >= 1:  # 每小时更新一次
                # 应用衰减因子
                decay_factor = self.config.popularity_decay_factor ** time_diff
                for key in self.popularity_scores:
                    self.popularity_scores[key] *= decay_factor
                
                self.last_update = current_time
            
            # 更新当前热度分数
            total_accesses = sum(self.access_counts.values())
            if total_accesses > 0:
                for key, count in self.access_counts.items():
                    normalized_score = count / total_accesses
                    self.popularity_scores[key] = max(
                        self.popularity_scores[key], 
                        normalized_score
                    )
            
        except Exception as e:
            logger.error(f"更新热度分数失败: {e}")
    
    def get_popular_keys(self, limit: int = 10) -> List[Tuple[str, float]]:
        """获取热门键"""
        try:
            # 过滤低于阈值的键
            filtered_keys = [
                (key, score) for key, score in self.popularity_scores.items()
                if score >= self.config.popularity_threshold
            ]
            
            # 按分数排序
            filtered_keys.sort(key=lambda x: x[1], reverse=True)
            return filtered_keys[:limit]
            
        except Exception as e:
            logger.error(f"获取热门键失败: {e}")
            return []

class SemanticAnalyzer:
    """语义分析器"""
    
    def __init__(self, config: PrefetchConfig):
        self.config = config
        self.key_relationships: Dict[str, Set[str]] = defaultdict(set)
        self.semantic_groups: Dict[str, Set[str]] = {}
        self.similarity_cache: Dict[Tuple[str, str], float] = {}
        
        logger.info("语义分析器初始化完成")
    
    def analyze_key_similarity(self, key1: str, key2: str) -> float:
        """分析键相似度"""
        try:
            # 检查缓存
            cache_key = tuple(sorted([key1, key2]))
            if cache_key in self.similarity_cache:
                return self.similarity_cache[cache_key]
            
            # 计算字符串相似度（简化实现）
            similarity = self._calculate_string_similarity(key1, key2)
            
            # 缓存结果
            self.similarity_cache[cache_key] = similarity
            return similarity
            
        except Exception as e:
            logger.error(f"分析键相似度失败: {e}")
            return 0.0
    
    def _calculate_string_similarity(self, s1: str, s2: str) -> float:
        """计算字符串相似度"""
        try:
            # 使用编辑距离计算相似度
            import difflib
            return difflib.SequenceMatcher(None, s1, s2).ratio()
            
        except Exception as e:
            logger.error(f"计算字符串相似度失败: {e}")
            return 0.0
    
    def build_semantic_groups(self, keys: List[str], similarity_threshold: float = 0.7):
        """构建语义组"""
        try:
            # 计算所有键之间的相似度
            similarities = {}
            for i, key1 in enumerate(keys):
                for j, key2 in enumerate(keys[i+1:], i+1):
                    similarity = self.analyze_key_similarity(key1, key2)
                    if similarity >= similarity_threshold:
                        similarities[(key1, key2)] = similarity
            
            # 使用并查集构建语义组
            groups = {}
            key_to_group = {}
            
            for key in keys:
                if key not in key_to_group:
                    group_id = len(groups)
                    groups[group_id] = {key}
                    key_to_group[key] = group_id
            
            # 合并相似的键
            for (key1, key2), similarity in similarities.items():
                group1 = key_to_group[key1]
                group2 = key_to_group[key2]
                
                if group1 != group2:
                    # 合并组
                    groups[group1].update(groups[group2])
                    for key in groups[group2]:
                        key_to_group[key] = group1
                    del groups[group2]
            
            # 更新语义组
            self.semantic_groups = {f"group_{i}": group for i, group in groups.items()}
            
            logger.info(f"构建了 {len(self.semantic_groups)} 个语义组")
            
        except Exception as e:
            logger.error(f"构建语义组失败: {e}")
    
    def get_related_keys(self, key: str, limit: int = 5) -> List[str]:
        """获取相关键"""
        try:
            related_keys = []
            
            # 查找包含该键的语义组
            for group_keys in self.semantic_groups.values():
                if key in group_keys:
                    related_keys.extend(group_keys - {key})
                    break
            
            # 如果没有找到语义组，使用关系映射
            if not related_keys:
                related_keys = list(self.key_relationships[key])
            
            return related_keys[:limit]
            
        except Exception as e:
            logger.error(f"获取相关键失败: {e}")
            return []

class MLPredictor:
    """机器学习预测器"""
    
    def __init__(self, config: PrefetchConfig):
        self.config = config
        self.access_history: deque = deque(maxlen=config.feature_window_size * 10)
        self.features: List[List[float]] = []
        self.labels: List[str] = []
        self.model = None
        self.last_training = datetime.now()
        self.executor = ThreadPoolExecutor(max_workers=2)
        
        logger.info("机器学习预测器初始化完成")
    
    def record_access(self, record: AccessRecord):
        """记录访问用于训练"""
        try:
            self.access_history.append(record)
            
            # 检查是否需要重新训练模型
            if self._should_retrain():
                self.executor.submit(self._train_model)
            
        except Exception as e:
            logger.error(f"记录访问失败: {e}")
    
    def _should_retrain(self) -> bool:
        """检查是否应该重新训练"""
        time_since_training = (datetime.now() - self.last_training).total_seconds()
        return (time_since_training >= self.config.model_training_interval and 
                len(self.access_history) >= self.config.feature_window_size)
    
    def _extract_features(self, history: List[AccessRecord]) -> List[float]:
        """提取特征"""
        try:
            if not history:
                return [0.0] * 10  # 返回默认特征向量
            
            features = []
            
            # 时间特征
            now = datetime.now()
            last_access = history[-1].timestamp
            time_since_last = (now - last_access).total_seconds() / 3600  # 小时
            features.append(time_since_last)
            
            # 访问频率特征
            hour_counts = defaultdict(int)
            for record in history:
                hour_counts[record.timestamp.hour] += 1
            
            features.append(len(hour_counts))  # 活跃小时数
            features.append(max(hour_counts.values()) if hour_counts else 0)  # 最大小时访问数
            
            # 键多样性特征
            unique_keys = set(record.key for record in history)
            features.append(len(unique_keys))  # 唯一键数量
            
            # 序列特征
            key_sequence = [record.key for record in history[-10:]]  # 最近10次访问
            sequence_hash = hash(tuple(key_sequence)) % 1000000  # 序列哈希
            features.append(sequence_hash)
            
            # 用户/会话特征
            unique_users = set(record.user_id for record in history if record.user_id)
            unique_sessions = set(record.session_id for record in history if record.session_id)
            features.append(len(unique_users))
            features.append(len(unique_sessions))
            
            # 上下文特征
            context_keys = set()
            for record in history:
                context_keys.update(record.context.keys())
            features.append(len(context_keys))
            
            # 时间模式特征
            weekday_counts = defaultdict(int)
            for record in history:
                weekday_counts[record.timestamp.weekday()] += 1
            features.append(len(weekday_counts))  # 活跃天数
            features.append(max(weekday_counts.values()) if weekday_counts else 0)  # 最大日访问数
            
            return features
            
        except Exception as e:
            logger.error(f"提取特征失败: {e}")
            return [0.0] * 10
    
    def _train_model(self):
        """训练模型"""
        try:
            logger.info("开始训练ML预测模型...")
            
            # 准备训练数据
            history_list = list(self.access_history)
            
            features = []
            labels = []
            
            # 创建训练样本
            for i in range(len(history_list) - self.config.prediction_horizon):
                # 使用前window_size个访问作为特征
                window_start = max(0, i - self.config.feature_window_size + 1)
                window_history = history_list[window_start:i + 1]
                
                feature_vector = self._extract_features(window_history)
                features.append(feature_vector)
                
                # 下一个访问键作为标签
                next_key = history_list[i + 1].key
                labels.append(next_key)
            
            if len(features) < 10:  # 数据太少，无法训练
                return
            
            # 简化的预测模型（使用频率统计）
            self.features = features
            self.labels = labels
            
            # 构建键频率映射
            key_frequencies = defaultdict(int)
            for label in labels:
                key_frequencies[label] += 1
            
            # 排序并保存最频繁的键
            sorted_keys = sorted(key_frequencies.items(), key=lambda x: x[1], reverse=True)
            self.model = {key: freq for key, freq in sorted_keys[:100]}  # 保存前100个最频繁的键
            
            self.last_training = datetime.now()
            
            logger.info(f"ML模型训练完成，训练样本数: {len(features)}")
            
        except Exception as e:
            logger.error(f"训练模型失败: {e}")
    
    def predict_next_keys(self, current_history: List[AccessRecord], limit: int = 5) -> List[Tuple[str, float]]:
        """预测下一个可能访问的键"""
        try:
            if not self.model:
                return []
            
            # 提取当前历史的特征
            current_features = self._extract_features(current_history)
            
            # 简化预测：返回最频繁的键（实际应该使用更复杂的ML算法）
            predictions = []
            total_freq = sum(self.model.values())
            
            for key, freq in list(self.model.items())[:limit]:
                confidence = freq / total_freq
                predictions.append((key, confidence))
            
            return predictions
            
        except Exception as e:
            logger.error(f"预测下一个键失败: {e}")
            return []

class IntelligentPrefetcher:
    """智能预取器"""
    
    def __init__(self, cache_manager: DistributedCacheManager, config: PrefetchConfig = None):
        """
        初始化智能预取器
        
        Args:
            cache_manager: 分布式缓存管理器
            config: 预取配置
        """
        self.cache_manager = cache_manager
        self.config = config or PrefetchConfig()
        
        # 分析器
        self.pattern_analyzer = PatternAnalyzer(self.config)
        self.popularity_analyzer = PopularityAnalyzer(self.config)
        self.semantic_analyzer = SemanticAnalyzer(self.config)
        self.ml_predictor = MLPredictor(self.config)
        
        # 预取管理
        self.prefetch_queue: asyncio.PriorityQueue = asyncio.PriorityQueue()
        self.active_prefetches: Set[str] = set()
        self.prefetch_semaphore = asyncio.Semaphore(self.config.max_concurrent_prefetches)
        
        # 访问记录
        self.access_history: deque = deque(maxlen=10000)
        self.session_histories: Dict[str, List[AccessRecord]] = defaultdict(list)
        
        # 后台任务
        self.prefetch_task: Optional[asyncio.Task] = None
        self.analysis_task: Optional[asyncio.Task] = None
        
        # 统计信息
        self.prefetch_stats = {
            'total_prefetches': 0,
            'successful_prefetches': 0,
            'cache_hits_from_prefetch': 0,
            'prefetch_accuracy': 0.0,
            'strategy_performance': defaultdict(int)
        }
        
        logger.info("智能预取器初始化完成")
    
    async def start(self):
        """启动预取器"""
        try:
            logger.info("启动智能预取器...")
            
            # 启动后台任务
            self.prefetch_task = asyncio.create_task(self._prefetch_worker())
            self.analysis_task = asyncio.create_task(self._analysis_worker())
            
            logger.info("智能预取器启动成功")
            
        except Exception as e:
            logger.error(f"启动智能预取器失败: {e}")
            raise
    
    async def stop(self):
        """停止预取器"""
        try:
            logger.info("正在停止智能预取器...")
            
            # 停止后台任务
            if self.prefetch_task:
                self.prefetch_task.cancel()
                try:
                    await self.prefetch_task
                except asyncio.CancelledError:
                    pass
            
            if self.analysis_task:
                self.analysis_task.cancel()
                try:
                    await self.analysis_task
                except asyncio.CancelledError:
                    pass
            
            logger.info("智能预取器已停止")
            
        except Exception as e:
            logger.error(f"停止智能预取器失败: {e}")
    
    async def record_access(self, key: str, user_id: str = None, session_id: str = None, 
                           context: Dict[str, Any] = None):
        """记录访问"""
        try:
            record = AccessRecord(
                key=key,
                timestamp=datetime.now(),
                user_id=user_id,
                session_id=session_id,
                context=context or {}
            )
            
            # 记录到历史
            self.access_history.append(record)
            
            # 按会话记录
            session_key = session_id or user_id or "global"
            self.session_histories[session_key].append(record)
            
            # 更新分析器
            self.pattern_analyzer.record_access(record)
            self.popularity_analyzer.record_access(key)
            self.ml_predictor.record_access(record)
            
            # 触发预测
            await self._generate_prefetch_candidates(session_key)
            
        except Exception as e:
            logger.error(f"记录访问失败: {e}")
    
    async def _generate_prefetch_candidates(self, session_key: str):
        """生成预取候选"""
        try:
            candidates = []
            session_history = self.session_histories[session_key]
            
            if len(session_history) < 2:
                return
            
            # 策略1: 序列模式预取
            if PrefetchStrategy.SEQUENTIAL in [PrefetchStrategy.PATTERN_BASED]:
                recent_keys = [r.key for r in session_history[-5:]]
                pattern_predictions = self.pattern_analyzer.get_pattern_predictions(recent_keys)
                
                for key in pattern_predictions:
                    candidates.append(PrefetchCandidate(
                        key=key,
                        confidence=0.8,
                        priority=5,
                        strategy=PrefetchStrategy.PATTERN_BASED,
                        estimated_access_time=datetime.now() + timedelta(minutes=2)
                    ))
            
            # 策略2: 热度预取
            popular_keys = self.popularity_analyzer.get_popular_keys(5)
            for key, score in popular_keys:
                if key not in [r.key for r in session_history[-3:]]:  # 避免重复预取最近访问的
                    candidates.append(PrefetchCandidate(
                        key=key,
                        confidence=score,
                        priority=3,
                        strategy=PrefetchStrategy.POPULARITY,
                        estimated_access_time=datetime.now() + timedelta(minutes=5)
                    ))
            
            # 策略3: 语义相关预取
            last_key = session_history[-1].key
            related_keys = self.semantic_analyzer.get_related_keys(last_key, 3)
            
            for key in related_keys:
                candidates.append(PrefetchCandidate(
                    key=key,
                    confidence=0.6,
                    priority=4,
                    strategy=PrefetchStrategy.SEMANTIC,
                    estimated_access_time=datetime.now() + timedelta(minutes=3)
                ))
            
            # 策略4: ML预测
            ml_predictions = self.ml_predictor.predict_next_keys(session_history, 3)
            for key, confidence in ml_predictions:
                candidates.append(PrefetchCandidate(
                    key=key,
                    confidence=confidence,
                    priority=6,
                    strategy=PrefetchStrategy.ML_PREDICTED,
                    estimated_access_time=datetime.now() + timedelta(minutes=1)
                ))
            
            # 过滤和排序候选
            filtered_candidates = self._filter_candidates(candidates)
            
            # 添加到预取队列
            for candidate in filtered_candidates:
                if candidate.key not in self.active_prefetches:
                    await self.prefetch_queue.put(candidate)
            
        except Exception as e:
            logger.error(f"生成预取候选失败: {e}")
    
    def _filter_candidates(self, candidates: List[PrefetchCandidate]) -> List[PrefetchCandidate]:
        """过滤候选"""
        try:
            # 按置信度过滤
            filtered = [c for c in candidates if c.confidence >= self.config.min_confidence_threshold]
            
            # 去重
            seen_keys = set()
            unique_candidates = []
            for candidate in filtered:
                if candidate.key not in seen_keys:
                    seen_keys.add(candidate.key)
                    unique_candidates.append(candidate)
            
            # 按优先级排序
            unique_candidates.sort(reverse=True)
            
            return unique_candidates[:20]  # 限制数量
            
        except Exception as e:
            logger.error(f"过滤候选失败: {e}")
            return []
    
    async def _prefetch_worker(self):
        """预取工作器"""
        while True:
            try:
                # 获取预取候选
                candidate = await self.prefetch_queue.get()
                
                # 检查是否已在预取中
                if candidate.key in self.active_prefetches:
                    continue
                
                # 执行预取
                await self._execute_prefetch(candidate)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"预取工作器异常: {e}")
                await asyncio.sleep(1)
    
    async def _execute_prefetch(self, candidate: PrefetchCandidate):
        """执行预取"""
        async with self.prefetch_semaphore:
            try:
                # 标记为正在预取
                self.active_prefetches.add(candidate.key)
                
                # 检查缓存中是否已存在
                cached_value = await self.cache_manager.get(candidate.key)
                if cached_value is not None:
                    # 已存在，跳过预取
                    return
                
                # 模拟数据加载（实际应该从数据源加载）
                data = await self._load_data(candidate.key)
                
                if data is not None:
                    # 缓存数据
                    ttl = self._calculate_ttl(candidate)
                    await self.cache_manager.put(candidate.key, data, ttl)
                    
                    # 更新统计
                    self.prefetch_stats['successful_prefetches'] += 1
                    self.prefetch_stats['strategy_performance'][candidate.strategy.value] += 1
                    
                    logger.debug(f"预取成功: {candidate.key} (策略: {candidate.strategy.value})")
                
                self.prefetch_stats['total_prefetches'] += 1
                
            except Exception as e:
                logger.error(f"执行预取失败 {candidate.key}: {e}")
            finally:
                # 清理标记
                self.active_prefetches.discard(candidate.key)
    
    async def _load_data(self, key: str) -> Optional[Any]:
        """加载数据（模拟）"""
        try:
            # 模拟数据加载延迟
            await asyncio.sleep(0.1)
            
            # 根据键生成模拟数据
            if "market" in key:
                return {
                    "id": key,
                    "title": f"Market {key}",
                    "price": 0.5,
                    "volume": 1000,
                    "timestamp": datetime.now().isoformat()
                }
            elif "user" in key:
                return {
                    "id": key,
                    "name": f"User {key}",
                    "balance": 1000,
                    "timestamp": datetime.now().isoformat()
                }
            else:
                return {
                    "id": key,
                    "data": f"Data for {key}",
                    "timestamp": datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"加载数据失败 {key}: {e}")
            return None
    
    def _calculate_ttl(self, candidate: PrefetchCandidate) -> int:
        """计算TTL"""
        try:
            # 基础TTL
            base_ttl = 3600  # 1小时
            
            # 根据策略调整
            if candidate.strategy == PrefetchStrategy.POPULARITY:
                base_ttl *= 2  # 热门数据缓存更久
            elif candidate.strategy == PrefetchStrategy.TEMPORAL:
                base_ttl *= 1.5  # 时间相关数据适中
            elif candidate.strategy == PrefetchStrategy.ML_PREDICTED:
                base_ttl = int(base_ttl * candidate.confidence)  # 根据置信度调整
            
            # 根据置信度调整
            ttl = int(base_ttl * candidate.confidence)
            
            return max(300, min(ttl, 7200))  # 限制在5分钟到2小时之间
            
        except Exception as e:
            logger.error(f"计算TTL失败: {e}")
            return 3600
    
    async def _analysis_worker(self):
        """分析工作器"""
        while True:
            try:
                # 每5分钟执行一次分析
                await asyncio.sleep(300)
                
                # 分析访问模式
                await self._analyze_patterns()
                
                # 更新语义组
                await self._update_semantic_groups()
                
                # 计算预取准确率
                self._calculate_accuracy()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"分析工作器异常: {e}")
                await asyncio.sleep(60)
    
    async def _analyze_patterns(self):
        """分析访问模式"""
        try:
            # 分析序列模式
            patterns = self.pattern_analyzer.analyze_sequential_patterns()
            self.pattern_analyzer.patterns = patterns
            
            # 分析时间模式
            temporal_patterns = self.pattern_analyzer.analyze_temporal_patterns()
            
            logger.debug(f"发现 {len(patterns)} 个序列模式")
            
        except Exception as e:
            logger.error(f"分析访问模式失败: {e}")
    
    async def _update_semantic_groups(self):
        """更新语义组"""
        try:
            # 获取所有访问过的键
            all_keys = set()
            for record in self.access_history:
                all_keys.add(record.key)
            
            if len(all_keys) >= 10:  # 至少10个键才进行语义分析
                self.semantic_analyzer.build_semantic_groups(list(all_keys))
                
        except Exception as e:
            logger.error(f"更新语义组失败: {e}")
    
    def _calculate_accuracy(self):
        """计算预取准确率"""
        try:
            total_prefetches = self.prefetch_stats['total_prefetches']
            successful_prefetches = self.prefetch_stats['successful_prefetches']
            
            if total_prefetches > 0:
                accuracy = successful_prefetches / total_prefetches
                self.prefetch_stats['prefetch_accuracy'] = accuracy
                
                logger.info(f"预取准确率: {accuracy:.2%} ({successful_prefetches}/{total_prefetches})")
            
        except Exception as e:
            logger.error(f"计算预取准确率失败: {e}")
    
    # 公共API方法
    def get_prefetch_stats(self) -> Dict[str, Any]:
        """获取预取统计"""
        try:
            return {
                'stats': dict(self.prefetch_stats),
                'config': self.config.to_dict(),
                'queue_size': self.prefetch_queue.qsize(),
                'active_prefetches': len(self.active_prefetches),
                'access_history_size': len(self.access_history),
                'session_count': len(self.session_histories),
                'pattern_count': len(self.pattern_analyzer.patterns),
                'semantic_groups': len(self.semantic_analyzer.semantic_groups),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"获取预取统计失败: {e}")
            return {}
    
    def get_predictions(self, session_key: str = "global", limit: int = 10) -> List[Dict]:
        """获取预测结果"""
        try:
            predictions = []
            session_history = self.session_histories.get(session_key, [])
            
            if not session_history:
                return predictions
            
            # 获取各种策略的预测
            recent_keys = [r.key for r in session_history[-5:]]
            
            # 模式预测
            pattern_predictions = self.pattern_analyzer.get_pattern_predictions(recent_keys)
            for key in pattern_predictions:
                predictions.append({
                    'key': key,
                    'strategy': PrefetchStrategy.PATTERN_BASED.value,
                    'confidence': 0.8
                })
            
            # 热度预测
            popular_keys = self.popularity_analyzer.get_popular_keys(5)
            for key, score in popular_keys:
                predictions.append({
                    'key': key,
                    'strategy': PrefetchStrategy.POPULARITY.value,
                    'confidence': score
                })
            
            # ML预测
            ml_predictions = self.ml_predictor.predict_next_keys(session_history, 5)
            for key, confidence in ml_predictions:
                predictions.append({
                    'key': key,
                    'strategy': PrefetchStrategy.ML_PREDICTED.value,
                    'confidence': confidence
                })
            
            # 去重并排序
            seen_keys = set()
            unique_predictions = []
            for pred in predictions:
                if pred['key'] not in seen_keys:
                    seen_keys.add(pred['key'])
                    unique_predictions.append(pred)
            
            # 按置信度排序
            unique_predictions.sort(key=lambda x: x['confidence'], reverse=True)
            
            return unique_predictions[:limit]
            
        except Exception as e:
            logger.error(f"获取预测结果失败: {e}")
            return []

# 便捷工厂函数
async def create_intelligent_prefetcher(cache_manager: DistributedCacheManager, 
                                      config: PrefetchConfig = None) -> IntelligentPrefetcher:
    """创建智能预取器"""
    prefetcher = IntelligentPrefetcher(cache_manager, config)
    await prefetcher.start()
    return prefetcher