from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from typing import List


def _collect_env_files() -> List[str]:
    """Return only the repository root .env to enforce a unified env file."""
    here = Path(__file__).resolve()
    root = here
    for _ in range(10):
        if (root / ".git").exists() or (root / "README.md").exists():
            break
        if root.parent == root:
            break
        root = root.parent
    return [str(root / ".env")]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=tuple(_collect_env_files()), extra="allow", case_sensitive=False)
    # Hyper endpoints
    HYPER_API_URL: str = "https://api.hyperliquid-testnet.xyz"
    HYPER_RPC_URL: str = "https://rpc.hyperliquid-testnet.xyz/evm"
    HYPER_WS_URL: str | None = None

    # Price source selection
    ENABLE_HYPER_SDK: bool = False
    PRICE_TIMEOUT: float = 5.0
    PRICE_CACHE_TTL: float = 2.0
    NAV_CACHE_TTL: float = 2.0
    PRICE_RETRIES: int = 2
    PRICE_RETRY_BACKOFF_SEC: float = 0.2
    ENABLE_LIVE_EXEC: bool = False
    APPLY_DRY_RUN_TO_POSITIONS: bool = True
    # Exec risk controls
    EXEC_ALLOWED_SYMBOLS: str = "BTC,ETH"
    EXEC_MAX_SIZE: float = 100.0
    EXEC_MIN_LEVERAGE: float = 1.0
    EXEC_MAX_LEVERAGE: float = 50.0
    EXEC_MAX_NOTIONAL_USD: float = 1e9
    EXEC_MIN_NOTIONAL_USD: float = 10.0
    EXEC_MARKET_SLIPPAGE_BPS: float = 10.0
    EXEC_RO_SLIPPAGE_BPS: float | None = None
    EXEC_RETRY_ATTEMPTS: int = 0
    EXEC_RETRY_BACKOFF_SEC: float = 1.0
    # Live trading credentials (if SDK uses private key)
    HYPER_TRADER_PRIVATE_KEY: str | None = None
    PRIVATE_KEY: str | None = None  # alias for convenience
    ADDRESS: str | None = None      # optional display/use
    # Apply fills to positions when live exec succeeds
    APPLY_LIVE_TO_POSITIONS: bool = True
    # Optional: on close error, attempt reduce-only fallback using stored position
    ENABLE_CLOSE_FALLBACK_RO: bool = True
    # Background snapshot daemon
    ENABLE_SNAPSHOT_DAEMON: bool = False
    SNAPSHOT_INTERVAL_SEC: float = 15.0
    # User WS listener for live fills write-back
    ENABLE_USER_WS_LISTENER: bool = False
    # Alerts
    ALERT_WEBHOOK_URL: str | None = None
    ALERT_COOLDOWN_SEC: float = 120.0
    ALERT_NAV_DRAWDOWN_PCT: float = 0.05

    # pydantic v2: model_config covers env loading and extra handling


settings = Settings()
