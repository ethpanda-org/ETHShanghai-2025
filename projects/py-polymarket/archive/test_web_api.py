import requests
import json

try:
    response = requests.get('http://localhost:8888/api/data', timeout=5)
    data = response.json()
    print('Web监控API测试成功!')
    print(f'状态: {data.get("status")}')
    print(f'总交易数: {data.get("total_trades", 0)}')
    print(f'当前余额: ${data.get("current_balance", 0):,.0f}')
except Exception as e:
    print(f'API测试失败: {e}')