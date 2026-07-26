#!/usr/bin/env bash
# CLowl conformance gate (OSA-1153 item 3).
#
# This script IS the conformance gate for the clowl repo (there is no CI).
# It runs the TS suite, the Python suite, then the divergence gate that
# compares fixtures/.verdicts/ts.json vs py.json.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "========================================"
echo "STEP 1/5: Single-source shim parity gate"
echo "========================================"
# Root clowl.py and _generated.py must remain thin re-export shims so the
# twin package pattern cannot silently return after the SDK collapse.
grep -q 'from clowl.clowl import' "$REPO_ROOT/clowl.py" || {
  echo "PARITY GATE FAIL: root clowl.py must contain 'from clowl.clowl import'" >&2
  exit 1
}
if grep -qE '^(class|def) ' "$REPO_ROOT/clowl.py"; then
  echo "PARITY GATE FAIL: root clowl.py defines classes/functions, it must stay a shim" >&2
  exit 1
fi
lines=$(wc -l < "$REPO_ROOT/clowl.py")
if [ "$lines" -gt 70 ]; then
  echo "PARITY GATE FAIL: root clowl.py has $lines lines (max 70); it must stay a shim" >&2
  exit 1
fi
grep -q 'from clowl._generated import' "$REPO_ROOT/_generated.py" || {
  echo "PARITY GATE FAIL: root _generated.py must contain 'from clowl._generated import'" >&2
  exit 1
}
lines=$(wc -l < "$REPO_ROOT/_generated.py")
if [ "$lines" -gt 40 ]; then
  echo "PARITY GATE FAIL: root _generated.py has $lines lines (max 40); it must stay a shim" >&2
  exit 1
fi
echo "single-source shim parity gate: OK (root clowl.py and _generated.py are shims)"

echo "========================================"
echo "STEP 2/5: Generated-layer drift gate"
echo "========================================"
python3 "$REPO_ROOT/tools/gen_sdk_layer.py" --check

echo "========================================"
echo "STEP 3/5: TypeScript conformance suite"
echo "========================================"
(cd "$REPO_ROOT/clowl-ts" && npm test)

echo "========================================"
echo "STEP 4/5: Python conformance suite"
echo "========================================"
python3 "$REPO_ROOT/tests/test_conformance.py"

echo "========================================"
echo "STEP 5/5: Divergence gate (TS vs Python)"
echo "========================================"
python3 "$REPO_ROOT/fixtures/divergence_gate.py"

echo "ALL CONFORMANCE CHECKS PASSED"
