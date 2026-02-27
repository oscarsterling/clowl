# CLowl Lifecycle State Machine

**Source:** ChatGPT QA session, 2026-02-27
**Layer:** Coordination (runtime-managed, not LLM-facing)

---

## Design Principles

1. Every message belongs to exactly one task instance
2. Every task instance has a single authoritative lifecycle
3. All state transitions are explicit and event-driven
4. No implicit transitions. Ever.
5. Transitions are idempotent
6. Every transition is traceable and timestamped at the coordination layer

---

## Task Identity

- `task_id` — stable across lifecycle
- `mid` — unique per message
- `parent_task_id` — optional
- `trace_id` — root lineage

Lifecycle is attached to `task_id`, not message.

---

## States

| State | Description | Terminal? |
|-------|-------------|-----------|
| CREATED | Task instantiated in system. Not yet sent. | No |
| DISPATCHED | Message placed on transport successfully. | No |
| ACKNOWLEDGED | Receiver explicitly confirmed receipt. | No |
| RUNNING | Receiver has begun execution. | No |
| WAITING | Blocked on dependency or subtask. | No |
| COMPLETED | Finished successfully. | **Yes** |
| FAILED | Execution failed. | **Yes** |
| CANCELLED | Explicit cancellation. | **Yes** |
| TIMED_OUT | Exceeded SLA or TTL. | **Yes** |

TIMED_OUT is separate from FAILED for SLA reporting clarity.

---

## Events

| Event | Source |
|-------|--------|
| EV_CREATE | System |
| EV_DISPATCH_SUCCESS | Transport |
| EV_DISPATCH_FAIL | Transport |
| EV_ACK | Semantic (ACK performative) |
| EV_START | Semantic (first PROG) |
| EV_WAIT | Semantic (PROG with blocked flag) |
| EV_RESUME | Semantic (child completed) |
| EV_DONE | Semantic (DONE performative) |
| EV_ERROR | Semantic (ERR performative) |
| EV_CANCEL | Semantic (CNCL) or Admin |
| EV_TIMEOUT | Runtime policy |

---

## Transition Table

### CREATED
| Event | Next State |
|-------|------------|
| EV_DISPATCH_SUCCESS | DISPATCHED |
| EV_DISPATCH_FAIL | FAILED |
| EV_CANCEL | CANCELLED |

### DISPATCHED
| Event | Next State |
|-------|------------|
| EV_ACK | ACKNOWLEDGED |
| EV_TIMEOUT | TIMED_OUT |
| EV_CANCEL | CANCELLED |

### ACKNOWLEDGED
| Event | Next State |
|-------|------------|
| EV_START | RUNNING |
| EV_CANCEL | CANCELLED |
| EV_TIMEOUT | TIMED_OUT |

### RUNNING
| Event | Next State |
|-------|------------|
| EV_WAIT | WAITING |
| EV_DONE | COMPLETED |
| EV_ERROR | FAILED |
| EV_CANCEL | CANCELLED |
| EV_TIMEOUT | TIMED_OUT |

### WAITING
| Event | Next State |
|-------|------------|
| EV_RESUME | RUNNING |
| EV_ERROR | FAILED |
| EV_CANCEL | CANCELLED |
| EV_TIMEOUT | TIMED_OUT |

### Terminal States (COMPLETED, FAILED, CANCELLED, TIMED_OUT)
| Event | Action |
|-------|--------|
| Any | No-op (idempotent reject) |

No resurrection. Retry = new task instance with new task_id.

---

## Semantic Performative → Event Mapping

| Performative | Event |
|-------------|-------|
| ACK | EV_ACK |
| PROG (first) | EV_START |
| PROG (blocked) | EV_WAIT |
| DONE | EV_DONE |
| ERR | EV_ERROR |
| CNCL | EV_CANCEL |

First PROG → START. Subsequent PROG → no state change unless WAIT flag set.

---

## Subtask Propagation

- Parent task enters WAITING when it emits a blocking REQ to a child
- Parent resumes (EV_RESUME) when all blocking children reach COMPLETED
- If any child enters FAILED: parent receives EV_ERROR → FAILED (unless policy says tolerate)

---

## Timeout Model

Each state can define SLA:
- DISPATCHED: ack timeout
- ACKNOWLEDGED: start timeout
- RUNNING: execution timeout
- WAITING: dependency timeout

Timeout always transitions to TIMED_OUT. Never FAILED.

---

## Idempotency Rules

For every task:
- EV_DONE in RUNNING → COMPLETED
- EV_DONE in COMPLETED → no-op
- EV_DONE in FAILED → no-op
- EV_DONE in TIMED_OUT → no-op

Duplicate delivery cannot corrupt lifecycle.

---

## State Graph

```
CREATED
  ↓
DISPATCHED
  ↓
ACKNOWLEDGED
  ↓
RUNNING ⇄ WAITING
  ↓         ↓
COMPLETED  FAILED / CANCELLED / TIMED_OUT
```

All flows forward. No backward transitions. No infinite loops.

---

## What This Unlocks

- SLA tracking per state
- Mean time to acknowledge
- Mean time to execute
- Failure rate by state
- Timeout diagnostics
- Dependency critical path analysis
- Deterministic replay

---

## Hardline Rule

**The LLM cannot directly change lifecycle state.** Only events derived from validated messages or runtime policies can trigger transitions.
