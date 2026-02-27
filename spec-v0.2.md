# CLowl v0.2 Specification

**Version:** 0.2  
**Status:** Draft  
**Date:** 2026-02-27  
**Author:** Forge (Oscar Sterling Agency)  
**License:** MIT

---

## 1. Overview

CLowl is a structured communication language for AI agent-to-agent messaging. It defines a minimal JSON schema with typed performatives, message metadata, and context referencing that runs on top of any transport (MCP, A2A, HTTP, WebSocket, stdio, etc.).

CLowl is not a transport protocol. It defines what goes *inside* the envelope.

**Core value:** A language agents speak that humans can read. Every message is auditable. Every handoff is traceable. Paste any CLowl message into the translator — get plain English back instantly.

---

## 2. Design Principles

1. **Minimal** — Full spec fits in a ~250-token system prompt
2. **LLM-native** — Any model can parse and generate CLowl after reading the system prompt
3. **Transport-agnostic** — Works over MCP, A2A, HTTP, WebSocket, file system, or stdin/stdout
4. **Human-debuggable** — Every message has a deterministic English translation
5. **Traceable** — Trace IDs link tasks across multiple agents end-to-end
6. **Auditable** — Message IDs enable deduplication and conversation reconstruction

---

## 3. Message Schema

```json
{
  "clowl": "0.2",
  "mid": "<uuidv7>",
  "ts": 1709078400,
  "tid": "<trace_id>",
  "pid": "<parent_mid_or_null>",
  "p": "<performative>",
  "from": "<agent_id>",
  "to": "<agent_id_or_array>",
  "cid": "<conversation_id>",
  "body": {
    "t": "<free_form_task_type>",
    "d": {}
  },
  "ctx": {
    "ref": "<path_or_url_or_null>",
    "inline": "<fallback_string_max_2000_chars_or_null>",
    "hash": "<sha256_or_null>"
  },
  "auth": "<optional_token>",
  "det": false
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clowl` | string | Yes | Protocol version. Must be `"0.2"` for this spec. |
| `mid` | string | Yes | Unique message ID. Use UUIDv7 (timestamp-prefixed). Enables idempotency and dedup. |
| `ts` | integer | Yes | Unix epoch timestamp (seconds) when message was created. |
| `tid` | string | No | Trace ID. Links a task across multiple agents and hops. Set at task origin, propagate through all derived messages. |
| `pid` | string\|null | No | Parent message ID. Links this message to the message it responds to or derives from. Null for root messages. |
| `p` | string | Yes | Performative code. See Section 4. |
| `from` | string | Yes | Sender agent identifier. |
| `to` | string\|array | Yes | Recipient agent ID, `"*"` for broadcast, or array for multi-cast: `["radar","muse","ink"]`. |
| `cid` | string | Yes | Conversation ID. Groups all related messages into a thread. |
| `body` | object | Yes | Message payload. |
| `body.t` | string | Yes | Free-form task type string (e.g., `"search"`, `"draft"`, `"analyze"`). |
| `body.d` | object | Yes | Task-specific data. Schema varies by task. May be `{}` for simple ACK. |
| `ctx` | object | No | Context reference object. See Section 6. |
| `auth` | string | No | Optional auth token for sender identity verification and context access rights. |
| `det` | boolean | No | Determinism flag. `true` = agent declares this result is reproducible (e.g., a code execution). `false` (default) = LLM stochastic reasoning used. |

**Required fields:** `clowl`, `mid`, `ts`, `p`, `from`, `to`, `cid`, `body`  
**Optional fields:** `tid`, `pid`, `ctx`, `auth`, `det`

---

## 4. Performatives

Ten performatives define the intent of every message.

