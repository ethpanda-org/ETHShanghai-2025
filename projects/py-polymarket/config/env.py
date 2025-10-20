from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Set

_ENV_PATH = Path('.env')


def _load_dotenv() -> None:
    if not _ENV_PATH.exists():
        return
    for line in _ENV_PATH.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        os.environ.setdefault(key.strip(), value.strip())


def _env(name: str, default: str) -> tuple[str, bool]:
    value = os.getenv(name)
    if value is None:
        return default, False
    return value, True


def _env_bool(name: str, default: bool) -> tuple[bool, bool]:
    raw, found = _env(name, str(default).lower())
    return (raw.lower() == 'true'), found


def _env_int(name: str, default: int) -> tuple[int, bool]:
    raw, found = _env(name, str(default))
    try:
        return int(raw), found
    except ValueError:
        return default, found


@dataclass
class EnvironmentSettings:
    """Resolved environment overrides."""

    environment: str = 'development'
    debug: bool = False
    offline_mode: bool = False
    dry_run: bool = True

    polygon_rpc_url: str = 'https://polygon-rpc.com'
    polymarket_contract: str = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045'
    clob_rest_url: str = 'https://clob.polymarket.com'
    clob_ws_url: str = 'wss://ws-subscriptions-clob.polymarket.com/ws'

    proxy_enabled: bool = True
    proxy_url: Optional[str] = None
    proxy_host: str = 'brd.superproxy.io'
    proxy_port: int = 33335
    proxy_username: Optional[str] = None
    proxy_password: Optional[str] = None

    db_host: str = 'localhost'
    db_port: int = 5432
    db_name: str = 'polymarket_db'
    db_user: Optional[str] = None
    db_password: Optional[str] = None

    newsapi_key: Optional[str] = None
    twitter_bearer_token: Optional[str] = None
    polygon_private_key: Optional[str] = None

    overrides: Set[str] = field(default_factory=set, init=False)


def load_environment() -> EnvironmentSettings:
    """Return parsed environment configuration."""

    _load_dotenv()
    overrides: Set[str] = set()

    def track(name: str, value, found: bool):
        if found:
            overrides.add(name)
        return value

    environment, found = _env('POLY_ENV', 'development')
    debug, found_debug = _env_bool('POLY_DEBUG', False)
    offline, found_offline = _env_bool('POLY_OFFLINE_MODE', False)
    dry_run, found_dryrun = _env_bool('POLY_DRY_RUN', True)

    polygon_rpc, found_polygon = _env('POLYGON_RPC_URL', 'https://polygon-rpc.com')
    contract, found_contract = _env('POLYMARKET_CONTRACT', '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045')
    clob_rest, found_rest = _env('CLOB_REST_URL', 'https://clob.polymarket.com')
    clob_ws, found_ws = _env('CLOB_WS_URL', 'wss://ws-subscriptions-clob.polymarket.com/ws')

    proxy_enabled, found_proxy_enabled = _env_bool('PROXY_ENABLED', True)
    proxy_url = os.getenv('PROXY_URL')
    if proxy_url is not None:
        overrides.add('proxy_url')
    proxy_host, found_proxy_host = _env('PROXY_HOST', 'brd.superproxy.io')
    proxy_port, found_proxy_port = _env_int('PROXY_PORT', 33335)
    proxy_username = os.getenv('PROXY_USERNAME')
    if proxy_username is not None:
        overrides.add('proxy_username')
    proxy_password = os.getenv('PROXY_PASSWORD')
    if proxy_password is not None:
        overrides.add('proxy_password')

    db_host, found_db_host = _env('DB_HOST', 'localhost')
    db_port, found_db_port = _env_int('DB_PORT', 5432)
    db_name, found_db_name = _env('DB_NAME', 'polymarket_db')
    db_user = os.getenv('DB_USER')
    if db_user is not None:
        overrides.add('db_user')
    db_password = os.getenv('DB_PASSWORD')
    if db_password is not None:
        overrides.add('db_password')

    news_key = os.getenv('NEWSAPI_KEY')
    if news_key is not None:
        overrides.add('newsapi_key')
    twitter_key = os.getenv('TWITTER_BEARER_TOKEN')
    if twitter_key is not None:
        overrides.add('twitter_bearer_token')
    private_key = os.getenv('POLY_PRIVATE_KEY')
    if private_key is not None:
        overrides.add('polygon_private_key')

    env = EnvironmentSettings(
        environment=track('environment', environment, found),
        debug=track('debug', debug, found_debug),
        offline_mode=track('offline_mode', offline, found_offline),
        dry_run=track('dry_run', dry_run, found_dryrun),
        polygon_rpc_url=track('polygon_rpc_url', polygon_rpc, found_polygon),
        polymarket_contract=track('polymarket_contract', contract, found_contract),
        clob_rest_url=track('clob_rest_url', clob_rest, found_rest),
        clob_ws_url=track('clob_ws_url', clob_ws, found_ws),
        proxy_enabled=track('proxy_enabled', proxy_enabled, found_proxy_enabled),
        proxy_url=proxy_url,
        proxy_host=track('proxy_host', proxy_host, found_proxy_host),
        proxy_port=track('proxy_port', proxy_port, found_proxy_port),
        proxy_username=proxy_username,
        proxy_password=proxy_password,
        db_host=track('db_host', db_host, found_db_host),
        db_port=track('db_port', db_port, found_db_port),
        db_name=track('db_name', db_name, found_db_name),
        db_user=db_user,
        db_password=db_password,
        newsapi_key=news_key,
        twitter_bearer_token=twitter_key,
        polygon_private_key=private_key,
    )
    env.overrides.update(overrides)
    return env


__all__ = ['EnvironmentSettings', 'load_environment']
