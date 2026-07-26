"""Unit tests for OSA-1153 item 4 typed streaming partial factory and
reconstruction helper (Python SDK). Runnable under pytest and standalone."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from clowl import (  # noqa: E402
    CLowlMessage,
    create_prog,
    create_req,
    reconstruct_progress,
)


def test_create_prog_freeform_still_works():
    msg = create_prog("radar", "oscar", "c1", "search", pct=50, note="halfway")
    assert msg.p == "PROG"
    assert msg.body["d"] == {"pct": 50, "note": "halfway"}
    assert msg.is_valid()


def test_create_prog_typed_emits_only_provided_fields():
    msg = create_prog("radar", "oscar", "c1", "search", seq=2, phase="indexing", pct=40, partial={"found": 3})
    assert msg.body["d"] == {"seq": 2, "phase": "indexing", "pct": 40, "partial": {"found": 3}}
    assert "final" not in msg.body["d"]
    assert msg.is_valid()


def test_create_prog_final_emitted_only_when_true():
    not_final = create_prog("radar", "oscar", "c1", "search", seq=0, final=False)
    assert "final" not in not_final.body["d"]
    is_final = create_prog("radar", "oscar", "c1", "search", seq=1, final=True)
    assert is_final.body["d"]["final"] is True
    assert is_final.is_valid()


def test_reconstruct_folds_latest_state():
    stream = [
        create_prog("radar", "oscar", "c1", "search", seq=0, partial={"found": 1}),
        create_prog("radar", "oscar", "c1", "search", seq=1, partial={"found": 3, "scanned": 10}),
    ]
    latest_state, is_final, gaps = reconstruct_progress(stream)
    assert latest_state == {"found": 3, "scanned": 10}
    assert is_final is False
    assert gaps == []


def test_reconstruct_reports_gaps():
    stream = [
        create_prog("radar", "oscar", "c1", "search", seq=0),
        create_prog("radar", "oscar", "c1", "search", seq=1),
        create_prog("radar", "oscar", "c1", "search", seq=4),
    ]
    _, _, gaps = reconstruct_progress(stream)
    assert gaps == [2, 3]


def test_reconstruct_final_and_ignores_non_prog():
    stream = [
        create_req("oscar", "radar", "c1", "search"),
        create_prog("radar", "oscar", "c1", "search", seq=0, partial={"found": 2}),
        create_prog("radar", "oscar", "c1", "search", seq=1, partial={"found": 8}, final=True),
    ]
    latest_state, is_final, gaps = reconstruct_progress(stream)
    assert latest_state == {"found": 8}
    assert is_final is True
    assert gaps == []


def test_reconstruct_empty():
    latest_state, is_final, gaps = reconstruct_progress([])
    assert latest_state == {}
    assert is_final is False
    assert gaps == []


if __name__ == "__main__":
    import pytest
    raise SystemExit(pytest.main([__file__, "-v"]))
