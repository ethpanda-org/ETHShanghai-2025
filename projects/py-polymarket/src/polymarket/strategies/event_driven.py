import logging
import re
import string
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import aiohttp
import asyncio
import json
import numpy as np


logger = logging.getLogger(__name__)

class EventType(Enum):
    """事件类型枚举"""
    NEWS = "news"
    SOCIAL_MEDIA = "social_media"  
    ECONOMIC = "economic"
    POLITICAL = "political"
    EARNINGS = "earnings"
    REGULATORY = "regulatory"
    INSIDER = "insider"
    MARKET_DATA = "market_data"

class EventImpact(Enum):
    """事件影响程度"""
    NEGLIGIBLE = "negligible"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class MarketEvent:
    """市场事件数据结构"""
    event_id: str
    event_type: EventType
    title: str
    content: str
    source: str
    timestamp: datetime
    relevance_score: float  # 0-1, 与市场的相关性
    sentiment_score: float  # -1到1, 负面到正面
    credibility_score: float  # 0-1, 消息可信度
    impact_level: EventImpact
    keywords: List[str]
    market_ids: List[str]  # 相关的市场ID
    confidence: float  # 0-1, 整体置信度

@dataclass  
class EventSignal:
    """事件生成的交易信号"""
    market_id: str
    signal_strength: float  # -1到1
    signal_type: str  # "buy", "sell", "hold"
    confidence: float
    event_ids: List[str]  # 触发信号的事件ID
    reasoning: str
    expected_duration: timedelta  # 信号预期持续时间
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None

