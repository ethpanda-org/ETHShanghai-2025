#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
方法6: BERT语义提取器
使用BERT等Transformer模型进行语义理解和实体识别

特点:
- 基于深度学习的上下文理解
- 使用预训练的Transformer模型
- 可以理解复杂的语义关系
- 需要安装: pip install transformers torch
"""

import re
from typing import List, Tuple, Dict, Set
from collections import defaultdict, Counter
from utils import load_tweets, save_results, parse_timestamp

# 尝试导入transformers
try:
    from transformers import pipeline, AutoTokenizer, AutoModelForTokenClassification
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("警告: transformers未安装，将使用基础提取功能")


class BERTExtractor:
    """基于BERT的代币提取器"""
    
    def __init__(self, use_gpu=False):
        """
        初始化
        
        Args:
            use_gpu: 是否使用GPU加速
        """
        self.ner_pipeline = None
        self.use_gpu = use_gpu
        
        if TRANSFORMERS_AVAILABLE:
            try:
                # 使用预训练的NER模型
                device = 0 if use_gpu and torch.cuda.is_available() else -1
                self.ner_pipeline = pipeline(
                    "ner",
                    model="dslim/bert-base-NER",
                    aggregation_strategy="simple",
                    device=device
                )
                print(f"成功加载BERT NER模型 (device: {'GPU' if device >= 0 else 'CPU'})")
            except Exception as e:
                print(f"警告: 无法加载BERT模型: {e}")
                print("将使用基础提取功能")
        
        # 模式匹配作为补充
        self.token_pattern = re.compile(r'\$([A-Z][A-Z0-9]{1,10})\b')
        
        # 加密货币相关关键词（用于上下文评分）
        self.crypto_context_words = {
            'crypto', 'token', 'coin', 'blockchain', 'defi', 'nft', 'meme',
            'launch', 'pump', 'moon', 'buy', 'sell', 'trade', 'dex', 'swap',
            'contract', 'address', 'wallet', 'hodl', 'bull', 'bear', 'ath',
        }
    
    def extract_entities_with_bert(self, text: str) -> List[Dict]:
        """
        使用BERT提取命名实体
        
        Args:
            text: 输入文本
            
        Returns:
            实体列表
        """
        if not self.ner_pipeline:
            return []
        
        try:
            # 限制文本长度以避免内存问题
            max_length = 512
            if len(text) > max_length:
                text = text[:max_length]
            
            entities = self.ner_pipeline(text)
            return entities
        except Exception as e:
            print(f"BERT处理错误: {e}")
            return []
    
    def calculate_context_score(self, text: str) -> float:
        """
        计算文本的加密货币上下文相关度
        
        Args:
            text: 文本
            
        Returns:
            上下文分数 (0-1)
        """
        text_lower = text.lower()
        word_count = len(text_lower.split())
        
        if word_count == 0:
            return 0.0
        
        # 统计加密货币关键词出现次数
        crypto_word_count = sum(1 for word in self.crypto_context_words 
                                if word in text_lower)
        
        # 统计 $ 符号出现次数（强指示符）
        dollar_sign_count = text.count('$')
        
        # 综合计算：$ 符号权重更高（每个 $ 相当于 2 个关键词）
        total_crypto_indicators = crypto_word_count + (dollar_sign_count * 2)
        
        # 计算密度比例（指示符数量 / 总词数）
        if word_count == 0:
            density = 0.0
        else:
            density = total_crypto_indicators / word_count
        
        # 使用更平滑的归一化：sigmoid-like 函数
        # 当密度达到 0.5（即每2个词有1个指示符）时接近 1.0
        score = min(density * 2, 1.0)
        
        return score
    
    def extract_with_patterns(self, text: str) -> Set[str]:
        """
        使用正则模式提取（作为BERT补充）
        
        Args:
            text: 输入文本
            
        Returns:
            代币集合
        """
        tokens = set()
        
        # $符号标记
        dollar_tokens = self.token_pattern.findall(text)
        tokens.update([t.upper() for t in dollar_tokens])
        
        # 大写词汇（2-10个字符）
        upper_tokens = re.findall(r'\b([A-Z]{2,10})\b', text)
        tokens.update(upper_tokens)
        
        return tokens
    
    def extract_from_tweets(self, tweets: List[dict], top_n=100, use_bert=True) -> List[Tuple[str, str]]:
        """
        从推文列表中提取代币信息
        
        Args:
            tweets: 推文列表
            top_n: 提取前N个实体
            use_bert: 是否使用BERT（如果False则仅使用模式匹配）
            
        Returns:
            [(token, timestamp), ...] 格式的结果
        """
        # 收集实体信息
        entity_info = defaultdict(lambda: {
            'timestamps': [],
            'contexts': [],
            'engagement': 0,
            'count': 0,
            'bert_confidence': []
        })
        
        total_tweets = len(tweets)
        print(f"开始处理 {total_tweets} 条推文...")
        
        for idx, tweet in enumerate(tweets):
            if (idx + 1) % 1000 == 0:
                print(f"进度: {idx + 1}/{total_tweets}")
            
            # 获取主推文内容
            text = tweet.get('text', '')
            timestamp = parse_timestamp(tweet.get('createdAt', ''))
            engagement = tweet.get('favoriteCount', 0) + tweet.get('retweetCount', 0)
            
            # 合并文本：主推文 + 回复内容 + 引用内容
            combined_text = text
            
            # 添加 replyToStatus 中的内容
            if 'replyToStatus' in tweet and tweet['replyToStatus']:
                reply_text = tweet['replyToStatus'].get('text', '')
                if reply_text:
                    combined_text += ' ' + reply_text
            
            # 添加 quotedStatus 中的内容
            if 'quotedStatus' in tweet and tweet['quotedStatus']:
                quoted_text = tweet['quotedStatus'].get('text', '')
                if quoted_text:
                    combined_text += ' ' + quoted_text
            
            # 计算上下文相关度（使用合并后的文本）
            context_score = self.calculate_context_score(combined_text)
            
            # 方法1: 使用BERT NER（使用合并文本）
            if use_bert and self.ner_pipeline:
                try:
                    entities = self.extract_entities_with_bert(combined_text)
                    for entity in entities:
                        entity_text = entity.get('word', '').strip()
                        confidence = entity.get('score', 0.0)
                        entity_type = entity.get('entity_group', '')
                        
                        # 只处理组织、人物等可能是代币的实体
                        if entity_type in ['ORG', 'PER', 'MISC']:
                            normalized = self._normalize_entity(entity_text)
                            if normalized and self._is_potential_token(normalized):
                                entity_info[normalized]['timestamps'].append(timestamp)
                                entity_info[normalized]['contexts'].append(context_score)
                                entity_info[normalized]['engagement'] += engagement
                                entity_info[normalized]['count'] += 1
                                entity_info[normalized]['bert_confidence'].append(confidence)
                except Exception as e:
                    # BERT出错时跳过
                    pass
            
            # 方法2: 使用模式匹配（使用合并文本）
            pattern_tokens = self.extract_with_patterns(combined_text)
            for token in pattern_tokens:
                if self._is_potential_token(token):
                    entity_info[token]['timestamps'].append(timestamp)
                    entity_info[token]['contexts'].append(context_score)
                    entity_info[token]['engagement'] += engagement
                    entity_info[token]['count'] += 1
                    entity_info[token]['bert_confidence'].append(0.5)  # 默认置信度
            
            # 方法3: 从Twitter entities提取（主推文）
            entities_data = tweet.get('entities', {})
            for symbol in entities_data.get('symbols', []):
                token = symbol.get('text', '').upper()
                if self._is_potential_token(token):
                    entity_info[token]['timestamps'].append(timestamp)
                    entity_info[token]['contexts'].append(context_score)
                    entity_info[token]['engagement'] += engagement
                    entity_info[token]['count'] += 1
                    entity_info[token]['bert_confidence'].append(0.8)  # Twitter官方识别，高置信度
            
            # 方法4: 从 replyToStatus 的 entities 提取
            if 'replyToStatus' in tweet and tweet['replyToStatus']:
                reply_entities = tweet['replyToStatus'].get('entities', {})
                for symbol in reply_entities.get('symbols', []):
                    token = symbol.get('text', '').upper()
                    if self._is_potential_token(token):
                        entity_info[token]['timestamps'].append(timestamp)
                        entity_info[token]['contexts'].append(context_score)
                        entity_info[token]['engagement'] += engagement
                        entity_info[token]['count'] += 1
                        entity_info[token]['bert_confidence'].append(0.7)  # reply中的，略低置信度
            
            # 方法5: 从 quotedStatus 的 entities 提取
            if 'quotedStatus' in tweet and tweet['quotedStatus']:
                quoted_entities = tweet['quotedStatus'].get('entities', {})
                for symbol in quoted_entities.get('symbols', []):
                    token = symbol.get('text', '').upper()
                    if self._is_potential_token(token):
                        entity_info[token]['timestamps'].append(timestamp)
                        entity_info[token]['contexts'].append(context_score)
                        entity_info[token]['engagement'] += engagement
                        entity_info[token]['count'] += 1
                        entity_info[token]['bert_confidence'].append(0.7)  # quoted中的，略低置信度
        
        print("计算综合分数...")
        
        # 计算综合分数
        scored_entities = []
        for entity, info in entity_info.items():
            if not info['timestamps']:
                continue
            
            # 计算各项分数
            import math
            
            # 频率分数
            count_score = math.log(1 + info['count'])
            
            # 互动分数
            engagement_score = math.log(1 + info['engagement'])
            
            # 平均上下文相关度
            avg_context = sum(info['contexts']) / len(info['contexts']) if info['contexts'] else 0
            
            # 平均BERT置信度
            avg_confidence = sum(info['bert_confidence']) / len(info['bert_confidence']) if info['bert_confidence'] else 0.5
            
            # 综合分数 = 频率 * 互动 * 上下文 * 置信度
            combined_score = count_score * engagement_score * (1 + avg_context) * (1 + avg_confidence)
            
            # 选择最早的时间戳
            earliest_timestamp = min(info['timestamps'])
            
            scored_entities.append((entity, earliest_timestamp, combined_score))
        
        # 排序并返回Top N
        scored_entities.sort(key=lambda x: x[2], reverse=True)
        results = [(entity, ts) for entity, ts, _ in scored_entities[:top_n]]
        
        return results
    
    def _normalize_entity(self, entity_text: str) -> str:
        """
        标准化实体文本
        
        Args:
            entity_text: 原始实体文本
            
        Returns:
            标准化后的文本
        """
        # 移除特殊字符
        normalized = re.sub(r'[^\w\s]', '', entity_text)
        
        # 移除多余空格
        normalized = ' '.join(normalized.split())
        
        # 移除$符号
        normalized = normalized.lstrip('$')
        
        # 如果是单个词且较短，转大写
        words = normalized.split()
        if len(words) == 1 and len(words[0]) <= 10:
            normalized = words[0].upper()
        
        return normalized.strip()
    
    def _is_potential_token(self, token: str) -> bool:
        """
        判断是否是潜在的代币符号
        
        Args:
            token: 词汇
            
        Returns:
            是否是潜在代币
        """
        # 长度检查
        if len(token) < 2 or len(token) > 30:
            return False
        
        # 必须包含字母
        if not any(c.isalpha() for c in token):
            return False
        
        # 跳过纯数字
        if token.replace(' ', '').isdigit():
            return False
        
        # 跳过URL
        if 'http' in token.lower() or 'www' in token.lower():
            return False
        
        # 跳过常见停用词
        stopwords = {
            'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN',
            'WAS', 'HER', 'HIS', 'HIM', 'HAS', 'HAD', 'GET', 'GOT', 'HOW',
            'FROM', 'HAVE', 'THAT', 'THIS', 'WILL', 'WITH', 'BEEN', 'MORE',
            'THEIR', 'THERE', 'THESE', 'THOSE', 'WOULD', 'COULD', 'SHOULD',
            'WE',
        }
        
        if token in stopwords:
            return False
        
        return True
    
    def process_file(self, input_path: str, output_path: str, top_n=100):
        """
        处理单个推文文件
        
        Args:
            input_path: 输入JSON文件路径
            output_path: 输出TXT文件路径
            top_n: 提取前N个实体
        """
        print(f"正在处理: {input_path}")
        
        # 加载推文
        tweets = load_tweets(input_path)
        print(f"加载了 {len(tweets)} 条推文")
        
        # 提取实体
        use_bert = self.ner_pipeline is not None
        results = self.extract_from_tweets(tweets, top_n, use_bert=use_bert)
        print(f"基于BERT提取了 {len(results)} 个实体")
        
        # 保存结果
        save_results(results, output_path)


def main():
    """主函数"""
    import os
    
    # 获取当前目录
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 查找所有推文文件
    tweet_files = [f for f in os.listdir(current_dir) 
                   if f.startswith('user_tweets_') and f.endswith('.json')]
    
    if not tweet_files:
        print("未找到推文文件")
        return
    
    # 创建输出目录
    output_dir = os.path.join(current_dir, 'output')
    os.makedirs(output_dir, exist_ok=True)
    
    # 创建提取器
    extractor = BERTExtractor(use_gpu=False)
    
    # 处理每个文件
    for tweet_file in tweet_files:
        input_path = os.path.join(current_dir, tweet_file)
        output_filename = tweet_file.replace('.json', '_bert.txt')
        output_path = os.path.join(output_dir, output_filename)
        
        print(f"\n{'='*60}")
        extractor.process_file(input_path, output_path, top_n=100)
        print(f"{'='*60}\n")


if __name__ == '__main__':
    main()

