/**
 * CLowl v0.2 Message Creation and Validation
 *
 * Mirrors the Python reference library. Zero runtime dependencies.
 */
import { CLOWL_VERSION, VALID_PERFORMATIVES, VALID_DELEGATION_MODES, PERFORMATIVE_NAMES, } from "./types.js";
// ---------------------------------------------------------------------------
// ID Generation
// ---------------------------------------------------------------------------
/**
 * Generate a time-ordered message ID (UUIDv7-style).
 * Format: <timestamp_ms_hex>-7<3hex>-<4hex>-<4hex>-<12hex>
 * Sorts lexicographically by creation time.
 */
export function generateMid() {
    const tsMs = Date.now();
    const rand = randomHex(24);
    const tsHex = tsMs.toString(16).padStart(12, "0");
    return `${tsHex}-7${rand.slice(1, 4)}-${rand.slice(4, 8)}-${rand.slice(8, 12)}-${rand.slice(12, 24)}`;
}
/** Generate a conversation ID. */
export function generateCid() {
    return randomHex(16);
}
/** Generate a trace ID. */
export function generateTid() {
    return "t-" + randomHex(12);
}
/**
 * Generate a hex string of the specified length using crypto.getRandomValues
 * when available, with a Math.random fallback.
 */
function randomHex(length) {
    if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
        const bytes = new Uint8Array(Math.ceil(length / 2));
        globalThis.crypto.getRandomValues(bytes);
        return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, length);
    }
    let hex = "";
    for (let i = 0; i < length; i++) {
        hex += Math.floor(Math.random() * 16).toString(16);
    }
    return hex;
}
// ---------------------------------------------------------------------------
// CLowlMessage Class
// ---------------------------------------------------------------------------
export class CLowlMessage {
    clowl;
    mid;
    ts;
    p;
    from;
    to;
    cid;
    body;
    tid;
    pid;
    ctx;
    auth;
    det;
    constructor(p, from, to, cid, bodyT, bodyD = {}, options = {}) {
        this.clowl = CLOWL_VERSION;
        this.mid = options.mid ?? generateMid();
        this.ts = options.ts ?? Math.floor(Date.now() / 1000);
        this.p = p;
        this.from = from;
        this.to = to;
        this.cid = cid;
        this.body = { t: bodyT, d: bodyD };
        this.tid = options.tid;
        this.pid = options.pid;
        this.ctx = options.ctx;
        this.auth = options.auth;
        this.det = options.det ?? false;
    }
    // ------------------------------------------------------------------
    // Serialization
    // ------------------------------------------------------------------
    /** Convert to a plain object suitable for JSON serialization. */
    toDict() {
        const d = {
            clowl: this.clowl,
            mid: this.mid,
            ts: this.ts,
            p: this.p,
            from: this.from,
            to: this.to,
            cid: this.cid,
            body: this.body,
        };
        if (this.tid !== undefined)
            d.tid = this.tid;
        if (this.pid !== undefined)
            d.pid = this.pid;
        if (this.ctx !== undefined)
            d.ctx = this.ctx;
        if (this.auth !== undefined)
            d.auth = this.auth;
        if (this.det)
            d.det = this.det;
        return d;
    }
    /** Serialize to a JSON string. */
    toJson(indent = 2) {
        return JSON.stringify(this.toDict(), null, indent);
    }
    /** Construct a CLowlMessage from a plain object (e.g., parsed JSON). */
    static fromDict(data) {
        const body = data.body ?? { t: "", d: {} };
        const bodyT = body.t ?? "";
        const bodyD = (body.d ?? {});
        return new CLowlMessage(data.p, data.from, data.to, data.cid, bodyT, bodyD, {
            mid: data.mid,
            ts: data.ts,
            tid: data.tid,
            pid: data.pid,
            ctx: data.ctx,
            auth: data.auth,
            det: data.det ?? false,
        });
    }
    /** Construct a CLowlMessage from a JSON string. */
    static fromJson(jsonStr) {
        return CLowlMessage.fromDict(JSON.parse(jsonStr));
    }
    // ------------------------------------------------------------------
    // Validation
    // ------------------------------------------------------------------
    /** Validate the message. Returns a list of error strings (empty = valid). */
    validate() {
        const errors = [];
        if (this.clowl !== CLOWL_VERSION) {
            errors.push(`Invalid clowl version: '${this.clowl}' (expected '${CLOWL_VERSION}')`);
        }
        if (!this.mid) {
            errors.push("Missing required field: mid");
        }
        if (typeof this.ts !== "number" || this.ts < 0) {
            errors.push(`Invalid ts: ${JSON.stringify(this.ts)} (must be non-negative integer)`);
        }
        if (!VALID_PERFORMATIVES.includes(this.p)) {
            errors.push(`Invalid performative: '${this.p}' (must be one of ${[...VALID_PERFORMATIVES].sort().join(", ")})`);
        }
        if (!this.from) {
            errors.push("Missing required field: from");
        }
        if (!this.to || (Array.isArray(this.to) && this.to.length === 0)) {
            errors.push("Missing required field: to");
        }
        if (!this.cid) {
            errors.push("Missing required field: cid");
        }
        if (typeof this.body !== "object" || this.body === null) {
            errors.push("body must be an object");
        }
        else {
            if (!this.body.t) {
                errors.push("body.t is required");
            }
            if (typeof this.body.d !== "object" || this.body.d === null || Array.isArray(this.body.d)) {
                errors.push("body.d must be an object");
            }
        }
        // DLGT requires delegation_mode
        if (this.p === "DLGT") {
            const d = this.body.d ?? {};
            const mode = d.delegation_mode;
            if (!mode || !VALID_DELEGATION_MODES.includes(mode)) {
                errors.push(`DLGT messages require body.d.delegation_mode to be one of ${[...VALID_DELEGATION_MODES].sort().join(", ")}, got ${JSON.stringify(mode)}`);
            }
        }
        // ctx validation
        if (this.ctx !== undefined) {
            if (typeof this.ctx !== "object" || this.ctx === null) {
                errors.push("ctx must be an object with ref/inline/hash fields");
            }
            else {
                const inline = this.ctx.inline;
                if (inline && inline.length > 2000) {
                    errors.push(`ctx.inline exceeds 2000 character limit (got ${inline.length})`);
                }
                const h = this.ctx.hash;
                if (h && (typeof h !== "string" || h.length !== 64)) {
                    errors.push("ctx.hash must be a 64-char SHA-256 hex string");
                }
            }
        }
        return errors;
    }
    /** Return true if the message passes validation. */
    isValid() {
        return this.validate().length === 0;
    }
    // ------------------------------------------------------------------
    // Human Translation
    // ------------------------------------------------------------------
    /** Return a human-readable English description of this message. */
    toHuman() {
        const date = new Date(this.ts * 1000);
        const tsStr = date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
        const perf = PERFORMATIVE_NAMES[this.p] ?? this.p;
        const toStr = Array.isArray(this.to) ? "[" + this.to.join(", ") + "]" : this.to;
        const bodyD = this.body.d ?? {};
        const bodyT = this.body.t ?? "";
        const tidTag = this.tid ? `[${this.tid}] ` : "";
        const pidTag = this.pid ? ` (re: ${this.pid.slice(0, 8)}...)` : "";
        const detTag = this.det ? " [deterministic]" : "";
        const authTag = this.auth ? " [authenticated]" : "";
        let detail;
        if (this.p === "ERR") {
            const code = bodyD.code ?? "?";
            const msg = bodyD.msg ?? "unknown error";
            const retry = bodyD.retry ? " - retryable" : "";
            detail = `[${code}] ${msg}${retry}`;
        }
        else if (this.p === "CAPS") {
            const supports = bodyD.supports ?? [];
            const ver = bodyD.clowl ?? "?";
            detail = `CLowl v${ver} | supports: ${supports.join(", ")}`;
        }
        else if (this.p === "DLGT") {
            const mode = bodyD.delegation_mode ?? "transfer";
            const rest = {};
            for (const [k, v] of Object.entries(bodyD)) {
                if (k !== "delegation_mode")
                    rest[k] = v;
            }
            detail = `${bodyT} [${mode}]`;
            if (Object.keys(rest).length > 0) {
                detail += ` - ${JSON.stringify(rest)}`;
            }
        }
        else if (this.p === "PROG") {
            const pct = bodyD.pct;
            const note = bodyD.note ?? "";
            if (pct !== undefined) {
                detail = `${bodyT} - ${pct}% ${note}`.replace(/[\s-]+$/, "");
            }
            else {
                detail = `${bodyT} - ${note}`.replace(/[\s-]+$/, "");
            }
        }
        else if (this.p === "ACK") {
            const eta = bodyD.eta;
            detail = `Acknowledged ${bodyT}`;
            if (eta)
                detail += ` - ETA ${eta}`;
        }
        else if (Object.keys(bodyD).length > 0) {
            detail = `${bodyT} - ${JSON.stringify(bodyD)}`;
        }
        else {
            detail = bodyT;
        }
        let ctxStr = "";
        if (this.ctx) {
            const ref = this.ctx.ref;
            const h = this.ctx.hash;
            if (ref) {
                ctxStr = ` | ctx: ${ref}`;
                if (h) {
                    ctxStr += ` (sha256: ${h.slice(0, 12)}...)`;
                }
            }
        }
        return `[${tsStr}] ${tidTag}${this.from} > ${toStr}: ${perf} ${detail}${ctxStr}${detTag}${pidTag}${authTag}`;
    }
    toString() {
        return `CLowlMessage(p=${JSON.stringify(this.p)}, from=${JSON.stringify(this.from)}, to=${JSON.stringify(this.to)}, t=${JSON.stringify(this.body.t)})`;
    }
}
// ---------------------------------------------------------------------------
// Factory Functions
// ---------------------------------------------------------------------------
/** Create a REQ (Request) message. */
export function createReq(from, to, cid, task, data = {}, options = {}) {
    return new CLowlMessage("REQ", from, to, cid, task, data, options);
}
/** Create an ACK (Acknowledge) message. */
export function createAck(from, to, cid, task, data = {}, options = {}) {
    return new CLowlMessage("ACK", from, to, cid, task, data, options);
}
/** Create a DONE (Complete) message. */
export function createDone(from, to, cid, task, data = {}, options = {}) {
    return new CLowlMessage("DONE", from, to, cid, task, data, options);
}
/** Create an ERR (Error) message. */
export function createErr(from, to, cid, code, msg, retry = false, options = {}) {
    return new CLowlMessage("ERR", from, to, cid, "error", { code, msg, retry }, options);
}
/** Create a DLGT (Delegate) message. */
export function createDlgt(from, to, cid, task, delegationMode = "transfer", data = {}, options = {}) {
    if (!VALID_DELEGATION_MODES.includes(delegationMode)) {
        throw new Error(`delegation_mode must be one of ${[...VALID_DELEGATION_MODES].sort().join(", ")}`);
    }
    const d = { delegation_mode: delegationMode, ...data };
    return new CLowlMessage("DLGT", from, to, cid, task, d, options);
}
/** Create a PROG (Progress) message. */
export function createProg(from, to, cid, task, pct, note = "", options = {}) {
    const data = {};
    if (pct !== undefined)
        data.pct = pct;
    if (note)
        data.note = note;
    return new CLowlMessage("PROG", from, to, cid, task, data, options);
}
/** Create a CAPS (Capabilities) message. Broadcasts to '*'. */
export function createCaps(from, supports, options = {}) {
    return new CLowlMessage("CAPS", from, "*", "system", "capabilities", { supports, clowl: CLOWL_VERSION }, options);
}
/** Create a CNCL (Cancel) message. */
export function createCncl(from, to, cid, task, reason = "", options = {}) {
    const data = reason ? { reason } : {};
    return new CLowlMessage("CNCL", from, to, cid, task, data, options);
}
/** Create an INF (Inform) message. */
export function createInf(from, to, cid, task, data = {}, options = {}) {
    return new CLowlMessage("INF", from, to, cid, task, data, options);
}
/** Create a QRY (Query) message. */
export function createQry(from, to, cid, task, data = {}, options = {}) {
    return new CLowlMessage("QRY", from, to, cid, task, data, options);
}
//# sourceMappingURL=message.js.map