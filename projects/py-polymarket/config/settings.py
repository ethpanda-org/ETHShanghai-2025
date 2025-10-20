"""Unified settings loader for the Polymarket trading system."""

from __future__ import annotations

import json
import os
from copy import deepcopy
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Dict, List, Optional

try:
    import yaml  # type: ignore
except ModuleNotFoundError:
    yaml = None

from .env import load_environment

CONFIG_DIR = Path(__file__).resolve().parent
ABI_PATH = CONFIG_DIR / "abi.json"

DEFAULT_RUNTIME: Dict[str, Any] = {
    "environment": "development",
    "debug": False,
    "offline_mode": False,
    "network": {
        "timeout_total": 120,
        "timeout_connect": 30,
        "timeout_read": 60,
        "retry_attempts": 3,
        "max_connections": 10,
        "keepalive_timeout": 30,
    },
    "proxy": {
        "enabled": True,
        "host": "brd.superproxy.io",
        "port": 33335,
        "skip_healthcheck": True,
        "rotation_countries": ["US", "CA", "GB", "DE", "FR", "NL", "CH", "AU"],
        "requests_per_rotation": 8,
        "max_retry": 3,
        "refresh_interval": 600,
        "test_url": "https://geo.brdtest.com/welcome.txt?product=resi&method=native",
    },
    "database": {
        "host": "localhost",
        "name": "polymarket_db",
        "user": None,
        "password": None,
        "port": 5432,
    },
    "blockchain": {
        "polymarket_contract": "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045",
    },
    "monitoring": {
        "port": 8888,
        "report_dir": "logs",
        "auto_open_browser": True,
        "trade_telemetry_path": "reports/fills.jsonl",
    },
    "logging": {
        "level": "INFO",
        "enable_console": True,
        "file_path": "logs/polymarket.log",
        "format": "%(asctime)s - %(levelname)s - %(name)s - %(message)s",
        "max_file_size": 10 * 1024 * 1024,
        "backup_count": 5,
    },
    "strategy": {
        "signal_floor": 0.12,
        "consensus_min": 2,
        "max_risk_level": "HIGH",
        "min_volume_24h": 1000.0,
        "max_spread_bps": 1500,  # 15% maximum spread threshold
        "spread_volume_tiers": [],
        "hold_seconds_by_risk": {
            "LOW": 600,
            "MEDIUM": 300,
            "HIGH": 180,
        },
    },
    "trading": {
        "initial_balance": 10000,
        "max_total_exposure": 0.35,
        "max_single_position": 0.01,
        "min_position_size": 10,
        "daily_loss_enabled": True,
        "daily_loss_limit_pct": 0.02,  # halt for the day if realized loss exceeds 2% of initial balance
        "daily_loss_limit_usd": 0.0,   # optional absolute USD cap (0 disables)
        "daily_loss_cooldown_minutes": 45,  # pause new orders this many minutes after hitting the limit
        "daily_loss_recovery_ratio": 0.4,   # scale position sizing while recovering post-cooldown
        "daily_loss_reset_hour": 0,
        "order_frequency": {
            "enabled": False,
            "max_orders": 30,
            "interval_seconds": 60,
        },
        "dry_run": True,
        "max_open_positions": 50,
        "max_positions_per_market": 1,
        "max_orders_per_loop": 10,
        "per_market_exposure_caps": {},
    },
    "execution": {
        "exit_policy": {
            "min_hold_seconds": 45,
            "holding_seconds": 300,
            "stop_loss_pct": 0.05,
            "take_profit_pct": 0.10,
            "tiered_tp_sl": {
                "enabled": False,
                "soft_stop_pct": 0.03,
                "hard_stop_pct": 0.08,
                "trim_ratio": 0.5,
                "cooldown_seconds": 0,
                "extended_min_hold_seconds": 240,
            },
        },
        "costs": {
            "taker_fee": 0.005,
            "edge_risk_premium": 0.005,
        },
        "price_guard": {
            "enabled": True,
            "max_abs_from_top": 0.08,
            "max_abs_from_last": 0.12,
            "max_rel_pct": 0.25,
        },
        "order_dedupe": {
            "window_seconds": 300,
            "max_entries": 500,
            "persist_csv": True,
            "log_path": "reports/order_intents.csv",
            "size_tolerance": 0.0,
            "size_ratio_tolerance": 0.0,
        },
        "time_stop_min_seconds": 60,
        "time_stop_max_seconds": 300,
        "breakeven_trigger_pct": 0.05,
        "slippage_model": "taker",
        "liquidity_exit": {
            "enabled": True,
            "min_liquidity_notional": 2500.0,
            "slice_notional": 1000.0,
            "max_slices": 5,
            "min_slice_notional": 250.0,
        },
    },
    "data": {
        "max_retries": 3,
        "request_timeout": 30,
        "use_ws": False,
    },
    "risk": {
        "volatility_risk_ceiling": 0.2,
    },
    "alert": {
        "enable_email": False,
        "smtp_server": "smtp.example.com",
        "smtp_port": 587,
        "username": None,
        "password": None,
        "to_email": "admin@example.com",
        "subject": "[Polymarket] System Alert",
    },
    "user_agents": [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    ],
}

