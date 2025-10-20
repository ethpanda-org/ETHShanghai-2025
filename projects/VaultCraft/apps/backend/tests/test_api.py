from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


def test_health():
    c = TestClient(app)
    r = c.get("/health")
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_metrics_post():
    c = TestClient(app)
    nav = [1.0, 1.01, 0.99, 1.02]
    r = c.post("/metrics", json=nav)
    assert r.status_code == 200
    body = r.json()
    for k in ["ann_return", "ann_vol", "sharpe", "mdd", "recovery_days"]:
        assert k in body


def test_api_metrics_series_query():
    c = TestClient(app)
    r = c.get("/api/v1/metrics/0xabc", params={"series": "1,1.01,1.02"})
    assert r.status_code == 200
    body = r.json()
    assert body["ann_return"] > 0


def test_api_nav_and_events():
    c = TestClient(app)
    r = c.get("/api/v1/nav/0xabc", params={"window": 10})
    assert r.status_code == 200
    nav = r.json()["nav"]
    assert isinstance(nav, list) and len(nav) == 10

    r2 = c.get("/api/v1/events/0xabc")
    assert r2.status_code == 200
    assert isinstance(r2.json()["events"], list)


def test_artifacts_endpoints():
    c = TestClient(app)
    r = c.get("/api/v1/artifacts/vault")
    assert r.status_code == 200
    body = r.json()
    assert ("abi" in body) or ("error" in body)
    r2 = c.get("/api/v1/artifacts/mockerc20")
    assert r2.status_code == 200
    b2 = r2.json()
    assert ("abi" in b2) or ("error" in b2)


def test_status_has_state_fields():
    c = TestClient(app)
    r = c.get("/api/v1/status")
    assert r.status_code == 200
    b = r.json()
    assert b.get("ok") is True
    state = b.get("state")
    assert isinstance(state, dict)
    assert "listener" in state and "snapshot" in state


def test_artifact_cors_allows_local_dev(monkeypatch, tmp_path):
    """Ensure CORS middleware echoes arbitrary localhost origins."""
    from app import main as main_module

    original_root = main_module.REPO_ROOT
    fake_root = tmp_path / "repo"
    artifact_dir = fake_root / "hardhat" / "artifacts" / "contracts" / "Vault.sol"
    artifact_dir.mkdir(parents=True, exist_ok=True)
    (artifact_dir / "Vault.json").write_text('{"abi": [], "bytecode": "0x"}', encoding="utf-8")
    try:
        monkeypatch.setattr(main_module, "REPO_ROOT", fake_root)
        client = TestClient(main_module.app)
        r = client.get("/api/v1/artifacts/vault", headers={"Origin": "http://localhost:5173"})
        assert r.status_code == 200
        assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"
        r2 = client.get("/api/v1/artifacts/vault", headers={"Origin": "http://127.0.0.1:4200"})
        assert r2.status_code == 200
        assert r2.headers.get("access-control-allow-origin") == "http://127.0.0.1:4200"
    finally:
        monkeypatch.setattr(main_module, "REPO_ROOT", original_root)
