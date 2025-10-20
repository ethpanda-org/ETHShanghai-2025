from __future__ import annotations

import os
import sys
from pathlib import Path


# Normalise runtime environment so tests don't depend on local .env overrides.
os.environ.setdefault("ENABLE_LIVE_EXEC", "0")
os.environ.setdefault("ENABLE_USER_WS_LISTENER", "0")

# Ensure `app` package (apps/backend/app) is importable when running from repo root
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
