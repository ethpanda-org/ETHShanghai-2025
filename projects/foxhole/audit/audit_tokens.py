#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
代币审计模块
读取提取的代币列表，通过 DexScreener API 查询 BSC 链上的合约地址
使用 AI 分析真假合约
"""

import requests
import time
import json
from typing import List, Dict, Tuple
from datetime import datetime
import websocket
import threading


class AIAnalyzer:
    """AI 分析器 - 使用 WebSocket AI"""
    
    def __init__(self, ws_url: str = "wss://chat-proxy.bitseek.ai/v2/chat?apikey=ETHSH2025"):
        """初始化 AI 分析器"""
        self.ws_url = ws_url
        self.response_text = ""
        self.response_complete = False
        self.in_think_tag = False
        
    def on_message(self, ws, message):
        """处理 WebSocket 消息"""
        try:
            msg = json.loads(message)
            if msg["event"] == "message":
                chunk = msg["data"]["output"]
                
                # 过滤 <think> 标签
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
            print(f"⚠️ 消息处理错误: {e}")
    
    def on_error(self, ws, error):
        """处理错误"""
        print(f"⚠️ WebSocket 错误: {error}")
        self.response_complete = True
    
    def on_close(self, ws, close_status_code, close_msg):
        """连接关闭"""
        self.response_complete = True
    
    def on_open(self, ws):
        """连接建立"""
        pass
    
    def ask_ai(self, prompt: str, timeout: int = 30) -> str:
        """
        向 AI 提问并获取回答
        
        Args:
            prompt: 提示词
            timeout: 超时时间（秒）
            
        Returns:
            AI 的回答
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
            
            # 在后台线程运行
            wst = threading.Thread(target=ws.run_forever)
            wst.daemon = True
            wst.start()
            
            # 等待响应完成
            start_time = time.time()
            while not self.response_complete:
                if time.time() - start_time > timeout:
                    ws.close()
                    return "⚠️ AI 响应超时"
                time.sleep(0.1)
            
            return self.response_text.strip()
            
        except Exception as e:
            return f"⚠️ AI 请求失败: {e}"


