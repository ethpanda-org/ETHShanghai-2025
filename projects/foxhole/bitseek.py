import websocket
import json
import time
import threading
import re
import requests
from urllib.parse import quote

URL = "wss://chat-proxy.bitseek.ai/v2/chat?apikey=ETHSH2025"
ws_app = None
is_streaming = False
output_buffer = ""
web_search_enabled = True  # 是否启用自动联网搜索

def on_message(ws, message):
    global is_streaming, output_buffer
    msg = json.loads(message)
    if msg["event"] == "message":
        is_streaming = True
        chunk = msg["data"]["output"]
        output_buffer += chunk
        
        # 直接输出所有内容，包括 <think> 标签
        print(chunk, end="", flush=True)
        
        if msg["data"]["stop"]:
            print("\n--- Stream End ---\n")
            is_streaming = False
            output_buffer = ""
    elif msg["event"] == "error":
        print("❌ Error:", msg["data"]["error"])
        is_streaming = False
        output_buffer = ""

def search_crypto_info(query):
    """搜索加密货币相关信息"""
    results = []
    
    # 检测是否是加密货币查询
    crypto_keywords = ['coin', 'token', 'crypto', '币', 'meme', 'btc', 'eth', 'sol']
    is_crypto = any(kw in query.lower() for kw in crypto_keywords)
    
    if not is_crypto:
        return results
    
    try:
        print("💰 正在获取加密货币数据...")
        
        # 使用 CoinGecko API
        # 获取趋势币种
        trending_url = "https://api.coingecko.com/api/v3/search/trending"
        response = requests.get(trending_url, timeout=10)
        
        if response.status_code == 200:
            trending_data = response.json()
            coins = trending_data.get('coins', [])[:5]
            
            if coins:
                snippet = "🔥 当前热门加密货币：\n"
                for i, item in enumerate(coins, 1):
                    coin = item.get('item', {})
                    name = coin.get('name', '')
                    symbol = coin.get('symbol', '')
                    market_cap_rank = coin.get('market_cap_rank', 'N/A')
                    price_btc = coin.get('price_btc', 0)
                    
                    snippet += f"\n{i}. {name} (${symbol})\n"
                    snippet += f"   市值排名: #{market_cap_rank}\n"
                    snippet += f"   价格(BTC): {price_btc:.8f}\n"
                
                results.append({
                    'title': '🔥 热门加密货币（CoinGecko实时数据）',
                    'snippet': snippet,
                    'url': 'https://www.coingecko.com/en/categories/meme-token'
                })
        
        # 获取 meme 币分类
        meme_url = "https://api.coingecko.com/api/v3/coins/markets"
        params = {
            'vs_currency': 'usd',
            'category': 'meme-token',
            'order': 'volume_desc',
            'per_page': 5,
            'page': 1,
            'sparkline': False
        }
        
        response = requests.get(meme_url, params=params, timeout=10)
        
        if response.status_code == 200:
            meme_coins = response.json()
            
            if meme_coins:
                snippet = "🎭 Meme币实时行情：\n"
                for i, coin in enumerate(meme_coins, 1):
                    name = coin.get('name', '')
                    symbol = coin.get('symbol', '').upper()
                    price = coin.get('current_price', 0)
                    change_24h = coin.get('price_change_percentage_24h', 0)
                    volume = coin.get('total_volume', 0)
                    market_cap = coin.get('market_cap', 0)
                    
                    change_emoji = "📈" if change_24h > 0 else "📉"
                    snippet += f"\n{i}. {name} (${symbol})\n"
                    snippet += f"   价格: ${price:.6f}\n"
                    snippet += f"   24h变化: {change_emoji} {change_24h:.2f}%\n"
                    snippet += f"   24h成交量: ${volume:,.0f}\n"
                    snippet += f"   市值: ${market_cap:,.0f}\n"
                
                results.append({
                    'title': '🎭 Meme币实时市场数据（按交易量排序）',
                    'snippet': snippet,
                    'url': 'https://www.coingecko.com/en/categories/meme-token'
                })
        
        if results:
            print(f"✅ 获取到加密货币数据\n")
        
    except Exception as e:
        print(f"⚠️ 加密货币API请求失败: {e}")
    
    return results

