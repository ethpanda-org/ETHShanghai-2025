#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
方法2: TF-IDF统计提取器
使用词频-逆文档频率(TF-IDF)算法识别重要词汇

特点:
- 基于统计的无监督方法
- 识别文档中最具特征性的词汇
- 适合发现高频但不是通用的代币名称
"""

import re
from collections import Counter, defaultdict
from typing import List, Tuple, Dict, Set
import math
from utils import load_tweets, save_results, parse_timestamp, filter_common_words


class TFIDFExtractor:
    """基于TF-IDF的代币提取器"""
    
    def __init__(self, min_token_length=2, max_token_length=15, top_n=100):
        """
        初始化
        
        Args:
            min_token_length: 最小代币长度
            max_token_length: 最大代币长度
            top_n: 提取前N个高分词汇
        """
        self.min_token_length = min_token_length
        self.max_token_length = max_token_length
        self.top_n = top_n
        
        # 词汇模式：大写字母开头的词、$符号词、#标签
        self.token_pattern = re.compile(r'\$?[A-Z][A-Za-z0-9_]{1,14}|#[A-Za-z0-9_]+')
    
    def tokenize(self, text: str) -> List[str]:
        """
        分词并提取候选代币
        
        Args:
            text: 推文文本
            
        Returns:
            代币列表
        """
        # 提取符合模式的词汇
        tokens = self.token_pattern.findall(text)
        
        # 清理和标准化
        cleaned = []
        for token in tokens:
            # 移除$和#前缀
            token = token.lstrip('$#').upper()
            
            # 长度过滤
            if self.min_token_length <= len(token) <= self.max_token_length:
                cleaned.append(token)
        
        return cleaned
    
    def calculate_tf(self, tokens: List[str]) -> Dict[str, float]:
        """
        计算词频(Term Frequency)
        
        Args:
            tokens: 词汇列表
            
        Returns:
            {token: tf_score}
        """
        if not tokens:
            return {}
        
        token_counts = Counter(tokens)
        total_tokens = len(tokens)
        
        # TF = 词频 / 总词数
        tf_scores = {token: count / total_tokens 
                     for token, count in token_counts.items()}
        
        return tf_scores
    
    def calculate_idf(self, documents: List[List[str]]) -> Dict[str, float]:
        """
        计算逆文档频率(Inverse Document Frequency)
        
        Args:
            documents: 文档列表，每个文档是一个词汇列表
            
        Returns:
            {token: idf_score}
        """
        num_docs = len(documents)
        
        # 计算每个词出现在多少个文档中
        doc_freq = defaultdict(int)
        for doc in documents:
            unique_tokens = set(doc)
            for token in unique_tokens:
                doc_freq[token] += 1
        
        # IDF = log(总文档数 / 包含该词的文档数)
        idf_scores = {}
        for token, freq in doc_freq.items():
            idf_scores[token] = math.log(num_docs / freq)
        
        return idf_scores
    
    def extract_from_tweets(self, tweets: List[dict]) -> List[Tuple[str, str]]:
        """
        从推文列表中提取代币信息
        
        Args:
            tweets: 推文列表
            
        Returns:
            [(token, timestamp), ...] 格式的结果
        """
        # 第一步：分词并建立文档集合
        documents = []
        tweet_data = []
        
        for tweet in tweets:
            text = tweet.get('text', '')
            tokens = self.tokenize(text)
            
            if tokens:
                documents.append(tokens)
                tweet_data.append({
                    'tokens': tokens,
                    'timestamp': parse_timestamp(tweet.get('createdAt', '')),
                    'favorite_count': tweet.get('favoriteCount', 0),
                    'retweet_count': tweet.get('retweetCount', 0)
                })
        
        if not documents:
            return []
        
        # 第二步：计算IDF
        idf_scores = self.calculate_idf(documents)
        
        # 第三步：计算每条推文的TF-IDF并收集结果
        token_scores = defaultdict(lambda: {'max_tfidf': 0.0, 'timestamp': '', 'engagement': 0})
        
        for data in tweet_data:
            tokens = data['tokens']
            tf_scores = self.calculate_tf(tokens)
            timestamp = data['timestamp']
            engagement = data['favorite_count'] + data['retweet_count']
            
            # 计算TF-IDF
            for token in set(tokens):
                if token in tf_scores and token in idf_scores:
                    tfidf = tf_scores[token] * idf_scores[token]
                    
                    # 考虑互动量加权
                    weighted_score = tfidf * (1 + math.log(1 + engagement))
                    
                    # 保留最高分的记录
                    if weighted_score > token_scores[token]['max_tfidf']:
                        token_scores[token] = {
                            'max_tfidf': weighted_score,
                            'timestamp': timestamp,
                            'engagement': engagement
                        }
        
        # 第四步：排序并选择Top N
        sorted_tokens = sorted(token_scores.items(), 
                               key=lambda x: x[1]['max_tfidf'], 
                               reverse=True)
        
        # 过滤常见词
        filtered_tokens = []
        for token, data in sorted_tokens:
            if self._is_potential_token(token):
                filtered_tokens.append(token)
        
        # 取前N个
        top_tokens = filtered_tokens[:self.top_n]
        
        # 构建结果
        results = []
        for token in top_tokens:
            timestamp = token_scores[token]['timestamp']
            results.append((token, timestamp))
        
        return results
    
    def _is_potential_token(self, token: str) -> bool:
        """
        判断是否是潜在的代币符号
        
        Args:
            token: 词汇
            
        Returns:
            是否是潜在代币
        """
        # 过滤纯数字
        if token.isdigit():
            return False
        
        # 过滤常见英文词
        common_words = {
            'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 
            'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM',
            'THIS', 'THAT', 'WITH', 'FROM', 'HAVE', 'BEEN', 'WILL', 'WOULD',
            'THERE', 'THEIR', 'WHAT', 'ABOUT', 'WHICH', 'WHEN', 'WHERE',
            'JUST', 'LIKE', 'MORE', 'SOME', 'TIME', 'VERY', 'AFTER', 'COULD',
            'FIRST', 'THAN', 'MOST', 'OTHER', 'ONLY', 'OVER', 'ALSO', 'BACK',
            'THEM', 'THEN', 'THESE', 'SUCH', 'INTO', 'MAKE', 'MANY', 'WELL',
        }
        
        if token in common_words:
            return False
        
        # 优先考虑包含数字的（如DOGE420, PEPE2.0）
        if any(c.isdigit() for c in token):
            return True
        
        # 3-6个字符的大写词汇很可能是代币
        if 3 <= len(token) <= 6 and token.isupper():
            return True
        
        # 其他情况，接受
        return True
    
    def process_file(self, input_path: str, output_path: str):
        """
        处理单个推文文件
        
        Args:
            input_path: 输入JSON文件路径
            output_path: 输出TXT文件路径
        """
        print(f"正在处理: {input_path}")
        
        # 加载推文
        tweets = load_tweets(input_path)
        print(f"加载了 {len(tweets)} 条推文")
        
        # 提取代币
        results = self.extract_from_tweets(tweets)
        print(f"基于TF-IDF提取了 {len(results)} 个代币")
        
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
    extractor = TFIDFExtractor(top_n=100)
    
    # 处理每个文件
    for tweet_file in tweet_files:
        input_path = os.path.join(current_dir, tweet_file)
        output_filename = tweet_file.replace('.json', '_tfidf.txt')
        output_path = os.path.join(output_dir, output_filename)
        
        print(f"\n{'='*60}")
        extractor.process_file(input_path, output_path)
        print(f"{'='*60}\n")


if __name__ == '__main__':
    main()