DEFAULT_STRATEGIES: Dict[str, Any] = {
    "strategies": {
        "mean_reversion": {
            "enabled": True,
            "weight": 0.40,
            "params": {
                "z_score_threshold": 1.5,
                "lookback_period": 20,
                "confidence_threshold": 0.4,
                "min_position_size": 10,
                "min_deviation": 0.06,
                "require_non_negative_momentum": True,
                "max_position_percent": 0.05,
            },
        },
        "event_driven": {
            "enabled": True,
            "weight": 0.30,
            "params": {
                "sentiment_threshold": 0.2,
                "update_interval": 180,
                "signal_decay": 3600,
                "relevance_threshold": 0.4,
            },
        },
        "micro_arbitrage": {
            "enabled": True,
            "weight": 0.20,
            "params": {
                "min_spread": 0.02,
                "taker_fee": 0.003,
                "min_net_edge": 0.002,
                "max_holding": 1800,
                "correlation_threshold": 0.7,
            },
        },
        "momentum_scalping": {
            "enabled": True,
            "weight": 0.10,
            "params": {
                "min_momentum": 0.05,
                "signal_decay": 900,
            },
        },
    }
}


def _load_yaml(name: str) -> Dict[str, Any]:
    path = CONFIG_DIR / name
    if not path.exists():
        json_fallback = path.with_suffix(".json")
        if json_fallback.exists():
            with json_fallback.open("r", encoding="utf-8") as handle:
                return json.load(handle)
        return {}
    if yaml is None:  # type: ignore[name-defined]
        json_fallback = path.with_suffix(".json")
        if json_fallback.exists():
            with json_fallback.open("r", encoding="utf-8") as handle:
                return json.load(handle)
        raise ImportError("PyYAML is required to parse YAML configuration")
    with path.open("r", encoding="utf-8") as handle:
        loaded = yaml.safe_load(handle) or {}
    if not isinstance(loaded, dict):
        raise ValueError(f"Expected a mapping in {path}, got {type(loaded).__name__}")
    return loaded

def _load_abi() -> List[Any]:
    try:
        with ABI_PATH.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
            return data if isinstance(data, list) else []
    except FileNotFoundError:
        return []
    except json.JSONDecodeError:
        return []


def _deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    result = deepcopy(base)
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def _to_namespace(data: Dict[str, Any]) -> SimpleNamespace:
    return SimpleNamespace(
        **{key: _to_namespace(value) if isinstance(value, dict) else value for key, value in data.items()}
    )


def _proxy_url(host: str, port: int, username: Optional[str], password: Optional[str]) -> Optional[str]:
    if not host or not port:
        return None
    if username and password:
        return f"http://{username}:{password}@{host}:{port}"
    return f"http://{host}:{port}"


