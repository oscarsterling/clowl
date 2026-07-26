/**
 * CLowl v0.2 Message Creation and Validation
 *
 * Mirrors the Python reference library. Zero runtime dependencies.
 */

import {
  CLOWL_VERSION,
  VALID_PERFORMATIVES,
  VALID_DELEGATION_MODES,
  PERFORMATIVE_NAMES,
  type Performative,
  type DelegationMode,
  type Recipient,
  type CLowlBody,
  type CLowlContext,
  type CLowlMessageData,
  type CLowlMessageOptions,
  type CoercionWarning,
} from "./types.js";

// ---------------------------------------------------------------------------
// ID Generation
// ---------------------------------------------------------------------------

/**
 * Generate a time-ordered message ID (UUIDv7-style).
 * Format: <timestamp_ms_hex>-7<3hex>-<4hex>-<4hex>-<12hex>
 * Sorts lexicographically by creation time.
 */
export function generateMid(): string {
  const tsMs = Date.now();
  const rand = randomHex(24);
  const tsHex = tsMs.toString(16).padStart(12, "0");
  return `${tsHex}-7${rand.slice(1, 4)}-${rand.slice(4, 8)}-${rand.slice(8, 12)}-${rand.slice(12, 24)}`;
}

/** Generate a conversation ID. */
export function generateCid(): string {
  return randomHex(16);
}

/** Generate a trace ID. */
export function generateTid(): string {
  return "t-" + randomHex(12);
}

/**
 * Generate a hex string of the specified length using crypto.getRandomValues
 * when available, with a Math.random fallback.
 */
