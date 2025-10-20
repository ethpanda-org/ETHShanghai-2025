import requests
import json

# MCP服务器地址 - 注意使用/rpc端点
url = "http://127.0.0.1:3000/rpc"

# 构造JSON-RPC请求获取工具列表
payload = {
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": None,
    "id": 1
}

# 发送请求
try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")