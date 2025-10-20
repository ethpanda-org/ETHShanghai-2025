from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Dict, Optional, List

import httpx


DEFAULT_API = "https://api.hyperliquid-testnet.xyz"
DEFAULT_RPC = "https://rpc.hyperliquid-testnet.xyz/evm"


@dataclass
class RPCInfo:
    chain_id: int
    block_number: int
    gas_price_wei: int


class HyperHTTP:
    def __init__(self, api_base: str = DEFAULT_API, rpc_url: str = DEFAULT_RPC, timeout: float = 10.0):
        self.api_base = api_base.rstrip("/")
        self.rpc_url = rpc_url
        self.timeout = timeout

    def rpc_ping(self) -> RPCInfo:
        with httpx.Client(timeout=self.timeout) as s:
            chain_hex = s.post(self.rpc_url, json={"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}).json()["result"]
            block_hex = s.post(self.rpc_url, json={"jsonrpc":"2.0","id":2,"method":"eth_blockNumber","params":[]}).json()["result"]
            gas_hex = s.post(self.rpc_url, json={"jsonrpc":"2.0","id":3,"method":"eth_gasPrice","params":[]}).json()["result"]
        return RPCInfo(chain_id=int(chain_hex,16), block_number=int(block_hex,16), gas_price_wei=int(gas_hex,16))

    def get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = f"{self.api_base}/{path.lstrip('/')}"
        with httpx.Client(timeout=self.timeout) as s:
            r = s.get(url, params=params)
            r.raise_for_status()
            try:
                return r.json()
            except json.JSONDecodeError:
                return {"raw": r.text}

    # --- Convenience REST helpers (fixture-friendly) ---
    def get_markets(self) -> Dict[str, Any]:
        """Fetch available markets metadata (symbol list, filters).

        Note: Exact path/shape depends on Hyper REST; tests monkeypatch `get`.
        """
        return self.get("info", params={"type": "meta"})

    def get_index_prices(self, symbols: List[str]) -> Dict[str, float]:
        """Return index prices for given symbols as {symbol: price}.

        Implementation uses a generic path and is designed to be monkeypatched
        in tests to avoid network calls.
        """
        if not symbols:
            return {}
        # Generic endpoint; concrete integration will adapt per Hyper docs.
        data = self.get("indexPrices", params={"symbols": ",".join(symbols)})
        # Expect either {"prices": {sym: price}} or a list of {symbol, price}.
        if isinstance(data, dict) and "prices" in data and isinstance(data["prices"], dict):
            return {k: float(v) for k, v in data["prices"].items()}
        if isinstance(data, list):
            out: Dict[str, float] = {}
            for item in data:
                sym = item.get("symbol")
                px = item.get("price")
                if sym is not None and px is not None:
                    out[str(sym)] = float(px)
            return out
        return {}
