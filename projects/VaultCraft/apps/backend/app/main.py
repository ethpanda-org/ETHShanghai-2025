from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict
import os
import json
from pathlib import Path

from .metrics import compute_metrics
from .hyper_client import HyperHTTP, DEFAULT_API
from .price_provider import PriceRouter, CachedPriceRouter
from .hyper_exec import HyperExecClient, Order
from .cache import TTLCache
from .settings import settings
from .positions import get_profile
from .snapshots import store as snapshot_store
from .events import store as event_store
from .exec_service import ExecService
from .daemon import SnapshotDaemon
from .user_listener import UserEventsListener, last_ws_event
from .hyper_client import HyperHTTP
from .alerts import manager as alert_manager


def _repo_root() -> Path:
    root = Path(__file__).resolve().parent
    for _ in range(10):
        if (root / ".git").exists() or (root / "README.md").exists():
            return root
        if root.parent == root:
            break
        root = root.parent
    return root


REPO_ROOT = _repo_root()

app = FastAPI(title="VaultCraft v0 API")

_LOCAL_DEV_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_LOCAL_DEV_ORIGINS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}


_snapshot_daemon: SnapshotDaemon | None = None
_user_listener: UserEventsListener | None = None


@app.get("/api/v1/status")
def api_status():
    # Sanitize settings for FE/ops visibility
    flags = {
        "enable_sdk": bool(getattr(settings, "ENABLE_HYPER_SDK", False)),
        "enable_live_exec": bool(getattr(settings, "ENABLE_LIVE_EXEC", False)),
        "enable_user_ws": bool(getattr(settings, "ENABLE_USER_WS_LISTENER", False)),
        "enable_snapshot_daemon": bool(getattr(settings, "ENABLE_SNAPSHOT_DAEMON", False)),
        "address": getattr(settings, "ADDRESS", None),
        "allowed_symbols": getattr(settings, "EXEC_ALLOWED_SYMBOLS", ""),
        "exec_min_leverage": getattr(settings, "EXEC_MIN_LEVERAGE", None),
        "exec_max_leverage": getattr(settings, "EXEC_MAX_LEVERAGE", None),
        "exec_max_notional_usd": getattr(settings, "EXEC_MAX_NOTIONAL_USD", None),
        "exec_min_notional_usd": getattr(settings, "EXEC_MIN_NOTIONAL_USD", None),
    }
    try:
        http = HyperHTTP()
        info = http.rpc_ping()
        rpc = {"rpc": http.rpc_url, "chainId": info.chain_id, "block": info.block_number}
    except Exception:
        rpc = {"rpc": getattr(settings, "HYPER_RPC_URL", None), "chainId": None, "block": None}
    # runtime daemon states
    listener_state = "disabled"
    if flags["enable_live_exec"] and flags["enable_user_ws"]:
        listener_state = "idle"
        if _user_listener and _user_listener.is_running():
            listener_state = "running"
    snapshot_state = "disabled"
    if flags["enable_snapshot_daemon"]:
        snapshot_state = "idle"
        if _snapshot_daemon and _snapshot_daemon.is_running():
            snapshot_state = "running"
    vault_key = flags["address"] or "_global"
    last_ws = None
    try:
        last_ws = last_ws_event(vault_key)
    except Exception:
        last_ws = None
    state = {
        "listener": listener_state,
        "snapshot": snapshot_state,
        "listenerLastTs": last_ws,
    }
    return {"ok": True, "flags": flags, "network": rpc, "state": state}


@app.post("/metrics")
def metrics_endpoint(nav_series: list[float]):
    """Compute basic metrics from a NAV series (daily)."""
    return compute_metrics(nav_series)


# --- v1 API skeleton ---
@app.get("/api/v1/metrics/{address}")
def api_metrics(address: str, series: Optional[str] = None):
    """Compute metrics for a vault address.

    - Optional query `series` as comma-separated NAV values for demo/testing.
    - In production, NAV would be sourced from storage/indexer.
    """
    if series:
        try:
            nav = [float(x) for x in series.split(",") if x]
        except ValueError:
            return {"error": "invalid series"}
        return compute_metrics(nav)
    # Fallback demo series
    demo = [1.0, 1.01, 0.99, 1.03, 1.05]
    return compute_metrics(demo)


_nav_cache = TTLCache[str, List[float]](ttl_seconds=float(getattr(settings, "NAV_CACHE_TTL", 2.0)))