class Settings:
    """Application settings sourced from YAML and environment variables."""

    def __init__(self) -> None:
        self.reload()

    def reload(self) -> None:
        env = load_environment()
        env_fields = set(getattr(env, 'overrides', set()))

        def resolve(field: str, fallback: Any) -> Any:
            return getattr(env, field) if field in env_fields else fallback

        runtime_data = _deep_merge(DEFAULT_RUNTIME, _load_yaml("runtime.yaml"))
        strategies_data = _deep_merge(DEFAULT_STRATEGIES, _load_yaml("strategies.yaml"))

        self.environment = resolve("environment", runtime_data["environment"])
        self.debug = bool(resolve("debug", runtime_data["debug"]))
        self.OFFLINE_MODE = bool(resolve("offline_mode", runtime_data.get("offline_mode", False)))

        self.network = _to_namespace(runtime_data["network"])

        dry_run_flag = bool(
            resolve(
                "dry_run",
                runtime_data.get("dry_run", runtime_data.get("trading", {}).get("dry_run", False)),
            )
        )
        runtime_data.setdefault("trading", {})["dry_run"] = dry_run_flag
        runtime_data["dry_run"] = dry_run_flag
        self.DRY_RUN = dry_run_flag

        proxy_runtime = runtime_data["proxy"]
        proxy_enabled = resolve("proxy_enabled", proxy_runtime.get("enabled", True))
        proxy_runtime["enabled"] = proxy_enabled
        proxy_host = resolve("proxy_host", proxy_runtime.get("host"))
        proxy_port = resolve("proxy_port", proxy_runtime.get("port"))
        proxy_username = resolve("proxy_username", proxy_runtime.get("username"))
        proxy_password = resolve("proxy_password", proxy_runtime.get("password"))
        proxy_url = resolve("proxy_url", proxy_runtime.get("url"))
        if not proxy_enabled:
            proxy_url = None
        elif not proxy_url:
            proxy_url = _proxy_url(proxy_host, proxy_port, proxy_username, proxy_password)

        proxy_dict = {
            **proxy_runtime,
            "host": proxy_host,
            "port": proxy_port,
            "username": proxy_username,
            "password": proxy_password,
            "url": proxy_url,
        }
        self.proxy = _to_namespace(proxy_dict)
        self.PROXY_URL = proxy_url
        self.PROXY_CONFIG = {
            "max_retry": proxy_runtime.get("max_retry", 3),
            "refresh_interval": proxy_runtime.get("refresh_interval", 600),
            "test_url": proxy_runtime.get("test_url"),
        }
        self.PROXY_SKIP_HEALTHCHECK = bool(proxy_runtime.get("skip_healthcheck", True))

        db_runtime = runtime_data["database"]
        db_host = resolve("db_host", db_runtime.get("host"))
        db_port = resolve("db_port", db_runtime.get("port"))
        db_name = resolve("db_name", db_runtime.get("name"))
        db_user = resolve("db_user", db_runtime.get("user"))
        db_password = resolve("db_password", db_runtime.get("password"))
        self.database = _to_namespace(
            {
                "host": db_host,
                "port": db_port,
                "name": db_name,
                "user": db_user,
                "password": db_password,
            }
        )
        self.DB_CONFIG = {
            "host": db_host,
            "user": db_user,
            "password": db_password,
            "database": db_name,
            "port": db_port,
        }

        self.monitoring = _to_namespace(runtime_data["monitoring"])
        self.logging = _to_namespace(runtime_data["logging"])
        self.data = _to_namespace(runtime_data["data"])
        self.risk = _to_namespace(runtime_data.get("risk", {}))
        self.alert = _to_namespace(runtime_data["alert"])
        self.trading = _to_namespace(runtime_data["trading"])
        freq_runtime = runtime_data["trading"].get("order_frequency", {})
        self.TRADING_ORDER_FREQUENCY = {
            "enabled": bool(freq_runtime.get("enabled", False)),
            "max_orders": int(freq_runtime.get("max_orders", 0) or 0),
            "interval_seconds": int(freq_runtime.get("interval_seconds", 0) or 0),
        }
        self.market_rules = _to_namespace(runtime_data.get("market_rules", {}))
        self.strategy = _to_namespace(runtime_data.get("strategy", {}))

        try:
            report_dir_raw = str(getattr(self.monitoring, "report_dir", "reports"))
        except Exception:
            report_dir_raw = "reports"
        self.MONITORING_REPORT_DIR = Path(report_dir_raw)
        telemetry_raw = None
        try:
            telemetry_raw = getattr(self.monitoring, "trade_telemetry_path", None)
        except Exception:
            telemetry_raw = None
        if telemetry_raw:
            telemetry_path = Path(str(telemetry_raw))
        else:
            telemetry_path = Path("reports") / "fills.jsonl"
        if not telemetry_path.is_absolute():
            # Resolve relative paths from current working directory to stay sandbox-friendly
            telemetry_path = Path.cwd() / telemetry_path
        self.TRADE_TELEMETRY_PATH = telemetry_path

        # --- optional: API credentials for authenticated/private features (env-only) ---
        # Never persisted; these must come from the process environment or secrets store.
        try:
            self.POLYMARKET_API_KEY = os.getenv("POLYMARKET_API_KEY")
            self.POLYMARKET_API_SECRET = os.getenv("POLYMARKET_API_SECRET")
            self.POLYMARKET_API_PASSPHRASE = os.getenv("POLYMARKET_API_PASSPHRASE")
        except Exception:
            self.POLYMARKET_API_KEY = None
            self.POLYMARKET_API_SECRET = None
            self.POLYMARKET_API_PASSPHRASE = None

        # --- order lifecycle streaming feature flags (env-first) ---
        # SERVICE_USE_ORDER_WS enables the private order-status WebSocket listener.
        # ORDER_WS_COOLDOWN_SECONDS is used after failures before reconnecting.
        # ORDER_WS_SUB_LIMIT caps subscribed markets to reduce server/client load.
        def _env_bool(name: str, default: bool) -> bool:
            raw = os.getenv(name)
            if raw is None:
                return default
            return str(raw).strip().lower() in {"1", "true", "yes", "on"}

        def _env_int(name: str, default: int) -> int:
            raw = os.getenv(name)
            if raw is None or not str(raw).strip():
                return default
            try:
                return int(str(raw).strip())
            except ValueError:
                return default

        self.SERVICE_USE_ORDER_WS = _env_bool("SERVICE_USE_ORDER_WS", False)
        self.ORDER_WS_COOLDOWN_SECONDS = max(1, _env_int("ORDER_WS_COOLDOWN_SECONDS", 60))
        self.ORDER_WS_SUB_LIMIT = max(1, _env_int("ORDER_WS_SUB_LIMIT", 50))

        # --- Public Data API (read-only) fallback settings ---
        self.SERVICE_USE_PUBLIC_DATA_API = _env_bool("SERVICE_USE_PUBLIC_DATA_API", False)
        try:
            self.DATA_API_BASE_URL = os.getenv("DATA_API_BASE_URL") or "https://api.polymarket.com"
        except Exception:
            self.DATA_API_BASE_URL = "https://api.polymarket.com"
        try:
            self.DATA_API_RATE_LIMIT_PER_SEC = float(os.getenv("DATA_API_RATE_LIMIT_PER_SEC", "1.0"))
        except Exception:
            self.DATA_API_RATE_LIMIT_PER_SEC = 1.0
        try:
            self.DATA_API_MAX_CONCURRENCY = int(os.getenv("DATA_API_MAX_CONCURRENCY", "2"))
        except Exception:
            self.DATA_API_MAX_CONCURRENCY = 2

        # --- order REST fallback settings ---
        self.SERVICE_USE_ORDER_REST_FALLBACK = _env_bool("SERVICE_USE_ORDER_REST_FALLBACK", True)
        self.ORDER_REST_POLL_SECONDS = max(5, _env_int("ORDER_REST_POLL_SECONDS", 15))
        self.ORDER_REST_POLL_LIMIT = max(10, _env_int("ORDER_REST_POLL_LIMIT", 100))

        # --- execution / exit policy / costs ---
        exec_runtime = runtime_data.get("execution", {})
        exit_runtime = exec_runtime.get("exit_policy", {})
        tiered_runtime = exit_runtime.get("tiered_tp_sl", {}) if isinstance(exit_runtime, dict) else {}
        cost_runtime = exec_runtime.get("costs", {})
        dedupe_runtime = exec_runtime.get("order_dedupe", {})
        liq_exit_runtime = exec_runtime.get("liquidity_exit", {})
        self.execution = _to_namespace(
            {
                "exit_policy": {
                    "mode": str(exit_runtime.get("mode", "advanced")),
                    "min_hold_seconds": int(exit_runtime.get("min_hold_seconds", 45)),
                    "holding_seconds": int(exit_runtime.get("holding_seconds", 300)),
                    "stop_loss_pct": float(exit_runtime.get("stop_loss_pct", 0.02)),
                    "take_profit_pct": float(exit_runtime.get("take_profit_pct", 0.03)),
                    "tiered_tp_sl": {
                        "enabled": bool(tiered_runtime.get("enabled", False)),
                        "soft_stop_pct": float(tiered_runtime.get("soft_stop_pct", 0.03)),
                        "hard_stop_pct": float(tiered_runtime.get("hard_stop_pct", 0.08)),
                        "trim_ratio": float(tiered_runtime.get("trim_ratio", 0.5)),
                        "cooldown_seconds": int(tiered_runtime.get("cooldown_seconds", 0)),
                        "extended_min_hold_seconds": int(tiered_runtime.get("extended_min_hold_seconds", 240)),
                    },
                },
                "costs": {
                    "taker_fee": float(cost_runtime.get("taker_fee", 0.005)),
                    "edge_risk_premium": float(cost_runtime.get("edge_risk_premium", 0.005)),
                    "maker_fee": float(cost_runtime.get("maker_fee", 0.0)),
                },
                "slippage_model": str(exec_runtime.get("slippage_model", "taker")),
                "entry_cooldown_seconds": int(exec_runtime.get("entry_cooldown_seconds", 120)),
                "notional_step": float(exec_runtime.get("notional_step", 1.0)),
                "order_dedupe": {
                    "window_seconds": int(dedupe_runtime.get("window_seconds", 0)),
                    "max_entries": int(dedupe_runtime.get("max_entries", 0)),
                    "persist_csv": bool(dedupe_runtime.get("persist_csv", False)),
                    "log_path": str(dedupe_runtime.get("log_path", "reports/order_intents.csv")),
                },
                "liquidity_exit": {
                    "enabled": bool(liq_exit_runtime.get("enabled", False)),
                    "min_liquidity_notional": float(liq_exit_runtime.get("min_liquidity_notional", 0.0)),
                    "slice_notional": float(liq_exit_runtime.get("slice_notional", 0.0)),
                    "max_slices": int(liq_exit_runtime.get("max_slices", 1)),
                    "min_slice_notional": float(liq_exit_runtime.get("min_slice_notional", 0.0)),
                },
            }
        )
        # convenience aliases
        exit_policy_ns = getattr(self.execution, "exit_policy", SimpleNamespace())
        self.EXIT_MIN_HOLD_SECONDS = int(getattr(exit_policy_ns, "min_hold_seconds", 45))
        self.EXIT_HOLDING_SECONDS = int(getattr(exit_policy_ns, "holding_seconds", 300))
        self.EXIT_STOP_LOSS_PCT = float(getattr(exit_policy_ns, "stop_loss_pct", 0.02))
        self.EXIT_TAKE_PROFIT_PCT = float(getattr(exit_policy_ns, "take_profit_pct", 0.03))
        self.EXIT_POLICY_MODE = str(getattr(exit_policy_ns, "mode", "advanced"))
        tiered_ns = getattr(exit_policy_ns, "tiered_tp_sl", SimpleNamespace())
        try:
            self.TP_SL_TIERED_ENABLED = bool(getattr(tiered_ns, "enabled", False))
        except Exception:
            self.TP_SL_TIERED_ENABLED = False
        try:
            self.TP_SL_SOFT_STOP_PCT = float(getattr(tiered_ns, "soft_stop_pct", self.EXIT_STOP_LOSS_PCT))
        except Exception:
            self.TP_SL_SOFT_STOP_PCT = self.EXIT_STOP_LOSS_PCT
        try:
            hard_pct = float(getattr(tiered_ns, "hard_stop_pct", self.EXIT_STOP_LOSS_PCT))
            self.TP_SL_HARD_STOP_PCT = max(self.EXIT_STOP_LOSS_PCT, hard_pct)
        except Exception:
            self.TP_SL_HARD_STOP_PCT = self.EXIT_STOP_LOSS_PCT
        try:
            ratio = float(getattr(tiered_ns, "trim_ratio", 0.5))
            self.TP_SL_TRIM_RATIO = max(0.0, min(1.0, ratio))
        except Exception:
            self.TP_SL_TRIM_RATIO = 0.5
        try:
            self.TP_SL_STAGE1_COOLDOWN_SECONDS = max(0, int(getattr(tiered_ns, "cooldown_seconds", 0)))
        except Exception:
            self.TP_SL_STAGE1_COOLDOWN_SECONDS = 0
        try:
            self.TP_SL_EXTENDED_MIN_HOLD_SECONDS = int(
                getattr(tiered_ns, "extended_min_hold_seconds", self.EXIT_MIN_HOLD_SECONDS)
            )
        except Exception:
            self.TP_SL_EXTENDED_MIN_HOLD_SECONDS = self.EXIT_MIN_HOLD_SECONDS
        costs_ns = getattr(self.execution, "costs", SimpleNamespace())
        self.TAKER_FEE = float(getattr(costs_ns, "taker_fee", 0.005))
        self.EDGE_RISK_PREMIUM = float(getattr(costs_ns, "edge_risk_premium", 0.005))
        self.ENTRY_COOLDOWN_SECONDS = int(getattr(self.execution, "entry_cooldown_seconds", 120))
        self.MAKER_FEE = float(getattr(costs_ns, "maker_fee", 0.0))
        dedupe_ns = getattr(self.execution, "order_dedupe", SimpleNamespace())
        self.ORDER_DEDUPE_LOG_PATH = getattr(dedupe_ns, "log_path", "reports/order_intents.csv")
        self.ORDER_DEDUPE_PERSIST = bool(getattr(dedupe_ns, "persist_csv", False))
        liquidity_exit_ns = getattr(self.execution, "liquidity_exit", SimpleNamespace())
        self.LIQUIDITY_EXIT_ENABLED = bool(getattr(liquidity_exit_ns, "enabled", False))

        self.API_KEYS = {
            "newsapi": resolve("newsapi_key", None),
            "twitter": resolve("twitter_bearer_token", None),
        }
        self.POLYGON_RPC = resolve("polygon_rpc_url", env.polygon_rpc_url)
        self.POLYMARKET_CONTRACT = resolve(
            "polymarket_contract", runtime_data["blockchain"].get("polymarket_contract")
        )
        self.POLY_PRIVATE_KEY = resolve("polygon_private_key", None)
        self.CLOB_REST_URL = resolve("clob_rest_url", env.clob_rest_url)
        self.CLOB_WS_URL = resolve("clob_ws_url", env.clob_ws_url)

        self.USER_AGENTS = list(runtime_data.get("user_agents", []))
        self.ABI = _load_abi()

        self.DATA_COLLECTOR = {
            "max_retries": self.data.max_retries,
            "request_timeout": self.data.request_timeout,
            "proxy_refresh_interval": self.PROXY_CONFIG.get("refresh_interval", 600),
        }
        try:
            self.DATA_USE_WS = bool(getattr(self.data, "use_ws", False))
        except Exception:
            self.DATA_USE_WS = False
        self.ALERT_CONFIG = {
            "enable_email": self.alert.enable_email,
            "smtp_server": self.alert.smtp_server,
            "smtp_port": self.alert.smtp_port,
            "username": self.alert.username,
            "password": self.alert.password,
            "to_email": self.alert.to_email,
            "subject": self.alert.subject,
        }

        self.strategies = strategies_data["strategies"]
        # Keep strategies accessible under trading namespace for backwards compatibility.
        setattr(self.trading, "strategies", self.strategies)
        # --- ingest fallback behaviour (env-first) ---
        # STRATEGY_HALT_ON_FALLBACK: boolean ("true"/"false")
        # STRATEGY_SKIP_ON_FALLBACK: comma-separated list or JSON list of strategy names
        # STRATEGY_SIZE_SCALES_ON_FALLBACK: mapping of name->scale, either JSON object
        #   or comma-separated key=value pairs (e.g., "mean_reversion=0.8,micro_arbitrage=0.5")
        def _bool_env(name: str, default: bool = False) -> bool:
            raw = os.getenv(name)
            if raw is None:
                return default
            return str(raw).strip().lower() in {"1", "true", "yes", "on"}

        def _list_env(name: str) -> List[str]:
            raw = os.getenv(name)
            if not raw:
                return []
            txt = str(raw).strip()
            try:
                val = json.loads(txt)
                if isinstance(val, list):
                    return [str(x) for x in val if x]
            except Exception:
                pass
            return [item.strip() for item in txt.split(",") if item.strip()]

        def _map_env(name: str) -> Dict[str, float]:
            raw = os.getenv(name)
            mapping: Dict[str, float] = {}
            if not raw:
                return mapping
            txt = str(raw).strip()
            try:
                val = json.loads(txt)
                if isinstance(val, dict):
                    for k, v in val.items():
                        try:
                            mapping[str(k)] = float(v)
                        except Exception:
                            continue
                    return mapping
            except Exception:
                pass
            for part in txt.split(","):
                if "=" not in part:
                    continue
                k, v = part.split("=", 1)
                k = k.strip()
                try:
                    mapping[k] = float(v)
                except Exception:
                    continue
            return mapping

        # Attach as attributes for runner to consume via getattr(settings, ...)
        try:
            self.STRATEGY_HALT_ON_FALLBACK = _bool_env("STRATEGY_HALT_ON_FALLBACK", False)
        except Exception:
            self.STRATEGY_HALT_ON_FALLBACK = False
        try:
            self.STRATEGY_SKIP_ON_FALLBACK = _list_env("STRATEGY_SKIP_ON_FALLBACK")
        except Exception:
            self.STRATEGY_SKIP_ON_FALLBACK = []
        try:
            self.STRATEGY_SIZE_SCALES_ON_FALLBACK = _map_env("STRATEGY_SIZE_SCALES_ON_FALLBACK")
        except Exception:
            self.STRATEGY_SIZE_SCALES_ON_FALLBACK = {}
        # aliases for risk tuning
        try:
            self.RISK_VOLATILITY_CEILING = float(getattr(self.risk, "volatility_risk_ceiling", 0.25))
        except Exception:
            self.RISK_VOLATILITY_CEILING = 0.25
        try:
            self.RISK_MAX_SINGLE_ORDER_RATIO = float(getattr(self.trading, "max_single_position", 0.01))
        except Exception:
            self.RISK_MAX_SINGLE_ORDER_RATIO = 0.01
        try:
            caps = getattr(self.trading, "per_market_exposure_caps", {})
            if isinstance(caps, dict):
                self.PER_MARKET_EXPOSURE_CAPS = {str(k): float(v) for k, v in caps.items()}
            else:
                self.PER_MARKET_EXPOSURE_CAPS = {}
        except Exception:
            self.PER_MARKET_EXPOSURE_CAPS = {}
        try:
            strat_caps = getattr(self.trading, "strategy_exposure_caps", {})
            if isinstance(strat_caps, dict):
                self.STRATEGY_EXPOSURE_CAPS = {str(k): float(v) for k, v in strat_caps.items()}
            else:
                self.STRATEGY_EXPOSURE_CAPS = {}
        except Exception:
            self.STRATEGY_EXPOSURE_CAPS = {}
        # aliases for strategy engine
        try:
            self.STRATEGY_SIGNAL_FLOOR = float(getattr(self.strategy, "signal_floor", 0.12))
        except Exception:
            self.STRATEGY_SIGNAL_FLOOR = 0.12
        try:
            self.STRATEGY_CONSENSUS_MIN = int(getattr(self.strategy, "consensus_min", 2))
        except Exception:
            self.STRATEGY_CONSENSUS_MIN = 2
        try:
            mrl = str(getattr(self.strategy, "max_risk_level", "HIGH")).upper()
            if mrl not in {"LOW", "MEDIUM", "HIGH"}:
                mrl = "HIGH"
            self.STRATEGY_MAX_RISK_LEVEL = mrl
        except Exception:
            self.STRATEGY_MAX_RISK_LEVEL = "HIGH"
        try:
            self.STRATEGY_MIN_VOLUME_24H = float(getattr(self.strategy, "min_volume_24h", 1000.0))
        except Exception:
            self.STRATEGY_MIN_VOLUME_24H = 1000.0
        try:
            self.STRATEGY_MAX_SPREAD_BPS = int(getattr(self.strategy, "max_spread_bps", 1500))
        except Exception:
            self.STRATEGY_MAX_SPREAD_BPS = 1500
        try:
            hbr = getattr(self.strategy, "hold_seconds_by_risk", {})
            if isinstance(hbr, dict):
                self.STRATEGY_HOLD_SECONDS_BY_RISK = {str(k).upper(): int(v) for k, v in hbr.items() if isinstance(v, (int, float))}
            else:
                self.STRATEGY_HOLD_SECONDS_BY_RISK = {}
        except Exception:
            self.STRATEGY_HOLD_SECONDS_BY_RISK = {}
        try:
            tiers_cfg = getattr(self.strategy, "spread_volume_tiers", [])
            tiers_list = []
            if isinstance(tiers_cfg, (list, tuple)):
                for item in tiers_cfg:
                    if not isinstance(item, dict):
                        continue
                    try:
                        min_volume = float(item.get("min_volume", 0.0))
                        max_bps = float(item.get("max_spread_bps", self.STRATEGY_MAX_SPREAD_BPS))
                        tiers_list.append((min_volume, max_bps))
                    except Exception:
                        continue
            tiers_list.sort(key=lambda pair: pair[0], reverse=True)
            self.STRATEGY_SPREAD_VOLUME_TIERS = tiers_list
        except Exception:
            self.STRATEGY_SPREAD_VOLUME_TIERS = []
        try:
            bl = getattr(self.strategy, "blacklist", [])
            if isinstance(bl, (list, tuple, set)):
                self.STRATEGY_BLACKLIST = [str(item) for item in bl]
            else:
                self.STRATEGY_BLACKLIST = []
        except Exception:
            self.STRATEGY_BLACKLIST = []
        # Optional per-market threshold overrides: { market_id: { signal_floor: float, consensus_min: int } }
        try:
            th_over = getattr(self.strategy, "threshold_overrides", {})
            mapping: Dict[str, Dict[str, float]] = {}
            if isinstance(th_over, dict):
                for mid, cfg in th_over.items():
                    if not mid or not isinstance(cfg, dict):
                        continue
                    entry: Dict[str, float] = {}
                    if "signal_floor" in cfg:
                        try:
                            entry["signal_floor"] = float(cfg.get("signal_floor"))
                        except Exception:
                            pass
                    if "consensus_min" in cfg:
                        try:
                            entry["consensus_min"] = int(cfg.get("consensus_min"))  # type: ignore[assignment]
                        except Exception:
                            pass
                    if entry:
                        mapping[str(mid)] = entry
            self.STRATEGY_THRESHOLD_OVERRIDES = mapping
        except Exception:
            self.STRATEGY_THRESHOLD_OVERRIDES = {}
        try:
            pairs_cfg = getattr(self.strategy, "micro_arbitrage_reference_pairs", {})
            mapping: Dict[str, List[str]] = {}
            if isinstance(pairs_cfg, dict):
                for raw_key, raw_values in pairs_cfg.items():
                    if not raw_key:
                        continue
                    key = str(raw_key)
                    if isinstance(raw_values, (list, tuple, set)):
                        refs = [str(val) for val in raw_values if val]
                    elif raw_values:
                        refs = [str(raw_values)]
                    else:
                        refs = []
                    if refs:
                        mapping[key] = refs
            self.MICRO_ARBITRAGE_REFERENCE_PAIRS = mapping
        except Exception:
            self.MICRO_ARBITRAGE_REFERENCE_PAIRS = {}

    def as_dict(self) -> Dict[str, Any]:
        """Return a dictionary snapshot of core settings."""

        return {
            "environment": self.environment,
            "debug": self.debug,
            "offline_mode": self.OFFLINE_MODE,
            "dry_run": self.DRY_RUN,
            "proxy_url": self.PROXY_URL,
            "database": self.DB_CONFIG,
            "polygon_rpc": self.POLYGON_RPC,
            "clob_rest_url": self.CLOB_REST_URL,
            "clob_ws_url": self.CLOB_WS_URL,
            "market_rules": getattr(self.market_rules, "__dict__", {}),
            "execution": {
                "exit_policy": {
                    "min_hold_seconds": self.EXIT_MIN_HOLD_SECONDS,
                    "holding_seconds": self.EXIT_HOLDING_SECONDS,
                    "stop_loss_pct": self.EXIT_STOP_LOSS_PCT,
                    "take_profit_pct": self.EXIT_TAKE_PROFIT_PCT,
                    "tiered_tp_sl": {
                        "enabled": self.TP_SL_TIERED_ENABLED,
                        "soft_stop_pct": self.TP_SL_SOFT_STOP_PCT,
                        "hard_stop_pct": self.TP_SL_HARD_STOP_PCT,
                        "trim_ratio": self.TP_SL_TRIM_RATIO,
                        "cooldown_seconds": self.TP_SL_STAGE1_COOLDOWN_SECONDS,
                        "extended_min_hold_seconds": self.TP_SL_EXTENDED_MIN_HOLD_SECONDS,
                    },
                },
                "costs": {
                    "taker_fee": self.TAKER_FEE,
                    "edge_risk_premium": self.EDGE_RISK_PREMIUM,
                },
                "slippage_model": self.execution.slippage_model,
            },
            "risk": {
                "volatility_risk_ceiling": self.RISK_VOLATILITY_CEILING,
            },
            "trading": {
                "order_frequency": dict(self.TRADING_ORDER_FREQUENCY),
            },
        }


