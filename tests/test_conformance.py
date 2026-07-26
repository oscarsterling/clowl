"""
CLowl Python conformance runner (OSA-1153 items 3 + 1).

Loads fixtures/conformance-cases.json, asserts the strict and lenient
expected_verdict per case (plus expected_coercions when present), and writes
fixtures/.verdicts/py.json ({strict, lenient} per case) for the divergence gate.

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


def evaluate(case: dict, lenient: bool):
    """Return (verdict, warnings) for the given parse mode."""
    try:
        if lenient:
            msg = CLowlMessage.parse_lenient(case["input"])
        else:
            msg = CLowlMessage.from_dict(case["input"])
        warnings = list(getattr(msg, "coercion_warnings", []))
        valid = msg.is_valid()

        if case["class"] == "roundtrip":
            if not valid:
                return "invalid", warnings
            got = msg.to_dict()
            expected = case.get("expected_roundtrip")
            return ("roundtrip_ok" if got == expected else "roundtrip_mismatch"), warnings

        return ("valid" if valid else "invalid"), warnings
    except Exception:
        return "invalid", []


def norm_warnings(ws):
    """Order-independent normalization of coercion warnings for comparison."""
    return sorted(
        (
            {
                "field": w["field"],
                "original": w["original"],
                "coerced": w["coerced"],
                "reason": w["reason"],
            }
            for w in ws
        ),
        key=lambda w: (w["field"], w["reason"]),
    )


def write_verdicts() -> dict:
    """Compute strict + lenient verdicts and write fixtures/.verdicts/py.json."""
    verdicts = {
        case["id"]: {
            "strict": evaluate(case, False)[0],
            "lenient": evaluate(case, True)[0],
        }
        for case in CASES
    }
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
    strict_verdict, _ = evaluate(case, False)
    assert strict_verdict == case["expected_verdict"]

    expected_lenient = case.get("expected_lenient_verdict", case["expected_verdict"])
    lenient_verdict, lenient_warnings = evaluate(case, True)
    assert lenient_verdict == expected_lenient

    if "expected_coercions" in case:
        assert norm_warnings(lenient_warnings) == norm_warnings(case["expected_coercions"])


if __name__ == "__main__":
    failed = 0
    for case in CASES:
        sv, _ = evaluate(case, False)
        expected = case["expected_verdict"]
        exp_len = case.get("expected_lenient_verdict", expected)
        lv, lw = evaluate(case, True)
        ok = sv == expected and lv == exp_len
        if ok and "expected_coercions" in case:
            ok = norm_warnings(lw) == norm_warnings(case["expected_coercions"])
        status = "PASS" if ok else "FAIL"
        print(f"{status}  {case['id']}: strict={sv}/{expected} lenient={lv}/{exp_len}")
        if not ok:
            failed += 1
    write_verdicts()
    print(f"Wrote {VERDICTS_PATH} ({len(CASES)} cases, {failed} failed)")
    sys.exit(1 if failed else 0)