class TokenAuditor:
    """代币审计器"""
    
    def __init__(self, use_ai: bool = True):
        """
        初始化审计器
        
        Args:
            use_ai: 是否使用 AI 分析（True=使用AI，False=使用启发式规则）
        """
        self.dexscreener_api = "https://api.dexscreener.com/latest/dex"
        self.bscscan_api = "https://api.bscscan.com/api"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        self.use_ai = use_ai
        if use_ai:
            self.ai_analyzer = AIAnalyzer()
            print("🤖 AI 分析器已启用")
        
    def read_token_file(self, file_path: str) -> List[Tuple[str, str]]:
        """
        读取代币文件
        
        Args:
            file_path: 文件路径
            
        Returns:
            [(token, timestamp), ...] 列表
        """
        tokens = []
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        parts = line.split('\t')
                        if len(parts) >= 2:
                            token = parts[0].strip()
                            timestamp = parts[1].strip()
                            tokens.append((token, timestamp))
        except Exception as e:
            print(f"❌ 读取文件失败: {e}")
        
        return tokens
    
    def search_token_on_dexscreener(self, token_symbol: str) -> Dict:
        """
        在 DexScreener 上搜索代币
        
        Args:
            token_symbol: 代币符号
            
        Returns:
            搜索结果字典
        """
        try:
            url = f"{self.dexscreener_api}/search/?q={token_symbol}"
            response = self.session.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return data
            else:
                return {"error": f"HTTP {response.status_code}"}
                
        except Exception as e:
            return {"error": str(e)}
    
    def filter_bsc_pairs(self, search_result: Dict) -> List[Dict]:
        """
        过滤出 BSC 链上的交易对
        
        Args:
            search_result: DexScreener 搜索结果
            
        Returns:
            BSC 交易对列表
        """
        bsc_pairs = []
        
        if "pairs" not in search_result:
            return bsc_pairs
        
        for pair in search_result.get("pairs", []):
            chain_id = pair.get("chainId", "").lower()
            # BSC 链的 chainId 可能是 "bsc" 或 "bnb"
            if chain_id in ["bsc", "bnb", "binance"]:
                bsc_pairs.append(pair)
        
        return bsc_pairs
    
    def extract_contract_info(self, bsc_pairs: List[Dict]) -> List[Dict]:
        """
        提取合约地址信息
        
        Args:
            bsc_pairs: BSC 交易对列表
            
        Returns:
            合约信息列表
        """
        contracts = []
        seen_addresses = set()
        
        for pair in bsc_pairs:
            base_token = pair.get("baseToken", {})
            token_address = base_token.get("address", "")
            
            if token_address and token_address not in seen_addresses:
                seen_addresses.add(token_address)
                
                contract_info = {
                    "address": token_address,
                    "name": base_token.get("name", "Unknown"),
                    "symbol": base_token.get("symbol", "Unknown"),
                    "dex_id": pair.get("dexId", "Unknown"),
                    "dex_url": pair.get("url", ""),
                    "price_usd": pair.get("priceUsd", "N/A"),
                    "liquidity_usd": pair.get("liquidity", {}).get("usd", 0),
                    "volume_24h": pair.get("volume", {}).get("h24", 0),
                    "price_change_24h": pair.get("priceChange", {}).get("h24", 0),
                    "txns_24h": pair.get("txns", {}).get("h24", {}).get("buys", 0) + 
                               pair.get("txns", {}).get("h24", {}).get("sells", 0),
                    "created_at": pair.get("pairCreatedAt", 0),
                }
                
                contracts.append(contract_info)
        
        # 按流动性排序
        contracts.sort(key=lambda x: x["liquidity_usd"], reverse=True)
        
        return contracts
    
    def format_contract_info(self, contracts: List[Dict]) -> str:
        """
        格式化合约信息为文本
        
        Args:
            contracts: 合约信息列表
            
        Returns:
            格式化的文本
        """
        if not contracts:
            return "未找到 BSC 链上的合约"
        
        result = []
        for i, contract in enumerate(contracts, 1):
            created_time = datetime.fromtimestamp(contract["created_at"] / 1000).strftime('%Y-%m-%d %H:%M:%S') if contract["created_at"] else "Unknown"
            
            result.append(f"""
合约 #{i}:
  地址: {contract['address']}
  名称: {contract['name']}
  符号: {contract['symbol']}
  DEX: {contract['dex_id']}
  价格: ${contract['price_usd']}
  流动性: ${contract['liquidity_usd']:,.2f}
  24h交易量: ${contract['volume_24h']:,.2f}
  24h价格变化: {contract['price_change_24h']:.2f}%
  24h交易次数: {contract['txns_24h']}
  创建时间: {created_time}
  DexScreener链接: {contract['dex_url']}
            """)
        
        return "\n".join(result)
    
    def analyze_with_ai(self, token_symbol: str, contracts: List[Dict]) -> str:
        """
        使用 AI 分析合约真假
        
        Args:
            token_symbol: 代币符号
            contracts: 合约信息列表
            
        Returns:
            AI 分析结果
        """
        if not contracts:
            return "无合约可分析"
        
        if len(contracts) == 1:
            return f"✅ 只找到一个合约地址，可能是官方合约"
        
        # 如果不使用 AI，使用启发式规则
        if not self.use_ai:
            return self._heuristic_analysis(token_symbol, contracts)
        
        # 构建 AI 分析提示词
        contract_details = []
        for i, contract in enumerate(contracts, 1):
            created_time = datetime.fromtimestamp(contract["created_at"] / 1000).strftime('%Y-%m-%d') if contract["created_at"] else "未知"
            contract_details.append(
                f"合约{i}:\n"
                f"  - 地址: {contract['address'][:10]}...{contract['address'][-8:]}\n"
                f"  - 名称: {contract['name']}\n"
                f"  - 流动性: ${contract['liquidity_usd']:,.0f}\n"
                f"  - 24h交易量: ${contract['volume_24h']:,.0f}\n"
                f"  - 24h交易次数: {contract['txns_24h']}\n"
                f"  - 24h价格变化: {contract['price_change_24h']:.2f}%\n"
                f"  - 创建时间: {created_time}\n"
                f"  - DEX: {contract['dex_id']}"
            )
        
        prompt = f"""你是一个区块链安全专家。请分析以下 BSC 链上的代币合约数据，判断真假：

代币符号: ${token_symbol}
找到 {len(contracts)} 个合约地址

{chr(10).join(contract_details)}

请分析：
1. 哪个合约最可能是真实/官方的？（给出合约编号和原因）
2. 其他合约可能是什么类型（仿冒币、骗局、分叉项目等）？
3. 投资风险提示和建议

请用中文简洁回答，突出重点，控制在 150 字以内。"""
        
        print("🤖 正在请求 AI 分析（可能需要20-40秒）...")
        # 根据合约数量调整超时时间
        timeout = min(60, 30 + len(contracts) * 2)
        ai_response = self.ai_analyzer.ask_ai(prompt, timeout=timeout)
        
        if ai_response.startswith("⚠️"):
            # AI 失败，回退到启发式规则
            print("⚠️ AI 分析失败，使用启发式规则")
            return self._heuristic_analysis(token_symbol, contracts)
        
        return f"\n🤖 AI 分析结果：\n\n{ai_response}\n"
    
    def _heuristic_analysis(self, token_symbol: str, contracts: List[Dict]) -> str:
        """
        基于启发式规则的分析
        
        Args:
            token_symbol: 代币符号
            contracts: 合约信息列表
            
        Returns:
            分析结果
        """
        if len(contracts) == 1:
            return "✅ 只有一个合约，可能是官方合约"
        
        # 按流动性、交易量、交易次数综合评分
        for contract in contracts:
            score = 0
            
            # 流动性权重 40%
            if contract["liquidity_usd"] > 100000:
                score += 4
            elif contract["liquidity_usd"] > 10000:
                score += 2
            elif contract["liquidity_usd"] > 1000:
                score += 1
            
            # 交易量权重 30%
            if contract["volume_24h"] > 50000:
                score += 3
            elif contract["volume_24h"] > 5000:
                score += 2
            elif contract["volume_24h"] > 500:
                score += 1
            
            # 交易次数权重 30%
            if contract["txns_24h"] > 100:
                score += 3
            elif contract["txns_24h"] > 20:
                score += 2
            elif contract["txns_24h"] > 5:
                score += 1
            
            contract["score"] = score
        
        # 排序
        contracts.sort(key=lambda x: x["score"], reverse=True)
        
        best = contracts[0]
        
        analysis = f"""
🤖 AI 分析结果：

✅ 最可能的真实合约: {best['address']}
   - 流动性最高: ${best['liquidity_usd']:,.2f}
   - 24h交易量: ${best['volume_24h']:,.2f}
   - 24h交易次数: {best['txns_24h']}
   - 综合评分: {best['score']}/10

"""
        
        if len(contracts) > 1:
            analysis += "⚠️ 其他合约可能是:\n"
            for contract in contracts[1:]:
                risk_level = "高风险" if contract["score"] < 3 else "中等风险"
                analysis += f"   - {contract['address'][:10]}... (评分: {contract['score']}/10, {risk_level})\n"
            
            analysis += "\n💡 投资建议:\n"
            analysis += "   - 优先选择流动性高、交易活跃的合约\n"
            analysis += "   - 警惕流动性低、交易量少的合约（可能是骗局）\n"
            analysis += "   - 在 BSCScan 上验证合约代码和审计报告\n"
        
        return analysis
    
    def audit_token(self, token_symbol: str, timestamp: str) -> Dict:
        """
        审计单个代币
        
        Args:
            token_symbol: 代币符号
            timestamp: 时间戳
            
        Returns:
            审计结果字典
        """
        print(f"\n{'='*70}")
        print(f"🔍 审计代币: ${token_symbol} (首次提及: {timestamp})")
        print(f"{'='*70}")
        
        # 搜索代币
        print(f"📡 正在 DexScreener 上搜索 ${token_symbol}...")
        search_result = self.search_token_on_dexscreener(token_symbol)
        
        if "error" in search_result:
            print(f"❌ 搜索失败: {search_result['error']}")
            return {
                "token": token_symbol,
                "status": "error",
                "message": search_result['error']
            }
        
        # 过滤 BSC 链
        bsc_pairs = self.filter_bsc_pairs(search_result)
        
        if not bsc_pairs:
            print(f"⚠️  未在 BSC 链上找到 ${token_symbol}")
            return {
                "token": token_symbol,
                "status": "not_found",
                "message": "未在 BSC 链上找到"
            }
        
        print(f"✅ 找到 {len(bsc_pairs)} 个 BSC 交易对")
        
        # 提取合约信息
        contracts = self.extract_contract_info(bsc_pairs)
        print(f"📋 识别到 {len(contracts)} 个不同的合约地址")
        
        # 格式化输出
        print("\n" + "="*70)
        print("📊 合约详细信息:")
        print("="*70)
        print(self.format_contract_info(contracts))
        
        # AI 分析
        print("\n" + "="*70)
        if self.use_ai:
            print("🤖 AI 安全分析:")
        else:
            print("📊 启发式规则分析:")
        print("="*70)
        analysis = self.analyze_with_ai(token_symbol, contracts)
        print(analysis)
        
        return {
            "token": token_symbol,
            "timestamp": timestamp,
            "status": "success",
            "contracts_count": len(contracts),
            "contracts": contracts,
            "analysis": analysis
        }
    
    def audit_token_list(self, file_path: str, limit: int = None):
        """
        审计代币列表
        
        Args:
            file_path: 代币列表文件路径
            limit: 限制审计数量（用于测试）
        """
        print(f"\n🚀 开始代币审计...")
        print(f"📁 读取文件: {file_path}")
        
        # 读取代币
        tokens = self.read_token_file(file_path)
        
        if not tokens:
            print("❌ 未找到代币数据")
            return
        
        total = len(tokens)
        if limit:
            tokens = tokens[:limit]
            print(f"📊 共有 {total} 个代币，审计前 {limit} 个")
        else:
            print(f"📊 共有 {total} 个代币")
        
        # 审计结果
        results = []
        
        # 审计每个代币
        for idx, (token, timestamp) in enumerate(tokens, 1):
            print(f"\n进度: {idx}/{len(tokens)}")
            
            result = self.audit_token(token, timestamp)
            results.append(result)
            
            # 避免请求过快
            if idx < len(tokens):
                time.sleep(1.5)  # DexScreener API 限流
        
        # 生成摘要
        self.print_summary(results)
        
        return results
    
    def print_summary(self, results: List[Dict]):
        """
        打印审计摘要
        
        Args:
            results: 审计结果列表
        """
        print("\n\n" + "="*70)
        print("📈 审计摘要")
        print("="*70)
        
        total = len(results)
        success = sum(1 for r in results if r["status"] == "success")
        not_found = sum(1 for r in results if r["status"] == "not_found")
        error = sum(1 for r in results if r["status"] == "error")
        
        print(f"总计: {total} 个代币")
        print(f"✅ 成功找到: {success} 个")
        print(f"⚠️  未找到: {not_found} 个")
        print(f"❌ 错误: {error} 个")
        
        # 多合约警告
        multi_contract_tokens = [r for r in results if r["status"] == "success" and r["contracts_count"] > 1]
        if multi_contract_tokens:
            print(f"\n⚠️  {len(multi_contract_tokens)} 个代币有多个合约地址（需要特别注意）:")
            for r in multi_contract_tokens:
                print(f"   - ${r['token']}: {r['contracts_count']} 个合约")