_settings = Settings()
DRY_RUN: bool = False
STRATEGY_EXPOSURE_CAPS: Dict[str, float] = {}
MARKET_RULES: Dict[str, Any] = {}
TRADING_ORDER_FREQUENCY: Dict[str, Any] = {}


def _refresh_aliases() -> None:
    global OFFLINE_MODE, DRY_RUN, PROXY_URL, PROXY_CONFIG, DB_CONFIG, API_KEYS, DATA_COLLECTOR, ALERT_CONFIG, ABI, STRATEGY_EXPOSURE_CAPS, MICRO_ARBITRAGE_REFERENCE_PAIRS, MARKET_RULES, TRADING_ORDER_FREQUENCY
    OFFLINE_MODE = _settings.OFFLINE_MODE
    DRY_RUN = getattr(_settings, "DRY_RUN", False)
    PROXY_URL = _settings.PROXY_URL
    PROXY_CONFIG = _settings.PROXY_CONFIG
    DB_CONFIG = _settings.DB_CONFIG
    API_KEYS = _settings.API_KEYS
    DATA_COLLECTOR = _settings.DATA_COLLECTOR
    ALERT_CONFIG = _settings.ALERT_CONFIG
    ABI = list(_settings.ABI)
    STRATEGY_EXPOSURE_CAPS = dict(getattr(_settings, "STRATEGY_EXPOSURE_CAPS", {}))
    MICRO_ARBITRAGE_REFERENCE_PAIRS = dict(getattr(_settings, "MICRO_ARBITRAGE_REFERENCE_PAIRS", {}))
    MARKET_RULES = dict(getattr(getattr(_settings, "market_rules", {}), "__dict__", {}))
    TRADING_ORDER_FREQUENCY = dict(getattr(_settings, "TRADING_ORDER_FREQUENCY", {}))


