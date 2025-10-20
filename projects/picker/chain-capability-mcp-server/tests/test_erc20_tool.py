import requests
import json

# MCP服务器地址
MCP_SERVER_URL = "http://127.0.0.1:3000/rpc"

def test_create_erc20_token():
    """测试创建ERC20代币"""
    # 构造JSON-RPC请求
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "create_erc20_token",
            "arguments": {
                "name": "Test Token",
                "symbol": "TST",
                "decimals": 18,
                "initial_supply": "1000",  # 1000 TST tokens
                "initial_holder": "0x67e2c2e6186ae9Cc17798b5bD0c3c36Ef0209aC9"
            }
        }
    }
    
    # 发送POST请求
    response = requests.post(MCP_SERVER_URL, json=payload)
    
    # 打印结果
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

if __name__ == "__main__":
    test_create_erc20_token()