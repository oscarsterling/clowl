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
echo "STEP 1/4: Generated-layer drift gate"
echo "========================================"
python3 "$REPO_ROOT/tools/gen_sdk_layer.py" --check

echo "========================================"
echo "STEP 2/4: TypeScript conformance suite"
echo "========================================"
(cd "$REPO_ROOT/clowl-ts" && npm test)

echo "========================================"
echo "STEP 3/4: Python conformance suite"
echo "========================================"
python3 "$REPO_ROOT/tests/test_conformance.py"

echo "========================================"
echo "STEP 4/4: Divergence gate (TS vs Python)"
echo "========================================"
python3 "$REPO_ROOT/fixtures/divergence_gate.py"

echo "ALL CONFORMANCE CHECKS PASSED"
