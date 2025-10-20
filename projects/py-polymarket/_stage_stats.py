import json
from pathlib import Path
from collections import defaultdict

path = Path("reports/fills.jsonl")
if not path.exists():
    raise SystemExit("fills missing")

stage_counts = defaultdict(int)
strategy_stage = defaultdict(lambda: defaultdict(int))
with path.open(encoding="utf-8") as fh:
    for line in fh:
        line = line.strip()
        if not line:
            continue
        try:
            rec = json.loads(line)
        except Exception:
            continue
        if rec.get("event") != "exit":
            continue
        reason = rec.get("reason")
        if not reason:
            continue
        stage = None
        reason_str = str(reason)
        if reason_str.startswith("tp_sl_stage1"):
            stage = "stage1"
        elif reason_str.startswith("tp_sl_stage2") or reason_str == "tp_sl":
            stage = "stage2"
        if stage:
            stage_counts[stage] += 1
            strategies = rec.get("strategies") or []
            if isinstance(strategies, list):
                for strat in strategies:
                    strategy_stage[str(strat)][stage] += 1

print("stage counts", dict(stage_counts))
for strat, counts in strategy_stage.items():
    print(strat, dict(counts))
