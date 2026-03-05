import { describe, it, expect } from "vitest";
import {
  ConversationTracker,
  InvalidTransitionError,
  getNextState,
  getAllTransitions,
} from "../src/index.js";

describe("ConversationTracker", () => {
  it("starts in IDLE state", () => {
    const tracker = new ConversationTracker("conv-001");
    expect(tracker.state).toBe("IDLE");
    expect(tracker.cid).toBe("conv-001");
    expect(tracker.isTerminal).toBe(false);
    expect(tracker.history).toHaveLength(0);
  });

  it("tracks a simple REQ -> ACK -> DONE flow", () => {
    const tracker = new ConversationTracker("conv-001");

    tracker.apply("SEND_REQ");
    expect(tracker.state).toBe("REQUESTED");

    tracker.apply("RECV_ACK");
    expect(tracker.state).toBe("ACKNOWLEDGED");

    tracker.apply("RECV_DONE");
    expect(tracker.state).toBe("COMPLETED");
    expect(tracker.isTerminal).toBe(true);

    expect(tracker.history).toHaveLength(3);
    expect(tracker.history[0].from).toBe("IDLE");
    expect(tracker.history[0].event).toBe("SEND_REQ");
    expect(tracker.history[0].to).toBe("REQUESTED");
  });

  it("tracks REQ -> ACK -> PROG -> PROG -> DONE flow", () => {
    const tracker = new ConversationTracker("conv-002");

    tracker.apply("SEND_REQ");
    tracker.apply("RECV_ACK");
    tracker.apply("RECV_PROG");
    expect(tracker.state).toBe("IN_PROGRESS");

    tracker.apply("RECV_PROG");
    expect(tracker.state).toBe("IN_PROGRESS");

    tracker.apply("RECV_DONE");
    expect(tracker.state).toBe("COMPLETED");
  });

  it("tracks cancellation flow", () => {
    const tracker = new ConversationTracker("conv-003");

    tracker.apply("SEND_REQ");
    tracker.apply("RECV_ACK");
    tracker.apply("SEND_CNCL");
    expect(tracker.state).toBe("CANCELLED");
    expect(tracker.isTerminal).toBe(true);
  });

  it("tracks error and retry flow", () => {
    const tracker = new ConversationTracker("conv-004");

    tracker.apply("SEND_REQ");
    tracker.apply("RECV_ERR_RETRY");
    expect(tracker.state).toBe("RETRYING");

    tracker.apply("SEND_REQ");
    expect(tracker.state).toBe("REQUESTED");

    tracker.apply("RECV_ACK");
    tracker.apply("RECV_DONE");
    expect(tracker.state).toBe("COMPLETED");
  });

  it("tracks non-retryable error to FAILED", () => {
    const tracker = new ConversationTracker("conv-005");

    tracker.apply("SEND_REQ");
    tracker.apply("RECV_ERR");
    expect(tracker.state).toBe("FAILED");
    expect(tracker.isTerminal).toBe(true);
  });

  it("tracks delegation flow", () => {
    const tracker = new ConversationTracker("conv-006");

    tracker.apply("SEND_REQ");
    tracker.apply("RECV_ACK");
    tracker.apply("SEND_DLGT");
    expect(tracker.state).toBe("DELEGATED");

    tracker.apply("RECV_DONE");
    expect(tracker.state).toBe("COMPLETED");
  });

  it("throws InvalidTransitionError for invalid transitions", () => {
    const tracker = new ConversationTracker("conv-007");

    expect(() => tracker.apply("RECV_DONE")).toThrow(InvalidTransitionError);

    try {
      tracker.apply("RECV_DONE");
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidTransitionError);
      const err = e as InvalidTransitionError;
      expect(err.state).toBe("IDLE");
      expect(err.event).toBe("RECV_DONE");
    }
  });

  it("throws on transitions from terminal states", () => {
    const tracker = new ConversationTracker("conv-008");
    tracker.apply("SEND_REQ");
    tracker.apply("RECV_ACK");
    tracker.apply("RECV_DONE");

    expect(() => tracker.apply("SEND_REQ")).toThrow(InvalidTransitionError);
  });

  it("canApply returns correct results", () => {
    const tracker = new ConversationTracker("conv-009");

    expect(tracker.canApply("SEND_REQ")).toBe(true);
    expect(tracker.canApply("RECV_DONE")).toBe(false);
    expect(tracker.canApply("RECV_INF")).toBe(true);
    expect(tracker.canApply("RECV_CAPS")).toBe(true);
  });

  it("validEvents returns correct events for IDLE", () => {
    const tracker = new ConversationTracker("conv-010");
    const events = tracker.validEvents();
    expect(events).toContain("SEND_REQ");
    expect(events).toContain("RECV_INF");
    expect(events).toContain("RECV_CAPS");
    expect(events).not.toContain("RECV_DONE");
  });

  it("validEvents returns empty for terminal states", () => {
    const tracker = new ConversationTracker("conv-011");
    tracker.apply("SEND_REQ");
    tracker.apply("RECV_ERR");
    expect(tracker.validEvents()).toHaveLength(0);
  });

  it("reset returns to IDLE and clears history", () => {
    const tracker = new ConversationTracker("conv-012");
    tracker.apply("SEND_REQ");
    tracker.apply("RECV_ACK");

    tracker.reset();
    expect(tracker.state).toBe("IDLE");
    expect(tracker.history).toHaveLength(0);
  });

  it("handles INF and CAPS in IDLE without state change", () => {
    const tracker = new ConversationTracker("conv-013");
    tracker.apply("RECV_INF");
    expect(tracker.state).toBe("IDLE");
    tracker.apply("RECV_CAPS");
    expect(tracker.state).toBe("IDLE");
  });

  it("allows cancellation from RETRYING state", () => {
    const tracker = new ConversationTracker("conv-014");
    tracker.apply("SEND_REQ");
    tracker.apply("RECV_ERR_RETRY");
    tracker.apply("SEND_CNCL");
    expect(tracker.state).toBe("CANCELLED");
  });

  it("allows direct DONE from REQUESTED (fast completion)", () => {
    const tracker = new ConversationTracker("conv-015");
    tracker.apply("SEND_REQ");
    tracker.apply("RECV_DONE");
    expect(tracker.state).toBe("COMPLETED");
  });
});

describe("getNextState", () => {
  it("returns correct next state for valid transitions", () => {
    expect(getNextState("IDLE", "SEND_REQ")).toBe("REQUESTED");
    expect(getNextState("REQUESTED", "RECV_ACK")).toBe("ACKNOWLEDGED");
    expect(getNextState("ACKNOWLEDGED", "RECV_DONE")).toBe("COMPLETED");
  });

  it("returns undefined for invalid transitions", () => {
    expect(getNextState("IDLE", "RECV_DONE")).toBeUndefined();
    expect(getNextState("COMPLETED", "SEND_REQ")).toBeUndefined();
  });
});

describe("getAllTransitions", () => {
  it("returns all transition definitions", () => {
    const transitions = getAllTransitions();
    expect(transitions.length).toBeGreaterThan(20);

    // Every transition has required fields
    for (const t of transitions) {
      expect(t.from).toBeTruthy();
      expect(t.event).toBeTruthy();
      expect(t.to).toBeTruthy();
    }
  });

  it("has no backward transitions (terminal states have no outgoing)", () => {
    const transitions = getAllTransitions();
    const terminalOutgoing = transitions.filter(
      (t) => t.from === "COMPLETED" || t.from === "FAILED" || t.from === "CANCELLED",
    );
    expect(terminalOutgoing).toHaveLength(0);
  });
});
