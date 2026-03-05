/**
 * CLowl v0.2 Conversation State Machine
 *
 * Tracks conversation lifecycle with 9 states and 11 events.
 * Enforces forward-only transitions (no backward transitions).
 */
import { type ConversationState, type StateEvent, type StateTransition } from "./types.js";
/** Error thrown when an invalid state transition is attempted. */
export declare class InvalidTransitionError extends Error {
    readonly state: ConversationState;
    readonly event: StateEvent;
    constructor(state: ConversationState, event: StateEvent);
}
/** History entry for tracking state changes. */
export interface StateHistoryEntry {
    from: ConversationState;
    event: StateEvent;
    to: ConversationState;
    timestamp: number;
}
/**
 * Tracks the state of a single CLowl conversation.
 *
 * Usage:
 * ```ts
 * const tracker = new ConversationTracker("conv-001");
 * tracker.apply("SEND_REQ");   // IDLE -> REQUESTED
 * tracker.apply("RECV_ACK");   // REQUESTED -> ACKNOWLEDGED
 * tracker.apply("RECV_DONE");  // ACKNOWLEDGED -> COMPLETED
 * ```
 */
export declare class ConversationTracker {
    readonly cid: string;
    private _state;
    private _history;
    constructor(cid: string, initialState?: ConversationState);
    /** Current conversation state. */
    get state(): ConversationState;
    /** Full transition history. */
    get history(): readonly StateHistoryEntry[];
    /** Whether the conversation is in a terminal state. */
    get isTerminal(): boolean;
    /**
     * Apply an event to the conversation.
     * Throws InvalidTransitionError if the transition is not valid.
     */
    apply(event: StateEvent): ConversationState;
    /**
     * Check if an event can be applied without actually applying it.
     */
    canApply(event: StateEvent): boolean;
    /**
     * Get all events that are valid from the current state.
     */
    validEvents(): StateEvent[];
    /** Reset the tracker to IDLE. Clears history. */
    reset(): void;
}
/**
 * Look up the next state for a given (state, event) pair.
 * Returns undefined if the transition is invalid.
 */
export declare function getNextState(state: ConversationState, event: StateEvent): ConversationState | undefined;
/** Get all defined transitions. */
export declare function getAllTransitions(): readonly StateTransition[];
//# sourceMappingURL=state-machine.d.ts.map