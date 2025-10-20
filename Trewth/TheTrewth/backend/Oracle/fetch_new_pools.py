import os, json, time
from decimal import Decimal, getcontext
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware
import requests
from config import rw_url, RPC_URL, ENENT_ROUTER_ADDRESS, POOL_MANAGER_ADDRESS

getcontext().prec = 80

RPC = RPC_URL
w3 = Web3(Web3.HTTPProvider(RPC))
w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
if not w3.is_connected():
    raise SystemExit("RPC 未连接")

router_addr = ENENT_ROUTER_ADDRESS
if not router_addr:
    raise SystemExit("缺少 ROUTER_ADDRESS 或 ENENT_ROUTER_ADDRESS 环境变量")
ROUTER_ADDR = Web3.to_checksum_address(router_addr)
POOL_MANAGER_ADDR = POOL_MANAGER_ADDRESS
OUTPUT_PATH = os.environ.get("POOL_OUTPUT_PATH", "new_pools.jsonl")
POLL_INTERVAL = float(os.environ.get("POLL_INTERVAL", "2.0"))
FROM_BLOCK = int(os.environ.get("FROM_BLOCK", w3.eth.block_number))

ROUTER_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "address", "name": "token", "type": "address"},
            {"indexed": True, "internalType": "address", "name": "publisher", "type": "address"}
        ],
        "name": "OfficialTokenRegistered",
        "type": "event"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": False, "internalType": "address", "name": "token", "type": "address"},
            {"indexed": False, "internalType": "address", "name": "publisher", "type": "address"},
            {"indexed": False, "internalType": "uint24", "name": "fee", "type": "uint24"},
            {"indexed": False, "internalType": "uint256", "name": "nativeLiquidity", "type": "uint256"},
            {"indexed": False, "internalType": "uint256", "name": "liquidityTokens", "type": "uint256"},
            {"indexed": False, "internalType": "bool", "name": "liquidityAdded", "type": "bool"}
        ],
        "name": "TokenDeployed",
        "type": "event"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "address", "name": "token", "type": "address"},
            {"indexed": True, "internalType": "address", "name": "publisher", "type": "address"},
            {"indexed": False, "internalType": "string", "name": "geoTag", "type": "string"},
            {"indexed": False, "internalType": "string", "name": "weatherTag", "type": "string"},
            {"indexed": False, "internalType": "string[]", "name": "eventTypes", "type": "string[]"},
            {"indexed": False, "internalType": "string", "name": "eventDescription", "type": "string"},
            {"indexed": False, "internalType": "string", "name": "supplementLink", "type": "string"},
            {"indexed": False, "internalType": "uint256", "name": "eventTime", "type": "uint256"},
            {"indexed": False, "internalType": "uint256", "name": "publisherAllocationBps", "type": "uint256"},
            {"indexed": False, "internalType": "string", "name": "fullname", "type": "string"},
            {"indexed": False, "internalType": "string", "name": "ticker", "type": "string"}
        ],
        "name": "TokenMetadata",
        "type": "event"
    }
]

POOL_MANAGER_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "bytes32", "name": "id", "type": "bytes32"},
            {"indexed": True, "internalType": "address", "name": "currency0", "type": "address"},
            {"indexed": True, "internalType": "address", "name": "currency1", "type": "address"},
            {"indexed": False, "internalType": "uint24", "name": "fee", "type": "uint24"},
            {"indexed": False, "internalType": "int24", "name": "tickSpacing", "type": "int24"},
            {"indexed": False, "internalType": "address", "name": "hooks", "type": "address"},
            {"indexed": False, "internalType": "uint160", "name": "sqrtPriceX96", "type": "uint160"},
            {"indexed": False, "internalType": "int24", "name": "tick", "type": "int24"}
        ],
        "name": "Initialize",
        "type": "event"
    }
]

router = w3.eth.contract(address=ROUTER_ADDR, abi=ROUTER_ABI)
pool_manager = w3.eth.contract(address=POOL_MANAGER_ADDR, abi=POOL_MANAGER_ABI)

# 过滤器
token_meta_filter = router.events.TokenMetadata.create_filter(from_block=FROM_BLOCK)
token_deployed_filter = router.events.TokenDeployed.create_filter(from_block=FROM_BLOCK)
init_filter = pool_manager.events.Initialize.create_filter(from_block=FROM_BLOCK)

# 缓存
token_metadata = {}
token_deploy_info = {}
pool_inits = {}
token_to_pool_ids = {}
emitted = set()


def get_block_time(bn: int) -> int:
    return w3.eth.get_block(bn).timestamp


def price_from_sqrt(sqrt_price_x96: int, dec0=18, dec1=18):
    if sqrt_price_x96 == 0: return None
    p = Decimal(sqrt_price_x96)
    return (p * p) / Decimal(2 ** 192) * (Decimal(10) ** (dec0 - dec1))


