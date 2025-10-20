#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
方法1: 正则表达式提取器
使用传统的正则表达式模式匹配来识别代币符号

特点:
- 快速、轻量
- 基于模式匹配
- 适合已知格式的代币符号（如$BTC, $ETH）
"""

import re
import json
from typing import List, Tuple, Set
from utils import load_tweets, save_results, parse_timestamp, clean_token, deduplicate_results


class RegexExtractor:
    """基于正则表达式的代币提取器"""
    
    def __init__(self):
        # 定义多种正则模式
        self.patterns = [
            # 模式1: $符号开头的代币 (如 $BTC, $DOGE)
            r'\$([A-Z][A-Z0-9]{1,10})\b',
            
            # 模式2: CA地址格式 (以太坊/BSC合约地址)
            r'\b(0x[a-fA-F0-9]{40})\b',
            
            # 模式3: Solana地址格式 (base58编码，通常44个字符)
            r'\b([1-9A-HJ-NP-Za-km-z]{32,44})\b',
            
            # 模式4: 币种缩写提及 (大写字母2-10个)
            r'\b([A-Z]{2,10})\s+(?:coin|token|crypto|currency|meme)\b',
            
            # 模式5: 新币发布关键词
            r'(?:launch|launching|deployed|new)\s+([A-Z][A-Z0-9]{1,10})\b',
            
            # 模式6: 价格提及 (如 BTC at $50000)
            r'([A-Z]{2,10})\s+(?:at|price|@)\s+\$[\d,\.]+',
            
            # 模式7: 交易对格式 (如 BTC/USDT, ETH-USD)
            r'\b([A-Z]{2,10})[/\-](?:USD|USDT|USDC|BTC|ETH)\b',
        ]
        
        # 编译正则表达式以提高性能
        self.compiled_patterns = [re.compile(p, re.IGNORECASE | re.MULTILINE) for p in self.patterns]
    
    def extract_from_text(self, text: str) -> Set[str]:
        """
        从文本中提取代币符号
        
        Args:
            text: 推文文本
            
        Returns:
            提取到的代币符号集合
        """
        tokens = set()
        
        for pattern in self.compiled_patterns:
            matches = pattern.findall(text)
            for match in matches:
                if isinstance(match, tuple):
                    match = match[0]
                token = clean_token(match)
                
                # 过滤条件
                if self._is_valid_token(token):
                    tokens.add(token)
        
        return tokens
    
    def _is_valid_token(self, token: str) -> bool:
        """
        验证代币符号是否有效
        
        Args:
            token: 代币符号
            
        Returns:
            是否有效
        """
        # 长度检查
        if len(token) < 2 or len(token) > 50:
            return False
        
        # 跳过纯数字
        if token.isdigit():
            return False
        
        # 跳过常见英文单词
        common_words = {
            'NEW', 'NOW', 'HOW', 'ALL', 'GET', 'CAN', 'ONE', 'TWO', 
            'DAY', 'WAY', 'SEE', 'USE', 'HER', 'MAY', 'SAY', 'SHE',
            'HIM', 'HIS', 'BUT', 'NOT', 'YOU', 'FOR', 'ARE', 'THE',
            'AND', 'OUT', 'TOP', 'BIG', 'OLD', 'YES', 'WHY', 'LET',
            'ITS', 'OUR', 'GOT', 'HAS', 'HAD', 'WAS', 'HER', 'WHO',
        }
        if token in common_words:
            return False
        
        return True
    
    def extract_from_tweets(self, tweets: List[dict]) -> List[Tuple[str, str]]:
        """
        从推文列表中提取代币信息
        
        Args:
            tweets: 推文列表
            
        Returns:
            [(token, timestamp), ...] 格式的结果
        """
        results = []
        
        for tweet in tweets:
            text = tweet.get('text', '')
            created_at = tweet.get('createdAt', '')
            timestamp = parse_timestamp(created_at)
            
            # 从推文文本提取
            tokens = self.extract_from_text(text)
            
            # 也从entities.symbols中提取（Twitter已识别的符号）
            entities = tweet.get('entities', {})
            symbols = entities.get('symbols', [])
            for symbol in symbols:
                symbol_text = clean_token(symbol.get('text', ''))
                if self._is_valid_token(symbol_text):
                    tokens.add(symbol_text)
            
            # 添加到结果
            for token in tokens:
                results.append((token, timestamp))
        
        return results
    
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
        print(f"提取了 {len(results)} 个代币实例")
        
        # 去重
        results = deduplicate_results(results)
        print(f"去重后剩余 {len(results)} 个唯一代币")
        
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
    extractor = RegexExtractor()
    
    # 处理每个文件
    for tweet_file in tweet_files:
        input_path = os.path.join(current_dir, tweet_file)
        output_filename = tweet_file.replace('.json', '_regex.txt')
        output_path = os.path.join(output_dir, output_filename)
        
        print(f"\n{'='*60}")
        extractor.process_file(input_path, output_path)
        print(f"{'='*60}\n")


if __name__ == '__main__':
    main()

