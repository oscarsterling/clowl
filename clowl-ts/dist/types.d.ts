/**
 * CLowl v0.2 TypeScript Types
 *
 * Complete type definitions for the CLowl protocol.
 * Zero runtime dependencies. Full type safety, no `any`.
 */
/** CLowl protocol version */
export declare const CLOWL_VERSION: "0.2";
/** All valid performative codes */
export declare const VALID_PERFORMATIVES: readonly ["REQ", "INF", "ACK", "ERR", "DLGT", "DONE", "CNCL", "QRY", "PROG", "CAPS"];
/** Performative type union */
export type Performative = (typeof VALID_PERFORMATIVES)[number];
/** Human-readable performative names */
export declare const PERFORMATIVE_NAMES: Record<Performative, string>;
/** Valid delegation modes for DLGT messages */
export declare const VALID_DELEGATION_MODES: readonly ["transfer", "fork", "assist"];
/** Delegation mode type union */
export type DelegationMode = (typeof VALID_DELEGATION_MODES)[number];
/** Context object for referencing shared state */
export interface CLowlContext {
    ref: string | null;
    inline: string | null;
    hash: string | null;
}
/** Message body */
export interface CLowlBody {
    /** Free-form task type string */
    t: string;
    /** Task-specific data */
    d: Record<string, unknown>;
}
/** Error body data */
export interface CLowlErrorData {
    code: string;
    msg: string;
    retry: boolean;
}
/** CAPS body data */
export interface CLowlCapsData {
    supports: string[];
    clowl: string;
}
/** DLGT body data (must include delegation_mode) */
export interface CLowlDelegationData {
    delegation_mode: DelegationMode;
    [key: string]: unknown;
}
/** PROG body data */
export interface CLowlProgressData {
    pct?: number;
    note?: string;
}
/** Recipient type: single agent, broadcast, or multicast */
export type Recipient = string | string[];
/** Full CLowl message as a plain object (JSON-serializable) */
export interface CLowlMessageData {
    clowl: string;
    mid: string;
    ts: number;
    p: Performative;
    from: string;
    to: Recipient;
    cid: string;
    body: CLowlBody;
    tid?: string;
    pid?: string;
    ctx?: CLowlContext;
    auth?: string;
    det?: boolean;
}
/** Options for creating a CLowlMessage */
export interface CLowlMessageOptions {
    mid?: string;
    ts?: number;
    tid?: string;
    pid?: string;
    ctx?: CLowlContext;
    auth?: string;
    det?: boolean;
}
/** Validation error */
export interface ValidationError {
    field: string;
    message: string;
}
/** Conversation states (9 total) */
export declare const CONVERSATION_STATES: readonly ["IDLE", "REQUESTED", "ACKNOWLEDGED", "IN_PROGRESS", "DELEGATED", "COMPLETED", "FAILED", "CANCELLED", "RETRYING"];
export type ConversationState = (typeof CONVERSATION_STATES)[number];
/** State machine events (11 total) */
export declare const STATE_EVENTS: readonly ["SEND_REQ", "RECV_ACK", "RECV_ERR", "RECV_ERR_RETRY", "RECV_PROG", "RECV_DONE", "SEND_CNCL", "RECV_CNCL", "SEND_DLGT", "RECV_INF", "RECV_CAPS"];
export type StateEvent = (typeof STATE_EVENTS)[number];
/** Transition definition */
export interface StateTransition {
    from: ConversationState;
    event: StateEvent;
    to: ConversationState;
}
/** Terminal states (no further transitions allowed) */
export declare const TERMINAL_STATES: ReadonlySet<ConversationState>;
//# sourceMappingURL=types.d.ts.map