import json
import time
import web3
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware
from pathlib import Path
import requests
from config import rw_url, RPC_URL, POOL_MANAGER_ADDRESS


# 直接读取 Foundry 最新产物 ABI，确保包含新增 PoolReserves 事件
ARTIFACT_PATH = Path("/Users/eugenewill/private/TrewthServer/Websocket/PoolManager.json")
if not ARTIFACT_PATH.exists():
    # 回退至旧路径（如果用户仍保留旧副本）
    ALT_PATH = Path("/Users/eugenewill/private/TrewthServer/Websocket/PoolManager.json")
    if ALT_PATH.exists():
        ARTIFACT_PATH = ALT_PATH
    else:
        raise SystemExit("未找到 PoolManager ABI 产物，请先 forge build")

with open(ARTIFACT_PATH, "r") as f:
    artifact = json.load(f)

w3 = Web3(Web3.HTTPProvider(RPC_URL))
w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
print("web3 version:", web3.__version__)
if not w3.is_connected():
    raise SystemExit("无法连接节点")

contract = w3.eth.contract(
    address=Web3.to_checksum_address(POOL_MANAGER_ADDRESS),
    abi=artifact["abi"]
)

# 尝试获取事件对象（不同版本 ABI 若缺失会抛异常）
SwapEvent = getattr(contract.events, "Swap", None)
PoolReservesEvent = getattr(contract.events, "PoolReserves", None)
if SwapEvent is None:
    print("警告: ABI 中未找到 Swap 事件")
if PoolReservesEvent is None:
    print("警告: ABI 中未找到 PoolReserves 事件（可能未使用更新后的合约）")

last_block = w3.eth.block_number
poll_interval = 2

# 打印事件签名（帮助校验）
if SwapEvent is not None:
    swap_abi = SwapEvent.abi
    sig_text = f"{swap_abi['name']}(" + ",".join(i["type"] for i in swap_abi["inputs"]) + ")"
    print("Swap 签名:", sig_text, Web3.keccak(text=sig_text).hex())
if PoolReservesEvent is not None:
    pr_abi = PoolReservesEvent.abi
    sig_text_pr = f"{pr_abi['name']}(" + ",".join(i["type"] for i in pr_abi["inputs"]) + ")"
    print("PoolReserves 签名:", sig_text_pr, Web3.keccak(text=sig_text_pr).hex())

# 简单工具函数
Q96 = 2 ** 96


def decode_price(sqrt_price_x96: int):
    # 返回 token1 / token0 价格 (浮点近似)
    return (sqrt_price_x96 / Q96) ** 2


def get_block_time(bn: int) -> int:
    return w3.eth.get_block(bn).timestamp


# 缓存: (txHash, poolId) -> list[swap_dict]
pending_swaps = {}
# 过期检测用: txHash -> 首次看到区块
swap_first_seen_block = {}
SWAP_EXPIRE_BLOCKS = 20  # 超过 N 区块还未匹配 reserves 就独立输出


def classify_direction(amount0, amount1):
    if amount0 is None or amount1 is None:
        return None
    if amount0 < 0 and amount1 > 0:
        return "token0_for_token1"  # 用户付出 token0 得到 token1
    if amount0 > 0 and amount1 < 0:
        return "token1_for_token0"
    return "other"


def unify_output(pool_id, tx_hash, base_block, swap_part, reserves_part):
    # swap_part / reserves_part 为字典或 None
    block_ts = get_block_time(base_block)
    record = {
        "poolId": pool_id,
        "txHash": tx_hash,
        "block": base_block,
        "timestamp": block_ts,  # 保留原字段
        "completedAt": block_ts,  # 新增: 交易完成区块时间戳 (秒)
        "completedAtISO": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(block_ts)),  # 新增: 可读 UTC 时间
        "amount0": swap_part.get("amount0") if swap_part else None,
        "amount1": swap_part.get("amount1") if swap_part else None,
        "sqrtPriceX96": reserves_part.get("sqrtPriceX96") if reserves_part else (
            swap_part.get("sqrtPriceX96") if swap_part else None),
        "price_token1_per_token0": reserves_part.get("price") if reserves_part else (
            swap_part.get("price") if swap_part else None),
        "liquidity": swap_part.get("liquidity") if swap_part else (
            reserves_part.get("liquidity") if reserves_part else None),
        "tick": swap_part.get("tick") if swap_part else (reserves_part.get("tick") if reserves_part else None),
        "fee": swap_part.get("fee") if swap_part else None,
        "reserve0": reserves_part.get("reserve0") if reserves_part else None,
        "reserve1": reserves_part.get("reserve1") if reserves_part else None,
        "nativeGlobalBalance": reserves_part.get("nativeGlobalBalance") if reserves_part else None,
        "direction": classify_direction(swap_part.get("amount0") if swap_part else None,
                                       swap_part.get("amount1") if swap_part else None),
        "hasSwap": bool(swap_part),
        "hasReserves": bool(reserves_part)
    }
    url = f'http://{rw_url}:3000/data_to_RW/liquidity'
    # Correctly send the data as JSON in the request body

    response = requests.post(url, json=record)
    print(response.text)


