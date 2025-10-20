#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
实时代币审计监听器
整合 WebSocket + BERT 提取 + DexScreener 审计 + AI 分析
"""

import websocket
import json
import time
import threading
import sys
import requests
from datetime import datetime
from collections import defaultdict
from pathlib import Path

# 添加 extractor 路径
sys.path.insert(0, str(Path(__file__).parent / 'extractor'))

from bert_extractor import BERTExtractor


class RealtimeAuditMonitor:
    """实时代币审计监听器"""
    
    def __init__(self, ws_url: str, use_bert: bool = True, use_ai: bool = False):
        """
        初始化
        
        Args:
            ws_url: WebSocket URL
            use_bert: 是否使用 BERT
            use_ai: 是否使用 AI 分析（需要 ws.py 中的 AI）
        """
        self.ws_url = ws_url
        self.ws = None
        self.running = False
        self.use_ai = use_ai
        
        # 初始化 BERT 提取器
        print("🤖 初始化 BERT 提取器...")
        self.extractor = BERTExtractor(use_gpu=False)
        self.use_bert = use_bert
        print("✅ BERT 提取器就绪\n")
        
        # 统计信息
        self.message_count = 0
        self.tweet_count = 0
        self.token_found_count = 0
        self.audit_count = 0
        
        # 缓存（避免重复审计）
        self.audited_tokens = {}  # token -> audit_result
        
    def on_message(self, ws, message):
        """处理接收到的消息"""
        try:
            self.message_count += 1
            data = json.loads(message)
            msg_type = data.get('type', 'unknown')
            
            if msg_type == 'connected':
                subs = data.get('subscriptions', 0)
                limit = data.get('subscriptionsLimit', 0)
                print(f"🔗 已连接 - 订阅: {subs}/{limit}")
            
            elif msg_type == 'subscribed':
                user_id = data.get('twitterUserId', '')
                print(f"✅ 订阅成功 - 用户ID: {user_id}")
            
            elif msg_type == 'user-update':
                # 处理推文更新
                self.process_tweet(data)
        
        except Exception as e:
            print(f"⚠️ 处理消息时出错: {e}")
    
    def process_tweet(self, data):
        """处理推文并审计代币"""
        try:
            tweet_data = data.get('data', {})
            status = tweet_data.get('status')
            
            if not status:
                return
            
            self.tweet_count += 1
            
            # 提取推文信息
            tweet_id = status.get('id', '')
            text = status.get('text', '')
            created_at = status.get('createdAt', '')
            
            user_info = tweet_data.get('twitterUser', {})
            username = user_info.get('screenName', 'Unknown')
            user_name = user_info.get('name', '')
            
            # 互动数据
            retweet_count = status.get('retweetCount', 0)
            favorite_count = status.get('favoriteCount', 0)
            
            print("\n" + "="*80)
            print(f"🐦 新推文 #{self.tweet_count}")
            print("="*80)
            print(f"👤 用户: @{username} ({user_name})")
            print(f"🕐 时间: {created_at}")
            print(f"💬 内容: {text}")
            print(f"📊 互动: ❤️ {favorite_count} | 🔄 {retweet_count}")
            
            # 提取代币
            print("\n🔍 正在提取代币...")
            tokens = self.extract_tokens(text, status.get('entities', {}))
            
            if tokens:
                print(f"💎 发现 {len(tokens)} 个潜在代币\n")
                self.token_found_count += len(tokens)
                
                # 逐个审计
                for token_info in tokens:
                    self.audit_token(token_info, text, username, tweet_id)
            else:
                print("ℹ️  未发现代币符号")
            
            print("-"*80)
            
        except Exception as e:
            print(f"⚠️ 处理推文时出错: {e}")
            import traceback
            traceback.print_exc()
    
    def extract_tokens(self, text, entities):
        """提取代币符号"""
        tokens_found = []
        seen_tokens = set()
        
        # 计算上下文得分
        context_score = self.extractor.calculate_context_score(text)
        
        # 方法1: Twitter entities (最可靠)
        for symbol in entities.get('symbols', []):
            token = symbol.get('text', '').upper()
            if token and self.extractor._is_potential_token(token):
                if token not in seen_tokens:
                    tokens_found.append({
                        'token': token,
                        'confidence': 0.95,
                        'context_score': context_score,
                        'method': 'Twitter $symbol'
                    })
                    seen_tokens.add(token)
        
        # 方法2: BERT NER
        if self.use_bert and self.extractor.ner_pipeline:
            try:
                bert_entities = self.extractor.extract_entities_with_bert(text)
                for entity in bert_entities:
                    entity_text = entity.get('word', '').strip()
                    confidence = entity.get('score', 0.0)
                    entity_type = entity.get('entity_group', '')
                    
                    if entity_type in ['ORG', 'MISC']:
                        normalized = self.extractor._normalize_entity(entity_text)
                        if normalized and self.extractor._is_potential_token(normalized):
                            token = normalized.upper()
                            if token not in seen_tokens:
                                tokens_found.append({
                                    'token': token,
                                    'confidence': confidence,
                                    'context_score': context_score,
                                    'method': f'BERT-NER ({entity_type})'
                                })
                                seen_tokens.add(token)
            except Exception as e:
                pass
        
        # 方法3: 模式匹配
        pattern_tokens = self.extractor.extract_with_patterns(text)
        for token in pattern_tokens:
            if self.extractor._is_potential_token(token):
                token = token.upper()
                if token not in seen_tokens:
                    tokens_found.append({
                        'token': token,
                        'confidence': 0.7,
                        'context_score': context_score,
                        'method': 'Pattern'
                    })
                    seen_tokens.add(token)
        
        return tokens_found
    
    def audit_token(self, token_info, tweet_text, username, tweet_id):
        """审计单个代币"""
        token = token_info['token']
        
        # 检查缓存
        if token in self.audited_tokens:
            cache_time = self.audited_tokens[token].get('audit_time', '')
            print(f"\n💰 ${token} (已审计: {cache_time})")
            print(f"   置信度: {token_info['confidence']:.2f} | 上下文: {token_info['context_score']:.2f}")
            print(f"   方法: {token_info['method']}")
            print(f"   ✅ 使用缓存结果")
            return
        
        print(f"\n{'='*80}")
        print(f"💰 代币: ${token}")
        print(f"{'='*80}")
        print(f"📊 提取信息:")
        print(f"   置信度: {token_info['confidence']:.2f}")
        print(f"   上下文评分: {token_info['context_score']:.2f}")
        print(f"   提取方法: {token_info['method']}")
        print(f"   来源推文: @{username} (ID: {tweet_id})")
        
        # 查询 DexScreener
        print(f"\n🔍 正在查询 DexScreener (BSC链)...")
        contracts = self.query_dexscreener(token)
        
        if not contracts:
            print(f"   ⚠️ 未找到合约地址")
            result = {
                'token': token,
                'contracts': [],
                'audit_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'tweet_id': tweet_id,
                'username': username
            }
            self.audited_tokens[token] = result
            return
        
        print(f"   ✅ 找到 {len(contracts)} 个合约\n")
        self.audit_count += 1
        
        # 显示所有合约
        for i, contract in enumerate(contracts, 1):
            self.display_contract(i, contract)
        
        # AI 分析（可选）
        if self.use_ai and len(contracts) > 1:
            print(f"\n🤖 正在进行 AI 风险分析...")
            ai_analysis = self.ai_analyze(token, contracts, tweet_text)
            print(ai_analysis)
        elif len(contracts) > 1:
            print(f"\n💡 提示: 发现多个合约，建议启用 AI 分析 (--use-ai)")
        
        # 缓存结果
        result = {
            'token': token,
            'contracts': contracts,
            'audit_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'tweet_id': tweet_id,
            'username': username
        }
        self.audited_tokens[token] = result
    
    def query_dexscreener(self, token_symbol):
        """查询 DexScreener API"""
        try:
            # 搜索 BSC 链上的交易对
            url = f"https://api.dexscreener.com/latest/dex/search?q={token_symbol}"
            
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            pairs = data.get('pairs', [])
            
            if not pairs:
                return []
            
            # 过滤 BSC 链的交易对
            bsc_pairs = [p for p in pairs if p.get('chainId') == 'bsc']
            
            if not bsc_pairs:
                return []
            
            # 提取合约信息
            contracts = []
            seen_addresses = set()
            
            for pair in bsc_pairs[:5]:  # 最多取5个
                base_token = pair.get('baseToken', {})
                token_address = base_token.get('address', '')
                
                if not token_address or token_address in seen_addresses:
                    continue
                
                seen_addresses.add(token_address)
                
                # 提取详细信息
                contract_info = {
                    'address': token_address,
                    'symbol': base_token.get('symbol', ''),
                    'name': base_token.get('name', ''),
                    'chain': 'BSC',
                    'dex': pair.get('dexId', ''),
                    'pair_address': pair.get('pairAddress', ''),
                    'price_usd': pair.get('priceUsd', '0'),
                    'liquidity_usd': pair.get('liquidity', {}).get('usd', 0),
                    'volume_24h': pair.get('volume', {}).get('h24', 0),
                    'price_change_24h': pair.get('priceChange', {}).get('h24', 0),
                    'txns_24h': pair.get('txns', {}).get('h24', {}),
                    'created_at': pair.get('pairCreatedAt', 0),
                    'url': pair.get('url', '')
                }
                
                contracts.append(contract_info)
            
            return contracts
            
        except Exception as e:
            print(f"   ❌ DexScreener 查询失败: {e}")
            return []
    
    def display_contract(self, index, contract):
        """显示合约信息"""
        print(f"📋 合约 #{index}")
        print(f"{'─'*80}")
        print(f"   📍 地址: {contract['address']}")
        print(f"   🏷️  符号: {contract['symbol']}")
        print(f"   📝 名称: {contract['name']}")
        print(f"   ⛓️  链: {contract['chain']}")
        print(f"   🏪 DEX: {contract['dex']}")
        print(f"   💰 价格: ${contract['price_usd']}")
        
        # 流动性
        liquidity = contract['liquidity_usd']
        if liquidity >= 1000000:
            liq_str = f"${liquidity/1000000:.2f}M"
            liq_status = "🟢"
        elif liquidity >= 100000:
            liq_str = f"${liquidity/1000:.2f}K"
            liq_status = "🟡"
        else:
            liq_str = f"${liquidity:.2f}"
            liq_status = "🔴"
        
        print(f"   💧 流动性: {liq_status} {liq_str}")
        
        # 24小时交易量
        volume = contract['volume_24h']
        if volume >= 1000000:
            vol_str = f"${volume/1000000:.2f}M"
        elif volume >= 1000:
            vol_str = f"${volume/1000:.2f}K"
        else:
            vol_str = f"${volume:.2f}"
        
        print(f"   📊 24h交易量: {vol_str}")
        
        # 24小时价格变化
        price_change = contract['price_change_24h']
        if price_change > 0:
            change_status = "📈"
        elif price_change < 0:
            change_status = "📉"
        else:
            change_status = "➡️"
        
        print(f"   {change_status} 24h涨跌: {price_change:+.2f}%")
        
        # 交易次数
        txns = contract['txns_24h']
        buys = txns.get('buys', 0)
        sells = txns.get('sells', 0)
        print(f"   🔄 24h交易: 买 {buys} | 卖 {sells}")
        
        # 创建时间
        created_at = contract['created_at']
        if created_at:
            created_time = datetime.fromtimestamp(created_at / 1000)
            age_hours = (datetime.now() - created_time).total_seconds() / 3600
            if age_hours < 24:
                age_str = f"{age_hours:.1f} 小时"
                age_status = "🔴 新币"
            elif age_hours < 168:  # 7天
                age_str = f"{age_hours/24:.1f} 天"
                age_status = "🟡 较新"
            else:
                age_str = f"{age_hours/24:.0f} 天"
                age_status = "🟢 成熟"
            
            print(f"   ⏰ 创建于: {created_time.strftime('%Y-%m-%d %H:%M')} ({age_status}, {age_str})")
        
        # URL
        if contract['url']:
            print(f"   🔗 查看: {contract['url']}")
        
        # 风险评估（启发式）
        risk_score = self.calculate_risk_score(contract)
        print(f"\n   ⚠️  风险评分: {risk_score}/10")
        
        print()
    
    def calculate_risk_score(self, contract):
        """计算风险评分 (0-10, 10为最高风险)"""
        risk = 0
        
        # 流动性检查
        liquidity = contract['liquidity_usd']
        if liquidity < 10000:
            risk += 4
        elif liquidity < 100000:
            risk += 2
        elif liquidity < 500000:
            risk += 1
        
        # 交易量检查
        volume = contract['volume_24h']
        if volume < 1000:
            risk += 3
        elif volume < 10000:
            risk += 1
        
        # 创建时间检查
        created_at = contract['created_at']
        if created_at:
            age_hours = (datetime.now() - datetime.fromtimestamp(created_at / 1000)).total_seconds() / 3600
            if age_hours < 24:
                risk += 2
            elif age_hours < 72:
                risk += 1
        
        # 交易次数检查
        txns = contract['txns_24h']
        total_txns = txns.get('buys', 0) + txns.get('sells', 0)
        if total_txns < 10:
            risk += 1
        
        return min(risk, 10)
    
    def ai_analyze(self, token, contracts, tweet_text):
        """AI 风险分析（简化版）"""
        # 这里可以集成 ws.py 中的 AI
        # 现在只返回简单的启发式建议
        
        analysis = "\n📊 风险分析:\n"
        
        if len(contracts) > 1:
            analysis += f"\n⚠️ 发现 {len(contracts)} 个合约，可能存在：\n"
            analysis += "   1. 正版 + 仿盘\n"
            analysis += "   2. 多个版本/迁移\n"
            analysis += "   3. 不同的流动性池\n"
        
        # 找出最可能的真币
        sorted_contracts = sorted(contracts, key=lambda x: (
            x['liquidity_usd'] * 0.6 +
            x['volume_24h'] * 0.3 +
            (x['txns_24h'].get('buys', 0) + x['txns_24h'].get('sells', 0)) * 10
        ), reverse=True)
        
        analysis += f"\n✅ 推荐合约: {sorted_contracts[0]['address']}\n"
        analysis += f"   原因: 最高流动性 (${sorted_contracts[0]['liquidity_usd']:,.0f})\n"
        
        if len(contracts) > 1:
            analysis += f"\n⚠️ 警惕合约: {sorted_contracts[-1]['address']}\n"
            analysis += f"   原因: 低流动性 (${sorted_contracts[-1]['liquidity_usd']:,.0f})\n"
        
        return analysis
    
    def on_error(self, ws, error):
        """处理错误"""
        print(f"❌ WebSocket 错误: {error}")
    
    def on_close(self, ws, close_status_code, close_msg):
        """连接关闭"""
        print(f"\n{'='*80}")
        print("⚠️ 连接已关闭")
        print(f"{'='*80}")
        self.running = False
        self.show_statistics()
    
    def on_open(self, ws):
        """连接建立"""
        print("✅ WebSocket 连接已建立")
        self.running = True
    
    def subscribe(self, username: str):
        """订阅用户"""
        if not self.ws or not self.running:
            print("⚠️ WebSocket 未连接")
            return False
        
        message = {
            "type": "subscribe",
            "twitterUsername": username
        }
        
        try:
            self.ws.send(json.dumps(message))
            print(f"📡 正在订阅: @{username}")
            return True
        except Exception as e:
            print(f"❌ 订阅失败: {e}")
            return False
    
    def show_statistics(self):
        """显示统计信息"""
        print("\n" + "="*80)
        print("📊 会话统计")
        print("="*80)
        print(f"收到消息: {self.message_count} 条")
        print(f"处理推文: {self.tweet_count} 条")
        print(f"发现代币: {self.token_found_count} 个")
        print(f"完成审计: {self.audit_count} 次")
        print(f"缓存代币: {len(self.audited_tokens)} 个")
        
        if self.audited_tokens:
            print("\n💎 审计过的代币:")
            for token, info in self.audited_tokens.items():
                contract_count = len(info['contracts'])
                print(f"   ${token}: {contract_count} 个合约 (审计于 {info['audit_time']})")
    
    def start(self, initial_users: list = None):
        """启动监听器"""
        print("\n" + "="*80)
        print("🚀 实时代币审计监听器")
        print("="*80)
        print(f"WebSocket: {self.ws_url[:60]}...")
        print(f"BERT 提取: {'✅ 启用' if self.use_bert else '❌ 禁用'}")
        print(f"AI 分析: {'✅ 启用' if self.use_ai else '❌ 禁用'}")
        print("="*80 + "\n")
        
        # 创建 WebSocket 连接
        self.ws = websocket.WebSocketApp(
            self.ws_url,
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close
        )
        
        # 在后台线程运行 WebSocket
        wst = threading.Thread(target=self.ws.run_forever)
        wst.daemon = True
        wst.start()
        
        # 等待连接建立
        print("⏳ 等待连接...")
        time.sleep(2)
        
        # 订阅初始用户
        if initial_users:
            print(f"\n📋 订阅 {len(initial_users)} 个用户...\n")
            for username in initial_users:
                self.subscribe(username)
                time.sleep(0.5)
        
        print("\n💡 功能说明:")
        print("   - 实时监听推文")
        print("   - BERT 提取代币符号")
        print("   - DexScreener 查询 BSC 合约")
        print("   - 显示完整合约信息")
        print("   - 风险评分和分析")
        print("   - 按 Ctrl+C 停止")
        print("\n" + "="*80)
        print("🎧 开始监听...\n")
        
        # 保持运行
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n\n👋 收到中断信号，正在退出...")
            if self.ws:
                self.ws.close()


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='实时代币审计监听器')
    parser.add_argument('users', nargs='*', help='要订阅的 Twitter 用户名')
    parser.add_argument('--no-bert', action='store_true', help='禁用 BERT')
    parser.add_argument('--use-ai', action='store_true', help='启用 AI 分析')
    parser.add_argument('--url', 
                        default='wss://p01--foxhole-backend--jb924j8sn9fb.code.run/ws/ethHackathonsrezIXgjXNr7ukySN6qNY',
                        help='WebSocket URL')
    
    args = parser.parse_args()
    
    # 创建监听器
    monitor = RealtimeAuditMonitor(
        ws_url=args.url,
        use_bert=not args.no_bert,
        use_ai=args.use_ai
    )
    
    # 启动
    try:
        monitor.start(initial_users=args.users if args.users else None)
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

