/**
 * CLowl v0.2 TypeScript Types
 *
 * Complete type definitions for the CLowl protocol.
 * Zero runtime dependencies. Full type safety, no `any`.
 */
/** CLowl protocol version */
export const CLOWL_VERSION = "0.2";
/** All valid performative codes */
export const VALID_PERFORMATIVES = [
    "REQ", "INF", "ACK", "ERR", "DLGT", "DONE", "CNCL", "QRY", "PROG", "CAPS",
];
/** Human-readable performative names */
export const PERFORMATIVE_NAMES = {
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
export const VALID_DELEGATION_MODES = ["transfer", "fork", "assist"];
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
];
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
];
/** Terminal states (no further transitions allowed) */
export const TERMINAL_STATES = new Set([
    "COMPLETED",
    "FAILED",
    "CANCELLED",
]);
//# sourceMappingURL=types.js.map