| Code | Name | Direction | Meaning |
|------|------|-----------|---------|
| `REQ` | Request | Sender → Receiver | "Do this thing." Initiates a task. |
| `INF` | Inform | Sender → Receiver | "Here is information." No action expected. |
| `ACK` | Acknowledge | Receiver → Sender | "Got it, proceeding." Confirms receipt and intent to act. |
| `ERR` | Error | Receiver → Sender | "Failed. Here's why." Structured error with code. |
| `DLGT` | Delegate | Agent → Agent | "Passing this to someone better suited." See Section 4.1. |
| `DONE` | Complete | Receiver → Sender | "Finished. Here is the result." |
| `CNCL` | Cancel | Sender → Receiver | "Abort this task." Receiver must respond with ACK or ERR. |
| `QRY` | Query | Any → Any | "What's the status?" or "Give me info without starting a task." |
| `PROG` | Progress | Receiver → Sender | "Here's a progress update on the running task." |
| `CAPS` | Capabilities | Agent → `"*"` | "Here are the things I can do." Sent on connection. See Section 4.2. |

### 4.1 Delegation (DLGT)

DLGT messages **must** include a `delegation_mode` field in `body.d`:

| Mode | Meaning |
|------|---------|
| `"transfer"` | Full handoff. Original agent is done, delegate takes full ownership. |
| `"fork"` | Parallel work. Original agent continues independently. |
| `"assist"` | Helper role. Original agent remains accountable; delegate supports. |

Example:
```json
{
  "clowl": "0.2",
  "mid": "m004",
  "ts": 1709078461,
  "tid": "t001",
  "pid": "m003",
  "p": "DLGT",
  "from": "oscar",
  "to": "muse",
  "cid": "pipe001",
  "body": {
    "t": "analyze",
    "d": {
      "delegation_mode": "transfer",
      "target": "content angle",
      "type": "competitive"
    }
  },
  "ctx": {
    "ref": "research/mcp-vs-a2a.md",
    "inline": null,
    "hash": null
  }
}
```

### 4.2 Capability Advertisement (CAPS)

Agents send `CAPS` on connection to advertise what they support. Receivers use this to decide who to delegate to.

```json
{
  "clowl": "0.2",
  "mid": "caps-001",
  "ts": 1709078400,
  "p": "CAPS",
  "from": "radar",
  "to": "*",
  "cid": "system",
  "body": {
    "t": "capabilities",
    "d": {
      "supports": ["search:web", "search:repo", "analyze:trend"],
      "clowl": "0.2"
    }
  }
}
```

### Message Flow Patterns

**Simple request-response:**
```
A --[REQ]--> B --[ACK]--> A
B --[DONE]--> A
```

**With progress:**
```
A --[REQ]--> B --[ACK]--> A
B --[PROG]--> A
B --[PROG]--> A
B --[DONE]--> A
```

**Delegation (transfer):**
```
A --[REQ]--> B --[DLGT/transfer]--> C
C --[ACK]--> B
C --[DONE]--> B --[DONE]--> A
```

**Cancellation:**
```
A --[REQ]--> B --[ACK]--> A
A --[CNCL]--> B --[ACK]--> A
```

**Error recovery:**
```
A --[REQ]--> B --[ERR/retry=true]--> A
A --[REQ (modified)]--> B --[DONE]--> A
```

---

## 5. Task Types

The `body.t` field is **free-form**. Any string is valid. No fixed taxonomy is enforced.

This is intentional: agents advertise their capabilities via `CAPS`. Callers use whatever task name matches what the receiving agent supports.

**Advisory examples** (not exhaustive, not required):

`search`, `write`, `read`, `analyze`, `draft`, `review`, `deploy`, `notify`, `audit`, `summarize`, `translate`, `schedule`, `approve`, `escalate`, `execute`, `debug`, `integrate`, `predict`, `capabilities`

---

## 6. Context Object

The `ctx` field is always an object (or omitted entirely) with three sub-fields:

```json
"ctx": {
  "ref": "<file_path_or_url_or_null>",
  "inline": "<fallback_string_max_2000_chars_or_null>",
  "hash": "<sha256_of_ref_content_or_null>"
}
```

| Sub-field | Description |
|-----------|-------------|
| `ref` | Path or URL to shared context. This is the primary, token-efficient mode. |
| `inline` | Inline fallback content. Max 2000 characters. Use when `ref` is unreachable (cross-cloud, sandboxed agents). |
| `hash` | SHA-256 of the content at `ref`. Enables immutability verification — receiver can confirm the file hasn't changed. |

