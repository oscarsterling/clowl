/**
 * CLowl v0.2 Conversation State Machine
 *
 * Tracks conversation lifecycle with 9 states and 11 events.
 * Enforces forward-only transitions (no backward transitions).
 */

import {
  type ConversationState,
  type StateEvent,
  type StateTransition,
  TERMINAL_STATES,
} from "./types.js";

// ---------------------------------------------------------------------------
// Transition Table
// ---------------------------------------------------------------------------

/**
 * All valid state transitions.
 * The state machine is forward-only: once a conversation reaches a terminal
 * state (COMPLETED, FAILED, CANCELLED), no further transitions are allowed.
 */
const TRANSITIONS: readonly StateTransition[] = [
  // From IDLE
  { from: "IDLE", event: "SEND_REQ", to: "REQUESTED" },
  { from: "IDLE", event: "RECV_INF", to: "IDLE" },
  { from: "IDLE", event: "RECV_CAPS", to: "IDLE" },

  // From REQUESTED
  { from: "REQUESTED", event: "RECV_ACK", to: "ACKNOWLEDGED" },
  { from: "REQUESTED", event: "RECV_ERR", to: "FAILED" },
  { from: "REQUESTED", event: "RECV_ERR_RETRY", to: "RETRYING" },
  { from: "REQUESTED", event: "SEND_CNCL", to: "CANCELLED" },
  { from: "REQUESTED", event: "RECV_DONE", to: "COMPLETED" },

  // From ACKNOWLEDGED
  { from: "ACKNOWLEDGED", event: "RECV_PROG", to: "IN_PROGRESS" },
  { from: "ACKNOWLEDGED", event: "RECV_DONE", to: "COMPLETED" },
  { from: "ACKNOWLEDGED", event: "RECV_ERR", to: "FAILED" },
  { from: "ACKNOWLEDGED", event: "RECV_ERR_RETRY", to: "RETRYING" },
  { from: "ACKNOWLEDGED", event: "SEND_CNCL", to: "CANCELLED" },
  { from: "ACKNOWLEDGED", event: "SEND_DLGT", to: "DELEGATED" },

  // From IN_PROGRESS
  { from: "IN_PROGRESS", event: "RECV_PROG", to: "IN_PROGRESS" },
  { from: "IN_PROGRESS", event: "RECV_DONE", to: "COMPLETED" },
  { from: "IN_PROGRESS", event: "RECV_ERR", to: "FAILED" },
  { from: "IN_PROGRESS", event: "RECV_ERR_RETRY", to: "RETRYING" },
  { from: "IN_PROGRESS", event: "SEND_CNCL", to: "CANCELLED" },

  // From DELEGATED
  { from: "DELEGATED", event: "RECV_ACK", to: "DELEGATED" },
  { from: "DELEGATED", event: "RECV_PROG", to: "DELEGATED" },
  { from: "DELEGATED", event: "RECV_DONE", to: "COMPLETED" },
  { from: "DELEGATED", event: "RECV_ERR", to: "FAILED" },
  { from: "DELEGATED", event: "RECV_ERR_RETRY", to: "RETRYING" },
  { from: "DELEGATED", event: "SEND_CNCL", to: "CANCELLED" },

  // From RETRYING
  { from: "RETRYING", event: "SEND_REQ", to: "REQUESTED" },
  { from: "RETRYING", event: "SEND_CNCL", to: "CANCELLED" },

  // COMPLETED, FAILED, CANCELLED are terminal - no transitions out
] as const;

// Build a lookup map for O(1) transition resolution
const transitionMap = new Map<string, ConversationState>();
for (const t of TRANSITIONS) {
  transitionMap.set(`${t.from}:${t.event}`, t.to);
}

// ---------------------------------------------------------------------------
// ConversationTracker
// ---------------------------------------------------------------------------

/** Error thrown when an invalid state transition is attempted. */
export class InvalidTransitionError extends Error {
  readonly state: ConversationState;
  readonly event: StateEvent;

  constructor(state: ConversationState, event: StateEvent) {
    super(`Invalid transition: cannot apply event '${event}' in state '${state}'`);
    this.name = "InvalidTransitionError";
    this.state = state;
    this.event = event;
  }
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
export class ConversationTracker {
  readonly cid: string;
  private _state: ConversationState;
  private _history: StateHistoryEntry[];

  constructor(cid: string, initialState: ConversationState = "IDLE") {
    this.cid = cid;
    this._state = initialState;
    this._history = [];
  }

  /** Current conversation state. */
  get state(): ConversationState {
    return this._state;
  }

  /** Full transition history. */
  get history(): readonly StateHistoryEntry[] {
    return this._history;
  }

  /** Whether the conversation is in a terminal state. */
  get isTerminal(): boolean {
    return TERMINAL_STATES.has(this._state);
  }

  /**
   * Apply an event to the conversation.
   * Throws InvalidTransitionError if the transition is not valid.
   */
  apply(event: StateEvent): ConversationState {
    const next = transitionMap.get(`${this._state}:${event}`);
    if (next === undefined) {
      throw new InvalidTransitionError(this._state, event);
    }

    const entry: StateHistoryEntry = {
      from: this._state,
      event,
      to: next,
      timestamp: Math.floor(Date.now() / 1000),
    };

    this._history.push(entry);
    this._state = next;
    return next;
  }

  /**
   * Check if an event can be applied without actually applying it.
   */
  canApply(event: StateEvent): boolean {
    return transitionMap.has(`${this._state}:${event}`);
  }

  /**
   * Get all events that are valid from the current state.
   */
  validEvents(): StateEvent[] {
    const events: StateEvent[] = [];
    for (const t of TRANSITIONS) {
      if (t.from === this._state) {
        events.push(t.event);
      }
    }
    return events;
  }

  /** Reset the tracker to IDLE. Clears history. */
  reset(): void {
    this._state = "IDLE";
    this._history = [];
  }
}

/**
 * Look up the next state for a given (state, event) pair.
 * Returns undefined if the transition is invalid.
 */
export function getNextState(
  state: ConversationState,
  event: StateEvent,
): ConversationState | undefined {
  return transitionMap.get(`${state}:${event}`);
}

/** Get all defined transitions. */
export function getAllTransitions(): readonly StateTransition[] {
  return TRANSITIONS;
}
