"""
配置文件 - Dex Screener Token Monitor
"""

# API 配置
API_BASE_URL = "https://api.dexscreener.com"
API_ENDPOINTS = {
    "token_profiles": "/token-profiles/latest/v1",  # 获取最新的代币档案（30个）
    "token_boosts_latest": "/token-boosts/latest/v1",  # 获取最新提升的代币（30个）
    "token_boosts_top": "/token-boosts/top/v1",  # 获取热门提升的代币（30个）
    "token_details": "/latest/dex/tokens/{address}",  # 获取特定代币的详细信息
}

# 采集配置
FETCH_INTERVAL = 0.1  # 每次请求间隔（秒）
REQUEST_TIMEOUT = 10  # 请求超时时间（秒）
USE_ENDPOINTS = ["token_profiles", "token_boosts_latest", "token_boosts_top"]  # 要使用的端点列表
ENDPOINT_ROTATION_INTERVAL = 10  # 端点轮换间隔（秒），避免同时请求所有端点

# CSV 配置
CSV_FILE = "tokens_data.csv"
CSV_HEADERS = ["token_symbol", "token_name", "timestamp"]

# 日志配置
LOG_FILE = "monitor.log"
LOG_LEVEL = "INFO"

# 性能配置
CACHE_SIZE = 10000  # 内存缓存的token数量，用于快速去重

