// GENERATED FILE - DO NOT EDIT BY HAND.
// Source of truth: clowl-schema.json. Regenerate with: python3 tools/gen_sdk_layer.py
// Drift is enforced by fixtures/run-conformance.sh (generated-layer drift gate).

/** CLowl protocol version (schema properties.clowl.const). */
export const CLOWL_VERSION = "0.2" as const;

/** All valid performative codes (schema properties.p.enum). */
export const VALID_PERFORMATIVES = ["REQ", "INF", "ACK", "ERR", "DLGT", "DONE", "CNCL", "QRY", "PROG", "CAPS"] as const;

/** Valid delegation modes for DLGT messages (schema then delegation_mode.enum). */
export const VALID_DELEGATION_MODES = ["transfer", "fork", "assist"] as const;

/** Required top-level fields (schema required). */
export const REQUIRED_FIELDS = ["clowl", "mid", "ts", "p", "from", "to", "cid", "body"] as const;

/** Required body fields (schema properties.body.required). */
export const BODY_REQUIRED_FIELDS = ["t", "d"] as const;

/** All known top-level fields (schema properties keys; additionalProperties is false). */
export const KNOWN_FIELDS = ["clowl", "mid", "ts", "tid", "pid", "p", "from", "to", "cid", "body", "ctx", "auth", "det"] as const;

/** ctx.inline max length (schema properties.ctx.properties.inline.maxLength). */
export const CTX_INLINE_MAX_LENGTH = 2000;

/** ctx.hash exact length (schema properties.ctx.properties.hash.pattern). */
export const CTX_HASH_LENGTH = 64;
