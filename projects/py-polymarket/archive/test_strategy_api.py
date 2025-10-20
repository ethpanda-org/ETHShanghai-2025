import requests
import json

try:
    response = requests.get('http://localhost:8889/api/strategy-data', timeout=5)
    data = response.json()
    print('策略监控API测试成功!')
    print(f'状态: {data.get("status")}')
    print(f'策略数量: {len(data.get("strategy_params", {}))}')
    
    # 测试时间线API
    response2 = requests.get('http://localhost:8889/api/timeline-data', timeout=5)
    timeline_data = response2.json()
    print(f'时间线事件: {len(timeline_data.get("events", []))}')
    
except Exception as e:
    print(f'API测试失败: {e}')