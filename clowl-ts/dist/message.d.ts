/**
 * CLowl v0.2 Message Creation and Validation
 *
 * Mirrors the Python reference library. Zero runtime dependencies.
 */
import { type Performative, type DelegationMode, type Recipient, type CLowlBody, type CLowlContext, type CLowlMessageData, type CLowlMessageOptions, type CoercionWarning } from "./types.js";
/**
 * Generate a time-ordered message ID (UUIDv7-style).
 * Format: <timestamp_ms_hex>-7<3hex>-<4hex>-<4hex>-<12hex>
 * Sorts lexicographically by creation time.
 */
export declare function generateMid(): string;
/** Generate a conversation ID. */
export declare function generateCid(): string;
/** Generate a trace ID. */
export declare function generateTid(): string;
export declare class CLowlMessage {
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
    coercionWarnings: CoercionWarning[];
    constructor(p: Performative, from: string, to: Recipient, cid: string, bodyT: string, bodyD?: Record<string, unknown>, options?: CLowlMessageOptions);
    /** Convert to a plain object suitable for JSON serialization. */
    toDict(): CLowlMessageData;
    /** Serialize to a JSON string. */
    toJson(indent?: number): string;
    /** Construct a CLowlMessage from a plain object (e.g., parsed JSON). */
    static fromDict(data: CLowlMessageData, options?: {
        lenient?: boolean;
    }): CLowlMessage;
    /**
     * Lenient parse: coerce near-miss payloads into the declared schema and record
     * the original defects as coercionWarnings so audits can see what was changed.
     * Strict fromDict stays the default and is unchanged.
     */
    static parseLenient(data: CLowlMessageData): CLowlMessage;
    /** Construct a CLowlMessage from a JSON string. */
    static fromJson(jsonStr: string): CLowlMessage;
    /** Validate the message. Returns a list of error strings (empty = valid). */
    validate(): string[];
    /** Return true if the message passes validation. */
    isValid(): boolean;
    /** Return a human-readable English description of this message. */
    toHuman(): string;
    toString(): string;
}
/** Create a REQ (Request) message. */
export declare function createReq(from: string, to: Recipient, cid: string, task: string, data?: Record<string, unknown>, options?: CLowlMessageOptions): CLowlMessage;
/** Create an ACK (Acknowledge) message. */
export declare function createAck(from: string, to: string, cid: string, task: string, data?: Record<string, unknown>, options?: CLowlMessageOptions): CLowlMessage;
/** Create a DONE (Complete) message. */
export declare function createDone(from: string, to: string, cid: string, task: string, data?: Record<string, unknown>, options?: CLowlMessageOptions): CLowlMessage;
/** Create an ERR (Error) message. */
export declare function createErr(from: string, to: string, cid: string, code: string, msg: string, retry?: boolean, options?: CLowlMessageOptions): CLowlMessage;
/** Create a DLGT (Delegate) message. */
export declare function createDlgt(from: string, to: string, cid: string, task: string, delegationMode?: DelegationMode, data?: Record<string, unknown>, options?: CLowlMessageOptions): CLowlMessage;
/** Create a PROG (Progress) message. */
export declare function createProg(from: string, to: string, cid: string, task: string, pct?: number, note?: string, options?: CLowlMessageOptions): CLowlMessage;
/** Typed streaming partial fields for a PROG body. All optional. */
export interface ProgressPartialInput {
    seq?: number;
    phase?: string;
    pct?: number;
    partial?: Record<string, unknown>;
    final?: boolean;
    note?: string;
}
/**
 * Create a PROG (Progress) message carrying a typed streaming partial. Only
 * provided fields are emitted; final is emitted only when true. Consumers can
 * render the structured fields and audits can fold a stream via reconstructProgress.
 */
export declare function createProgPartial(from: string, to: string, cid: string, task: string, fields?: ProgressPartialInput, options?: CLowlMessageOptions): CLowlMessage;
/** Result of folding an ordered list of PROG partial messages. */
export interface ProgressReconstruction {
    latestState: Record<string, unknown>;
    isFinal: boolean;
    gaps: number[];
}
/**
 * Fold an ordered list of PROG messages into reconstructed task state.
 * latestState is a shallow merge of each PROG body.d.partial in the given order
 * (later wins); isFinal is true if any PROG message carries final === true; gaps
 * lists the missing seq numbers between the min and max observed integer seq.
 * Non-PROG messages and messages without the relevant fields are ignored.
 */
export declare function reconstructProgress(messages: CLowlMessage[]): ProgressReconstruction;
/** Create a CAPS (Capabilities) message. Broadcasts to '*'. */
export declare function createCaps(from: string, supports: string[], options?: CLowlMessageOptions): CLowlMessage;
/** Create a CNCL (Cancel) message. */
export declare function createCncl(from: string, to: string, cid: string, task: string, reason?: string, options?: CLowlMessageOptions): CLowlMessage;
/** Create an INF (Inform) message. */
export declare function createInf(from: string, to: Recipient, cid: string, task: string, data?: Record<string, unknown>, options?: CLowlMessageOptions): CLowlMessage;
/** Create a QRY (Query) message. */
export declare function createQry(from: string, to: string, cid: string, task: string, data?: Record<string, unknown>, options?: CLowlMessageOptions): CLowlMessage;
//# sourceMappingURL=message.d.ts.map