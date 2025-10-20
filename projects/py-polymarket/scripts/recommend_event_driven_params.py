"""
Recommend event-driven parameter tweaks based on last-24h analyzer output.

Reads reports/_analysis_event_driven_last24h.json and config/strategies.yaml,
then prints suggested changes. With --apply, writes the updated YAML.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict


def load_json(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def load_yaml(path: Path) -> Dict[str, Any]:
    try:
        import yaml  # type: ignore
    except Exception as exc:
        raise SystemExit("PyYAML is required: pip install PyYAML")
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}
        if not isinstance(data, dict):
            return {}
        return data


def dump_yaml(path: Path, data: Dict[str, Any]) -> None:
    try:
        import yaml  # type: ignore
    except Exception as exc:
        raise SystemExit("PyYAML is required: pip install PyYAML")
    path.write_text(yaml.safe_dump(data, sort_keys=False, allow_unicode=True), encoding="utf-8")


def recommend(ev: Dict[str, Any], cur: Dict[str, Any]) -> Dict[str, Any]:
    params = dict(cur)
    wins = float(((ev.get("exits") or {}).get("wins") or 0))
    losses = float(((ev.get("exits") or {}).get("losses") or 0))
    total = wins + losses
    win_rate = float(((ev.get("exits") or {}).get("win_rate") or 0.0))
    entries_by_source = ev.get("entries_by_source") or {}
    total_entries = sum(float(v or 0) for v in entries_by_source.values())

    # Baseline defaults if missing
    vol_th = float(params.get("volume_threshold", 5000.0) or 5000.0)
    min_conf = float(params.get("min_confidence", 0.30) or 0.30)
    sent_w = float(params.get("sentiment_weight", 0.55) or 0.55)
    sent_floor = float(params.get("sentiment_floor", 0.05) or 0.05)

    # Sparse triggers: lower volume_threshold modestly and/or raise sentiment_weight
    if total_entries < 10:
        vol_th = max(2000.0, vol_th * 0.8)
        sent_w = min(0.65, max(sent_w, 0.60))
        # optionally ease min_conf down a bit (not below 0.25)
        min_conf = max(0.25, min_conf - 0.05)

    # Noisy / low win-rate with adequate samples: tighten filters
    if total >= 30 and win_rate < 0.15:
        min_conf = min(0.45, min_conf + 0.05)
        sent_floor = min(0.10, max(sent_floor, 0.08))

    params.update(
        {
            "volume_threshold": round(vol_th, 2),
            "min_confidence": round(min_conf, 3),
            "sentiment_weight": round(sent_w, 3),
            "sentiment_floor": round(sent_floor, 3),
        }
    )
    return params


def main() -> None:
    ap = argparse.ArgumentParser(description="Recommend event-driven param tweaks")
    ap.add_argument("--apply", action="store_true", help="Apply changes to config/strategies.yaml")
    ap.add_argument("--dry-run", action="store_true", help="Do not write files; print suggestions only")
    args = ap.parse_args()

    ev_path = Path("reports") / "_analysis_event_driven_last24h.json"
    ev = load_json(ev_path)
    if not ev:
        raise SystemExit(f"Missing analyzer output: {ev_path}")

    cfg_path = Path("config") / "strategies.yaml"
    cfg = load_yaml(cfg_path)
    strat = (((cfg.get("strategies") or {}) if isinstance(cfg, dict) else {}) or {}).get("event_driven", {})
    params = (strat.get("params") or {}) if isinstance(strat, dict) else {}
    new_params = recommend(ev, params)

    suggestion = {
        "source_file": str(ev_path),
        "win_rate": float(((ev.get("exits") or {}).get("win_rate") or 0.0)),
        "entries_by_source": ev.get("entries_by_source") or {},
        "current_params": params,
        "recommended_params": new_params,
    }
    print(json.dumps(suggestion, ensure_ascii=False, indent=2))

    out_path = Path("reports") / "_event_driven_tuning_suggestion.json"
    out_path.write_text(json.dumps(suggestion, ensure_ascii=False, indent=2), encoding="utf-8")

    if args.apply and not args.dry_run:
        if not isinstance(cfg.get("strategies"), dict):
            raise SystemExit("Invalid strategies.yaml: missing strategies mapping")
        if not isinstance(cfg["strategies"].get("event_driven"), dict):
            cfg["strategies"]["event_driven"] = {"enabled": True, "weight": 0.25, "params": {}}
        cfg["strategies"]["event_driven"].setdefault("params", {}).update(new_params)
        dump_yaml(cfg_path, cfg)
        print(f"Applied recommendations to {cfg_path}")


if __name__ == "__main__":
    main()