function randomHex(length: number): string {
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
  readonly clowl: string;
  readonly mid: string;
  readonly ts: number;
  readonly p: Performative;
  readonly from: string;
  readonly to: Recipient;
  readonly cid: string;
  readonly body: CLowlBody;
  readonly tid: string | undefined;
  readonly pid: string | undefined;
  readonly ctx: CLowlContext | undefined;
  readonly auth: string | undefined;
  readonly det: boolean;
  coercionWarnings: CoercionWarning[] = [];

  constructor(
    p: Performative,
    from: string,
    to: Recipient,
    cid: string,
    bodyT: string,
    bodyD: Record<string, unknown> = {},
    options: CLowlMessageOptions = {},
  ) {
    this.clowl = options.clowl ?? CLOWL_VERSION;
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
  toDict(): CLowlMessageData {
    const d: CLowlMessageData = {
      clowl: this.clowl,
      mid: this.mid,
      ts: this.ts,
      p: this.p,
      from: this.from,
      to: this.to,
      cid: this.cid,
      body: this.body,
    };
    if (this.tid !== undefined) d.tid = this.tid;
    if (this.pid !== undefined) d.pid = this.pid;
    if (this.ctx !== undefined) d.ctx = this.ctx;
    if (this.auth !== undefined) d.auth = this.auth;
    if (this.det) d.det = this.det;
    return d;
  }

  /** Serialize to a JSON string. */
  toJson(indent: number = 2): string {
    return JSON.stringify(this.toDict(), null, indent);
  }

  /** Construct a CLowlMessage from a plain object (e.g., parsed JSON). */
  static fromDict(data: CLowlMessageData, options: { lenient?: boolean } = {}): CLowlMessage {
    if (options.lenient) return CLowlMessage.parseLenient(data);
    const body = data.body ?? { t: "", d: {} };
    const bodyT = body.t ?? "";
    const bodyD = (body.d ?? {}) as Record<string, unknown>;
    return new CLowlMessage(
      data.p,
      data.from,
      data.to,
      data.cid,
      bodyT,
      bodyD,
      {
        clowl: data.clowl,
        mid: data.mid,
        ts: data.ts,
        tid: data.tid,
        pid: data.pid,
        ctx: data.ctx,
        auth: data.auth,
        det: data.det ?? false,
      },
    );
  }

  /**
   * Lenient parse: coerce near-miss payloads into the declared schema and record
   * the original defects as coercionWarnings so audits can see what was changed.
   * Strict fromDict stays the default and is unchanged.
   */
  static parseLenient(data: CLowlMessageData): CLowlMessage {
    const warnings: CoercionWarning[] = [];
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      // Non-object input cannot be coerced; build an empty message so validate() fails.
      const msg = CLowlMessage.fromDict({} as CLowlMessageData);
      msg.coercionWarnings = warnings;
      return msg;
    }
    const work: Record<string, unknown> = { ...(data as unknown as Record<string, unknown>) };

    // clowl version
    if (typeof work.clowl === "string" && work.clowl !== CLOWL_VERSION) {
      warnings.push({ field: "clowl", original: work.clowl, coerced: CLOWL_VERSION, reason: "coerce-clowl-version" });
      work.clowl = CLOWL_VERSION;
    }

    // ts: numeric string -> int
    if (typeof work.ts === "string" && /^-?\d+$/.test(work.ts.trim())) {
      const n = parseInt(work.ts.trim(), 10);
      warnings.push({ field: "ts", original: work.ts, coerced: n, reason: "numeric-string-to-int" });
      work.ts = n;
    }

    // p: trim then uppercase (only when it lands on a valid performative)
    if (typeof work.p === "string") {
      const trimmed = work.p.trim();
      if (trimmed !== work.p && (VALID_PERFORMATIVES as readonly string[]).includes(trimmed)) {
        warnings.push({ field: "p", original: work.p, coerced: trimmed, reason: "trim-performative" });
        work.p = trimmed;
      } else if (
        !(VALID_PERFORMATIVES as readonly string[]).includes(work.p as string) &&
        (VALID_PERFORMATIVES as readonly string[]).includes((work.p as string).toUpperCase())
      ) {
        const up = (work.p as string).toUpperCase();
        warnings.push({ field: "p", original: work.p, coerced: up, reason: "uppercase-performative" });
        work.p = up;
      }
    }

    // body.d.delegation_mode: lowercase (DLGT). Clone body/d so the caller's input is never mutated.
    const body = (work.body ?? {}) as { t?: unknown; d?: unknown };
    if (work.p === "DLGT" && body && typeof body === "object" && body.d && typeof body.d === "object") {
      const origD = body.d as Record<string, unknown>;
      const mode = origD.delegation_mode;
      if (
        typeof mode === "string" &&
        !(VALID_DELEGATION_MODES as readonly string[]).includes(mode) &&
        (VALID_DELEGATION_MODES as readonly string[]).includes(mode.toLowerCase())
      ) {
        const lower = mode.toLowerCase();
        warnings.push({ field: "body.d.delegation_mode", original: mode, coerced: lower, reason: "lowercase-delegation-mode" });
        const newD = { ...origD, delegation_mode: lower };
        work.body = { ...(body as Record<string, unknown>), d: newD };
      }
    }

    // tid: stringify non-string (leave null/undefined alone)
    if (work.tid !== undefined && work.tid !== null && typeof work.tid !== "string") {
      const s = String(work.tid);
      warnings.push({ field: "tid", original: work.tid, coerced: s, reason: "stringify-tid" });
      work.tid = s;
    }

    // pid: stringify non-string (leave null/undefined alone; null pid is valid)
    if (work.pid !== undefined && work.pid !== null && typeof work.pid !== "string") {
      const s = String(work.pid);
      warnings.push({ field: "pid", original: work.pid, coerced: s, reason: "stringify-pid" });
      work.pid = s;
    }

    // det: coerce non-boolean to boolean
    if (work.det !== undefined && typeof work.det !== "boolean") {
      const b = Boolean(work.det);
      warnings.push({ field: "det", original: work.det, coerced: b, reason: "coerce-det-to-bool" });
      work.det = b;
    }

    const msg = CLowlMessage.fromDict(work as unknown as CLowlMessageData);
    msg.coercionWarnings = warnings;
    return msg;
  }

  /** Construct a CLowlMessage from a JSON string. */
  static fromJson(jsonStr: string): CLowlMessage {
    return CLowlMessage.fromDict(JSON.parse(jsonStr) as CLowlMessageData);
  }

  // ------------------------------------------------------------------
  // Validation
  // ------------------------------------------------------------------

  /** Validate the message. Returns a list of error strings (empty = valid). */
  validate(): string[] {
    const errors: string[] = [];

    if (this.clowl !== CLOWL_VERSION) {
      errors.push(`Invalid clowl version: '${this.clowl}' (expected '${CLOWL_VERSION}')`);
    }

    if (!this.mid) {
      errors.push("Missing required field: mid");
    }

    if (typeof this.ts !== "number" || !Number.isInteger(this.ts) || this.ts < 0) {
      errors.push(`Invalid ts: ${JSON.stringify(this.ts)} (must be non-negative integer)`);
    }

    if (!(VALID_PERFORMATIVES as readonly string[]).includes(this.p)) {
      errors.push(
        `Invalid performative: '${this.p}' (must be one of ${[...VALID_PERFORMATIVES].sort().join(", ")})`,
      );
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
    } else {
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
      const mode = d.delegation_mode as string | undefined;
      if (!mode || !(VALID_DELEGATION_MODES as readonly string[]).includes(mode)) {
        errors.push(
          `DLGT messages require body.d.delegation_mode to be one of ${[...VALID_DELEGATION_MODES].sort().join(", ")}, got ${JSON.stringify(mode)}`,
        );
      }
    }

    // ctx validation
    if (this.ctx !== undefined) {
      if (typeof this.ctx !== "object" || this.ctx === null) {
        errors.push("ctx must be an object with ref/inline/hash fields");
      } else {
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

    if (this.tid !== undefined && typeof this.tid !== "string") {
      errors.push(`tid must be a string (got ${JSON.stringify(this.tid)})`);
    }

    if (this.pid !== undefined && this.pid !== null && typeof this.pid !== "string") {
      errors.push(`pid must be a string (got ${JSON.stringify(this.pid)})`);
    }

    if (typeof this.det !== "boolean") {
      errors.push(`det must be a boolean (got ${JSON.stringify(this.det)})`);
    }

    return errors;
  }

  /** Return true if the message passes validation. */
  isValid(): boolean {
    return this.validate().length === 0;
  }

  // ------------------------------------------------------------------
  // Human Translation
  // ------------------------------------------------------------------

  /** Return a human-readable English description of this message. */
  toHuman(): string {
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

    let detail: string;

    if (this.p === "ERR") {
      const code = (bodyD.code as string) ?? "?";
      const msg = (bodyD.msg as string) ?? "unknown error";
      const retry = bodyD.retry ? " - retryable" : "";
      detail = `[${code}] ${msg}${retry}`;
    } else if (this.p === "CAPS") {
      const supports = (bodyD.supports as string[]) ?? [];
      const ver = (bodyD.clowl as string) ?? "?";
      detail = `CLowl v${ver} | supports: ${supports.join(", ")}`;
    } else if (this.p === "DLGT") {
      const mode = (bodyD.delegation_mode as string) ?? "transfer";
      const rest: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(bodyD)) {
        if (k !== "delegation_mode") rest[k] = v;
      }
      detail = `${bodyT} [${mode}]`;
      if (Object.keys(rest).length > 0) {
        detail += ` - ${JSON.stringify(rest)}`;
      }
    } else if (this.p === "PROG") {
      const pct = bodyD.pct as number | undefined;
      const note = (bodyD.note as string) ?? "";
      if (pct !== undefined) {
        detail = `${bodyT} - ${pct}% ${note}`.replace(/[\s-]+$/, "");
      } else {
        detail = `${bodyT} - ${note}`.replace(/[\s-]+$/, "");
      }
    } else if (this.p === "ACK") {
      const eta = bodyD.eta as string | undefined;
      detail = `Acknowledged ${bodyT}`;
      if (eta) detail += ` - ETA ${eta}`;
    } else if (Object.keys(bodyD).length > 0) {
      detail = `${bodyT} - ${JSON.stringify(bodyD)}`;
    } else {
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

  toString(): string {
    return `CLowlMessage(p=${JSON.stringify(this.p)}, from=${JSON.stringify(this.from)}, to=${JSON.stringify(this.to)}, t=${JSON.stringify(this.body.t)})`;
  }
}

// ---------------------------------------------------------------------------
// Factory Functions
// ---------------------------------------------------------------------------

/** Create a REQ (Request) message. */
export function createReq(
  from: string,
  to: Recipient,
  cid: string,
  task: string,
  data: Record<string, unknown> = {},
  options: CLowlMessageOptions = {},
): CLowlMessage {
  return new CLowlMessage("REQ", from, to, cid, task, data, options);
}

/** Create an ACK (Acknowledge) message. */
export function createAck(
  from: string,
  to: string,
  cid: string,
  task: string,
  data: Record<string, unknown> = {},
  options: CLowlMessageOptions = {},
): CLowlMessage {
  return new CLowlMessage("ACK", from, to, cid, task, data, options);
}

/** Create a DONE (Complete) message. */
export function createDone(
  from: string,
  to: string,
  cid: string,
  task: string,
  data: Record<string, unknown> = {},
  options: CLowlMessageOptions = {},
): CLowlMessage {
  return new CLowlMessage("DONE", from, to, cid, task, data, options);
}

/** Create an ERR (Error) message. */
export function createErr(
  from: string,
  to: string,
  cid: string,
  code: string,
  msg: string,
  retry: boolean = false,
  options: CLowlMessageOptions = {},
): CLowlMessage {
  return new CLowlMessage("ERR", from, to, cid, "error", { code, msg, retry }, options);
}

/** Create a DLGT (Delegate) message. */
export function createDlgt(
  from: string,
  to: string,
  cid: string,
  task: string,
  delegationMode: DelegationMode = "transfer",
  data: Record<string, unknown> = {},
  options: CLowlMessageOptions = {},
): CLowlMessage {
  if (!(VALID_DELEGATION_MODES as readonly string[]).includes(delegationMode)) {
    throw new Error(
      `delegation_mode must be one of ${[...VALID_DELEGATION_MODES].sort().join(", ")}`,
    );
  }
  const d: Record<string, unknown> = { delegation_mode: delegationMode, ...data };
  return new CLowlMessage("DLGT", from, to, cid, task, d, options);
}

/** Create a PROG (Progress) message. */
export function createProg(
  from: string,
  to: string,
  cid: string,
  task: string,
  pct?: number,
  note: string = "",
  options: CLowlMessageOptions = {},
): CLowlMessage {
  const data: Record<string, unknown> = {};
  if (pct !== undefined) data.pct = pct;
  if (note) data.note = note;
  return new CLowlMessage("PROG", from, to, cid, task, data, options);
}

/** Create a CAPS (Capabilities) message. Broadcasts to '*'. */
export function createCaps(
  from: string,
  supports: string[],
  options: CLowlMessageOptions = {},
): CLowlMessage {
  return new CLowlMessage(
    "CAPS",
    from,
    "*",
    "system",
    "capabilities",
    { supports, clowl: CLOWL_VERSION },
    options,
  );
}

/** Create a CNCL (Cancel) message. */
export function createCncl(
  from: string,
  to: string,
  cid: string,
  task: string,
  reason: string = "",
  options: CLowlMessageOptions = {},
): CLowlMessage {
  const data: Record<string, unknown> = reason ? { reason } : {};
  return new CLowlMessage("CNCL", from, to, cid, task, data, options);
}

/** Create an INF (Inform) message. */
export function createInf(
  from: string,
  to: Recipient,
  cid: string,
  task: string,
  data: Record<string, unknown> = {},
  options: CLowlMessageOptions = {},
): CLowlMessage {
  return new CLowlMessage("INF", from, to, cid, task, data, options);
}

/** Create a QRY (Query) message. */
export function createQry(
  from: string,
  to: string,
  cid: string,
  task: string,
  data: Record<string, unknown> = {},
  options: CLowlMessageOptions = {},
): CLowlMessage {
  return new CLowlMessage("QRY", from, to, cid, task, data, options);
}
