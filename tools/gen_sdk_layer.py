#!/usr/bin/env python3
"""Generate the schema-derived constant layer of the CLowl SDKs.

Source of truth: clowl-schema.json. This script emits the constants that both
SDKs consume (protocol version, performative enum, delegation modes, required
and known field lists, ctx length limits) so the schema is the single place
those values are declared. Hand-written code keeps transport, class logic,
validation flow, and the human-readable label map.

Usage:
    python3 tools/gen_sdk_layer.py            # write the generated files
    python3 tools/gen_sdk_layer.py --check    # regenerate in memory and diff
                                              # against the committed files;
                                              # exit nonzero on any drift

Deterministic and stdlib-only: same schema in produces byte-identical files out.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = REPO_ROOT / "clowl-schema.json"

# Emitted files. The two _generated.py files are byte-identical twins, matching
# the existing clowl.py twin reality (root reference file plus packaged copy).
TS_OUT = REPO_ROOT / "clowl-ts" / "src" / "generated.ts"
PY_OUT_PKG = REPO_ROOT / "clowl" / "_generated.py"
PY_OUT_ROOT = REPO_ROOT / "_generated.py"

GEN_CMD = "python3 tools/gen_sdk_layer.py"


def load_schema() -> dict:
    with open(SCHEMA_PATH, encoding="utf-8") as f:
        return json.load(f)


def extract(schema: dict) -> dict:
    props = schema["properties"]
    version = props["clowl"]["const"]
    performatives = list(props["p"]["enum"])
    delegation_modes = list(
        schema["then"]["properties"]["body"]["properties"]["d"]
        ["properties"]["delegation_mode"]["enum"]
    )
    required = list(schema["required"])
    body_required = list(props["body"]["required"])
    known_fields = list(props.keys())
    inline_max = props["ctx"]["properties"]["inline"]["maxLength"]
    hash_pattern = props["ctx"]["properties"]["hash"]["pattern"]
    m = re.search(r"\{(\d+)\}", hash_pattern)
    if not m:
        raise ValueError(
            f"cannot derive ctx.hash length from pattern {hash_pattern!r}"
        )
    hash_len = int(m.group(1))
    return {
        "version": version,
        "performatives": performatives,
        "delegation_modes": delegation_modes,
        "required": required,
        "body_required": body_required,
        "known_fields": known_fields,
        "inline_max": inline_max,
        "hash_len": hash_len,
    }


def ts_tuple(items: list) -> str:
    return "[" + ", ".join(f'"{i}"' for i in items) + "]"


def render_ts(d: dict) -> str:
    return f'''// GENERATED FILE - DO NOT EDIT BY HAND.
// Source of truth: clowl-schema.json. Regenerate with: {GEN_CMD}
// Drift is enforced by fixtures/run-conformance.sh (generated-layer drift gate).

/** CLowl protocol version (schema properties.clowl.const). */
export const CLOWL_VERSION = "{d["version"]}" as const;

/** All valid performative codes (schema properties.p.enum). */
export const VALID_PERFORMATIVES = {ts_tuple(d["performatives"])} as const;

/** Valid delegation modes for DLGT messages (schema then delegation_mode.enum). */
export const VALID_DELEGATION_MODES = {ts_tuple(d["delegation_modes"])} as const;

/** Required top-level fields (schema required). */
export const REQUIRED_FIELDS = {ts_tuple(d["required"])} as const;

/** Required body fields (schema properties.body.required). */
export const BODY_REQUIRED_FIELDS = {ts_tuple(d["body_required"])} as const;

/** All known top-level fields (schema properties keys; additionalProperties is false). */
export const KNOWN_FIELDS = {ts_tuple(d["known_fields"])} as const;

/** ctx.inline max length (schema properties.ctx.properties.inline.maxLength). */
export const CTX_INLINE_MAX_LENGTH = {d["inline_max"]};

/** ctx.hash exact length (schema properties.ctx.properties.hash.pattern). */
export const CTX_HASH_LENGTH = {d["hash_len"]};
'''


def py_frozenset(items: list) -> str:
    return "frozenset({" + ", ".join(f'"{i}"' for i in items) + "})"


def py_tuple(items: list) -> str:
    return "(" + ", ".join(f'"{i}"' for i in items) + ",)"


def render_py(d: dict) -> str:
    return f'''"""GENERATED FILE - DO NOT EDIT BY HAND.

Source of truth: clowl-schema.json. Regenerate with: {GEN_CMD}
Drift is enforced by fixtures/run-conformance.sh (generated-layer drift gate).
"""

# CLowl protocol version (schema properties.clowl.const).
CLOWL_VERSION = "{d["version"]}"

# All valid performative codes (schema properties.p.enum).
VALID_PERFORMATIVES = {py_frozenset(d["performatives"])}

# Valid delegation modes for DLGT messages (schema then delegation_mode.enum).
VALID_DELEGATION_MODES = {py_frozenset(d["delegation_modes"])}

# Required top-level fields (schema required).
REQUIRED_FIELDS = {py_tuple(d["required"])}

# Required body fields (schema properties.body.required).
BODY_REQUIRED_FIELDS = {py_tuple(d["body_required"])}

# All known top-level fields (schema properties keys; additionalProperties is False).
KNOWN_FIELDS = {py_tuple(d["known_fields"])}

# ctx.inline max length (schema properties.ctx.properties.inline.maxLength).
CTX_INLINE_MAX_LENGTH = {d["inline_max"]}

# ctx.hash exact length (schema properties.ctx.properties.hash.pattern).
CTX_HASH_LENGTH = {d["hash_len"]}
'''


def targets(d: dict) -> dict:
    ts = render_ts(d)
    py = render_py(d)
    return {TS_OUT: ts, PY_OUT_PKG: py, PY_OUT_ROOT: py}


def write_files(files: dict) -> None:
    for path, content in files.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"wrote {path.relative_to(REPO_ROOT)}")


def check_files(files: dict) -> int:
    drift = []
    for path, content in files.items():
        rel = path.relative_to(REPO_ROOT)
        if not path.is_file():
            drift.append(f"{rel}: missing (run {GEN_CMD})")
            continue
        current = path.read_text(encoding="utf-8")
        if current != content:
            drift.append(f"{rel}: out of date (run {GEN_CMD})")
    if drift:
        print("GENERATED-LAYER DRIFT DETECTED:", file=sys.stderr)
        for line in drift:
            print(f"  {line}", file=sys.stderr)
        return 1
    print(
        f"generated-layer drift gate: OK - {len(files)} files match clowl-schema.json"
    )
    return 0


def main(argv: list) -> int:
    schema = load_schema()
    d = extract(schema)
    files = targets(d)
    if "--check" in argv[1:]:
        return check_files(files)
    write_files(files)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