@app.get("/api/v1/nav/{address}")
def api_nav(address: str, window: int = 30):
    """Return NAV series for a vault.

    v0 demo: compute NAV from a static cash+positions profile per vault id using
    current index prices. Series is a flat timeline using the same NAV value
    repeated, suitable for UI until storage/backfill is added.
    """
    cache_key = f"{address}:{window}"
    cached = _nav_cache.get(cache_key)
    if cached is not None:
        return {"address": address, "nav": cached}
    # Prefer stored snapshots if available
    series = snapshot_store.get(address, window=window)
    if series:
        nav = [round(v, 6) for (_, v) in series]
        _nav_cache.set(cache_key, nav)
        return {"address": address, "nav": nav}

    profile = get_profile(address)
    router = PriceRouter()
    syms = list(profile.get("positions", {}).keys()) if profile else []
    try:
        prices = router.get_index_prices(syms) if syms else {}
    except Exception:
        prices = {s: 1000.0 + 100.0 * i for i, s in enumerate(syms)}
    nav_val = HyperExecClient.pnl_to_nav(cash=profile.get("cash", 1_000_000.0), positions=profile.get("positions", {}), index_prices=prices)
    nav = [round(nav_val / profile.get("denom", 1_000_000.0), 6)] * max(1, window)
    _nav_cache.set(cache_key, nav)
    return {"address": address, "nav": nav}


@app.get("/api/v1/nav_series/{address}")
def api_nav_series(address: str, since: float | None = None, window: int | None = None):
    if since is not None:
        series = snapshot_store.get_since(address, since_ts=float(since))
    else:
        w = window if window is not None else 60
        series = snapshot_store.get(address, window=int(w))
    return {"address": address, "series": [{"ts": ts, "nav": round(nav, 6)} for (ts, nav) in series]}


@app.post("/api/v1/nav/snapshot/{address}")
def api_nav_snapshot(address: str, nav: float | None = None, ts: float | None = None):
    """Create a NAV snapshot for a vault.

    If `nav` is omitted, compute from positions + prices at call time.
    """
    if nav is None:
        profile = get_profile(address)
        syms = list(profile.get("positions", {}).keys()) if profile else []
        router = PriceRouter()
        try:
            prices = router.get_index_prices(syms) if syms else {}
        except Exception:
            prices = {s: 1000.0 + 100.0 * i for i, s in enumerate(syms)}
        nav_val = HyperExecClient.pnl_to_nav(
            cash=profile.get("cash", 1_000_000.0),
            positions=profile.get("positions", {}),
            index_prices=prices,
        )
        nav = round(nav_val / profile.get("denom", 1_000_000.0), 6)
    snapshot_store.add(address, float(nav), ts)
    _nav_cache.clear()
    try:
        alert_manager.on_nav(address, float(nav))
    except Exception:
        pass
    return {"ok": True, "address": address, "nav": nav}


@app.get("/api/v1/events/{address}")
def api_events(address: str, limit: int | None = None, since: float | None = None, types: Optional[str] = None):
    ty = [t for t in (types.split(',') if types else []) if t]
    ev = event_store.list(address, limit=limit, since=since, types=ty if ty else None)
    return {"address": address, "events": ev}


# --- Markets & Prices ---
def _load_pairs_from_deployments() -> List[Dict[str, object]]:
    f = Path("deployments") / "hyper-testnet.json"
    if f.exists():
        try:
            data = json.loads(f.read_text())
            pairs = data.get("config", {}).get("pairs", [])
            if isinstance(pairs, list) and pairs:
                return pairs
        except Exception:
            pass
    return [{"symbol": "BTC", "leverage": 5}, {"symbol": "ETH", "leverage": 5}]


@app.get("/api/v1/markets")
def api_markets():
    return {"pairs": _load_pairs_from_deployments()}


_price_provider = CachedPriceRouter()


@app.get("/api/v1/price")
def api_price(symbols: str):
    """Return prices for given symbols, comma-separated."""
    syms = [s for s in symbols.split(",") if s]
    try:
        prices = _price_provider.get_index_prices(syms)
        if not prices:
            raise RuntimeError("empty prices")
    except Exception:
        # graceful fallback: deterministic demo pricing
        prices = {s: 1000.0 + 100.0 * i for i, s in enumerate(syms)}
    return {"prices": prices}


