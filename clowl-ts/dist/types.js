/**
 * CLowl v0.2 TypeScript Types
 *
 * Complete type definitions for the CLowl protocol.
 * Zero runtime dependencies. Full type safety, no `any`.
 */
// CLOWL_VERSION, VALID_PERFORMATIVES, and VALID_DELEGATION_MODES are generated
// from clowl-schema.json (see tools/gen_sdk_layer.py) and re-exported here so
// the schema is their single source of truth. PERFORMATIVE_NAMES is the
// human-readable label map, which the schema does not declare, so it stays
// hand-maintained.
import { CLOWL_VERSION, VALID_PERFORMATIVES, VALID_DELEGATION_MODES, } from "./generated.js";
export { CLOWL_VERSION, VALID_PERFORMATIVES, VALID_DELEGATION_MODES };
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