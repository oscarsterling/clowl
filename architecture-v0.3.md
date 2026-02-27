# CLowl v0.3 Architecture — Three-Layer Separation

**Source:** ChatGPT QA session, 2026-02-27
**Status:** Draft architecture for v0.3

---

## Core Insight

The LLM should only generate **semantic intent**. The runtime wraps it with infrastructure metadata. Don't make the LLM responsible for generating UUIDs and timestamps — it'll hallucinate them.

---

## Layer 1: Semantic Layer (LLM-facing, ~150 tokens)

Express structured intent between agents. NOT responsible for IDs, timestamps, tracing, retries, auth, dedup, or lifecycle.

### CLowl-S (Semantic Envelope)

```json
{
  "p": "REQ | INF | ACK | ERR | DONE | QRY | PROG | CNCL",
  "from": "<agent_id>",
  "to": "<agent_id>",
  "task": "<string>",
  "data": {},
  "ctx": "<ref | null>"
}
```

**LLM's job:** Declare intent, declare target, declare task, provide structured payload, reference context. That's it.

### Injection Prompt (~150 tokens)

```
You communicate with other agents using CLowl semantic JSON. Format:
{ "p": "<REQ|INF|ACK|ERR|DONE|QRY|PROG|CNCL>", "from": "<agent_id>", "to": "<agent_id>", "task": "<string>", "data": {}, "ctx": "<ref|null>" }

Rules:
- Output only valid JSON.
- No extra text.
- All fields required.
- Use null if no context.
- Never inline large content; reference it in ctx.
```

---

## Layer 2: Coordination Layer (Runtime / Agent Orchestrator)

The runtime wraps semantic messages into a coordination envelope.

```json
{
  "clowl": "0.3",
  "mid": "uuid",
  "ts": 1709078400,
  "trace": {
    "tid": "root-task-id",
    "pid": "parent-mid"
  },
  "routing": {
    "from": "oscar",
    "to": "radar",
    "broadcast": false
  },
  "auth": {
    "issuer": "oscar",
    "token": "jwt-or-sig",
    "scopes": ["read:research"]
  },
  "semantic": {
    "...LLM output here..."
  }
}
```

### Responsibilities
- Message IDs
- Trace propagation
- Retry policy
- Idempotency
- Auth validation
- Context access verification
- Delegation semantics
- Rate limiting
- Backpressure
- Ordering guarantees
- Replay storage

**The LLM is not aware of any of this.**

---

## Layer 3: Transport Layer (Wire-level delivery)

CLowl does NOT define transport. It defines payload shape inside transport.

Supported transports: MCP, A2A, HTTP, Kafka, WebSocket, Redis Pub/Sub, gRPC, file system, stdin/stdout.

Transport concerns: delivery guarantees, encryption, network routing, load balancing, failover.

---

## Why This Separation Matters

- Upgrade runtime metadata without changing LLM prompt
- Swap transport without rewriting semantic layer
- Validate semantic payload independently
- Enforce strict JSON schema at runtime
- Version the runtime protocol without retraining agents

---

## Delegation in the New Model

Delegation becomes coordination logic, not a semantic performative.

1. Oscar sends REQ to Muse
2. Muse runtime decides to delegate to Ink
3. Runtime emits new REQ from Muse to Ink
4. Semantic layer never needs a DLGT performative

If DLGT is kept for observability, treat it as: `p: "INF"`, `task: "delegation_notice"`.

---

## Context Handling

- Semantic layer: `"ctx": "research/mcp-vs-a2a.md"`
- Coordination layer enforces: context exists, hash matches, access scope valid, snapshot immutable, versioned if needed
- If inline fallback needed, runtime injects it, not LLM

---

## Version Strategy

- Semantic layer: rarely changes (v1.0 stable target)
- Coordination layer: versioned independently (v0.3, v1.0, etc.)
- Transport layer: independent (MCP 0.7, HTTP/2, etc.)

---

## Positioning

- Before: "A language agents speak"
- After: "A composable semantic layer that sits inside any agent runtime"
- Commercial angle: "OpenTelemetry for AI agents" — trace trees, cost-per-branch, failure lineage
