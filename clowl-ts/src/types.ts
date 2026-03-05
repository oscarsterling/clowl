/**
 * CLowl v0.2 TypeScript Types
 *
 * Complete type definitions for the CLowl protocol.
 * Zero runtime dependencies. Full type safety, no `any`.
 */

/** CLowl protocol version */
export const CLOWL_VERSION = "0.2" as const;

/** All valid performative codes */
export const VALID_PERFORMATIVES = [
  "REQ", "INF", "ACK", "ERR", "DLGT", "DONE", "CNCL", "QRY", "PROG", "CAPS",
] as const;

/** Performative type union */
export type Performative = (typeof VALID_PERFORMATIVES)[number];

/** Human-readable performative names */
export const PERFORMATIVE_NAMES: Record<Performative, string> = {
  REQ: "REQUEST",
  INF: "INFORM",
  ACK: "ACKNOWLEDGE",
  ERR: "ERROR",
  DLGT: "DELEGATE",
  DONE: "COMPLETE",
  CNCL: "CANCEL",
  QRY: "QUERY",
  PROG: "PROGRESS",
  CAPS: "CAPABILITIES",
};

/** Valid delegation modes for DLGT messages */
export const VALID_DELEGATION_MODES = ["transfer", "fork", "assist"] as const;

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

// ---- State Machine Types ----

/** Conversation states (9 total) */
export const CONVERSATION_STATES = [
  "IDLE",
  "REQUESTED",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "DELEGATED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "RETRYING",
] as const;

export type ConversationState = (typeof CONVERSATION_STATES)[number];

/** State machine events (11 total) */
export const STATE_EVENTS = [
  "SEND_REQ",
  "RECV_ACK",
  "RECV_ERR",
  "RECV_ERR_RETRY",
  "RECV_PROG",
  "RECV_DONE",
  "SEND_CNCL",
  "RECV_CNCL",
  "SEND_DLGT",
  "RECV_INF",
  "RECV_CAPS",
] as const;

export type StateEvent = (typeof STATE_EVENTS)[number];

/** Transition definition */
export interface StateTransition {
  from: ConversationState;
  event: StateEvent;
  to: ConversationState;
}

/** Terminal states (no further transitions allowed) */
export const TERMINAL_STATES: ReadonlySet<ConversationState> = new Set([
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);