class EventDrivenStrategy:
    """
    事件驱动交易策略
    
    核心功能：
    1. 实时监控新闻、社交媒体、经济数据等事件源
    2. 评估事件对特定预测市场的影响
    3. 生成相应的交易信号
    4. 动态调整仓位和风险参数
    """
    
    def __init__(self, 
                 news_sources: List[str] = None,
                 social_sources: List[str] = None,
                 update_interval: int = 300,  # 5分钟更新一次
                 sentiment_threshold: float = 0.3,
                 relevance_threshold: float = 0.5):
        """
        初始化事件驱动策略
        
        Args:
            news_sources: 新闻源列表
            social_sources: 社交媒体源列表  
            update_interval: 更新间隔(秒)
            sentiment_threshold: 情绪阈值
            relevance_threshold: 相关性阈值
        """
        self.news_sources = news_sources or ['reuters', 'bloomberg', 'ap', 'bbc']
        self.social_sources = social_sources or ['twitter', 'reddit'] 
        self.update_interval = update_interval
        self.sentiment_threshold = sentiment_threshold
        self.relevance_threshold = relevance_threshold
        
        # 事件处理器
        self.event_processors = {
            EventType.NEWS: self._process_news_event,
            EventType.SOCIAL_MEDIA: self._process_social_event,
            EventType.ECONOMIC: self._process_economic_event,
            EventType.POLITICAL: self._process_political_event,
            EventType.REGULATORY: self._process_regulatory_event
        }
        
        # 事件存储
        self.recent_events: List[MarketEvent] = []
        self.event_cache: Dict[str, MarketEvent] = {}
        self.signal_history: List[EventSignal] = []
        
        # 市场关键词映射
        self.market_keywords = {}
        self.sentiment_analyzer = None
        
        # 初始化组件
        self._initialize_components()
    
    def _initialize_components(self):
        """初始化各个组件"""
        try:
            # 初始化情感分析器 (简化版本)
            self.sentiment_analyzer = SimpleSentimentAnalyzer()
            
            # 预设市场关键词
            self._setup_market_keywords()
            
            logger.info("事件驱动策略组件初始化完成")
            
        except Exception as e:
            logger.error(f"组件初始化失败: {e}")
            raise
    
    def _setup_market_keywords(self):
        """设置市场关键词映射"""
        # 这里应该从配置文件或数据库加载
        # 示例关键词映射
        self.market_keywords = {
            "election": ["election", "vote", "poll", "candidate", "campaign", "democrat", "republican"],
            "economy": ["gdp", "inflation", "fed", "interest rate", "unemployment", "recession"],
            "crypto": ["bitcoin", "ethereum", "crypto", "blockchain", "defi"],
            "tech": ["apple", "google", "microsoft", "tesla", "ai", "artificial intelligence"],
            "sports": ["nfl", "nba", "world cup", "olympics", "championship"],
            "weather": ["hurricane", "flood", "drought", "climate", "temperature"]
        }
    
    async def run_event_monitoring(self):
        """运行事件监控主循环"""
        logger.info("开始事件监控...")
        
        while True:
            try:
                # 1. 收集新事件
                new_events = await self._collect_events()
                
                # 2. 处理事件
                processed_events = []
                for event in new_events:
                    processed_event = await self._process_event(event)
                    if processed_event:
                        processed_events.append(processed_event)
                
                # 3. 更新事件存储
                self._update_event_storage(processed_events)
                
                # 4. 生成交易信号
                signals = await self._generate_signals_from_events(processed_events)
                
                # 5. 记录和返回信号
                self.signal_history.extend(signals)
                
                if signals:
                    logger.info(f"生成 {len(signals)} 个交易信号")
                    for signal in signals:
                        logger.info(f"信号: {signal.market_id} | {signal.signal_type} | 强度: {signal.signal_strength:.2f}")
                
                # 6. 等待下次更新
                await asyncio.sleep(self.update_interval)
                
            except Exception as e:
                logger.error(f"事件监控异常: {e}")
                await asyncio.sleep(60)  # 出错后等待1分钟
    
    async def _collect_events(self) -> List[Dict]:
        """收集各类事件数据"""
        all_events = []
        
        # 并行收集不同源的数据
        tasks = [
            self._collect_news_events(),
            self._collect_social_events(),
            self._collect_economic_events()
        ]
        
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in results:
                if isinstance(result, list):
                    all_events.extend(result)
                elif isinstance(result, Exception):
                    logger.warning(f"事件收集异常: {result}")
                    
        except Exception as e:
            logger.error(f"事件收集失败: {e}")
        
        return all_events
    
    async def _collect_news_events(self) -> List[Dict]:
        """收集新闻事件"""
        # 这里应该接入真实的新闻API
        # 示例实现
        news_events = []
        
        try:
            # 模拟新闻API调用
            sample_news = [
                {
                    "title": "Federal Reserve Announces Interest Rate Decision",
                    "content": "The Federal Reserve announced a 0.25% interest rate increase...",
                    "source": "reuters",
                    "timestamp": datetime.now(),
                    "category": "economic"
                },
                {
                    "title": "Presidential Candidate Leads in Latest Poll",
                    "content": "Latest polling data shows candidate leading by 5 points...",
                    "source": "ap",
                    "timestamp": datetime.now(),
                    "category": "political"
                }
            ]
            
            news_events.extend(sample_news)
            
        except Exception as e:
            logger.error(f"新闻收集异常: {e}")
        
        return news_events
    
    async def _collect_social_events(self) -> List[Dict]:
        """收集社交媒体事件"""
        social_events = []
        
        try:
            # 这里应该接入Twitter API、Reddit API等
            # 示例实现
            sample_social = [
                {
                    "title": "Trending: #Election2024",
                    "content": "Massive discussion about upcoming election results",
                    "source": "twitter",
                    "timestamp": datetime.now(),
                    "category": "political",
                    "engagement": 15000
                }
            ]
            
            social_events.extend(sample_social)
            
        except Exception as e:
            logger.error(f"社交媒体收集异常: {e}")
        
        return social_events
    
    async def _collect_economic_events(self) -> List[Dict]:
        """收集经济数据事件"""
        economic_events = []
        
        try:
            # 这里应该接入经济数据API (如Fed API, 统计局API等)
            sample_economic = [
                {
                    "title": "GDP Growth Rate Q3 2024",
                    "content": "GDP growth rate for Q3 2024 announced at 2.1%",
                    "source": "bureau_of_statistics", 
                    "timestamp": datetime.now(),
                    "category": "economic",
                    "value": 2.1
                }
            ]
            
            economic_events.extend(sample_economic)
            
        except Exception as e:
            logger.error(f"经济数据收集异常: {e}")
            
        return economic_events
    
    async def _process_event(self, raw_event: Dict) -> Optional[MarketEvent]:
        """处理单个原始事件"""
        try:
            # 1. 基础信息提取
            event_type = self._classify_event_type(raw_event)
            
            # 2. 情感分析
            sentiment_score = self.sentiment_analyzer.analyze(raw_event.get('content', ''))
            
            # 3. 相关性分析
            relevance_score, relevant_markets = self._analyze_relevance(raw_event)
            
            # 4. 可信度评估
            credibility_score = self._assess_credibility(raw_event)
            
            # 5. 影响程度评估
            impact_level = self._assess_impact_level(raw_event, sentiment_score, relevance_score)
            
            # 6. 关键词提取
            keywords = self._extract_keywords(raw_event.get('content', ''))
            
            # 7. 综合置信度
            confidence = self._calculate_confidence(relevance_score, credibility_score, impact_level)
            
            # 过滤低质量事件
            if confidence < 0.3 or relevance_score < self.relevance_threshold:
                return None
            
            # 创建事件对象
            event = MarketEvent(
                event_id=f"{raw_event.get('source', 'unknown')}_{int(datetime.now().timestamp())}",
                event_type=event_type,
                title=raw_event.get('title', ''),
                content=raw_event.get('content', ''),
                source=raw_event.get('source', 'unknown'),
                timestamp=raw_event.get('timestamp', datetime.now()),
                relevance_score=relevance_score,
                sentiment_score=sentiment_score,
                credibility_score=credibility_score,
                impact_level=impact_level,
                keywords=keywords,
                market_ids=relevant_markets,
                confidence=confidence
            )
            
            return event
            
        except Exception as e:
            logger.error(f"事件处理异常: {e}")
            return None
    
    def _classify_event_type(self, raw_event: Dict) -> EventType:
        """分类事件类型"""
        source = raw_event.get('source', '').lower()
        category = raw_event.get('category', '').lower()
        content = raw_event.get('content', '').lower()
        
        # 基于来源分类
        if source in ['twitter', 'reddit', 'facebook']:
            return EventType.SOCIAL_MEDIA
        elif source in ['fed', 'bureau_of_statistics', 'treasury']:
            return EventType.ECONOMIC
        
        # 基于分类分类
        if category in ['economic', 'finance']:
            return EventType.ECONOMIC
        elif category in ['political', 'election']:
            return EventType.POLITICAL
        
        # 基于内容分类
        if any(word in content for word in ['regulation', 'sec', 'cftc', 'law']):
            return EventType.REGULATORY
        elif any(word in content for word in ['earnings', 'quarterly', 'revenue']):
            return EventType.EARNINGS
        
        # 默认为新闻
        return EventType.NEWS
    
    def _analyze_relevance(self, raw_event: Dict) -> Tuple[float, List[str]]:
        """分析事件相关性"""
        content = raw_event.get('content', '').lower()
        title = raw_event.get('title', '').lower()
        text = f"{title} {content}"
        
        relevant_markets = []
        relevance_scores = []
        
        # 检查每个市场类别的关键词
        for market_category, keywords in self.market_keywords.items():
            keyword_matches = sum(1 for keyword in keywords if keyword.lower() in text)
            if keyword_matches > 0:
                relevance_score = min(1.0, keyword_matches / len(keywords))
                relevant_markets.append(market_category)
                relevance_scores.append(relevance_score)
        
        # 计算最高相关性分数
        max_relevance = max(relevance_scores) if relevance_scores else 0.0
        
        return max_relevance, relevant_markets
    
    def _assess_credibility(self, raw_event: Dict) -> float:
        """评估消息可信度"""
        source = raw_event.get('source', '').lower()
        
        # 来源可信度权重
        source_credibility = {
            'reuters': 0.9,
            'bloomberg': 0.9, 
            'ap': 0.85,
            'bbc': 0.8,
            'cnn': 0.7,
            'fed': 0.95,
            'bureau_of_statistics': 0.95,
            'twitter': 0.3,
            'reddit': 0.2,
            'unknown': 0.1
        }
        
        base_credibility = source_credibility.get(source, 0.1)
        
        # 基于内容特征调整
        content = raw_event.get('content', '')
        
        # 有数据支撑的消息可信度更高
        if re.search(r'\d+\.?\d*%|\$\d+|\d+\s*(million|billion|trillion)', content):
            base_credibility *= 1.2
        
        # 包含具体时间和地点的消息可信度更高
        if re.search(r'\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}|yesterday|today|tomorrow', content):
            base_credibility *= 1.1
            
        return min(1.0, base_credibility)
    
    def _assess_impact_level(self, raw_event: Dict, sentiment_score: float, relevance_score: float) -> EventImpact:
        """评估影响程度"""
        # 综合考虑情感强度和相关性
        impact_score = abs(sentiment_score) * relevance_score
        
        # 特定事件类型的影响权重
        content = raw_event.get('content', '').lower()
        title = raw_event.get('title', '').lower()
        text = f"{title} {content}"
        
        # 高影响关键词
        if any(word in text for word in ['breaking', 'urgent', 'emergency', 'crisis']):
            impact_score *= 1.5
        
        # 央行、选举等关键事件
        if any(word in text for word in ['federal reserve', 'fed', 'election', 'vote']):
            impact_score *= 1.3
        
        # 根据分数分级
        if impact_score >= 0.8:
            return EventImpact.CRITICAL
        elif impact_score >= 0.6:
            return EventImpact.HIGH  
        elif impact_score >= 0.4:
            return EventImpact.MEDIUM
        elif impact_score >= 0.2:
            return EventImpact.LOW
        else:
            return EventImpact.NEGLIGIBLE
    
    def _extract_keywords(self, content: str) -> List[str]:
        """提取关键词"""
        # 简单的关键词提取 (实际应用中可使用NLP库)
        import string
        
        # 清理文本
        content = content.lower()
        content = content.translate(str.maketrans('', '', string.punctuation))
        
        # 分词
        words = content.split()
        
        # 过滤停用词
        stop_words = {'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that', 'these', 'those'}
        
        keywords = [word for word in words if len(word) > 3 and word not in stop_words]
        
        # 返回前10个最频繁的词
        from collections import Counter
        return [word for word, count in Counter(keywords).most_common(10)]
    
    def _calculate_confidence(self, relevance_score: float, credibility_score: float, impact_level: EventImpact) -> float:
        """计算综合置信度"""
        # 影响程度权重
        impact_weights = {
            EventImpact.NEGLIGIBLE: 0.1,
            EventImpact.LOW: 0.3,
            EventImpact.MEDIUM: 0.5,
            EventImpact.HIGH: 0.8,
            EventImpact.CRITICAL: 1.0
        }
        
        impact_weight = impact_weights.get(impact_level, 0.1)
        
        # 加权平均
        confidence = (relevance_score * 0.4 + credibility_score * 0.4 + impact_weight * 0.2)
        
        return min(1.0, confidence)
    
    def _update_event_storage(self, new_events: List[MarketEvent]):
        """更新事件存储"""
        # 添加新事件
        self.recent_events.extend(new_events)
        
        # 更新缓存
        for event in new_events:
            self.event_cache[event.event_id] = event
        
        # 清理过期事件 (保留24小时内的事件)
        cutoff_time = datetime.now() - timedelta(hours=24)
        self.recent_events = [e for e in self.recent_events if e.timestamp > cutoff_time]
        
        # 保持存储大小限制
        if len(self.recent_events) > 1000:
            self.recent_events = self.recent_events[-1000:]
        
        logger.info(f"事件存储更新: 新增 {len(new_events)} 个事件，当前总数 {len(self.recent_events)}")
    
    async def _generate_signals_from_events(self, events: List[MarketEvent]) -> List[EventSignal]:
        """从事件生成交易信号"""
        signals = []
        
        # 按市场分组事件
        market_events = defaultdict(list)
        for event in events:
            for market_id in event.market_ids:
                market_events[market_id].append(event)
        
        # 为每个市场生成信号
        for market_id, market_event_list in market_events.items():
            signal = await self._generate_market_signal(market_id, market_event_list)
            if signal:
                signals.append(signal)
        
        return signals
    
    async def _generate_market_signal(self, market_id: str, events: List[MarketEvent]) -> Optional[EventSignal]:
        """为特定市场生成信号"""
        if not events:
            return None
        
        try:
            # 1. 计算综合情感分数
            weighted_sentiment = 0
            total_weight = 0
            
            for event in events:
                weight = event.confidence * event.relevance_score
                weighted_sentiment += event.sentiment_score * weight
                total_weight += weight
            
            if total_weight == 0:
                return None
                
            avg_sentiment = weighted_sentiment / total_weight
            
            # 2. 计算信号强度
            signal_strength = self._calculate_signal_strength(events, avg_sentiment)
            
            # 3. 确定信号类型
            if signal_strength > self.sentiment_threshold:
                signal_type = "buy"
            elif signal_strength < -self.sentiment_threshold:
                signal_type = "sell" 
            else:
                signal_type = "hold"
            
            # 4. 计算置信度
            confidence = self._calculate_signal_confidence(events)
            
            # 5. 预期持续时间
            expected_duration = self._estimate_signal_duration(events)
            
            # 6. 风险参数
            stop_loss, take_profit = self._calculate_risk_parameters(signal_strength, avg_sentiment)
            
            # 7. 生成推理说明
            reasoning = self._generate_signal_reasoning(events, avg_sentiment, signal_strength)
            
            return EventSignal(
                market_id=market_id,
                signal_strength=signal_strength,
                signal_type=signal_type,
                confidence=confidence,
                event_ids=[e.event_id for e in events],
                reasoning=reasoning,
                expected_duration=expected_duration,
                stop_loss=stop_loss,
                take_profit=take_profit
            )
            
        except Exception as e:
            logger.error(f"信号生成异常 {market_id}: {e}")
            return None
    
    def _calculate_signal_strength(self, events: List[MarketEvent], avg_sentiment: float) -> float:
        """计算信号强度"""
        # 基础强度来自情感分数
        base_strength = avg_sentiment
        
        # 事件数量和质量加权
        event_weight = 0
        for event in events:
            # 高影响力事件权重更大
            impact_multiplier = {
                EventImpact.NEGLIGIBLE: 0.1,
                EventImpact.LOW: 0.3,
                EventImpact.MEDIUM: 0.6,
                EventImpact.HIGH: 0.9,
                EventImpact.CRITICAL: 1.5
            }.get(event.impact_level, 0.1)
            
            event_weight += event.confidence * event.relevance_score * impact_multiplier
        
        # 标准化事件权重
        normalized_event_weight = min(1.0, event_weight / len(events))
        
        # 计算最终信号强度
        signal_strength = base_strength * normalized_event_weight
        
        # 限制在-1到1之间
        return max(-1.0, min(1.0, signal_strength))
    
    def _calculate_signal_confidence(self, events: List[MarketEvent]) -> float:
        """计算信号置信度"""
        if not events:
            return 0.0
        
        # 平均置信度
        avg_confidence = sum(e.confidence for e in events) / len(events)
        
        # 可信度调整
        avg_credibility = sum(e.credibility_score for e in events) / len(events)
        
        # 事件一致性 (情感方向是否一致)
        sentiments = [e.sentiment_score for e in events]
        positive_count = sum(1 for s in sentiments if s > 0.1)
        negative_count = sum(1 for s in sentiments if s < -0.1)
        total_count = len(sentiments)
        
        consistency = max(positive_count, negative_count) / total_count if total_count > 0 else 0
        
        # 综合置信度
        signal_confidence = (avg_confidence * 0.4 + avg_credibility * 0.3 + consistency * 0.3)
        
        return min(1.0, signal_confidence)
    
    def _estimate_signal_duration(self, events: List[MarketEvent]) -> timedelta:
        """估计信号持续时间"""
        # 基于事件类型和影响程度估计
        max_duration = timedelta(hours=1)  # 默认1小时
        
        for event in events:
            if event.impact_level == EventImpact.CRITICAL:
                max_duration = max(max_duration, timedelta(days=1))
            elif event.impact_level == EventImpact.HIGH:
                max_duration = max(max_duration, timedelta(hours=12))
            elif event.impact_level == EventImpact.MEDIUM:
                max_duration = max(max_duration, timedelta(hours=4))
        
        return max_duration
    
    def _calculate_risk_parameters(self, signal_strength: float, sentiment: float) -> Tuple[Optional[float], Optional[float]]:
        """计算风险参数"""
        # 止损位: 基于信号强度的反向移动
        stop_loss_pct = 0.05 + (1 - abs(signal_strength)) * 0.1  # 5-15%
        
        # 止盈位: 基于预期收益  
        take_profit_pct = abs(signal_strength) * 0.3  # 最多30%
        
        return stop_loss_pct, take_profit_pct
    
    def _generate_signal_reasoning(self, events: List[MarketEvent], sentiment: float, strength: float) -> str:
        """生成信号推理说明"""
        reasoning_parts = []
        
        # 基础情感分析
        if sentiment > 0.3:
            reasoning_parts.append(f"正面情绪 ({sentiment:.2f})")
        elif sentiment < -0.3:
            reasoning_parts.append(f"负面情绪 ({sentiment:.2f})")
        else:
            reasoning_parts.append(f"中性情绪 ({sentiment:.2f})")
        
        # 关键事件摘要
        critical_events = [e for e in events if e.impact_level in [EventImpact.HIGH, EventImpact.CRITICAL]]
        if critical_events:
            reasoning_parts.append(f"{len(critical_events)}个高影响事件")
        
        # 事件来源
        sources = list(set(e.source for e in events))
        reasoning_parts.append(f"来源: {', '.join(sources[:3])}")
        
        # 信号强度说明
        if abs(strength) > 0.7:
            reasoning_parts.append("强烈信号")
        elif abs(strength) > 0.3:
            reasoning_parts.append("中等信号") 
        else:
            reasoning_parts.append("弱信号")
        
        return " | ".join(reasoning_parts)
    
    def get_recent_signals(self, hours: int = 1) -> List[EventSignal]:
        """获取最近的信号"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        return [s for s in self.signal_history if s.event_ids and 
                any(self.event_cache.get(eid, {}).timestamp > cutoff_time for eid in s.event_ids)]
    
    def get_market_events(self, market_id: str, hours: int = 24) -> List[MarketEvent]:
        """获取特定市场的事件"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        return [e for e in self.recent_events 
                if market_id in e.market_ids and e.timestamp > cutoff_time]