# --- Artifacts helper for FE Manager ---
@app.get("/api/v1/artifacts/vault")
def api_artifact_vault():
    """Serve Vault ABI and bytecode from Hardhat artifacts for FE deployment.

    This avoids bundling artifacts in the FE and keeps a single source of truth.
    """
    artifact = REPO_ROOT / "hardhat" / "artifacts" / "contracts" / "Vault.sol" / "Vault.json"
    if not artifact.exists():
        return {"error": "artifact not found", "path": str(artifact)}
    try:
        data = json.loads(artifact.read_text("utf-8"))
        return {"abi": data.get("abi", []), "bytecode": data.get("bytecode")}
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/v1/artifacts/mockerc20")
def api_artifact_mockerc20():
    """Serve MockERC20 ABI and bytecode from Hardhat artifacts for FE dev helpers."""
    artifact = REPO_ROOT / "hardhat" / "artifacts" / "contracts" / "MockERC20.sol" / "MockERC20.json"
    if not artifact.exists():
        return {"error": "artifact not found", "path": str(artifact)}
    try:
        data = json.loads(artifact.read_text("utf-8"))
        return {"abi": data.get("abi", []), "bytecode": data.get("bytecode")}
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/v1/register_deployment")
def api_register_deployment(vault: str, asset: str | None = None, name: str | None = None, type: str | None = None):
    """Record a deployment in deployments/hyper-testnet.json for discovery.

    This is a convenience for demo. In production this should be guarded.
    """
    f = REPO_ROOT / "deployments" / "hyper-testnet.json"
    try:
        meta = json.loads(f.read_text()) if f.exists() else {}
    except Exception:
        meta = {}
    meta.setdefault("network", "hyperTestnet")
    deployments = meta.get("deployments")
    if not isinstance(deployments, list):
        deployments = []
        legacy = {}
        if isinstance(meta.get("vault"), str):
            legacy["vault"] = meta.get("vault")
        if meta.get("asset"):
            legacy["asset"] = meta.get("asset")
        if legacy.get("vault"):
            deployments.append(legacy)
    updated = False
    for item in deployments:
        if isinstance(item, dict) and item.get("vault") == vault:
            if asset:
                item["asset"] = asset
            if name:
                item["name"] = name
            if type:
                item["type"] = type
            updated = True
            break
    if not updated:
        entry = {"vault": vault, "type": type or "public"}
        if asset:
            entry["asset"] = asset
        if name:
            entry["name"] = name
        deployments.append(entry)
    meta["deployments"] = deployments
    # retain legacy keys for backward compatibility
    meta["vault"] = vault
    if asset:
        meta["asset"] = asset
    if name:
        meta["name"] = name
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps(meta, indent=2, ensure_ascii=False))
    return {"ok": True, "path": str(f), "deployments": deployments}


# --- Exec Service (dry-run env-controlled) ---
@app.post("/api/v1/exec/open")
def api_exec_open(symbol: str, size: float, side: str, reduce_only: bool = False, leverage: float | None = None, vault: str = "_global"):
    svc = ExecService()
    return svc.open(vault, Order(symbol=symbol, size=size, side=side, reduce_only=reduce_only, leverage=leverage))


@app.post("/api/v1/exec/close")
def api_exec_close(symbol: str, size: float | None = None, vault: str = "_global"):
    svc = ExecService()
    return svc.close(vault, symbol=symbol, size=size)


@app.get("/api/v1/pretrade")
def api_pretrade(symbol: str, size: float, side: str, reduce_only: bool = False, leverage: float | None = None):
    svc = ExecService()
    try:
        svc._validate(Order(symbol=symbol, size=size, side=side, reduce_only=reduce_only, leverage=leverage))
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# --- Vaults registry (derive from deployments & positions) ---
def _vault_registry() -> List[Dict[str, object]]:
    out: Dict[str, Dict[str, object]] = {}
    # 1) positions.json keys → default private vaults
    try:
        pos_path = os.getenv("POSITIONS_FILE")
        if pos_path:
            path = Path(pos_path)
            if not path.is_absolute():
                path = REPO_ROOT / path
        else:
            path = REPO_ROOT / "deployments" / "positions.json"
        if path.exists():
            data = json.loads(path.read_text() or "{}")
            if isinstance(data, dict):
                for vid in data.keys():
                    if isinstance(vid, str):
                        out[vid] = {
                            "id": vid,
                            "name": f"Vault {vid}",
                            "type": "private",
                        }
    except Exception:
        pass
    # 2) deployments/hyper-testnet.json vault → prefer public entry if present
    try:
        d = REPO_ROOT / "deployments" / "hyper-testnet.json"
        if d.exists():
            meta = json.loads(d.read_text() or "{}")
            deployments = []
            if isinstance(meta.get("deployments"), list):
                deployments = meta["deployments"]
            elif meta.get("vault"):
                deployments = [{"vault": meta.get("vault"), "asset": meta.get("asset")}]
            for entry in deployments:
                vid = entry.get("vault")
                if isinstance(vid, str) and vid:
                    out[vid] = {
                        "id": vid,
                        "name": entry.get("name") or "VaultCraft (Hyper Testnet)",
                        "type": entry.get("type") or "public",
                        "asset": entry.get("asset"),
                    }
    except Exception:
        pass
    # fallback demo if empty
    if not out:
        return [
            {"id": "0x1234...5678", "name": "Alpha Momentum Strategy", "type": "public"},
            {"id": "0x8765...4321", "name": "Quant Arbitrage Fund", "type": "private"},
        ]
    return list(out.values())