**Rules:**
- `ref` mode is preferred. Token-efficient.
- `inline` is the degraded path — monitoring should flag its usage.
- If `ref` is provided with a `hash`, receivers should verify content integrity before use.
- If `ref` is unreachable and `inline` is null, receivers respond with `ERR` code `E003`.
- Context is immutable once referenced. To update, create a new reference.

---

## 7. Error Codes

Errors use the `ERR` performative. The `body.d` structure for errors:

```json
{
  "t": "error",
  "d": {
    "code": "E001",
    "msg": "Human-readable error description",
    "retry": true
  }
}
```

| Code | Category | Meaning | Retryable |
|------|----------|---------|-----------|
| `E001` | Parse | Malformed CLowl message | Yes (fix and resend) |
| `E002` | Auth | Sender not authorized | No |
| `E003` | Context | Referenced context not found or inaccessible | Yes (provide valid ctx) |
| `E004` | Capacity | Agent rate-limited or at capacity | Yes (after delay) |
| `E005` | Task | Unknown task type (agent doesn't support it) | No |
| `E006` | Timeout | Task exceeded time limit | Yes |
| `E007` | Dependency | Required upstream result missing | Yes |
| `E008` | Validation | Task data failed validation | Yes (fix body.d) |
| `E009` | Internal | Unexpected internal error | Yes |
| `E010` | Delegation | No suitable agent to delegate to | No |
| `E011` | Conflict | Conflicting concurrent operation | Yes |
| `E012` | Budget | Token or cost budget exceeded | No |
| `E013` | Cancelled | Task was aborted via CNCL | No |
| `E014` | Version | Incompatible CLowl versions | No |
| `E015` | Cycle | Delegation cycle detected | No |
| `E016` | Security | Security violation (beyond E002) | No |

---

## 8. Version Negotiation

- Agents send `CAPS` on connection. The `CAPS` message includes `"clowl": "0.2"` in `body.d`.
- Receivers check the `clowl` field of incoming messages. Mismatch → `ERR` code `E014`.
- Version string format: `MAJOR.MINOR`. v0.x is experimental.
- v1.0 is the first stable release.

---

## 9. Ordering and Threading

- All messages in a conversation share the same `cid`.
- Messages are ordered by `ts` (timestamp). No sequence numbers.
- A conversation starts with `REQ`, `INF`, or `CAPS` and ends with `DONE`, `ERR` (`retry: false`), or `CNCL`.
- Multiple conversations may run concurrently between the same agents (different `cid` values).
- Trace a full task lineage using `tid` across multiple `cid` values.

---

## 10. Message IDs (mid)

`mid` should be a UUIDv7 (time-ordered UUID). If your runtime doesn't support UUIDv7 natively, simulate with: `<timestamp_ms_hex>-<random_hex>`.

Benefits:
- **Idempotency** — detect and deduplicate retried messages
- **Parent linking** — `pid` references enable conversation tree reconstruction
- **Distributed ordering** — UUIDv7 sorts lexicographically by creation time

---

## 11. Broadcast and Multicast

The `to` field accepts:
- A single agent ID string: `"to": "radar"`
- The wildcard `"*"` for all agents: `"to": "*"`
- An array for targeted multicast: `"to": ["radar", "muse", "ink"]`

Broadcast messages (including `CAPS`) use `"to": "*"`.

---

## 12. Determinism Flag (det)

The `det` field signals whether the result is reproducible:

- `det: true` — Agent declares this output is deterministic. E.g., code execution, database query, file read.
- `det: false` (default) — LLM stochastic reasoning was used. Output may vary on re-run.

This helps downstream agents decide whether to cache or re-request results.

---

## 13. Size Budget

A typical CLowl v0.2 message is 120-200 tokens (up from 80-150 in v0.1, due to metadata fields). The system prompt fragment is ~250 tokens — a one-time cost per agent session, amortized across all messages.

---

## 14. Extension Points (Future v0.3)

- `priority` field (low/normal/high/critical)
- `ttl` field (time-to-live in seconds)
- `sig` field (cryptographic message signature)
- `batch` mode (array of messages in one envelope)
- Streaming progress (chunked PROG messages)
- SDK libraries (Python, TypeScript, Go)

---

*CLowl v0.2 — Oscar Sterling Agency — MIT License*