def try_emit(pool_id: str):
    if pool_id in emitted: return
    init = pool_inits.get(pool_id)
    if not init: return
    c0 = init["currency0"];
    c1 = init["currency1"]
    # 简单假设事件代币为非零地址
    token = c1 if c0 == "0x0000000000000000000000000000000000000000" else c0
    meta = token_metadata.get(token)
    # print(meta)
    dep = token_deploy_info.get(token)
    if not meta or not dep: return
    tags = set()
    if meta.get("geoTag"): tags.add(meta["geoTag"])
    if meta.get("weatherTag"): tags.add(meta["weatherTag"])
    for t in meta.get("eventTypes") or []: tags.add(t)
    record = {
        "poolId": pool_id,
        "tokenAddress": token,
        "tokenPublisher": meta.get("publisher") or dep.get("publisher"),
        "tokenMetadata": {
            "ticker": meta.get("ticker"),
            "fullname": meta.get("fullname"),
            "geoTag": meta.get("geoTag"),
            "weatherTag": meta.get("weatherTag"),
            "eventTypes": meta.get("eventTypes"),
            "eventDescription": meta.get("eventDescription"),
            "supplementLink": meta.get("supplementLink"),
            "eventTime": meta.get("eventTime"),
            "publisherAllocationBps": meta.get("publisherAllocationBps"),
            "txHash": meta.get("txHash"),
            "block": meta.get("block"),
            "blockTime": meta.get("blockTime")
        },
        "deploymentInfo": {
            "fee": dep.get("fee"),
            "nativeLiquidity": str(dep.get("nativeLiquidity")),
            "liquidityTokens": str(dep.get("liquidityTokens")),
            "liquidityAdded": dep.get("liquidityAdded"),
            "txHash": dep.get("txHash"),
            "block": dep.get("block"),
            "blockTime": dep.get("blockTime")
        },
        "poolInit": {
            "currency0": c0,
            "currency1": c1,
            "fee": init["fee"],
            "tickSpacing": init["tickSpacing"],
            "hooks": init["hooks"],
            "sqrtPriceX96": str(init["sqrtPriceX96"]),
            "tick": init["tick"],
            "txHash": init["txHash"],
            "block": init["block"],
            "blockTime": init["blockTime"],
            "initialPrice_token1_per_token0": str(price_from_sqrt(init["sqrtPriceX96"]) or "")
        },
        "tags": list(tags),
        "createdAtBlock": init["block"],
        "createdAtTime": init["blockTime"]
    }
    print(record)
    url = f'http://{rw_url}:3000/data_to_RW/pools'
    # Correctly send the data as JSON in the request body

    response = requests.post(url, json=record)
    emitted.add(pool_id)


def handle_token_metadata(ev):
    a = ev["args"]
    print("[a]", a)
    token = Web3.to_checksum_address(a["token"])
    bn = ev.blockNumber
    token_metadata[token] = {
        "token": token,
        "publisher": Web3.to_checksum_address(a["publisher"]),
        "geoTag": a["geoTag"],
        "weatherTag": a["weatherTag"],
        "eventTypes": list(a["eventTypes"]),
        "eventDescription": a["eventDescription"],
        "supplementLink": a["supplementLink"],
        "eventTime": int(a["eventTime"]),
        "publisherAllocationBps": int(a["publisherAllocationBps"]),
        "txHash": ev.transactionHash.hex(),
        "block": bn,
        "blockTime": get_block_time(bn),
        "fullname": a["fullname"],
        "ticker": a["ticker"]
    }
    for pid in token_to_pool_ids.get(token, []):
        try_emit(pid)


def handle_token_deployed(ev):
    a = ev["args"]
    token = Web3.to_checksum_address(a["token"])
    bn = ev.blockNumber
    token_deploy_info[token] = {
        "token": token,
        "publisher": Web3.to_checksum_address(a["publisher"]),
        "fee": int(a["fee"]),
        "nativeLiquidity": int(a["nativeLiquidity"]),
        "liquidityTokens": int(a["liquidityTokens"]),
        "liquidityAdded": bool(a["liquidityAdded"]),
        "txHash": ev.transactionHash.hex(),
        "block": bn,
        "blockTime": get_block_time(bn)
    }
    for pid in token_to_pool_ids.get(token, []):
        try_emit(pid)


def handle_initialize(ev):
    a = ev["args"]
    pool_id = a["id"].hex()
    bn = ev.blockNumber
    currency0 = Web3.to_checksum_address(a["currency0"])
    currency1 = Web3.to_checksum_address(a["currency1"])
    pool_inits[pool_id] = {
        "currency0": currency0,
        "currency1": currency1,
        "fee": int(a["fee"]),
        "tickSpacing": int(a["tickSpacing"]),
        "hooks": a["hooks"],
        "sqrtPriceX96": int(a["sqrtPriceX96"]),
        "tick": int(a["tick"]),
        "txHash": ev.transactionHash.hex(),
        "block": bn,
        "blockTime": get_block_time(bn)
    }
    token_candidate = currency1 if currency0 == "0x0000000000000000000000000000000000000000" else currency0
    token_to_pool_ids.setdefault(token_candidate, set()).add(pool_id)
    try_emit(pool_id)


print(f"单线程监听开始：from block {FROM_BLOCK}，输出文件 {OUTPUT_PATH}")

while True:
    try:
        for e in token_meta_filter.get_new_entries():
            handle_token_metadata(e)
        for e in token_deployed_filter.get_new_entries():
            handle_token_deployed(e)
        for e in init_filter.get_new_entries():
            handle_initialize(e)
    except Exception as ex:
        print("poll error:", ex)
    time.sleep(POLL_INTERVAL)
