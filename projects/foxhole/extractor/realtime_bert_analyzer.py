#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
实时BERT分析模块
从推文文本中实时提取代币符号
"""

import re
from typing import List, Set, Dict
from collections import defaultdict

# 尝试导入transformers
try:
    from transformers import pipeline
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("Warning: transformers not installed, using pattern-based extraction only")


class RealtimeBERTAnalyzer:
    """实时BERT代币分析器"""
    
    def __init__(self, use_gpu=False, use_bert=True):
        """
        初始化分析器
        
        Args:
            use_gpu: 是否使用GPU加速
            use_bert: 是否使用BERT (False则仅使用模式匹配)
        """
        self.ner_pipeline = None
        self.use_gpu = use_gpu
        self.use_bert = use_bert and TRANSFORMERS_AVAILABLE
        
        # 尝试加载BERT模型
        if self.use_bert:
            try:
                device = 0 if use_gpu and torch.cuda.is_available() else -1
                self.ner_pipeline = pipeline(
                    "ner",
                    model="dslim/bert-base-NER",
                    aggregation_strategy="simple",
                    device=device
                )
                print(f"[BERT] Model loaded successfully (device: {'GPU' if device >= 0 else 'CPU'})")
            except Exception as e:
                print(f"[BERT] Failed to load model: {e}")
                print("[BERT] Using pattern-based extraction only")
                self.ner_pipeline = None
        
        # 正则模式
        self.token_pattern = re.compile(r'\$([A-Z][A-Z0-9]{1,10})\b')
        self.upper_token_pattern = re.compile(r'\b([A-Z]{2,10})\b')
        
        # 加密货币相关关键词
        self.crypto_keywords = {
            'crypto', 'token', 'coin', 'blockchain', 'defi', 'nft', 'meme',
            'launch', 'pump', 'moon', 'buy', 'sell', 'trade', 'dex', 'swap',
            'contract', 'address', 'wallet', 'hodl', 'bull', 'bear', 'ath',
            'ca', 'contract address', 'launched', 'fair launch'
        }
        
        # 停用词
        self.stopwords = {
            'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN',
            'WAS', 'HER', 'HIS', 'HIM', 'HAS', 'HAD', 'GET', 'GOT', 'HOW',
            'FROM', 'HAVE', 'THAT', 'THIS', 'WILL', 'WITH', 'BEEN', 'MORE',
            'THEIR', 'THERE', 'THESE', 'THOSE', 'WOULD', 'COULD', 'SHOULD',
            'WE', 'WHO', 'WHY', 'WHEN', 'WHERE', 'WHICH', 'WHAT', 'THEY',
        }
    
    def calculate_crypto_score(self, text: str) -> float:
        """
        计算文本的加密货币相关度分数
        
        Args:
            text: 文本内容
            
        Returns:
            分数 (0-1)
        """
        text_lower = text.lower()
        word_count = len(text_lower.split())
        
        if word_count == 0:
            return 0.0
        
        # 统计关键词出现次数
        keyword_count = sum(1 for keyword in self.crypto_keywords if keyword in text_lower)
        
        # $ 符号权重更高
        dollar_count = text.count('$')
        
        # 综合指示符数量
        total_indicators = keyword_count + (dollar_count * 2)
        
        # 计算密度
        density = total_indicators / word_count if word_count > 0 else 0.0
        
        # 归一化到 0-1
        score = min(density * 2, 1.0)
        
        return score
    
    def extract_with_bert(self, text: str) -> List[Dict]:
        """
        使用BERT提取实体
        
        Args:
            text: 文本内容
            
        Returns:
            实体列表
        """
        if not self.ner_pipeline:
            return []
        
        try:
            # 限制长度避免内存问题
            max_length = 512
            if len(text) > max_length:
                text = text[:max_length]
            
            entities = self.ner_pipeline(text)
            return entities
        except Exception as e:
            print(f"[BERT] Error during processing: {e}")
            return []
    
    def extract_with_patterns(self, text: str) -> Set[str]:
        """
        使用正则模式提取代币符号
        
        Args:
            text: 文本内容
            
        Returns:
            代币符号集合
        """
        tokens = set()
        
        # $符号标记的代币
        dollar_tokens = self.token_pattern.findall(text)
        tokens.update([t.upper() for t in dollar_tokens])
        
        # 全大写词汇 (2-10字符)
        upper_tokens = self.upper_token_pattern.findall(text)
        for token in upper_tokens:
            if self._is_valid_token(token):
                tokens.add(token)
        
        return tokens
    
    def extract_tokens(self, text: str, tweet_data: Dict = None) -> List[Dict]:
        """
        从文本中提取代币符号
        
        Args:
            text: 推文文本
            tweet_data: 完整的推文数据 (可选)
            
        Returns:
            提取的代币列表，每个代币包含: {symbol, confidence, source, context_score}
        """
        results = []
        seen_tokens = set()
        
        # 计算上下文相关度
        context_score = self.calculate_crypto_score(text)
        
        # 【批量版本逻辑】不再使用硬性过滤，context_score只作为评分因素
        # 注释掉原来的早期退出逻辑：
        # if context_score < 0.1:
        #     return results
        
        print(f"[BERT Analyzer] Context score: {context_score:.2f}")
        
        # 方法1: BERT提取（无论context_score多少都执行）
        if self.ner_pipeline:
            try:
                entities = self.extract_with_bert(text)
                for entity in entities:
                    entity_text = entity.get('word', '').strip()
                    confidence = entity.get('score', 0.0)
                    entity_type = entity.get('entity_group', '')
                    
                    # 只处理可能是代币的实体类型
                    if entity_type in ['ORG', 'PER', 'MISC']:
                        normalized = self._normalize_token(entity_text)
                        if normalized and self._is_valid_token(normalized) and normalized not in seen_tokens:
                            seen_tokens.add(normalized)
                            results.append({
                                'symbol': normalized,
                                'confidence': confidence,
                                'source': 'BERT',
                                'context_score': context_score
                            })
            except Exception as e:
                pass
        
        # 方法2: 模式匹配（无论context_score多少都执行）
        pattern_tokens = self.extract_with_patterns(text)
        for token in pattern_tokens:
            if token not in seen_tokens:
                seen_tokens.add(token)
                # $ 符号标记的置信度更高
                confidence = 0.8 if f'${token}' in text else 0.5
                results.append({
                    'symbol': token,
                    'confidence': confidence,
                    'source': 'Pattern',
                    'context_score': context_score
                })
        
        # 方法3: 从Twitter entities提取 (如果有完整数据)
        if tweet_data:
            entities_data = tweet_data.get('entities', {})
            for symbol_data in entities_data.get('symbols', []):
                token = symbol_data.get('text', '').upper()
                if self._is_valid_token(token) and token not in seen_tokens:
                    seen_tokens.add(token)
                    results.append({
                        'symbol': token,
                        'confidence': 0.9,  # Twitter官方识别，高置信度
                        'source': 'Twitter',
                        'context_score': context_score
                    })
        
        # 【批量版本逻辑】使用context_score作为权重参与综合评分
        # 按综合分数排序：confidence * (1 + context_score)
        # context_score高时提升排名，低时不会过滤但排名靠后
        results.sort(key=lambda x: x['confidence'] * (1 + x['context_score']), reverse=True)
        
        return results
    
    def _normalize_token(self, token: str) -> str:
        """
        标准化代币符号
        
        Args:
            token: 原始代币符号
            
        Returns:
            标准化后的符号
        """
        # 移除特殊字符
        normalized = re.sub(r'[^\w\s]', '', token)
        
        # 移除多余空格
        normalized = ' '.join(normalized.split())
        
        # 移除$符号
        normalized = normalized.lstrip('$')
        
        # 如果是单个词且较短，转大写
        words = normalized.split()
        if len(words) == 1 and len(words[0]) <= 10:
            normalized = words[0].upper()
        
        return normalized.strip()
    
    def _is_valid_token(self, token: str) -> bool:
        """
        判断是否是有效的代币符号
        
        Args:
            token: 代币符号
            
        Returns:
            是否有效
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
        
        # 跳过停用词
        if token in self.stopwords:
            return False
        
        return True
    
    def analyze_tweet(self, tweet_data: Dict) -> Dict:
        """
        分析完整的推文数据
        
        Args:
            tweet_data: 推文数据字典
            
        Returns:
            分析结果 {text, tokens, timestamp, metadata}
        """
        # 获取主推文内容
        text = tweet_data.get('text', '')
        
        # DEBUG: 显示正在分析的文本
        print(f"[BERT Analyzer] Analyzing text: {text[:100]}{'...' if len(text) > 100 else ''}")
        
        # 合并相关文本内容
        combined_text = text
        
        # 添加 replyToStatus 内容
        if 'replyToStatus' in tweet_data and tweet_data['replyToStatus']:
            reply_text = tweet_data['replyToStatus'].get('text', '')
            if reply_text:
                combined_text += ' ' + reply_text
        
        # 添加 quotedStatus 内容
        if 'quotedStatus' in tweet_data and tweet_data['quotedStatus']:
            quoted_text = tweet_data['quotedStatus'].get('text', '')
            if quoted_text:
                combined_text += ' ' + quoted_text
        
        # 提取代币
        tokens = self.extract_tokens(combined_text, tweet_data)
        
        # DEBUG: 显示提取结果
        if tokens:
            print(f"[BERT Analyzer] Extracted {len(tokens)} token(s):")
            for token_info in tokens:
                print(f"  - ${token_info['symbol']} (confidence: {token_info['confidence']:.2f}, "
                      f"context: {token_info['context_score']:.2f}, source: {token_info['source']})")
        else:
            print(f"[BERT Analyzer] No tokens extracted")
        
        # 构建结果
        result = {
            'text': text,
            'combined_text': combined_text,
            'tokens': tokens,
            'timestamp': tweet_data.get('createdAt', ''),
            'tweet_id': tweet_data.get('id', ''),
            'username': tweet_data.get('username', 'Unknown'),
            'engagement': {
                'favorites': tweet_data.get('favoriteCount', 0),
                'retweets': tweet_data.get('retweetCount', 0),
            }
        }
        
        return result


def test_analyzer():
    """测试分析器"""
    analyzer = RealtimeBERTAnalyzer(use_gpu=False, use_bert=True)
    
    # 测试文本
    test_texts = [
        "Check out $PEPE, it's mooning! Contract address: 0x123...",
        "New token $DOGE just launched on BSC!",
        "Bitcoin and Ethereum are great investments",
        "GM everyone! Ready for another day of trading",
    ]
    
    print("\n" + "="*70)
    print("Testing BERT Analyzer")
    print("="*70)
    
    for text in test_texts:
        print(f"\nText: {text}")
        tokens = analyzer.extract_tokens(text)
        if tokens:
            print(f"Found {len(tokens)} tokens:")
            for token_info in tokens:
                print(f"  - {token_info['symbol']} (confidence: {token_info['confidence']:.2f}, "
                      f"source: {token_info['source']}, context: {token_info['context_score']:.2f})")
        else:
            print("  No tokens found")


if __name__ == '__main__':
    test_analyzer()


