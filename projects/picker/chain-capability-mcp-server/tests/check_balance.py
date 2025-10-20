import requests
import json

# JSON-RPC请求数据
payload = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
        "name": "check_balance",
        "arguments": {
            "wallet_address": "0x67e2c2e6186ae9Cc17798b5bD0c3c36Ef0209aC9"  # Hardhat测试账户
        }
    }
}

# 发送请求到MCP服务器
response = requests.post(
    "http://127.0.0.1:3000/rpc",
    json=payload,
    headers={"Content-Type": "application/json"}
)

print(f"Hardhat测试账户余额:")
print(f"Status Code: {response.status_code}")
print(f"Response: {response.json()}")