class SimpleSentimentAnalyzer:
    """简单情感分析器"""
    
    def __init__(self):
        # 正面词汇
        self.positive_words = {
            'good', 'great', 'excellent', 'positive', 'increase', 'gain', 'profit', 
            'success', 'win', 'victory', 'growth', 'improve', 'better', 'strong',
            'bullish', 'optimistic', 'confident', 'surge', 'rally', 'boom'
        }
        
        # 负面词汇
        self.negative_words = {
            'bad', 'terrible', 'negative', 'decrease', 'loss', 'fail', 'failure',
            'decline', 'drop', 'fall', 'crash', 'crisis', 'problem', 'issue',
            'bearish', 'pessimistic', 'concern', 'worry', 'doubt', 'recession'
        }
        
        # 强化词汇
        self.intensifiers = {
            'very': 1.3, 'extremely': 1.5, 'highly': 1.3, 'significantly': 1.4,
            'greatly': 1.3, 'massive': 1.5, 'huge': 1.4, 'tremendous': 1.5
        }
    
    def analyze(self, text: str) -> float:
        """分析文本情感，返回-1到1之间的分数"""
        if not text:
            return 0.0
        
        words = text.lower().split()
        
        positive_score = 0
        negative_score = 0
        intensifier = 1.0
        
        for i, word in enumerate(words):
            # 检查强化词
            if word in self.intensifiers:
                intensifier = self.intensifiers[word]
                continue
            
            # 检查情感词
            if word in self.positive_words:
                positive_score += 1 * intensifier
            elif word in self.negative_words:
                negative_score += 1 * intensifier
            
            # 重置强化因子
            intensifier = 1.0
        
        # 计算净情感分数
        total_sentiment_words = positive_score + negative_score
        if total_sentiment_words == 0:
            return 0.0
        
        # 标准化到-1到1
        net_sentiment = (positive_score - negative_score) / total_sentiment_words
        
        return max(-1.0, min(1.0, net_sentiment))