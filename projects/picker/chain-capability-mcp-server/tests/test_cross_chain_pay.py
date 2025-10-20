import requests
import json
import time

# 测试跨链支付工具
def test_cross_chain_pay():
    url = "http://127.0.0.1:3000/rpc"
    
    # 测试工具列表
    print("Testing tools list...")
    list_payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/list"
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, data=json.dumps(list_payload), headers=headers)
        print(f"Tools List Status Code: {response.status_code}")
        print(f"Tools List Response: {response.text}")
    except Exception as e:
        print(f"Error getting tools list: {e}")
    
    # 测试跨链支付工具调用
    print("\nTesting cross-chain payment tool...")
    payload = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {
            "name": "cross_chain_pay",
            "arguments": {
                "from": "sepolia:usdt",
                "to": "arb-sepolia:usdc",
                "amount": "0.1",
                "from_address": "0x67e2c2e6186ae9Cc17798b5bD0c3c36Ef0209aC9",
                "recipient": "0x67e2c2e6186ae9Cc17798b5bD0c3c36Ef0209aC9"
            }
        }
    }
    
    print(f"Sending request with payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, data=json.dumps(payload), headers=headers)
        print(f"Cross-chain Pay Status Code: {response.status_code}")
        print(f"Cross-chain Pay Response: {response.text}")
        
        # 如果响应包含JSON，尝试解析它
        try:
            response_json = response.json()
            if "error" in response_json and response_json["error"]:
                print(f"Error details: {response_json['error']}")
                # 提取Meson API的详细错误信息
                error_message = response_json['error']['message']
                if 'error:' in error_message:
                    # 解析Meson API返回的详细错误
                    import re
                    match = re.search(r'error: (.*)', error_message)
                    if match:
                        meson_error = match.group(1)
                        print(f"Meson API Error: {meson_error}")
        except:
            pass
    except Exception as e:
        print(f"Error calling cross-chain pay tool: {e}")

if __name__ == "__main__":
    print("Testing cross-chain payment tool...")
    test_cross_chain_pay()