def main():
    """主函数"""
    import sys
    import os
    
    # 默认文件路径
    default_file = "extractor/output/user_tweets_902926941413453824_bert.txt"
    
    # 解析命令行参数
    file_path = default_file
    use_ai = True
    limit = None
    
    for i, arg in enumerate(sys.argv[1:], 1):
        if arg == "--test":
            limit = 5
        elif arg == "--no-ai":
            use_ai = False
        elif arg == "--help" or arg == "-h":
            print("""
代币审计模块 - 使用说明

用法:
  python audit_tokens.py [文件路径] [选项]

选项:
  --test      测试模式（只审计前5个代币）
  --no-ai     使用启发式规则代替 AI 分析
  --help, -h  显示此帮助信息

示例:
  # 使用 AI 审计所有代币
  python audit_tokens.py extractor/output/xxx_bert.txt
  
  # 测试模式 + AI
  python audit_tokens.py extractor/output/xxx_bert.txt --test
  
  # 使用启发式规则（不需要网络连接）
  python audit_tokens.py extractor/output/xxx_bert.txt --no-ai
  
  # 默认文件
  python audit_tokens.py
            """)
            return
        elif not arg.startswith("--"):
            file_path = arg
    
    # 检查文件是否存在
    if not os.path.exists(file_path):
        print(f"❌ 文件不存在: {file_path}")
        print(f"用法: python audit_tokens.py [文件路径] [选项]")
        print(f"运行 'python audit_tokens.py --help' 查看详细帮助")
        return
    
    # 创建审计器
    print("\n" + "="*70)
    print("🔍 代币审计模块")
    print("="*70)
    if use_ai:
        print("✅ 使用 AI 智能分析")
    else:
        print("📊 使用启发式规则分析")
    
    auditor = TokenAuditor(use_ai=use_ai)
    
    # 开始审计
    auditor.audit_token_list(file_path, limit=limit)


if __name__ == "__main__":
    main()

