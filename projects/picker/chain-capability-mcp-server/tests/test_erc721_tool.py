import requests
import json

# MCP 服务器地址
url = "http://127.0.0.1:3000"

# 测试 create_erc721_nft 工具
def test_create_erc721_nft():
    # 准备测试参数
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "create_erc721_nft",
            "arguments": {
                "name": "Test NFT Collection",
                "symbol": "TNFT",
                "baseURI": "https://example.com/nft/"
            }
        }
    }
    
    # 打印发送的参数
    print("Sending payload:", json.dumps(payload, indent=2))
    
    # 发送请求到正确的JSON-RPC端点
    response = requests.post(f"{url}/rpc", json=payload)
    
    # 打印响应
    print("Status Code:", response.status_code)
    print("Response:", response.text)

if __name__ == "__main__":
    test_create_erc721_nft()