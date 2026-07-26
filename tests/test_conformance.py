"""
CLowl Python conformance runner (OSA-1153 item 3).

Loads fixtures/conformance-cases.json, asserts expected_verdict per case,
and writes fixtures/.verdicts/py.json for the divergence gate.

Runnable as: python3 tests/test_conformance.py
Also works under pytest.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from clowl import CLowlMessage  # noqa: E402

FIXTURES_PATH = ROOT / "fixtures" / "conformance-cases.json"
VERDICTS_PATH = ROOT / "fixtures" / ".verdicts" / "py.json"


def load_cases():
    with open(FIXTURES_PATH, encoding="utf-8") as f:
        data = json.load(f)
    return data["cases"]


CASES = load_cases()


def compute_verdict(case: dict) -> str:
    """Mirror TS computeVerdict: try/except around construction + validate."""
    try:
        msg = CLowlMessage.from_dict(case["input"])
        valid = msg.is_valid()

        if case["class"] == "roundtrip":
            if not valid:
                return "invalid"
            got = msg.to_dict()
            expected = case.get("expected_roundtrip")
            return "roundtrip_ok" if got == expected else "roundtrip_mismatch"

        # valid | invalid | coercible
        return "valid" if valid else "invalid"
    except Exception:
        return "invalid"


def write_verdicts() -> dict:
    """Compute all verdicts and write fixtures/.verdicts/py.json."""
    verdicts = {case["id"]: compute_verdict(case) for case in CASES}
    VERDICTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(VERDICTS_PATH, "w", encoding="utf-8") as f:
        f.write(json.dumps(verdicts, indent=2) + "\n")
    return verdicts


@pytest.fixture(scope="session", autouse=True)
def _write_verdicts_on_session_end():
    """Write py.json after the full pytest session (on teardown)."""
    yield
    write_verdicts()


@pytest.mark.parametrize("case", CASES, ids=lambda c: c["id"])
def test_conformance_case(case):
    assert compute_verdict(case) == case["expected_verdict"]


if __name__ == "__main__":
    failed = 0
    for case in CASES:
        verdict = compute_verdict(case)
        expected = case["expected_verdict"]
        ok = verdict == expected
        status = "PASS" if ok else "FAIL"
        print(f"{status}  {case['id']}: got={verdict} expected={expected}")
        if not ok:
            failed += 1
    write_verdicts()
    print(f"Wrote {VERDICTS_PATH} ({len(CASES)} cases, {failed} failed)")
    sys.exit(1 if failed else 0)
