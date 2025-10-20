"""Monitoring integration smoke tests."""

from __future__ import annotations

import json
import socket
import time
from pathlib import Path
from urllib import request

from polymarket.monitoring.web import WebMonitor


def _allocate_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def test_monitoring_api_serves_report(tmp_path: Path) -> None:
    report = {
        "trades": [
            {"market_id": "SIM-1", "action": "yes", "size": 100, "price": 0.45, "timestamp": "2025-01-01T00:00:00Z"},
            {"market_id": "SIM-2", "action": "no", "size": 150, "price": 0.55, "timestamp": "2025-01-01T00:01:00Z"},
        ],
        "simulation_summary": {
            "start_time": "2025-01-01T00:00:00Z",
            "performance_metrics": {
                "closed_trades": 1,
                "open_positions": 1,
                "current_balance": 12_500,
                "total_pnl": 250,
                "win_rate": 0.5,
                "total_return": 0.025,
            },
        },
    }
    report_path = tmp_path / "simulation_report_20250101_0000.json"
    report_path.write_text(json.dumps(report), encoding="utf-8")

    port = _allocate_port()
    monitor = WebMonitor(port=port, report_dir=tmp_path, auto_open=False)
    monitor.start_background()
    try:
        # Allow the server to bind before issuing the request
        time.sleep(0.2)
        with request.urlopen(f"http://127.0.0.1:{port}/api/data") as response:
            assert response.status == 200
            payload = json.loads(response.read().decode("utf-8"))
        assert payload["status"] == "success"
        assert payload["total_trades"] == 2
        assert payload["recent_trades"][0]["market_id"] == "SIM-1"
        assert payload["recent_trades"][1]["action"] == "no"
    finally:
        monitor.stop()