def search_web_enhanced(query, num_results=5):
    """增强的网络搜索，使用多个搜索源"""
    try:
        # 显示截断的查询
        display_query = query[:60] + "..." if len(query) > 60 else query
        print(f"🔍 网络搜索中...")
        all_results = []
        
        # 方法1: 使用 DuckDuckGo Instant Answer API
        try:
            url = f"https://api.duckduckgo.com/?q={quote(query)}&format=json&no_html=1"
            response = requests.get(url, timeout=10)
            data = response.json()
            
            if data.get('AbstractText'):
                all_results.append({
                    'title': data.get('Heading', 'Summary'),
                    'snippet': data['AbstractText'],
                    'url': data.get('AbstractURL', ''),
                    'source': 'DuckDuckGo'
                })
            
            for topic in data.get('RelatedTopics', [])[:3]:
                if isinstance(topic, dict) and 'Text' in topic:
                    all_results.append({
                        'title': topic.get('Text', '').split(' - ')[0][:100],
                        'snippet': topic.get('Text', ''),
                        'url': topic.get('FirstURL', ''),
                        'source': 'DuckDuckGo'
                    })
        except Exception as e:
            print(f"  DuckDuckGo搜索失败: {e}")
        
        # 方法2: 使用 HTML 抓取 DuckDuckGo
        try:
            from bs4 import BeautifulSoup
            search_url = f"https://html.duckduckgo.com/html/?q={quote(query)}"
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
            response = requests.get(search_url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                results_divs = soup.find_all('div', class_='result', limit=5)
                
                for div in results_divs:
                    title_elem = div.find('a', class_='result__a')
                    snippet_elem = div.find('a', class_='result__snippet')
                    
                    if title_elem:
                        all_results.append({
                            'title': title_elem.get_text(strip=True),
                            'snippet': snippet_elem.get_text(strip=True) if snippet_elem else '',
                            'url': title_elem.get('href', ''),
                            'source': 'DuckDuckGo HTML'
                        })
        except ImportError:
            print("  提示: 安装 beautifulsoup4 可获得更好的搜索结果")
        except Exception as e:
            print(f"  HTML搜索失败: {e}")
        
        # 去重
        seen_urls = set()
        unique_results = []
        for result in all_results:
            url = result.get('url', '')
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_results.append(result)
            elif not url and result.get('snippet'):  # 没有URL但有内容的结果
                unique_results.append(result)
        
        if unique_results:
            print(f"✅ 找到 {len(unique_results)} 条相关信息\n")
            return unique_results[:num_results]
        else:
            print("⚠️ 未找到相关结果\n")
            return []
        
    except Exception as e:
        print(f"⚠️ 搜索失败: {e}\n")
        return []

def search_web(query, num_results=5):
    """综合搜索入口"""
    all_results = []
    
    # 检测是否是加密货币查询
    crypto_keywords = ['coin', 'token', 'crypto', '币', 'meme', 'btc', 'eth', 'sol']
    is_crypto = any(kw in query.lower() for kw in crypto_keywords)
    
    # 先尝试加密货币专用搜索
    if is_crypto:
        crypto_results = search_crypto_info(query)
        all_results.extend(crypto_results)
        # 如果已经有足够的加密货币数据，就不再进行通用搜索
        if len(crypto_results) >= 2:
            return all_results
    
    # 再进行通用网络搜索
    web_results = search_web_enhanced(query, num_results)
    all_results.extend(web_results)
    
    return all_results[:num_results + 2]  # 返回更多结果

def needs_web_search(query):
    """智能判断查询是否需要联网搜索"""
    query_lower = query.lower()
    
    # 排除场景：用户提供了具体内容让AI分析
    exclude_patterns = [
        'analyze', 'explain', 'what is', 'what are', 'how to', 'why',
        'there is a post', 'here is', 'the post says', 'the content is',
        '分析', '解释', '这是', '这里有', '帖子说', '内容是', '这段', '这个',
        'tell me which', 'which word', 'probable', '告诉我', '哪个词'
    ]
    
    for pattern in exclude_patterns:
        if pattern in query_lower:
            return False
    
    # 强触发词组合（需要上下文）
    strong_triggers = [
        ('最新', ['价格', '消息', '新闻', '动态', '行情', '数据']),
        ('今天', ['价格', '行情', '新闻', '涨', '跌']),
        ('现在', ['价格', '行情', '多少']),
        ('当前', ['价格', '行情', '市值']),
        ('latest', ['price', 'news', 'update', 'data']),
        ('today', ['price', 'market', 'news']),
        ('current', ['price', 'market', 'value']),
    ]
    
    # 检查强触发词组合
    for trigger, contexts in strong_triggers:
        if trigger in query_lower:
            if any(ctx in query_lower for ctx in contexts):
                return True
    
    # 加密货币相关（强制搜索）
    crypto_search_patterns = [
        'meme coin', 'meme币', '币价格', 'token price', '币行情',
        '热门币', 'trending crypto', '涨幅', 'price change',
        'btc price', 'eth price', 'sol price', '比特币价格'
    ]
    
    for pattern in crypto_search_patterns:
        if pattern in query_lower:
            return True
    
    # 时效性问题（必须有明确的查询意图）
    time_query_patterns = [
        '2024年.*什么', '2025年.*什么', '今年.*什么',
        'what.*2024', 'what.*2025', 'what.*this year',
        '最近.*发生', '最近.*新闻', 'recent.*news', 'recent.*event'
    ]
    
    import re
    for pattern in time_query_patterns:
        if re.search(pattern, query_lower):
            return True
    
    return False

def extract_search_keywords(query):
    """从查询中提取核心搜索关键词"""
    import re
    
    query_lower = query.lower()
    
    # 移除常见的问句模式
    query_clean = re.sub(r'(please |帮我 |帮忙 |tell me |给我 |查一下 |搜索 )', '', query_lower)
    query_clean = re.sub(r'(what is |what are |how to |why |什么是 |怎么 |为什么 )', '', query_clean)
    query_clean = re.sub(r'(now you tell me|告诉我|分析|explain)', '', query_clean)
    
    # 提取关键短语
    # 加密货币名称
    crypto_names = re.findall(r'\b(bitcoin|btc|ethereum|eth|solana|sol|doge|shib|pepe|meme coin|meme币)\b', query_clean)
    
    # 价格/行情相关
    price_terms = re.findall(r'\b(price|价格|行情|market|涨幅|跌幅)\b', query_clean)
    
    # 时间相关
    time_terms = re.findall(r'\b(today|今天|latest|最新|current|当前|now|现在)\b', query_clean)
    
    # 组合关键词
    keywords = []
    if crypto_names:
        keywords.extend(crypto_names[:2])
    if price_terms:
        keywords.append(price_terms[0])
    if time_terms:
        keywords.append(time_terms[0])
    
    # 如果没有提取到关键词，返回原始查询的前50个字符
    if not keywords:
        # 提取名词短语
        words = query_clean.split()
        # 移除太短或太长的词
        meaningful_words = [w for w in words if 3 <= len(w) <= 20]
        if meaningful_words:
            return ' '.join(meaningful_words[:5])
        return query[:50]
    
    return ' '.join(keywords)

def format_search_results(results):
    """格式化搜索结果为更自然的形式"""
    if not results:
        return ""
    
    formatted = "\n\n[参考资料 - 以下是实时搜索结果]\n"
    for i, result in enumerate(results, 1):
        formatted += f"\n{i}. {result['title']}\n"
        snippet = result['snippet']
        # 智能截取
        if len(snippet) > 300:
            formatted += f"   {snippet[:300]}...\n"
        else:
            formatted += f"   {snippet}\n"
        if result.get('url'):
            formatted += f"   🔗 {result['url']}\n"
    formatted += "\n[参考资料结束]\n\n"
    return formatted

def create_enhanced_prompt(user_query, search_results):
    """创建增强的提示词，智能整合搜索结果"""
    if not search_results:
        return user_query
    
    # 判断查询类型
    has_crypto = any(kw in user_query.lower() for kw in ['coin', 'token', 'crypto', '币', 'btc', 'eth'])
    
    if has_crypto:
        # 加密货币查询
        prompt = f"""用户问题: {user_query}

{format_search_results(search_results)}

请基于以上实时数据回答用户的问题。注意：
1. 优先使用搜索结果中的实时数据（价格、涨跌幅等）
2. 如果数据不完整，说明数据来源和时效性
3. 提供清晰的数字和百分比
4. 如果是 meme 币，可以提及市场趋势和风险提示"""
    else:
        # 通用查询
        prompt = f"""{user_query}

{format_search_results(search_results)}

请参考以上搜索结果回答问题，综合多个来源的信息给出准确答案。"""
    
    return prompt

def on_open(ws):
    print("✅ Connected")
    print("💡 Type your message and press Enter to send.")
    print("💡 Type '/search <query>' to force web search.")
    print("💡 Type '/toggle' to enable/disable auto web search.")
    print("💡 Type 'quit' or 'exit' to close the connection.\n")
    print(f"🌐 Auto web search: {'ON' if web_search_enabled else 'OFF'}\n")
    ws.send(json.dumps({"event": "ping"}))

def on_close(ws, close_status_code, close_msg):
    print(f"\n⚠️ Connection closed: {close_status_code} - {close_msg}")

def on_error(ws, error):
    print(f"❌ WebSocket error: {error}")

def send_message(prompt):
    global ws_app
    if ws_app:
        ws_app.send(json.dumps({
            "event": "message",
            "data": {"prompt": prompt}
        }))

def input_thread():
    """处理用户输入的线程"""
    global ws_app, is_streaming, web_search_enabled
    time.sleep(1)  # 等待连接建立
    
    while True:
        try:
            # 等待流式输出完成
            while is_streaming:
                time.sleep(0.1)
            
            user_input = input("You: ").strip()
            
            # 处理退出命令
            if user_input.lower() in ['quit', 'exit']:
                print("👋 Closing connection...")
                if ws_app:
                    ws_app.close()
                break
            
            # 处理切换命令
            if user_input.lower() == '/toggle':
                web_search_enabled = not web_search_enabled
                print(f"🌐 Auto web search: {'ON' if web_search_enabled else 'OFF'}\n")
                continue
            
            if user_input:
                print()  # 空行分隔
                
                # 处理强制搜索命令
                if user_input.startswith('/search '):
                    query = user_input[8:].strip()
                    if query:
                        # 提取搜索关键词
                        search_keywords = extract_search_keywords(query)
                        print(f"🔑 搜索关键词: {search_keywords}\n")
                        
                        search_results = search_web(search_keywords)
                        if search_results:
                            enhanced_prompt = create_enhanced_prompt(query, search_results)
                            send_message(enhanced_prompt)
                        else:
                            print("⚠️ 未找到搜索结果，使用原始问题\n")
                            send_message(query)
                    continue
                
                # 自动判断是否需要搜索
                if web_search_enabled and needs_web_search(user_input):
                    # 提取搜索关键词
                    search_keywords = extract_search_keywords(user_input)
                    print(f"🔑 搜索关键词: {search_keywords}\n")
                    
                    search_results = search_web(search_keywords)
                    if search_results:
                        enhanced_prompt = create_enhanced_prompt(user_input, search_results)
                        send_message(enhanced_prompt)
                    else:
                        print("⚠️ 未找到搜索结果，使用原始问题\n")
                        send_message(user_input)
                else:
                    send_message(user_input)
            
        except (EOFError, KeyboardInterrupt):
            print("\n👋 Closing connection...")
            if ws_app:
                ws_app.close()
            break

def run_ws():
    global ws_app
    ws_app = websocket.WebSocketApp(
        URL,
        on_open=on_open,
        on_message=on_message,
        on_close=on_close,
        on_error=on_error
    )
    
    # 启动输入线程
    thread = threading.Thread(target=input_thread, daemon=True)
    thread.start()
    
    # 运行 WebSocket
    ws_app.run_forever()

if __name__ == "__main__":
    run_ws()