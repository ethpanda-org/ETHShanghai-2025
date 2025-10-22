#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
实时CA检测器 - 主入口脚本
整合Twitter WebSocket监听、BERT分析和审计功能
实时从Twitter推文中检测和审计加密货币代币合约地址
"""

import sys
import os
import time
import json
from datetime import datetime
from typing import Dict, Set
import threading
import queue

# 添加项目路径到sys.path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, 'extractor'))
sys.path.insert(0, os.path.join(project_root, 'monitor'))
sys.path.insert(0, os.path.join(project_root, 'audit'))

# 导入模块
from monitor.twitter_listener import TwitterListener
from extractor.realtime_bert_analyzer import RealtimeBERTAnalyzer
from audit.realtime_auditor import RealtimeAuditor


class RealtimeCADetector:
    """实时CA检测器"""
    
    def __init__(self, ws_url: str, use_bert: bool = True, use_ai: bool = True,
                 min_confidence: float = 0.5, min_context_score: float = 0.2,
                 auto_reconnect: bool = True, max_reconnect_attempts: int = 10,
                 ping_interval: float = 30.0, ping_timeout: float = 10.0):
        """
        初始化检测器
        
        Args:
            ws_url: Twitter WebSocket URL
            use_bert: 是否使用BERT分析
            use_ai: 是否使用AI审计
            min_confidence: 最小置信度阈值
            min_context_score: 最小上下文相关度阈值
            auto_reconnect: 是否自动重连
            max_reconnect_attempts: 最大重连次数
            ping_interval: 心跳间隔(秒)
            ping_timeout: 心跳超时时间(秒)
        """
        self.ws_url = ws_url
        self.use_bert = use_bert
        self.use_ai = use_ai
        self.min_confidence = min_confidence
        self.min_context_score = min_context_score
        
        # 创建组件
        print("\n[Detector] Initializing components...")
        self.analyzer = RealtimeBERTAnalyzer(use_gpu=False, use_bert=use_bert)
        self.auditor = RealtimeAuditor(use_ai=use_ai, rate_limit=1.5)
        self.listener = TwitterListener(ws_url, 
                                       on_tweet_callback=self.on_tweet_received,
                                       on_raw_message_callback=self.on_raw_message_received,
                                       auto_reconnect=auto_reconnect,
                                       max_reconnect_attempts=max_reconnect_attempts,
                                       ping_interval=ping_interval,
                                       ping_timeout=ping_timeout)
        
        # 已处理的代币集合(避免重复审计)
        self.processed_tokens = set()
        
        # 审计队列(用于异步处理)
        self.audit_queue = queue.Queue()
        self.audit_thread = None
        self.running = False
        
        # 统计信息
        self.stats = {
            'tweets_received': 0,
            'tokens_extracted': 0,
            'tokens_audited': 0,
            'contracts_found': 0,
        }
        
        # 结果保存
        self.results = []
        self.output_file = None
        
        # JSON日志文件
        self.json_log_file = "data/ws.json"
        self._ensure_data_dir()
        
        print("[Detector] Initialization complete")
    
    def _ensure_data_dir(self):
        """确保 data 目录存在"""
        import os
        dir_path = os.path.dirname(self.json_log_file)
        if dir_path and not os.path.exists(dir_path):
            os.makedirs(dir_path)
    
    def _save_to_json_log(self, log_data: Dict):
        """保存日志到 ws.json"""
        try:
            import json
            from datetime import datetime
            # 添加时间戳
            log_data["logged_at"] = datetime.now().isoformat()
            
            # 追加到文件
            with open(self.json_log_file, 'a', encoding='utf-8') as f:
                json.dump(log_data, f, ensure_ascii=False)
                f.write('\n')
        except Exception as e:
            print(f"[Detector] Error saving to JSON log: {e}")
    
    def on_raw_message_received(self, raw_data: Dict):
        """
        收到原始 WebSocket 消息时的回调函数
        
        Args:
            raw_data: 原始消息数据字典
        """
        try:
            # 过滤掉 status 为 null 的消息（user-update 事件中没有新推文）
            if raw_data.get('type') == 'user-update':
                data = raw_data.get('data', {})
                status = data.get('status')
                if status is None:
                    # 跳过没有新推文的用户更新事件
                    return
            
            # 保存原始消息到 ws.json
            log_entry = {
                "log_type": "raw_twitter_message",
                "timestamp": datetime.now().isoformat(),
                "message": raw_data
            }
            # 提取 tweet_event_id 并添加
            tweet_event_id = None
            msg_type = raw_data.get('type')
            if msg_type == 'tweet':
                # 直接 tweet 事件
                tweet_event_id = raw_data.get('id') or raw_data.get('data', {}).get('id')
            elif msg_type == 'user-update':
                status = raw_data.get('data', {}).get('status') or {}
                tweet_event_id = status.get('id')
            if tweet_event_id:
                log_entry["tweet_event_id"] = tweet_event_id
            self._save_to_json_log(log_entry)
            
        except Exception as e:
            print(f"[Detector] Error processing raw message: {e}")
    
    def on_tweet_received(self, tweet_data: Dict):
        """
        收到推文时的回调函数
        
        Args:
            tweet_data: 推文数据字典
        """
        self.stats['tweets_received'] += 1
        
        try:
            # 从推文数据中提取真实的推文ID
            tweet_id = tweet_data.get('id') or tweet_data.get('id_str') or str(tweet_data.get('tweet_id', ''))
            if not tweet_id:
                # 如果还是找不到ID，尝试从嵌套的 status 字段中提取
                tweet_id = tweet_data.get('status', {}).get('id') or tweet_data.get('status', {}).get('id_str')
            
            # 如果仍然没有ID，使用时间戳作为备用
            if not tweet_id:
                tweet_id = datetime.now().isoformat()
            
            # DEBUG: 打印完整的推文数据
            print("\n" + "="*70)
            print(f"[Detector] Processing tweet #{self.stats['tweets_received']}")
            print(f"[Detector] Tweet ID: {tweet_id}")
            print("="*70)
            print("[DEBUG] Complete Tweet Data:")
            print(json.dumps(tweet_data, indent=2, ensure_ascii=False))
            print("-"*70)
            
            analysis_result = self.analyzer.analyze_tweet(tweet_data)
            
            # 提取代币
            tokens = analysis_result.get('tokens', [])
            
            if not tokens:
                print("[Detector] No tokens found in this tweet")
                return
            
            print(f"[Detector] Found {len(tokens)} potential tokens:")
            for token_info in tokens:
                print(f"  - ${token_info['symbol']} "
                      f"(confidence: {token_info['confidence']:.2f}, "
                      f"context: {token_info['context_score']:.2f}, "
                      f"source: {token_info['source']})")
            
            # 过滤并加入审计队列
            for token_info in tokens:
                # 检查阈值 (满足其中一个条件即可通过)
                if (token_info['confidence'] < self.min_confidence and 
                    token_info['context_score'] < self.min_context_score):
                    print(f"[Detector] Skipping ${token_info['symbol']} (below threshold: "
                          f"confidence={token_info['confidence']:.2f}, context={token_info['context_score']:.2f})")
                    continue
                
                # 不再检查是否已处理，每次都处理
                # if token_info['symbol'] in self.processed_tokens:
                #     print(f"[Detector] Skipping ${token_info['symbol']} (already processed)")
                #     continue
                
                # 加入审计队列
                self.stats['tokens_extracted'] += 1
                
                audit_task = {
                    'token': token_info['symbol'],
                    'token_info': token_info,
                    'tweet_event_id': tweet_id,  # 添加推文事件ID
                    'tweet_data': {
                        'tweet_id': analysis_result['tweet_id'],
                        'username': analysis_result['username'],
                        'text': analysis_result['text'],
                        'timestamp': analysis_result['timestamp'],
                        'engagement': analysis_result['engagement'],
                    }
                }
                
                self.audit_queue.put(audit_task)
                print(f"[Detector] Added ${token_info['symbol']} to audit queue")
            
        except Exception as e:
            print(f"[Detector] Error processing tweet: {e}")
            import traceback
            traceback.print_exc()
    
    def audit_worker(self):
        """审计工作线程"""
        print("[Detector] Audit worker started")
        
        while self.running:
            try:
                # 从队列获取任务(超时1秒)
                try:
                    task = self.audit_queue.get(timeout=1)
                except queue.Empty:
                    continue
                
                # 执行审计
                token_symbol = task['token']
                token_info = task['token_info']
                tweet_data = task['tweet_data']
                tweet_event_id = task.get('tweet_event_id', '')
                
                print(f"\n[Detector] Auditing token: ${token_symbol}")
                print(f"[Detector] Tweet Event ID: {tweet_event_id}")
                
                # 调用审计器（传递 tweet_event_id）
                audit_result = self.auditor.audit_token(token_symbol, token_info, tweet_event_id=tweet_event_id)
                
                # 添加推文信息
                audit_result['tweet'] = tweet_data
                
                # 打印结果
                print(self.auditor.format_audit_result(audit_result))
                
                # 保存结果
                self.results.append(audit_result)
                self.stats['tokens_audited'] += 1
                
                if audit_result.get('contracts'):
                    self.stats['contracts_found'] += len(audit_result['contracts'])
                
                # 保存到文件
                if self.output_file:
                    self.save_result_to_file(audit_result)
                
                # 标记任务完成
                self.audit_queue.task_done()
                
            except Exception as e:
                print(f"[Detector] Error in audit worker: {e}")
                import traceback
                traceback.print_exc()
        
        print("[Detector] Audit worker stopped")
    
    def save_result_to_file(self, audit_result: Dict):
        """
        保存审计结果到文件
        
        Args:
            audit_result: 审计结果字典
        """
        try:
            with open(self.output_file, 'a', encoding='utf-8') as f:
                # 写入分隔符
                f.write("\n" + "="*70 + "\n")
                
                # 写入基本信息
                f.write(f"Token: ${audit_result['token']}\n")
                f.write(f"Status: {audit_result['status']}\n")
                f.write(f"Time: {audit_result.get('timestamp', 'N/A')}\n")
                
                # 写入推文信息
                if 'tweet' in audit_result:
                    tweet = audit_result['tweet']
                    f.write(f"\nTweet Info:\n")
                    f.write(f"  From: @{tweet['username']}\n")
                    f.write(f"  Tweet ID: {tweet['tweet_id']}\n")
                    f.write(f"  Time: {tweet['timestamp']}\n")
                    f.write(f"  Text: {tweet['text'][:200]}{'...' if len(tweet['text']) > 200 else ''}\n")
                    f.write(f"  Engagement: {tweet['engagement']['favorites']} favorites, "
                           f"{tweet['engagement']['retweets']} retweets\n")
                
                # 写入合约信息
                if audit_result.get('recommended_contract'):
                    rec = audit_result['recommended_contract']
                    f.write(f"\nRecommended Contract:\n")
                    f.write(f"  Address: {rec['address']}\n")
                    f.write(f"  Name: {rec['name']}\n")
                    f.write(f"  Symbol: {rec['symbol']}\n")
                    f.write(f"  Chain: {rec['chain']}\n")
                    f.write(f"  Price: ${rec['price_usd']}\n")
                    f.write(f"  Liquidity: ${rec['liquidity_usd']:,.2f}\n")
                    f.write(f"  24h Volume: ${rec['volume_24h']:,.2f}\n")
                    f.write(f"  24h Price Change: {rec['price_change_24h']:.2f}%\n")
                    f.write(f"  24h Transactions: {rec['txns_24h_total']}\n")
                    f.write(f"  Risk Level: {audit_result.get('risk_level', 'unknown').upper()}\n")
                    f.write(f"  DexScreener: {rec['dex_url']}\n")
                
                # 写入分析结果
                if audit_result.get('message'):
                    f.write(f"\nAnalysis:\n{audit_result['message']}\n")
                
                f.write("="*70 + "\n")
                f.flush()
                
        except Exception as e:
            print(f"[Detector] Error saving to file: {e}")
    
    def start(self, users_to_monitor: list, output_file: str = None):
        """
        启动检测器
        
        Args:
            users_to_monitor: 要监听的Twitter用户列表
            output_file: 输出文件路径(可选)
        """
        print("\n" + "="*70)
        print("[Detector] Realtime CA Detector")
        print("="*70)
        print(f"[Detector] Configuration:")
        print(f"  - Use BERT: {self.use_bert}")
        print(f"  - Use AI: {self.use_ai}")
        print(f"  - Min Confidence: {self.min_confidence}")
        print(f"  - Min Context Score: {self.min_context_score}")
        print(f"  - Monitoring Users: {', '.join(users_to_monitor) if users_to_monitor else 'None'}")
        print(f"  - Heartbeat: {self.listener.ping_interval}s interval, {self.listener.ping_timeout}s timeout")
        
        # 设置输出文件
        if output_file:
            self.output_file = output_file
            print(f"  - Output File: {output_file}")
            # 创建/清空输出文件
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(f"Realtime CA Detector - Results\n")
                f.write(f"Started: {datetime.now().isoformat()}\n")
                f.write(f"Monitoring Users: {', '.join(users_to_monitor) if users_to_monitor else 'None'}\n")
        
        print("="*70)
        
        # 标记为运行中
        self.running = True
        
        # 启动审计工作线程
        self.audit_thread = threading.Thread(target=self.audit_worker)
        self.audit_thread.daemon = True
        self.audit_thread.start()
        
        # 启动Twitter监听器
        self.listener.start(initial_users=users_to_monitor, daemon=False)
        
        print("\n[Detector] Detector started successfully")
        print("[Detector] Press Ctrl+C to stop\n")
        
        # 主循环 - 定期打印统计信息
        try:
            last_stats_time = time.time()
            while self.listener.is_running():
                time.sleep(1)
                
                # 每60秒打印一次统计信息
                current_time = time.time()
                if current_time - last_stats_time >= 60:
                    self.print_stats()
                    last_stats_time = current_time
        
        except KeyboardInterrupt:
            print("\n\n[Detector] Interrupted by user")
        
        finally:
            self.stop()
    
    def stop(self):
        """停止检测器"""
        print("\n[Detector] Stopping detector...")
        
        # 停止监听器
        self.listener.stop()
        
        # 等待审计队列完成
        print("[Detector] Waiting for audit queue to finish...")
        self.audit_queue.join()
        
        # 停止审计线程
        self.running = False
        if self.audit_thread:
            self.audit_thread.join(timeout=5)
        
        # 打印最终统计
        self.print_stats()
        
        print("[Detector] Detector stopped")
    
    def print_stats(self):
        """打印统计信息"""
        print("\n" + "="*70)
        print("[Detector] Statistics")
        print("="*70)
        print(f"Tweets Received: {self.stats['tweets_received']}")
        print(f"Tokens Extracted: {self.stats['tokens_extracted']}")
        print(f"Tokens Audited: {self.stats['tokens_audited']}")
        print(f"Contracts Found: {self.stats['contracts_found']}")
        print(f"Queue Size: {self.audit_queue.qsize()}")
        print("="*70 + "\n")


def main():
    """主函数"""
    import argparse
    
    # 解析命令行参数
    parser = argparse.ArgumentParser(
        description='Realtime CA Detector - Monitor Twitter and detect cryptocurrency contract addresses',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Monitor specific users with BERT and AI
  python realtime_ca_detector.py --users elonmusk VitalikButerin
  
  # Monitor with pattern matching only (no BERT, no AI)
  python realtime_ca_detector.py --users elonmusk --no-bert --no-ai
  
  # Save results to file
  python realtime_ca_detector.py --users elonmusk --output results.txt
  
  # Adjust thresholds
  python realtime_ca_detector.py --users elonmusk --min-confidence 0.7 --min-context 0.3
        """
    )
    
    parser.add_argument('--users', nargs='+', default=[],
                       help='Twitter usernames to monitor (without @)')
    parser.add_argument('--no-bert', action='store_true',
                       help='Disable BERT analysis (use pattern matching only)')
    parser.add_argument('--no-ai', action='store_true',
                       help='Disable AI audit (use heuristic rules)')
    parser.add_argument('--min-confidence', type=float, default=0.5,
                       help='Minimum confidence threshold (0-1, default: 0.5)')
    parser.add_argument('--min-context', type=float, default=0.2,
                       help='Minimum context score threshold (0-1, default: 0.2)')
    parser.add_argument('--output', type=str, default=None,
                       help='Output file path for results')
    parser.add_argument('--ws-url', type=str,
                       default='wss://p01--foxhole-backend--jb924j8sn9fb.code.run/ws/ethHackathonsrezIXgjXNr7ukySN6qNY',
                       help='WebSocket URL')
    parser.add_argument('--no-reconnect', action='store_true',
                       help='Disable auto-reconnect on connection loss')
    parser.add_argument('--max-reconnect', type=int, default=10,
                       help='Maximum reconnection attempts (0 = unlimited, default: 10)')
    parser.add_argument('--ping-interval', type=float, default=30.0,
                       help='WebSocket ping interval in seconds (default: 30)')
    parser.add_argument('--ping-timeout', type=float, default=10.0,
                       help='WebSocket ping timeout in seconds (default: 10)')
    
    args = parser.parse_args()
    
    # 检查参数
    if not args.users:
        print("Warning: No users specified to monitor")
        print("You can add users interactively or restart with --users parameter")
        print("")
    
    # 创建检测器
    detector = RealtimeCADetector(
        ws_url=args.ws_url,
        use_bert=not args.no_bert,
        use_ai=not args.no_ai,
        min_confidence=args.min_confidence,
        min_context_score=args.min_context,
        auto_reconnect=not args.no_reconnect,
        max_reconnect_attempts=args.max_reconnect,
        ping_interval=args.ping_interval,
        ping_timeout=args.ping_timeout
    )
    
    # 启动检测器
    try:
        detector.start(
            users_to_monitor=args.users,
            output_file=args.output
        )
    except Exception as e:
        print(f"\n[Detector] Fatal error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()


