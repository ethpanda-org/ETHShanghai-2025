from __future__ import annotations

from app.daemon import SnapshotDaemon
from app.snapshots import store as snapshot_store


def test_snapshot_daemon_tick(monkeypatch):
    ids = ["0x1", "0x2"]
    calls = {"n": 0}

    # Monkeypatch snapshot_now to count calls on daemon module
    from app import daemon as daemon_mod

    def fake_snapshot(vault_id: str) -> float:
        calls["n"] += 1
        snapshot_store.add(vault_id, 1.0, None)
        return 1.0

    monkeypatch.setattr(daemon_mod, "snapshot_now", fake_snapshot)
    d = SnapshotDaemon(list_vaults=lambda: ids, interval_sec=0.1)
    d.tick()
    assert calls["n"] == len(ids)
