from web3 import Web3

rpc_list = [
    "https://rpc.sepolia.org",
    "https://rpc.ankr.com/eth_sepolia",
    "https://eth-sepolia.g.alchemy.com/v2/demo",
]

for rpc in rpc_list:
    print(f"正在测试 {rpc} ...")
    w3 = Web3(Web3.HTTPProvider(rpc))
    if w3.isConnected():
        print(f"✅ 已连接：{rpc}")
        print(f"当前区块高度：{w3.eth.block_number}")
        break
    else:
        print(f"❌ 无法连接：{rpc}")
