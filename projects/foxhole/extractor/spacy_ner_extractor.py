#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
方法5: spaCy命名实体识别提取器
使用spaCy的NER (Named Entity Recognition) 识别实体

特点:
- 使用预训练的语言模型
- 识别组织、产品等命名实体
- 可以识别多词实体
- 需要安装: pip install spacy && python -m spacy download en_core_web_sm
"""

import re
from typing import List, Tuple, Dict, Set
from collections import defaultdict, Counter
from utils import load_tweets, save_results, parse_timestamp

# 尝试导入spacy
try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    print("警告: spaCy未安装，将使用基础NER功能")


class SpacyNERExtractor:
    """基于spaCy的命名实体识别提取器"""
    
    def __init__(self, model_name='en_core_web_sm'):
        """
        初始化
        
        Args:
            model_name: spaCy模型名称
        """
        self.nlp = None
        
        if SPACY_AVAILABLE:
            try:
                self.nlp = spacy.load(model_name)
                print(f"成功加载spaCy模型: {model_name}")
            except OSError:
                print(f"警告: 未找到模型 {model_name}，尝试下载...")
                try:
                    import subprocess
                    subprocess.run(['python', '-m', 'spacy', 'download', model_name], 
                                   check=True, capture_output=True)
                    self.nlp = spacy.load(model_name)
                    print(f"成功下载并加载模型: {model_name}")
                except:
                    print("警告: 无法下载模型，使用基础NER")
        
        # 加密货币相关的实体类型
        self.relevant_entity_types = {'ORG', 'PRODUCT', 'MONEY', 'GPE', 'PERSON'}
        
        # 额外的模式匹配（作为NER的补充）
        self.token_pattern = re.compile(r'\$([A-Z][A-Z0-9]{1,10})\b')
        self.cashtag_pattern = re.compile(r'\$[A-Z]{2,10}\b')
    
    def extract_entities_with_spacy(self, text: str) -> List[Tuple[str, str]]:
        """
        使用spaCy提取命名实体
        
        Args:
            text: 输入文本
            
        Returns:
            [(entity_text, entity_type), ...] 列表
        """
        if not self.nlp:
            return []
        
        entities = []
        doc = self.nlp(text)
        
        for ent in doc.ents:
            if ent.label_ in self.relevant_entity_types:
                # 清理实体文本
                entity_text = ent.text.strip()
                entities.append((entity_text, ent.label_))
        
        return entities
    
    def extract_with_patterns(self, text: str) -> Set[str]:
        """
        使用正则模式提取（作为NER补充）
        
        Args:
            text: 输入文本
            
        Returns:
            代币集合
        """
        tokens = set()
        
        # $符号标记
        cashtags = self.cashtag_pattern.findall(text)
        tokens.update([tag.lstrip('$').upper() for tag in cashtags])
        
        # 大写词汇
        upper_words = re.findall(r'\b([A-Z]{2,10})\b', text)
        tokens.update(upper_words)
        
        return tokens
    
    def extract_from_tweets(self, tweets: List[dict], top_n=100) -> List[Tuple[str, str]]:
        """
        从推文列表中提取代币信息
        
        Args:
            tweets: 推文列表
            top_n: 提取前N个实体
            
        Returns:
            [(token, timestamp), ...] 格式的结果
        """
        # 收集实体信息
        entity_info = defaultdict(lambda: {
            'timestamps': [],
            'entity_types': Counter(),
            'engagement': 0,
            'count': 0
        })
        
        for tweet in tweets:
            text = tweet.get('text', '')
            timestamp = parse_timestamp(tweet.get('createdAt', ''))
            engagement = tweet.get('favoriteCount', 0) + tweet.get('retweetCount', 0)
            
            # 方法1: 使用spaCy NER
            if self.nlp:
                entities = self.extract_entities_with_spacy(text)
                for entity_text, entity_type in entities:
                    # 标准化
                    normalized = self._normalize_entity(entity_text)
                    if normalized and self._is_potential_token(normalized):
                        entity_info[normalized]['timestamps'].append(timestamp)
                        entity_info[normalized]['entity_types'][entity_type] += 1
                        entity_info[normalized]['engagement'] += engagement
                        entity_info[normalized]['count'] += 1
            
            # 方法2: 使用模式匹配（作为补充）
            pattern_tokens = self.extract_with_patterns(text)
            for token in pattern_tokens:
                if self._is_potential_token(token):
                    entity_info[token]['timestamps'].append(timestamp)
                    entity_info[token]['entity_types']['PATTERN'] += 1
                    entity_info[token]['engagement'] += engagement
                    entity_info[token]['count'] += 1
            
            # 方法3: 从Twitter entities提取
            entities_data = tweet.get('entities', {})
            for symbol in entities_data.get('symbols', []):
                token = symbol.get('text', '').upper()
                if self._is_potential_token(token):
                    entity_info[token]['timestamps'].append(timestamp)
                    entity_info[token]['entity_types']['SYMBOL'] += 1
                    entity_info[token]['engagement'] += engagement
                    entity_info[token]['count'] += 1
        
        # 计算综合分数
        scored_entities = []
        for entity, info in entity_info.items():
            if not info['timestamps']:
                continue
            
            # 计算分数
            import math
            count_score = math.log(1 + info['count'])
            engagement_score = math.log(1 + info['engagement'])
            
            # NER类型加权
            type_weights = {
                'ORG': 1.5,
                'PRODUCT': 1.8,
                'MONEY': 1.2,
                'SYMBOL': 2.0,
                'PATTERN': 1.0,
            }
            max_type_weight = max([type_weights.get(t, 1.0) 
                                   for t in info['entity_types'].keys()], default=1.0)
            
            combined_score = count_score * engagement_score * max_type_weight
            
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
        # 移除多余空格
        normalized = ' '.join(entity_text.split())
        
        # 移除$符号
        normalized = normalized.lstrip('$')
        
        # 如果是单个词且全大写，保持大写
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
        
        # 跳过常见停用词
        stopwords = {
            'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN',
            'WAS', 'HER', 'HIS', 'HIM', 'HAS', 'HAD', 'GET', 'GOT', 'HOW',
            'FROM', 'HAVE', 'THAT', 'THIS', 'WILL', 'WITH', 'BEEN', 'MORE',
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
        results = self.extract_from_tweets(tweets, top_n)
        print(f"基于spaCy NER提取了 {len(results)} 个实体")
        
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
    extractor = SpacyNERExtractor()
    
    # 处理每个文件
    for tweet_file in tweet_files:
        input_path = os.path.join(current_dir, tweet_file)
        output_filename = tweet_file.replace('.json', '_spacy.txt')
        output_path = os.path.join(output_dir, output_filename)
        
        print(f"\n{'='*60}")
        extractor.process_file(input_path, output_path, top_n=100)
        print(f"{'='*60}\n")


if __name__ == '__main__':
    main()

