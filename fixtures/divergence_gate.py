#!/usr/bin/env python3
"""
CLowl TS/Python divergence gate (OSA-1153 item 3).

Compares fixtures/.verdicts/ts.json and fixtures/.verdicts/py.json.
Exits nonzero on missing files, key-set mismatch, or any per-case disagreement.
This is the final step of fixtures/run-conformance.sh (the repo has no CI).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

FIXTURES_DIR = Path(__file__).resolve().parent
TS_PATH = FIXTURES_DIR / ".verdicts" / "ts.json"
PY_PATH = FIXTURES_DIR / ".verdicts" / "py.json"


def main() -> int:
    missing = []
    if not TS_PATH.is_file():
        missing.append(TS_PATH)
    if not PY_PATH.is_file():
        missing.append(PY_PATH)
    if missing:
        for path in missing:
            print(
                f"DIVERGENCE GATE ERROR: missing verdict file {path} "
                f"- run the SDK suites first",
                file=sys.stderr,
            )
        return 2

    with open(TS_PATH, encoding="utf-8") as f:
        ts = json.load(f)
    with open(PY_PATH, encoding="utf-8") as f:
        py = json.load(f)

    ts_keys = set(ts.keys())
    py_keys = set(py.keys())
    if ts_keys != py_keys:
        only_ts = sorted(ts_keys - py_keys)
        only_py = sorted(py_keys - ts_keys)
        print("DIVERGENCE GATE ERROR: verdict key sets differ", file=sys.stderr)
        if only_ts:
            print(f"  only in ts.json: {only_ts}", file=sys.stderr)
        if only_py:
            print(f"  only in py.json: {only_py}", file=sys.stderr)
        return 1

    disagreements = []
    for key in sorted(ts_keys):
        if ts[key] != py[key]:
            disagreements.append((key, ts[key], py[key]))

    if disagreements:
        for case_id, ts_v, py_v in disagreements:
            print(f"DIVERGENCE: {case_id} ts={ts_v} py={py_v}")
        return 1

    n = len(ts_keys)
    print(f"divergence gate: OK - {n} cases agree across TS and Python")
    return 0


if __name__ == "__main__":
    sys.exit(main())