# demo profiles were replaced by file-backed store (deployments/positions.json)


@app.get("/api/v1/vaults")
def api_vaults():
    return {"vaults": _vault_registry()}


@app.get("/api/v1/vaults/{vault_id}")
def api_vault_detail(vault_id: str):
    # basic info from registry
    info = next((v for v in _vault_registry() if v["id"] == vault_id), None)
    if info is None:
        info = {"id": vault_id, "name": "Vault", "type": "private"}
    # compute NAV + metrics
    profile = get_profile(vault_id)
    syms = list(profile.get("positions", {}).keys()) if profile else []
    try:
        prices = _price_provider.get_index_prices(syms) if syms else {}
    except Exception:
        prices = {s: 1000.0 + 100.0 * i for i, s in enumerate(syms)}
    nav_val = HyperExecClient.pnl_to_nav(
        cash=profile.get("cash", 1_000_000.0), positions=profile.get("positions", {}), index_prices=prices
    )
    unit_nav = round(nav_val / profile.get("denom", 1_000_000.0), 6)
    nav_series = [unit_nav] * 60
    m = compute_metrics(nav_series)
    # Attempt to enrich with deployment meta (asset address, if known)
    asset_addr = None
    try:
        d = REPO_ROOT / "deployments" / "hyper-testnet.json"
        if d.exists():
            meta = json.loads(d.read_text() or "{}")
            deployments = []
            if isinstance(meta.get("deployments"), list):
                deployments = meta["deployments"]
            elif meta.get("vault"):
                deployments = [{"vault": meta.get("vault"), "asset": meta.get("asset")}]
            for entry in deployments:
                if isinstance(entry, dict) and entry.get("vault") == vault_id:
                    a = entry.get("asset")
                    if isinstance(a, str) and a:
                        asset_addr = a
                        break
    except Exception:
        pass
    return {
        **info,
        "metrics": m,
        "unitNav": unit_nav,
        "lockDays": 1,
        "performanceFee": 10,
        "managementFee": 0,
        "aum": int(nav_val),
        "totalShares": int(profile.get("denom", 1_000_000.0)),
        **({"asset": asset_addr} if asset_addr else {}),
    }


# --- Positions admin (dev/demo) ---
@app.get("/api/v1/positions/{vault_id}")
def api_positions_get(vault_id: str):
    return get_profile(vault_id)


@app.post("/api/v1/positions/{vault_id}")
def api_positions_set(vault_id: str, profile: Dict[str, object]):
    from .positions import set_profile

    set_profile(vault_id, profile)
    unit = HyperExecClient.pnl_to_nav(
        cash=float(profile.get("cash", 1_000_000.0)),
        positions={str(k): float(v) for k, v in dict(profile.get("positions", {})).items()},
        index_prices={s: 0.0 for s in dict(profile.get("positions", {})).keys()},
    )
    # only confirm set; nav is computed via dedicated endpoints with live prices
    return {"ok": True}

@app.on_event("startup")
def _startup():
    global _snapshot_daemon, _user_listener
    # Ensure request-scoped determinism for tests and fresh boot by clearing caches
    try:
        try:
            _price_provider.cache.clear()
        except Exception:
            pass
        try:
            _nav_cache.clear()
        except Exception:
            pass
    except Exception:
        pass
    if settings.ENABLE_SNAPSHOT_DAEMON:
        def list_ids() -> List[str]:
            return [v["id"] for v in _vault_registry()]
        _snapshot_daemon = SnapshotDaemon(list_vaults=list_ids, interval_sec=float(settings.SNAPSHOT_INTERVAL_SEC))
        _snapshot_daemon.start()
    if settings.ENABLE_LIVE_EXEC and settings.ENABLE_USER_WS_LISTENER:
        # Use ADDRESS as the logical vault id; for multi-vault setups, consider per-vault routing
        _user_listener = UserEventsListener(vault=settings.ADDRESS or "_global")
        _user_listener.start()


@app.on_event("shutdown")
def _shutdown():
    global _snapshot_daemon, _user_listener
    try:
        if _snapshot_daemon:
            _snapshot_daemon.stop()
    except Exception:
        pass
    try:
        if _user_listener:
            _user_listener.stop()
    except Exception:
        pass
