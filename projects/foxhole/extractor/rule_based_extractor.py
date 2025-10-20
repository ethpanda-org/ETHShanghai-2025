#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
方法3: 基于规则的提取器
使用专家规则和启发式方法识别meme币

特点:
- 结合多种特征判断
- 基于加密货币领域知识
- 考虑上下文、互动量等因素
"""

import re
from typing import List, Tuple, Dict, Set
from collections import defaultdict
from utils import load_tweets, save_results, parse_timestamp, clean_token


class RuleBasedExtractor:
    """基于规则的代币提取器"""
    
    def __init__(self):
        # 加密货币相关关键词
        self.crypto_keywords = {
            'coin', 'token', 'crypto', 'meme', 'launch', 'launched', 'launching',
            'deploy', 'deployed', 'contract', 'address', 'ca', 'presale',
            'buy', 'buying', 'bought', 'sell', 'selling', 'sold', 'pump', 'moon',
            'ath', 'gem', 'alpha', 'airdrop', 'mint', 'minting', 'nft',
            'dex', 'cex', 'swap', 'liquidity', 'pool', 'farm', 'yield', 'stake',
            'blockchain', 'defi', 'web3', 'bullish', 'bearish', 'hodl',
        }
        
        # 价格相关模式
        self.price_patterns = [
            r'(\w+)\s+(?:at|@|price|trading)\s+\$[\d,\.]+',
            r'\$[\d,\.]+\s+(\w+)',
        ]
        
        # 交易相关模式
        self.trading_patterns = [
            r'(?:bought|sold|buying|selling)\s+(\$?\w+)',
            r'(\$?\w+)\s+(?:to the moon|moon|pump|dump)',
            r'(\$?\w+)\s+\d+x',  # 如 "DOGE 100x"
        ]
        
        # 合约地址模式
        self.contract_patterns = [
            r'(?:CA|Contract|Address):\s*([0-9a-fA-Fx]+)',
            r'\b(0x[a-fA-F0-9]{40})\b',
        ]
        
        # 知名代币列表（用于引导识别）
        self.known_tokens = {
            'BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOGE', 'SHIB', 'PEPE',
            'USDT', 'USDC', 'BUSD', 'DAI', 'MATIC', 'AVAX', 'DOT', 'LINK',
            'UNI', 'AAVE', 'CAKE', 'SUSHI', 'CRV', 'COMP', 'YFI', 'SNX',
        }
    
    def calculate_confidence(self, text: str, token: str, tweet_data: dict) -> float:
        """
        计算代币的信心分数
        
        Args:
            text: 推文文本
            token: 候选代币
            tweet_data: 推文数据
            
        Returns:
            信心分数 (0-1)
        """
        score = 0.0
        text_lower = text.lower()
        
        # 规则1: 如果是已知代币，高分
        if token in self.known_tokens:
            score += 0.3
        
        # 规则2: 如果有$符号前缀
        if f'${token}' in text or f'${token.lower()}' in text_lower:
            score += 0.2
        
        # 规则3: 如果文本包含加密货币关键词
        keyword_count = sum(1 for kw in self.crypto_keywords if kw in text_lower)
        score += min(keyword_count * 0.05, 0.2)
        
        # 规则4: 如果提到价格
        for pattern in self.price_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                score += 0.15
                break
        
        # 规则5: 如果提到交易行为
        for pattern in self.trading_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                score += 0.15
                break
        
        # 规则6: 互动量影响（点赞+转发）
        engagement = tweet_data.get('favoriteCount', 0) + tweet_data.get('retweetCount', 0)
        if engagement > 100:
            score += 0.1
        elif engagement > 50:
            score += 0.05
        
        # 规则7: 如果在entities.symbols中（Twitter官方识别）
        entities = tweet_data.get('entities', {})
        symbols = [s.get('text', '').upper() for s in entities.get('symbols', [])]
        if token in symbols:
            score += 0.25
        
        # 规则8: 如果有hashtag
        hashtags = [h.get('text', '').upper() for h in entities.get('hashtags', [])]
        if token in hashtags or token.lower() in [h.lower() for h in hashtags]:
            score += 0.15
        
        # 规则9: 代币长度启发式（3-6个字符最常见）
        if 3 <= len(token) <= 6:
            score += 0.1
        
        # 规则10: 全大写更可能是代币符号
        if token.isupper():
            score += 0.05
        
        return min(score, 1.0)
    
    def extract_candidates(self, text: str) -> Set[str]:
        """
        提取候选代币
        
        Args:
            text: 推文文本
            
        Returns:
            候选代币集合
        """
        candidates = set()
        
        # 方法1: $符号提取
        dollar_tokens = re.findall(r'\$([A-Z][A-Za-z0-9]{1,10})\b', text)
        candidates.update([t.upper() for t in dollar_tokens])
        
        # 方法2: 大写词汇
        upper_tokens = re.findall(r'\b([A-Z]{2,10})\b', text)
        candidates.update(upper_tokens)
        
        # 方法3: 价格模式
        for pattern in self.price_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            candidates.update([m.upper().lstrip('$') for m in matches if isinstance(m, str)])
        
        # 方法4: 交易模式
        for pattern in self.trading_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            candidates.update([m.upper().lstrip('$') for m in matches if isinstance(m, str)])
        
        # 方法5: 合约地址
        for pattern in self.contract_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            candidates.update(matches)
        
        return candidates
    
    def extract_from_tweets(self, tweets: List[dict], min_confidence=0.3) -> List[Tuple[str, str]]:
        """
        从推文列表中提取代币信息
        
        Args:
            tweets: 推文列表
            min_confidence: 最小信心阈值
            
        Returns:
            [(token, timestamp), ...] 格式的结果
        """
        # 收集所有候选代币及其最佳出现
        token_info = defaultdict(lambda: {'confidence': 0.0, 'timestamp': '', 'count': 0})
        
        for tweet in tweets:
            text = tweet.get('text', '')
            timestamp = parse_timestamp(tweet.get('createdAt', ''))
            
            # 提取候选代币
            candidates = self.extract_candidates(text)
            
            # 从entities中添加
            entities = tweet.get('entities', {})
            for symbol in entities.get('symbols', []):
                candidates.add(clean_token(symbol.get('text', '')))
            
            # 计算每个候选的信心分数
            for token in candidates:
                if not self._is_valid_token(token):
                    continue
                
                confidence = self.calculate_confidence(text, token, tweet)
                
                # 更新token信息
                token_info[token]['count'] += 1
                if confidence > token_info[token]['confidence']:
                    token_info[token]['confidence'] = confidence
                    token_info[token]['timestamp'] = timestamp
        
        # 筛选高信心代币
        results = []
        for token, info in token_info.items():
            if info['confidence'] >= min_confidence:
                results.append((token, info['timestamp'], info['confidence']))
        
        # 按信心分数排序
        results.sort(key=lambda x: x[2], reverse=True)
        
        # 返回 (token, timestamp) 格式
        return [(token, ts) for token, ts, _ in results]
    
    def _is_valid_token(self, token: str) -> bool:
        """
        验证代币是否有效
        
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
        
        # 跳过常见停用词
        stopwords = {
            'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN',
            'WAS', 'HER', 'HIS', 'HIM', 'HAS', 'HAD', 'GET', 'GOT', 'HOW',
            'ITS', 'OUR', 'OUT', 'WHO', 'OWN', 'TOO', 'VIA', 'WAY', 'WHY',
            'NOW', 'NEW', 'OLD', 'SEE', 'TWO', 'USE', 'MAY', 'SAY', 'SHE',
        }
        
        if token in stopwords:
            return False
        
        return True
    
    def process_file(self, input_path: str, output_path: str, min_confidence=0.3):
        """
        处理单个推文文件
        
        Args:
            input_path: 输入JSON文件路径
            output_path: 输出TXT文件路径
            min_confidence: 最小信心阈值
        """
        print(f"正在处理: {input_path}")
        print(f"最小信心阈值: {min_confidence}")
        
        # 加载推文
        tweets = load_tweets(input_path)
        print(f"加载了 {len(tweets)} 条推文")
        
        # 提取代币
        results = self.extract_from_tweets(tweets, min_confidence)
        print(f"基于规则提取了 {len(results)} 个代币")
        
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
    extractor = RuleBasedExtractor()
    
    # 处理每个文件
    for tweet_file in tweet_files:
        input_path = os.path.join(current_dir, tweet_file)
        output_filename = tweet_file.replace('.json', '_rule.txt')
        output_path = os.path.join(output_dir, output_filename)
        
        print(f"\n{'='*60}")
        extractor.process_file(input_path, output_path, min_confidence=0.3)
        print(f"{'='*60}\n")


if __name__ == '__main__':
    main()