def get_config() -> Settings:
    """Return the singleton settings object."""

    return _settings


def reload_settings() -> Settings:
    """Reload settings from disk and environment."""

    _settings.reload()
    _refresh_aliases()
    return _settings


# Expose module level aliases for legacy imports.
settings = _settings
config = _settings
_refresh_aliases()

__all__ = [
    "settings",
    "config",
    "get_config",
    "reload_settings",
    "OFFLINE_MODE",
    "DRY_RUN",
    "PROXY_URL",
    "PROXY_CONFIG",
    "DB_CONFIG",
    "API_KEYS",
    "DATA_COLLECTOR",
    "ALERT_CONFIG",
    "ABI",
    "EXIT_MIN_HOLD_SECONDS",
    "EXIT_HOLDING_SECONDS",
    "EXIT_STOP_LOSS_PCT",
    "EXIT_TAKE_PROFIT_PCT",
    "TP_SL_TIERED_ENABLED",
    "TP_SL_SOFT_STOP_PCT",
    "TP_SL_HARD_STOP_PCT",
    "TP_SL_TRIM_RATIO",
    "TP_SL_STAGE1_COOLDOWN_SECONDS",
    "TP_SL_EXTENDED_MIN_HOLD_SECONDS",
    "TAKER_FEE",
    "EDGE_RISK_PREMIUM",
    "MAKER_FEE",
    "RISK_VOLATILITY_CEILING",
    "STRATEGY_SIGNAL_FLOOR",
    "STRATEGY_CONSENSUS_MIN",
    "STRATEGY_MAX_RISK_LEVEL",
    "EXIT_POLICY_MODE",
    "STRATEGY_MIN_VOLUME_24H",
    "STRATEGY_MAX_SPREAD_BPS",
    "STRATEGY_HOLD_SECONDS_BY_RISK",
    "STRATEGY_SPREAD_VOLUME_TIERS",
    "STRATEGY_BLACKLIST",
    "MARKET_RULES",
    "PER_MARKET_EXPOSURE_CAPS",
    "STRATEGY_EXPOSURE_CAPS",
    "TRADING_ORDER_FREQUENCY",
]

















