"""GENERATED FILE - DO NOT EDIT BY HAND.

Source of truth: clowl-schema.json. Regenerate with: python3 tools/gen_sdk_layer.py
Drift is enforced by fixtures/run-conformance.sh (generated-layer drift gate).
"""

# CLowl protocol version (schema properties.clowl.const).
CLOWL_VERSION = "0.2"

# All valid performative codes (schema properties.p.enum).
VALID_PERFORMATIVES = frozenset({"REQ", "INF", "ACK", "ERR", "DLGT", "DONE", "CNCL", "QRY", "PROG", "CAPS"})

# Valid delegation modes for DLGT messages (schema then delegation_mode.enum).
VALID_DELEGATION_MODES = frozenset({"transfer", "fork", "assist"})

# Required top-level fields (schema required).
REQUIRED_FIELDS = ("clowl", "mid", "ts", "p", "from", "to", "cid", "body",)

# Required body fields (schema properties.body.required).
BODY_REQUIRED_FIELDS = ("t", "d",)

# All known top-level fields (schema properties keys; additionalProperties is False).
KNOWN_FIELDS = ("clowl", "mid", "ts", "tid", "pid", "p", "from", "to", "cid", "body", "ctx", "auth", "det",)

# ctx.inline max length (schema properties.ctx.properties.inline.maxLength).
CTX_INLINE_MAX_LENGTH = 2000

# ctx.hash exact length (schema properties.ctx.properties.hash.pattern).
CTX_HASH_LENGTH = 64

# PROG pct minimum (schema definitions.progress_partial.properties.pct.minimum).
PROGRESS_PCT_MIN = 0

# PROG pct maximum (schema definitions.progress_partial.properties.pct.maximum).
PROGRESS_PCT_MAX = 100

# PROG seq minimum (schema definitions.progress_partial.properties.seq.minimum).
PROGRESS_SEQ_MIN = 0

# PROG typed partial field names (schema definitions.progress_partial.properties keys).
PROGRESS_PARTIAL_FIELDS = ("seq", "phase", "pct", "partial", "final", "note",)
