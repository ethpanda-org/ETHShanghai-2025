#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
方法4: 关键词提取器 (RAKE算法)
使用RAKE (Rapid Automatic Keyword Extraction) 算法提取关键词

特点:
- 无监督的关键词提取
- 基于词频和词共现
- 快速、不依赖语言模型
- 适合识别多词组合的meme名称
"""

import re
import string
from typing import List, Tuple, Dict, Set
from collections import defaultdict, Counter
from utils import load_tweets, save_results, parse_timestamp


class RAKEExtractor:
    """基于RAKE算法的关键词提取器"""
    
    def __init__(self):
        # 停用词列表
        self.stop_words = self._get_stop_words()
        
        # 标点符号和分隔符
        self.delimiters = re.compile('[' + re.escape(string.punctuation + '\n\r') + ']')
    
    def _get_stop_words(self) -> Set[str]:
        """获取停用词列表"""
        # 英文常见停用词
        stop_words = {
            'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an',
            'and', 'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before',
            'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cannot',
            'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each',
            'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having',
            'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his',
            'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just',
            'me', 'might', 'more', 'most', 'must', 'my', 'myself', 'no', 'nor',
            'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
            'our', 'ours', 'ourselves', 'out', 'over', 'own', 's', 'same', 'she',
            'should', 'so', 'some', 'such', 't', 'than', 'that', 'the', 'their',
            'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
            'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
            'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which',
            'while', 'who', 'whom', 'why', 'will', 'with', 'would', 'you',
            'your', 'yours', 'yourself', 'yourselves',
        }
        return stop_words
    
    def _is_stop_word(self, word: str) -> bool:
        """判断是否为停用词"""
        return word.lower() in self.stop_words
    
    def _split_sentences(self, text: str) -> List[str]:
        """分句"""
        # 按标点符号分割
        sentences = re.split(r'[.!?\n]+', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def _generate_candidate_keywords(self, sentences: List[str]) -> List[List[str]]:
        """
        生成候选关键词短语
        
        Args:
            sentences: 句子列表
            
        Returns:
            候选短语列表
        """
        phrase_list = []
        
        for sentence in sentences:
            # 替换标点为分隔符
            sentence = self.delimiters.sub(' ', sentence)
            words = sentence.split()
            
            # 根据停用词分割成短语
            phrase = []
            for word in words:
                word = word.strip().lower()
                if word and not self._is_stop_word(word):
                    phrase.append(word)
                else:
                    if phrase:
                        phrase_list.append(phrase)
                        phrase = []
            
            if phrase:
                phrase_list.append(phrase)
        
        return phrase_list
    
    def _calculate_word_scores(self, phrase_list: List[List[str]]) -> Dict[str, float]:
        """
        计算单词分数
        
        Args:
            phrase_list: 短语列表
            
        Returns:
            单词分数字典
        """
        word_freq = Counter()
        word_degree = Counter()
        
        for phrase in phrase_list:
            phrase_length = len(phrase)
            phrase_degree = phrase_length - 1  # 共现度
            
            for word in phrase:
                word_freq[word] += 1
                word_degree[word] += phrase_degree
        
        # 计算分数: degree(word) / freq(word)
        word_scores = {}
        for word in word_freq:
            word_scores[word] = word_degree[word] / word_freq[word] if word_freq[word] > 0 else 0
        
        return word_scores
    
    def _calculate_phrase_scores(self, phrase_list: List[List[str]], 
                                  word_scores: Dict[str, float]) -> Dict[str, float]:
        """
        计算短语分数
        
        Args:
            phrase_list: 短语列表
            word_scores: 单词分数
            
        Returns:
            短语分数字典
        """
        phrase_scores = {}
        
        for phrase in phrase_list:
            phrase_str = ' '.join(phrase)
            score = sum(word_scores.get(word, 0) for word in phrase)
            
            if phrase_str in phrase_scores:
                phrase_scores[phrase_str] = max(phrase_scores[phrase_str], score)
            else:
                phrase_scores[phrase_str] = score
        
        return phrase_scores
    
    def extract_keywords(self, text: str, top_n=20) -> List[Tuple[str, float]]:
        """
        从文本中提取关键词
        
        Args:
            text: 输入文本
            top_n: 返回前N个关键词
            
        Returns:
            [(keyword, score), ...] 列表
        """
        # 分句
        sentences = self._split_sentences(text)
        
        # 生成候选短语
        phrase_list = self._generate_candidate_keywords(sentences)
        
        if not phrase_list:
            return []
        
        # 计算单词分数
        word_scores = self._calculate_word_scores(phrase_list)
        
        # 计算短语分数
        phrase_scores = self._calculate_phrase_scores(phrase_list, word_scores)
        
        # 排序
        sorted_phrases = sorted(phrase_scores.items(), key=lambda x: x[1], reverse=True)
        
        return sorted_phrases[:top_n]
    
    def extract_from_tweets(self, tweets: List[dict], top_n=100) -> List[Tuple[str, str]]:
        """
        从推文列表中提取代币信息
        
        Args:
            tweets: 推文列表
            top_n: 提取前N个关键词
            
        Returns:
            [(token, timestamp), ...] 格式的结果
        """
        # 聚合所有推文文本并保存时间映射
        keyword_appearances = defaultdict(list)
        
        for tweet in tweets:
            text = tweet.get('text', '')
            timestamp = parse_timestamp(tweet.get('createdAt', ''))
            engagement = tweet.get('favoriteCount', 0) + tweet.get('retweetCount', 0)
            
            # 提取关键词
            keywords = self.extract_keywords(text, top_n=10)
            
            for keyword, score in keywords:
                # 过滤并标准化
                tokens = self._extract_tokens_from_keyword(keyword)
                for token in tokens:
                    if self._is_potential_token(token):
                        keyword_appearances[token].append({
                            'timestamp': timestamp,
                            'score': score,
                            'engagement': engagement
                        })
        
        # 计算每个token的综合分数并选择最佳时间
        token_info = {}
        for token, appearances in keyword_appearances.items():
            # 综合分数 = 平均RAKE分数 * log(出现次数) * log(总互动量)
            avg_score = sum(a['score'] for a in appearances) / len(appearances)
            total_engagement = sum(a['engagement'] for a in appearances)
            frequency = len(appearances)
            
            import math
            combined_score = avg_score * math.log(1 + frequency) * math.log(1 + total_engagement)
            
            # 选择最早出现的时间
            earliest_time = min(a['timestamp'] for a in appearances)
            
            token_info[token] = {
                'timestamp': earliest_time,
                'score': combined_score
            }
        
        # 排序并返回Top N
        sorted_tokens = sorted(token_info.items(), key=lambda x: x[1]['score'], reverse=True)
        results = [(token, info['timestamp']) for token, info in sorted_tokens[:top_n]]
        
        return results
    
    def _extract_tokens_from_keyword(self, keyword: str) -> List[str]:
        """
        从关键词短语中提取可能的代币符号
        
        Args:
            keyword: 关键词短语
            
        Returns:
            代币列表
        """
        tokens = []
        
        # 分词
        words = keyword.split()
        
        for word in words:
            # 清理
            word = word.strip(string.punctuation).upper()
            
            # 提取$符号后的词
            if '$' in word:
                word = word.lstrip('$')
            
            if word:
                tokens.append(word)
        
        return tokens
    
    def _is_potential_token(self, token: str) -> bool:
        """
        判断是否是潜在的代币符号
        
        Args:
            token: 词汇
            
        Returns:
            是否是潜在代币
        """
        # 长度检查
        if len(token) < 2 or len(token) > 20:
            return False
        
        # 必须包含字母
        if not any(c.isalpha() for c in token):
            return False
        
        # 跳过纯数字
        if token.isdigit():
            return False
        
        # 跳过URL片段
        if 'http' in token.lower() or 'www' in token.lower():
            return False
        
        # 跳过常见词
        common = {
            'JUST', 'LIKE', 'TIME', 'WILL', 'YEAR', 'ALSO', 'BACK', 'THEM',
            'ONLY', 'COME', 'GOOD', 'MAKE', 'WELL', 'MUCH', 'EVEN', 'TAKE',
            'KNOW', 'WANT', 'NEED', 'THINK', 'MANY', 'FIRST', 'BEEN', 'MADE',
        }
        
        if token in common:
            return False
        
        return True
    
    def process_file(self, input_path: str, output_path: str, top_n=100):
        """
        处理单个推文文件
        
        Args:
            input_path: 输入JSON文件路径
            output_path: 输出TXT文件路径
            top_n: 提取前N个关键词
        """
        print(f"正在处理: {input_path}")
        
        # 加载推文
        tweets = load_tweets(input_path)
        print(f"加载了 {len(tweets)} 条推文")
        
        # 提取关键词
        results = self.extract_from_tweets(tweets, top_n)
        print(f"基于RAKE算法提取了 {len(results)} 个关键词")
        
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
    extractor = RAKEExtractor()
    
    # 处理每个文件
    for tweet_file in tweet_files:
        input_path = os.path.join(current_dir, tweet_file)
        output_filename = tweet_file.replace('.json', '_rake.txt')
        output_path = os.path.join(output_dir, output_filename)
        
        print(f"\n{'='*60}")
        extractor.process_file(input_path, output_path, top_n=100)
        print(f"{'='*60}\n")


if __name__ == '__main__':
    main()

