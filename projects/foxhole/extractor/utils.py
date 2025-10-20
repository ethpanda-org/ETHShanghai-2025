#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
公共工具函数模块
提供数据加载、结果保存等通用功能
"""

import json
import os
from typing import List, Dict, Tuple
from datetime import datetime


def load_tweets(json_path: str) -> List[Dict]:
    """
    加载推文JSON数据
    
    Args:
        json_path: JSON文件路径
        
    Returns:
        推文列表
    """
    with open(json_path, 'r', encoding='utf-8') as f:
        tweets = json.load(f)
    return tweets


def save_results(results: List[Tuple[str, str]], output_path: str):
    """
    保存提取结果到txt文件
    统一格式：每行第一项是meme名称/代币符号，第二项是时间
    
    Args:
        results: [(token, timestamp), ...] 格式的结果列表
        output_path: 输出文件路径
    """
    with open(output_path, 'w', encoding='utf-8') as f:
        for token, timestamp in results:
            f.write(f"{token}\t{timestamp}\n")
    print(f"结果已保存到: {output_path}")
    print(f"共提取 {len(results)} 条记录")


def parse_timestamp(created_at: str) -> str:
    """
    解析推文时间戳，转换为标准格式
    
    Args:
        created_at: ISO格式时间字符串，如 "2025-10-14T07:34:43.000Z"
        
    Returns:
        格式化的时间字符串 YYYY-MM-DD HH:MM:SS
    """
    try:
        dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        return dt.strftime('%Y-%m-%d %H:%M:%S')
    except:
        return created_at


def get_all_tweet_files(extractor_dir: str = None) -> List[str]:
    """
    获取extractor目录下所有的推文JSON文件
    
    Args:
        extractor_dir: extractor目录路径，默认为当前文件所在目录
        
    Returns:
        JSON文件路径列表
    """
    if extractor_dir is None:
        extractor_dir = os.path.dirname(os.path.abspath(__file__))
    
    json_files = []
    for file in os.listdir(extractor_dir):
        if file.startswith('user_tweets_') and file.endswith('.json'):
            json_files.append(os.path.join(extractor_dir, file))
    
    return json_files


def clean_token(token: str) -> str:
    """
    清理代币符号，移除特殊字符
    
    Args:
        token: 原始代币符号
        
    Returns:
        清理后的代币符号
    """
    # 移除$符号和其他常见前缀
    token = token.strip().upper()
    if token.startswith('$'):
        token = token[1:]
    return token


def deduplicate_results(results: List[Tuple[str, str]]) -> List[Tuple[str, str]]:
    """
    去重结果，保留每个token最早出现的时间
    
    Args:
        results: [(token, timestamp), ...] 格式的结果列表
        
    Returns:
        去重后的结果列表，按时间排序
    """
    seen = {}
    for token, timestamp in results:
        if token not in seen:
            seen[token] = timestamp
        else:
            # 保留更早的时间
            if timestamp < seen[token]:
                seen[token] = timestamp
    
    # 按时间排序
    sorted_results = sorted(seen.items(), key=lambda x: x[1])
    return sorted_results


def filter_common_words(tokens: List[str]) -> List[str]:
    """
    过滤常见词汇，只保留可能的代币符号
    
    Args:
        tokens: 代币列表
        
    Returns:
        过滤后的代币列表
    """
    # 常见的非代币词汇黑名单
    blacklist = {
        'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 
        'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM',
        'HIS', 'HOW', 'ITS', 'MAY', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO',
        'WHO', 'BOY', 'DID', 'ITS', 'LET', 'PUT', 'SAY', 'SHE', 'TOO',
        'USE', 'VIA', 'WAY', 'WHY', 'FROM', 'HAVE', 'THAT', 'THIS', 'THEY',
        'BEEN', 'CALL', 'COME', 'EACH', 'FIND', 'FIRST', 'GOOD', 'GREAT',
        'JUST', 'KNOW', 'LIKE', 'LONG', 'LOOK', 'MADE', 'MAKE', 'MANY',
        'MORE', 'MOST', 'MUCH', 'ONLY', 'OTHER', 'OVER', 'PART', 'SAID',
        'SAME', 'SOME', 'SUCH', 'TAKE', 'THAN', 'THAT', 'THEIR', 'THEM',
        'THEN', 'THERE', 'THESE', 'THINK', 'TIME', 'VERY', 'WANT', 'WELL',
        'WERE', 'WHAT', 'WHEN', 'WHERE', 'WHICH', 'WILL', 'WITH', 'WORD',
        'WORK', 'WORLD', 'WOULD', 'WRITE', 'YEAR', 'ABOUT', 'AFTER', 'AGAIN',
    }
    
    return [t for t in tokens if t not in blacklist and len(t) >= 2]

