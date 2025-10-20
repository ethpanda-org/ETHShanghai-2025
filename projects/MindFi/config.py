import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///app.db")
JWT_SECRET = os.getenv("JWT_SECRET", "change_me")
RPC_HTTP_URL = os.getenv("RPC_HTTP_URL", "https://rpc.ankr.com/eth_sepolia")
RELAYER_PRIVATE_KEY = os.getenv("RELAYER_PRIVATE_KEY", "")
