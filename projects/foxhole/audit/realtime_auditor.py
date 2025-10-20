#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
实时审计模块
对提取的代币符号进行实时审计，查询BSC链上的合约地址信息
"""

import requests
import time
import json
from typing import Dict, List, Optional
from datetime import datetime
import threading
import websocket
import ssl
import os


class JSONLogger:
    """JSON日志记录器 - 将审计数据保存为JSON格式"""
    
    def __init__(self, log_file: str = "data/ws.json"):
        """初始化JSON日志记录器"""
        self.log_file = log_file
        self.ensure_data_dir()
        
    def ensure_data_dir(self):
        """确保 data 目录存在"""
        dir_path = os.path.dirname(self.log_file)
        if dir_path and not os.path.exists(dir_path):
            os.makedirs(dir_path)
    
    def save_log(self, log_data: Dict):
        """
        保存日志数据到JSON文件
        采用追加模式，每条记录一行
        
        Args:
            log_data: 要保存的日志数据字典
        """
        try:
            # 添加时间戳
            log_data["logged_at"] = datetime.now().isoformat()
            
            # 追加到文件
            with open(self.log_file, 'a', encoding='utf-8') as f:
                json.dump(log_data, f, ensure_ascii=False)
                f.write('\n')
                
        except Exception as e:
            print(f"[JSON Logger] Failed to save log: {e}")
    
    def clear_log(self):
        """清空日志文件"""
        try:
            if os.path.exists(self.log_file):
                os.remove(self.log_file)
        except Exception as e:
            print(f"[JSON Logger] Failed to clear log: {e}")


class AIAnalyzer:
    """AI分析器 - 使用WebSocket AI"""
    
    def __init__(self, ws_url: str = "wss://chat-proxy.bitseek.ai/v2/chat?apikey=ETHSH2025"):
        """初始化AI分析器"""
        self.ws_url = ws_url
        self.response_text = ""
        self.response_complete = False
        self.in_think_tag = False
        
    def on_message(self, ws, message):
        """处理WebSocket消息"""
        try:
            msg = json.loads(message)
            if msg["event"] == "message":
                chunk = msg["data"]["output"]
                
                # 过滤<think>标签
                to_print = ""
                i = 0
                while i < len(chunk):
                    if chunk[i:i+7] == '<think>':
                        self.in_think_tag = True
                        i += 7
                        continue
                    elif chunk[i:i+8] == '</think>':
                        self.in_think_tag = False
                        i += 8
                        continue
                    
                    if not self.in_think_tag:
                        to_print += chunk[i]
                    i += 1
                
                self.response_text += to_print
                
                if msg["data"]["stop"]:
                    self.response_complete = True
        except Exception as e:
            print(f"[AI] Message processing error: {e}")
    
    def on_error(self, ws, error):
        """处理错误"""
        print(f"[AI] WebSocket error: {error}")
        self.response_complete = True
    
    def on_close(self, ws, close_status_code, close_msg):
        """连接关闭"""
        self.response_complete = True
    
    def on_open(self, ws):
        """连接建立"""
        pass
    
    def ask_ai(self, prompt: str, timeout: int = 120) -> str:
        """
        向AI提问并获取回答
        
        Args:
            prompt: 提示词
            timeout: 超时时间(秒)，默认120秒
            
        Returns:
            AI的回答
        """
        self.response_text = ""
        self.response_complete = False
        self.in_think_tag = False
        
        def send_message(ws):
            ws.send(json.dumps({"event": "ping"}))
            ws.send(json.dumps({
                "event": "message",
                "data": {"prompt": prompt}
            }))
        
        try:
            ws = websocket.WebSocketApp(
                self.ws_url,
                on_open=lambda ws: send_message(ws),
                on_message=self.on_message,
                on_error=self.on_error,
                on_close=self.on_close
            )
            
            # 在后台线程运行，禁用SSL验证
            sslopt = {"cert_reqs": ssl.CERT_NONE}
            wst = threading.Thread(target=lambda: ws.run_forever(sslopt=sslopt))
            wst.daemon = True
            wst.start()
            
            # 等待响应完成
            start_time = time.time()
            while not self.response_complete:
                elapsed = time.time() - start_time
                if elapsed > timeout:
                    ws.close()
                    return f"[AI] Response timeout after {timeout} seconds (elapsed: {elapsed:.1f}s)"
                time.sleep(0.1)
            
            return self.response_text.strip()
            
        except Exception as e:
            return f"[AI] Request failed: {e}"


class RealtimeAuditor:
    """实时代币审计器"""
    
    def __init__(self, use_ai: bool = True, rate_limit: float = 1.5, enable_json_log: bool = True):
        """
        初始化审计器
        
        Args:
            use_ai: 是否使用AI分析
            rate_limit: API请求间隔时间(秒)
            enable_json_log: 是否启用JSON日志
        """
        self.dexscreener_api = "https://api.dexscreener.com/latest/dex"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        self.use_ai = use_ai
        self.rate_limit = rate_limit
        self.last_request_time = 0
        self.enable_json_log = enable_json_log
        self.current_tweet_event_id = None  # 当前处理的推文事件ID
        
        if enable_json_log:
            self.json_logger = JSONLogger()
            print("[Auditor] JSON logging enabled -> data/ws.json")
        
        if use_ai:
            self.ai_analyzer = AIAnalyzer()
            print("[Auditor] AI analyzer enabled")
        else:
            print("[Auditor] Using heuristic analysis")
    
    def _log_json(self, log_type: str, data: Dict):
        """
        记录JSON日志
        
        Args:
            log_type: 日志类型
            data: 日志数据
        """
        if self.enable_json_log:
            log_entry = {
                "log_type": log_type,
                "timestamp": datetime.now().isoformat(),
                **data
            }
            # 如果有推文事件ID，添加到日志中
            if self.current_tweet_event_id:
                log_entry["tweet_event_id"] = self.current_tweet_event_id
            
            self.json_logger.save_log(log_entry)
    
    def _rate_limit_wait(self):
        """等待以遵守API速率限制"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        if time_since_last < self.rate_limit:
            time.sleep(self.rate_limit - time_since_last)
        self.last_request_time = time.time()
    
    def _fetch_and_log_token_info(self, token_address: str):
        """
        查询代币详细信息并记录到日志
        
        Args:
            token_address: 代币地址
        """
        try:
            print(f"\n[TokenInfo] Fetching detailed info for token: {token_address}")
            self._rate_limit_wait()
            
            url = f"{self.dexscreener_api}/tokens/{token_address}"
            response = self.session.get(url, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                
                # 记录完整的代币信息
                self._log_json("token_info", {
                    "token_address": token_address,
                    "status": "success",
                    "data": result
                })
                
                print(f"[TokenInfo] Successfully fetched token info for {token_address}")
                print(f"[TokenInfo] Found {len(result.get('pairs', []))} pairs")
                
            else:
                self._log_json("token_info", {
                    "token_address": token_address,
                    "status": "error",
                    "error": f"HTTP {response.status_code}"
                })
                print(f"[TokenInfo] Error fetching token info: HTTP {response.status_code}")
                
        except Exception as e:
            self._log_json("token_info", {
                "token_address": token_address,
                "status": "error",
                "error": str(e)
            })
            print(f"[TokenInfo] Exception while fetching token info: {e}")
    
    def search_token(self, token_symbol: str) -> Dict:
        """
        在DexScreener上搜索代币
        
        Args:
            token_symbol: 代币符号
            
        Returns:
            搜索结果字典
        """
        try:
            self._rate_limit_wait()
            url = f"{self.dexscreener_api}/search/?q={token_symbol}"
            response = self.session.get(url, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                # 记录搜索日志
                self._log_json("search_token", {
                    "token_symbol": token_symbol,
                    "status": "success",
                    "total_pairs": len(result.get("pairs", []))
                })
                return result
            else:
                error_msg = f"HTTP {response.status_code}"
                self._log_json("search_token", {
                    "token_symbol": token_symbol,
                    "status": "error",
                    "error": error_msg
                })
                return {"error": error_msg}
                
        except Exception as e:
            error_msg = str(e)
            self._log_json("search_token", {
                "token_symbol": token_symbol,
                "status": "error",
                "error": error_msg
            })
            return {"error": error_msg}
    
    def filter_bsc_pairs(self, search_result: Dict) -> List[Dict]:
        """
        过滤出BSC链上的交易对
        
        Args:
            search_result: DexScreener搜索结果
            
        Returns:
            BSC交易对列表
        """
        bsc_pairs = []
        
        if "pairs" not in search_result:
            return bsc_pairs
        
        # DEBUG: 显示所有链的统计
        all_pairs = search_result.get("pairs", [])
        chain_stats = {}
        if all_pairs:
            for pair in all_pairs:
                chain_id = pair.get("chainId", "unknown")
                chain_stats[chain_id] = chain_stats.get(chain_id, 0) + 1
            
            print(f"[DEBUG] Total pairs found: {len(all_pairs)}")
            print(f"[DEBUG] Pairs by chain: {chain_stats}")
        
        for pair in search_result.get("pairs", []):
            chain_id = pair.get("chainId", "").lower()
            if chain_id in ["bsc", "bnb", "binance"]:
                bsc_pairs.append(pair)
        
        print(f"[DEBUG] BSC pairs filtered: {len(bsc_pairs)} pairs")
        
        # 记录过滤日志
        bsc_pairs_info = []
        if bsc_pairs:
            print(f"\n[DEBUG] BSC Pairs Details:")
            for i, pair in enumerate(bsc_pairs, 1):
                base_token = pair.get("baseToken", {})
                pair_info = {
                    "pair_number": i,
                    "symbol": base_token.get('symbol', 'Unknown'),
                    "dex": pair.get('dexId', 'Unknown'),
                    "token_address": base_token.get('address', 'N/A'),
                    "pair_address": pair.get('pairAddress', 'N/A'),
                    "liquidity_usd": pair.get('liquidity', {}).get('usd', 0)
                }
                bsc_pairs_info.append(pair_info)
                
                print(f"  Pair #{i}: {base_token.get('symbol', 'Unknown')} on {pair.get('dexId', 'Unknown')}")
                print(f"    - Token Address: {base_token.get('address', 'N/A')}")
                print(f"    - Pair Address: {pair.get('pairAddress', 'N/A')}")
                print(f"    - Liquidity: ${pair.get('liquidity', {}).get('usd', 0):,.2f}")
        
        self._log_json("filter_bsc_pairs", {
            "total_pairs": len(all_pairs),
            "chain_stats": chain_stats,
            "bsc_pairs_count": len(bsc_pairs),
            "bsc_pairs": bsc_pairs_info
        })
        
        return bsc_pairs
    
    def extract_contract_info(self, bsc_pairs: List[Dict]) -> List[Dict]:
        """
        提取合约地址信息
        
        Args:
            bsc_pairs: BSC交易对列表
            
        Returns:
            合约信息列表
        """
        contracts = []
        seen_addresses = set()
        duplicate_count = 0
        
        print(f"\n[DEBUG] Extracting contract info from {len(bsc_pairs)} pairs...")
        
        for pair in bsc_pairs:
            base_token = pair.get("baseToken", {})
            token_address = base_token.get("address", "")
            
            if token_address and token_address not in seen_addresses:
                seen_addresses.add(token_address)
                
                contract_info = {
                    "address": token_address,
                    "pair_address": pair.get("pairAddress", "N/A"),
                    "name": base_token.get("name", "Unknown"),
                    "symbol": base_token.get("symbol", "Unknown"),
                    "chain": "BSC",
                    "dex_id": pair.get("dexId", "Unknown"),
                    "dex_url": pair.get("url", ""),
                    "price_usd": pair.get("priceUsd", "N/A"),
                    "liquidity_usd": pair.get("liquidity", {}).get("usd", 0),
                    "volume_24h": pair.get("volume", {}).get("h24", 0),
                    "price_change_24h": pair.get("priceChange", {}).get("h24", 0),
                    "txns_24h_buys": pair.get("txns", {}).get("h24", {}).get("buys", 0),
                    "txns_24h_sells": pair.get("txns", {}).get("h24", {}).get("sells", 0),
                    "txns_24h_total": pair.get("txns", {}).get("h24", {}).get("buys", 0) + 
                                     pair.get("txns", {}).get("h24", {}).get("sells", 0),
                    "created_at": pair.get("pairCreatedAt", 0),
                    "fdv": pair.get("fdv", 0),
                    "market_cap": pair.get("marketCap", 0),
                }
                
                contracts.append(contract_info)
            elif token_address:
                # 重复的地址
                duplicate_count += 1
                print(f"[DEBUG] Duplicate address skipped: {token_address[:10]}...{token_address[-8:]}")
        
        if duplicate_count > 0:
            print(f"[DEBUG] Skipped {duplicate_count} duplicate addresses")
        
        print(f"[DEBUG] Extracted {len(contracts)} unique contracts")
        
        # 按流动性排序
        contracts.sort(key=lambda x: x["liquidity_usd"], reverse=True)
        print(f"[DEBUG] Contracts sorted by liquidity (highest first)")
        
        # DEBUG: 打印每个合约的详细信息
        if contracts:
            print(f"\n[DEBUG] Detailed Contract Information ({len(contracts)} contracts):")
            print("=" * 70)
            for i, contract in enumerate(contracts, 1):
                created_time = datetime.fromtimestamp(contract["created_at"] / 1000).strftime('%Y-%m-%d %H:%M:%S') if contract["created_at"] else "Unknown"
                print(f"\nContract #{i}:")
                print(f"  Token Address: {contract['address']}")
                print(f"  Pair Address: {contract['pair_address']}")
                print(f"  Name: {contract['name']}")
                print(f"  Symbol: {contract['symbol']}")
                print(f"  Chain: {contract['chain']}")
                print(f"  DEX: {contract['dex_id']}")
                print(f"  Price (USD): ${contract['price_usd']}")
                print(f"  Liquidity (USD): ${contract['liquidity_usd']:,.2f}")
                print(f"  24h Volume: ${contract['volume_24h']:,.2f}")
                print(f"  24h Price Change: {contract['price_change_24h']:.2f}%")
                print(f"  24h Transactions:")
                print(f"    - Buys: {contract['txns_24h_buys']}")
                print(f"    - Sells: {contract['txns_24h_sells']}")
                print(f"    - Total: {contract['txns_24h_total']}")
                print(f"  FDV: ${contract['fdv']:,.2f}" if contract['fdv'] else "  FDV: N/A")
                print(f"  Market Cap: ${contract['market_cap']:,.2f}" if contract['market_cap'] else "  Market Cap: N/A")
                print(f"  Created At: {created_time}")
                print(f"  DexScreener URL: {contract['dex_url']}")
                print("-" * 70)
            print("=" * 70 + "\n")
        
        # 记录提取的合约信息
        self._log_json("extract_contracts", {
            "total_pairs": len(bsc_pairs),
            "unique_contracts": len(contracts),
            "duplicate_count": duplicate_count,
            "contracts": contracts
        })
        
        return contracts
    
    def analyze_contracts(self, token_symbol: str, contracts: List[Dict]) -> Dict:
        """
        分析合约安全性
        
        Args:
            token_symbol: 代币符号
            contracts: 合约信息列表
            
        Returns:
            分析结果字典
        """
        if not contracts:
            return {
                "status": "not_found",
                "message": "No contracts found on BSC chain",
                "recommended_contract": None
            }
        
        if len(contracts) == 1:
            return {
                "status": "single_contract",
                "message": "Only one contract found, likely official",
                "recommended_contract": contracts[0],
                "risk_level": "low"
            }
        
        # 使用AI分析或启发式规则
        if self.use_ai:
            analysis = self._ai_analysis(token_symbol, contracts)
        else:
            analysis = self._heuristic_analysis(token_symbol, contracts)
        
        return analysis
    
    def _heuristic_analysis(self, token_symbol: str, contracts: List[Dict]) -> Dict:
        """
        基于启发式规则的分析
        
        Args:
            token_symbol: 代币符号
            contracts: 合约信息列表
            
        Returns:
            分析结果
        """
        # 按流动性、交易量、交易次数综合评分
        print(f"\n[DEBUG] Calculating risk scores for {len(contracts)} contracts...")
        print("=" * 70)
        
        for i, contract in enumerate(contracts, 1):
            score = 0
            score_breakdown = {"liquidity": 0, "volume": 0, "txns": 0}
            
            # 流动性评分 (40%)
            liquidity = contract["liquidity_usd"]
            if liquidity > 100000:
                score_breakdown["liquidity"] = 4
                score += 4
            elif liquidity > 10000:
                score_breakdown["liquidity"] = 2
                score += 2
            elif liquidity > 1000:
                score_breakdown["liquidity"] = 1
                score += 1
            
            # 交易量评分 (30%)
            volume = contract["volume_24h"]
            if volume > 50000:
                score_breakdown["volume"] = 3
                score += 3
            elif volume > 5000:
                score_breakdown["volume"] = 2
                score += 2
            elif volume > 500:
                score_breakdown["volume"] = 1
                score += 1
            
            # 交易次数评分 (30%)
            txns = contract["txns_24h_total"]
            if txns > 100:
                score_breakdown["txns"] = 3
                score += 3
            elif txns > 20:
                score_breakdown["txns"] = 2
                score += 2
            elif txns > 5:
                score_breakdown["txns"] = 1
                score += 1
            
            contract["risk_score"] = score
            
            # DEBUG: 打印评分详情
            print(f"\nContract #{i}: {contract['address'][:10]}...{contract['address'][-8:]}")
            print(f"  Liquidity: ${liquidity:,.2f} -> Score: {score_breakdown['liquidity']}/4")
            print(f"  Volume: ${volume:,.2f} -> Score: {score_breakdown['volume']}/3")
            print(f"  Transactions: {txns} -> Score: {score_breakdown['txns']}/3")
            print(f"  Total Risk Score: {score}/10")
        
        print("=" * 70)
        
        # 找到最佳合约
        contracts.sort(key=lambda x: x["risk_score"], reverse=True)
        best_contract = contracts[0]
        
        # DEBUG: 显示排序后的排名
        print(f"\n[DEBUG] Final Ranking (sorted by risk score):")
        for i, contract in enumerate(contracts, 1):
            rank = f"[Rank {i}]"
            print(f"  {rank} {contract['address'][:10]}...{contract['address'][-8:]} - Score: {contract['risk_score']}/10")
        print()
        
        # 判断风险等级
        if best_contract["risk_score"] >= 7:
            risk_level = "low"
        elif best_contract["risk_score"] >= 4:
            risk_level = "medium"
        else:
            risk_level = "high"
        
        print(f"[DEBUG] Best contract risk level: {risk_level.upper()}")
        
        analysis_text = f"""
Most likely official contract: {best_contract['address']}
- Liquidity: ${best_contract['liquidity_usd']:,.2f}
- 24h Volume: ${best_contract['volume_24h']:,.2f}
- 24h Transactions: {best_contract['txns_24h_total']}
- Risk Score: {best_contract['risk_score']}/10

Other contracts ({len(contracts)-1}):
"""
        
        for contract in contracts[1:]:
            contract_risk = "high" if contract["risk_score"] < 3 else "medium"
            analysis_text += f"- {contract['address'][:10]}... (score: {contract['risk_score']}/10, {contract_risk} risk)\n"
        
        # 记录启发式分析结果
        ranking_info = []
        for i, contract in enumerate(contracts, 1):
            ranking_info.append({
                "rank": i,
                "address": contract['address'],
                "risk_score": contract['risk_score'],
                "liquidity_usd": contract['liquidity_usd'],
                "volume_24h": contract['volume_24h'],
                "txns_24h_total": contract['txns_24h_total']
            })
        
        self._log_json("heuristic_analysis", {
            "token_symbol": token_symbol,
            "total_contracts": len(contracts),
            "recommended_contract": {
                "address": best_contract['address'],
                "risk_score": best_contract['risk_score'],
                "risk_level": risk_level
            },
            "ranking": ranking_info
        })
        
        # 查询 rank 1 代币的详细信息
        self._fetch_and_log_token_info(best_contract['address'])
        
        return {
            "status": "analyzed",
            "message": analysis_text.strip(),
            "recommended_contract": best_contract,
            "all_contracts": contracts,
            "risk_level": risk_level,
            "analysis_type": "heuristic"
        }
    
    def _ai_analysis(self, token_symbol: str, contracts: List[Dict]) -> Dict:
        """
        使用AI进行分析
        
        Args:
            token_symbol: 代币符号
            contracts: 合约信息列表
            
        Returns:
            分析结果
        """
        print("\n[AI] Preparing contract analysis...")
        
        # 先进行启发式评分，用于辅助AI和作为备选
        print("[AI] Running heuristic scoring first...")
        heuristic_result = self._heuristic_analysis(token_symbol, contracts)
        
        # 构建详细的合约信息
        contract_details = []
        for i, contract in enumerate(contracts, 1):
            created_time = datetime.fromtimestamp(contract["created_at"] / 1000).strftime('%Y-%m-%d %H:%M') if contract["created_at"] else "Unknown"
            risk_score = contract.get('risk_score', 0)
            
            detail = f"""
合约 #{i}:
  Token地址: {contract['address']}
  交易对地址: {contract['pair_address']}
  名称: {contract['name']}
  符号: {contract['symbol']}
  DEX平台: {contract['dex_id']}
  
  核心指标:
  - 当前价格: ${contract['price_usd']}
  - 流动性: ${contract['liquidity_usd']:,.2f} USD
  - 24小时交易量: ${contract['volume_24h']:,.2f} USD
  - 24小时价格变化: {contract['price_change_24h']:.2f}%
  
  交易活跃度:
  - 24小时总交易: {contract['txns_24h_total']}次
  - 买入: {contract['txns_24h_buys']}次
  - 卖出: {contract['txns_24h_sells']}次
  - 买卖比: {contract['txns_24h_buys']/(contract['txns_24h_sells']+0.0001):.2f}
  
  市值数据:
  - FDV: ${contract.get('fdv', 0):,.2f} USD
  - Market Cap: ${contract.get('market_cap', 0):,.2f} USD
  
  其他信息:
  - 创建时间: {created_time}
  - 启发式评分: {risk_score}/10
  - DexScreener: {contract['dex_url']}
"""
            contract_details.append(detail.strip())
        
        # 构建专业的AI分析prompt
        prompt = f"""你是一位经验丰富的区块链安全专家和DeFi分析师。现在需要你分析BSC链上的代币合约，识别真实合约并评估风险。

代币符号: ${token_symbol}
链上发现: {len(contracts)} 个合约地址

{'='*70}
{chr(10).join(contract_details)}
{'='*70}

分析任务:

1. **真实性判断** (最重要)
   - 判断哪个合约最可能是官方/真实的代币合约
   - 请给出具体的合约编号(#1, #2, #3...)
   - 详细说明判断依据（流动性、交易量、创建时间、买卖比等）

2. **其他合约分析**
   - 分析其他合约的可能性质：
     * 仿盘/假币 (Fake/Scam)
     * 早期测试版本 (Old Version)  
     * 不同DEX的同一代币 (Same Token, Different DEX)
     * 恶意合约 (Malicious Contract)
   - 给出每个合约的风险等级

3. **风险评估**
   - 整体投资风险: 高/中/低
   - 主要风险点（如流动性不足、交易量异常、买卖比失衡等）
   - 是否发现可疑迹象（如honeypot特征、异常卖压等）

4. **投资建议**
   - 是否建议投资此代币
   - 如果投资，应选择哪个合约
   - 具体的注意事项和风险提示

输出要求:
- 使用清晰的中文
- 突出关键信息
- 给出明确的结论
- 不要使用emoji
- 控制在500字以内

请开始分析:"""
        
        print(f"[AI] Sending {len(prompt)} characters prompt to AI...")
        print("[AI] Waiting for AI response (may take 1-3 minutes)...")
        
        # 根据合约数量调整超时时间（增加超时限制）
        # 基础60秒 + 每个合约10秒，最大3分钟
        timeout = min(180, 60 + len(contracts) * 10)
        print(f"[AI] Timeout set to {timeout} seconds for {len(contracts)} contracts")
        ai_response = self.ai_analyzer.ask_ai(prompt, timeout=timeout)
        
        # 检查AI响应
        if ai_response.startswith("[AI]") or not ai_response or len(ai_response) < 50:
            print(f"[AI] Analysis failed or incomplete: {ai_response[:100]}")
            print("[AI] Falling back to heuristic analysis")
            
            self._log_json("ai_analysis", {
                "token_symbol": token_symbol,
                "status": "failed",
                "fallback": "heuristic",
                "error": ai_response[:100] if ai_response else "No response"
            })
            
            return heuristic_result
        
        print(f"[AI] Received {len(ai_response)} characters response")
        
        # 记录AI分析结果
        self._log_json("ai_analysis", {
            "token_symbol": token_symbol,
            "status": "success",
            "response_length": len(ai_response),
            "recommended_contract": {
                "address": heuristic_result["recommended_contract"]['address'],
                "risk_level": heuristic_result["risk_level"]
            },
            "ai_response": ai_response
        })
        
        # 返回AI分析结果，使用启发式评分的推荐合约
        return {
            "status": "analyzed",
            "message": f"\n[AI Analysis]\n\n{ai_response}\n",
            "recommended_contract": heuristic_result["recommended_contract"],
            "all_contracts": contracts,
            "risk_level": heuristic_result["risk_level"],
            "analysis_type": "ai"
        }
    
    def audit_token(self, token_symbol: str, token_info: Dict = None, tweet_event_id: str = None) -> Dict:
        """
        审计单个代币
        
        Args:
            token_symbol: 代币符号
            token_info: 代币额外信息(可选)
            tweet_event_id: 推文事件ID(可选)
            
        Returns:
            审计结果字典
        """
        # 设置当前推文事件ID
        self.current_tweet_event_id = tweet_event_id
        
        print(f"\n[Auditor] Auditing token: ${token_symbol}")
        if tweet_event_id:
            print(f"[Auditor] Tweet Event ID: {tweet_event_id}")
        
        # 搜索代币
        search_result = self.search_token(token_symbol)
        
        if "error" in search_result:
            print(f"[Auditor] Search failed: {search_result['error']}")
            error_result = {
                "token": token_symbol,
                "status": "error",
                "message": search_result['error'],
                "contracts": []
            }
            
            self._log_json("audit_complete", {
                "token": token_symbol,
                "status": "error",
                "error": search_result['error']
            })
            
            return error_result
        
        # 过滤BSC链
        bsc_pairs = self.filter_bsc_pairs(search_result)
        
        if not bsc_pairs:
            print(f"[Auditor] Not found on BSC chain: ${token_symbol}")
            not_found_result = {
                "token": token_symbol,
                "status": "not_found",
                "message": "Not found on BSC chain",
                "contracts": []
            }
            
            self._log_json("audit_complete", {
                "token": token_symbol,
                "status": "not_found",
                "message": "Not found on BSC chain"
            })
            
            return not_found_result
        
        print(f"[Auditor] Found {len(bsc_pairs)} BSC pairs")
        
        # 提取合约信息
        contracts = self.extract_contract_info(bsc_pairs)
        print(f"[Auditor] Identified {len(contracts)} unique contracts")
        
        # 分析合约
        analysis = self.analyze_contracts(token_symbol, contracts)
        
        # 构建完整结果
        result = {
            "token": token_symbol,
            "status": analysis["status"],
            "message": analysis.get("message", ""),
            "contracts": contracts,
            "recommended_contract": analysis.get("recommended_contract"),
            "risk_level": analysis.get("risk_level", "unknown"),
            "analysis_type": analysis.get("analysis_type", "none"),
            "timestamp": datetime.now().isoformat()
        }
        
        if token_info:
            result["token_info"] = token_info
        
        # 记录完整的审计结果
        audit_summary = {
            "token": token_symbol,
            "status": result["status"],
            "total_contracts": len(contracts),
            "risk_level": result["risk_level"],
            "analysis_type": result["analysis_type"]
        }
        
        if result.get("recommended_contract"):
            rec = result["recommended_contract"]
            audit_summary["recommended"] = {
                "token_address": rec.get("address"),
                "pair_address": rec.get("pair_address"),
                "name": rec.get("name"),
                "symbol": rec.get("symbol"),
                "dex": rec.get("dex_id"),
                "price_usd": rec.get("price_usd"),
                "liquidity_usd": rec.get("liquidity_usd"),
                "volume_24h": rec.get("volume_24h"),
                "txns_24h_total": rec.get("txns_24h_total"),
                "risk_score": rec.get("risk_score"),
                "dex_url": rec.get("dex_url")
            }
        
        if token_info:
            audit_summary["token_info"] = token_info
        
        self._log_json("audit_complete", audit_summary)
        
        return result
    
    def format_audit_result(self, audit_result: Dict) -> str:
        """
        格式化审计结果为可读文本
        
        Args:
            audit_result: 审计结果字典
            
        Returns:
            格式化的文本
        """
        lines = []
        lines.append("=" * 70)
        lines.append(f"Token: ${audit_result['token']}")
        lines.append(f"Status: {audit_result['status']}")
        lines.append(f"Time: {audit_result.get('timestamp', 'N/A')}")
        lines.append("=" * 70)
        
        if audit_result['status'] in ['not_found', 'error']:
            lines.append(f"Result: {audit_result['message']}")
        else:
            lines.append(f"\nFound {len(audit_result['contracts'])} contracts on BSC chain")
            
            if audit_result.get('recommended_contract'):
                rec = audit_result['recommended_contract']
                lines.append(f"\n[Recommended Contract]")
                lines.append(f"Token Address: {rec['address']}")
                lines.append(f"Pair Address: {rec['pair_address']}")
                lines.append(f"Name: {rec['name']}")
                lines.append(f"Symbol: {rec['symbol']}")
                lines.append(f"Price: ${rec['price_usd']}")
                lines.append(f"Liquidity: ${rec['liquidity_usd']:,.2f}")
                lines.append(f"24h Volume: ${rec['volume_24h']:,.2f}")
                lines.append(f"24h Price Change: {rec['price_change_24h']:.2f}%")
                lines.append(f"24h Transactions: {rec['txns_24h_total']} (Buys: {rec['txns_24h_buys']}, Sells: {rec['txns_24h_sells']})")
                lines.append(f"Risk Level: {audit_result.get('risk_level', 'unknown').upper()}")
                lines.append(f"DexScreener: {rec['dex_url']}")
            
            if audit_result.get('message'):
                lines.append(f"\n[Analysis]")
                lines.append(audit_result['message'])
        
        lines.append("=" * 70)
        
        return "\n".join(lines)


def test_auditor():
    """测试审计器"""
    auditor = RealtimeAuditor(use_ai=False, rate_limit=1.5)
    
    # 测试代币
    test_tokens = ["PEPE", "DOGE"]
    
    for token in test_tokens:
        result = auditor.audit_token(token)
        print(auditor.format_audit_result(result))
        print("\n")


if __name__ == '__main__':
    test_auditor()


