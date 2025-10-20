from datetime import datetime, timezone

ETH_DECIMALS = 10 ** 18

def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def eth_to_wei(v: float) -> int:
    return int(v * ETH_DECIMALS)

def wei_to_eth(v: int) -> float:
    return float(v) / ETH_DECIMALS
