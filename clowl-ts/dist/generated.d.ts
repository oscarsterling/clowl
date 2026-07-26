/** CLowl protocol version (schema properties.clowl.const). */
export declare const CLOWL_VERSION: "0.2";
/** All valid performative codes (schema properties.p.enum). */
export declare const VALID_PERFORMATIVES: readonly ["REQ", "INF", "ACK", "ERR", "DLGT", "DONE", "CNCL", "QRY", "PROG", "CAPS"];
/** Valid delegation modes for DLGT messages (schema then delegation_mode.enum). */
export declare const VALID_DELEGATION_MODES: readonly ["transfer", "fork", "assist"];
/** Required top-level fields (schema required). */
export declare const REQUIRED_FIELDS: readonly ["clowl", "mid", "ts", "p", "from", "to", "cid", "body"];
/** Required body fields (schema properties.body.required). */
export declare const BODY_REQUIRED_FIELDS: readonly ["t", "d"];
/** All known top-level fields (schema properties keys; additionalProperties is false). */
export declare const KNOWN_FIELDS: readonly ["clowl", "mid", "ts", "tid", "pid", "p", "from", "to", "cid", "body", "ctx", "auth", "det"];
/** ctx.inline max length (schema properties.ctx.properties.inline.maxLength). */
export declare const CTX_INLINE_MAX_LENGTH = 2000;
/** ctx.hash exact length (schema properties.ctx.properties.hash.pattern). */
export declare const CTX_HASH_LENGTH = 64;
/** PROG pct minimum (schema definitions.progress_partial.properties.pct.minimum). */
export declare const PROGRESS_PCT_MIN = 0;
/** PROG pct maximum (schema definitions.progress_partial.properties.pct.maximum). */
export declare const PROGRESS_PCT_MAX = 100;
/** PROG seq minimum (schema definitions.progress_partial.properties.seq.minimum). */
export declare const PROGRESS_SEQ_MIN = 0;
/** PROG typed partial field names (schema definitions.progress_partial.properties keys). */
export declare const PROGRESS_PARTIAL_FIELDS: readonly ["seq", "phase", "pct", "partial", "final", "note"];
//# sourceMappingURL=generated.d.ts.map