while True:
    try:
        current_block = w3.eth.block_number
        if current_block > last_block:
            from_block = last_block + 1
            to_block = current_block
            print(f"扫描区块 {from_block} - {to_block}")

            # 获取 Swap 事件日志
            if SwapEvent is not None:
                try:
                    swap_logs = SwapEvent.get_logs(from_block=from_block, to_block=to_block)
                except TypeError:
                    swap_logs = SwapEvent.get_logs(fromBlock=from_block, toBlock=to_block)
            else:
                swap_logs = []

            # 获取 PoolReserves 事件日志
            if PoolReservesEvent is not None:
                try:
                    reserve_logs = PoolReservesEvent.get_logs(from_block=from_block, to_block=to_block)
                except TypeError:
                    reserve_logs = PoolReservesEvent.get_logs(fromBlock=from_block, toBlock=to_block)
            else:
                reserve_logs = []

            # 处理 Swap
            for ev in swap_logs:
                a = ev["args"]
                pool_id = (a.get("id").hex() if a.get("id") and hasattr(a.get("id"), "hex") else str(a.get("id")))
                txh = ev.transactionHash.hex()
                swap_part = {
                    "amount0": a.get("amount0"),
                    "amount1": a.get("amount1"),
                    "sqrtPriceX96": a.get("sqrtPriceX96"),
                    "price": decode_price(a.get("sqrtPriceX96")) if a.get("sqrtPriceX96") else None,
                    "liquidity": a.get("liquidity"),
                    "tick": a.get("tick"),
                    "fee": a.get("fee")
                }
                key = (txh, pool_id)
                pending_swaps.setdefault(key, []).append(swap_part)
                swap_first_seen_block.setdefault(key, ev.blockNumber)

            # 处理 PoolReserves (匹配或独立输出)
            for ev in reserve_logs:
                a = ev["args"]
                pool_id = (a.get("id").hex() if a.get("id") and hasattr(a.get("id"), "hex") else str(a.get("id")))
                txh = ev.transactionHash.hex()
                reserves_part = {
                    "reserve0": a.get("reserve0"),
                    "reserve1": a.get("reserve1"),
                    "nativeGlobalBalance": a.get("nativeGlobalBalance"),
                    "sqrtPriceX96": a.get("sqrtPriceX96"),
                    "price": decode_price(a.get("sqrtPriceX96")) if a.get("sqrtPriceX96") else None,
                    "liquidity": a.get("liquidity"),
                    "tick": a.get("tick")
                }
                key = (txh, pool_id)
                lst = pending_swaps.get(key)
                if lst and len(lst) > 0:
                    swap_part = lst.pop(0)
                    if not lst:
                        pending_swaps.pop(key, None)
                    unify_output(pool_id, txh, ev.blockNumber, swap_part, reserves_part)
                else:
                    # 没有匹配 swap，直接输出 reserves-only
                    unify_output(pool_id, txh, ev.blockNumber, None, reserves_part)

            # 处理过期未匹配的 swap（无 reserves）
            expired_keys = []
            for key, first_block in swap_first_seen_block.items():
                if current_block - first_block >= SWAP_EXPIRE_BLOCKS and key in pending_swaps:
                    txh, pool_id = key
                    lst = pending_swaps[key]
                    while lst:
                        sp = lst.pop(0)
                        unify_output(pool_id, txh, first_block, sp, None)
                    expired_keys.append(key)
            for key in expired_keys:
                pending_swaps.pop(key, None)
                swap_first_seen_block.pop(key, None)

            last_block = current_block
        time.sleep(poll_interval)
    except KeyboardInterrupt:
        print("停止监听")
        break
    except Exception as e:
        print("监听错误:", type(e).__name__, str(e))
        time.sleep(poll_interval)
