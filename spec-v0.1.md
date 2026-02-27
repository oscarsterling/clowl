# CLowl v0.1 Specification

**Version:** 0.1  
**Status:** Draft  
**Date:** 2026-02-27  
**Author:** Forge (Oscar Sterling Agency)  
**License:** MIT

---

## 1. Overview

CLowl is a semantic compression layer for AI agent-to-agent communication. It defines a minimal JSON schema with typed performatives and context referencing that runs on top of existing transport protocols (MCP, A2A, HTTP, etc.).

CLowl is not a transport protocol. It defines what goes *inside* the envelope.

---

## 2. Design Principles

1. **Minimal** - The entire spec fits in a 200-token system prompt
2. **LLM-native** - Any model can parse and generate CLowl after reading the system prompt
3. **Transport-agnostic** - Works over MCP, A2A, HTTP, WebSocket, file system, or stdin/stdout
4. **Context by reference** - Agents point to shared context, never inline it
5. **Human-debuggable** - Every message has a deterministic human-readable translation

---

## 3. Message Schema

```json
{
  "cl": "0.1",
  "p": "<performative>",
  "from": "<agent_id>",
  "to": "<agent_id>",
  "cid": "<conversation_id>",
  "body": {
    "t": "<task_type>",
    "d": {}
  },
  "ctx": "<context_reference>"
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cl` | string | Yes | Protocol version. Always `"0.1"` for this spec. |
| `p` | string | Yes | Performative code. One of: `REQ`, `INF`, `ACK`, `ERR`, `DLGT`, `DONE`. |
| `from` | string | Yes | Sender agent identifier. |
| `to` | string | Yes | Recipient agent identifier. Use `"*"` for broadcast. |
| `cid` | string | Yes | Conversation ID. Groups related messages into a thread. |
| `body` | object | Yes | Message payload. |
| `body.t` | string | Yes | Task type code from the defined vocabulary. |
| `body.d` | object | Yes | Task-specific data. Schema varies by task type. May be `{}` for ACK. |
| `ctx` | string | No | Reference to shared context. File path, URL, or content hash. NOT inline content. |

---

## 4. Performatives

Six performatives define the intent of every message.

| Code | Name | Direction | Meaning |
|------|------|-----------|---------|
| `REQ` | Request | Sender → Receiver | "Do this thing." Initiates a task. |
| `INF` | Inform | Sender → Receiver | "Here is information." No action expected. |
| `ACK` | Acknowledge | Receiver → Sender | "Got it, proceeding." Confirms receipt and intent to act. |
| `ERR` | Error | Receiver → Sender | "Failed. Here's why." Structured error with code. |
| `DLGT` | Delegate | Agent → Agent | "Passing this to someone better suited." Includes original task. |
| `DONE` | Complete | Receiver → Sender | "Finished. Here is the result." |

### Message Flow Patterns

**Simple request-response:**
```
A -[REQ]-> B -[ACK]-> A -[DONE]-> A
```

**Delegation chain:**
```
A -[REQ]-> B -[DLGT]-> C -[ACK]-> B -[DONE]-> B -[DONE]-> A
```

**Error recovery:**
```
A -[REQ]-> B -[ERR]-> A -[REQ (modified)]-> B -[DONE]-> A
```

---

## 5. Task Types

Core vocabulary for the `body.t` field. Extensible - agents may define custom types prefixed with `x-`.

| Code | Name | Description | Typical `body.d` fields |
|------|------|-------------|------------------------|
| `search` | Search | Find information | `q` (query), `scope` (web/local/db), `limit` |
| `write` | Write | Create/write content to a destination | `path`, `content`, `mode` (create/append/overwrite) |
| `read` | Read | Read/retrieve content | `path`, `format` |
| `analyze` | Analyze | Perform analysis on data | `target`, `type` (sentiment/competitive/technical) |
| `draft` | Draft | Create a draft of content | `type` (post/email/doc), `topic`, `tone`, `platform` |
| `review` | Review | Review and provide feedback | `target`, `criteria` |
| `deploy` | Deploy | Deploy code or configuration | `target`, `env` (prod/staging), `version` |
| `notify` | Notify | Send a notification | `channel`, `recipient`, `message` |
| `audit` | Audit | Security or quality audit | `target`, `scope`, `level` (quick/full) |
| `summarize` | Summarize | Condense information | `target`, `max_tokens`, `format` |
| `translate` | Translate | Transform between formats/languages | `source`, `target_format`, `target_lang` |
| `schedule` | Schedule | Schedule a future action | `action`, `when`, `recurrence` |
| `approve` | Approve | Request or grant approval | `item`, `decision` (yes/no/conditional), `reason` |
| `escalate` | Escalate | Escalate to higher authority | `issue`, `severity` (low/medium/high/critical), `reason` |

### Custom Task Types

Agents may define custom task types using the `x-` prefix:

```json
{"t": "x-kroger-order", "d": {"store": "cartersville", "items": [...]}}
```

---

## 6. Context Referencing

The `ctx` field is the key innovation. Instead of passing context inline (which wastes tokens), agents reference shared context by:

1. **File path:** `"ctx": "memory/projects/clowl/research-2026-02-27.md"`
2. **URL:** `"ctx": "https://store.example.com/ctx/abc123"`
3. **Content hash:** `"ctx": "sha256:a1b2c3d4..."`
4. **Null:** Omit `ctx` if no shared context is needed.

### Rules

- The sender is responsible for ensuring the referenced context is accessible to the receiver.
- Receivers MUST NOT request inline context. If `ctx` is unreachable, respond with `ERR` code `E003`.
- Context is immutable once referenced. To update, create a new reference.

---

## 7. Error Codes

Structured error taxonomy for the `ERR` performative. The `body.d` field for errors:

```json
{
  "t": "escalate",
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
| `E002` | Auth | Sender not authorized for this task | No |
| `E003` | Context | Referenced context not found or inaccessible | Yes (provide valid ctx) |
| `E004` | Capacity | Agent is at capacity / rate limited | Yes (after delay) |
| `E005` | Task | Unknown task type | No |
| `E006` | Timeout | Task exceeded time limit | Yes |
| `E007` | Dependency | Required upstream result missing | Yes |
| `E008` | Validation | Task data failed validation | Yes (fix body.d) |
| `E009` | Internal | Unexpected internal error | Yes |
| `E010` | Delegation | No suitable agent to delegate to | No |
| `E011` | Conflict | Conflicting concurrent operation | Yes |
| `E012` | Budget | Token/cost budget exceeded | No |

---

## 8. Ordering and Threading

- All messages in a conversation share the same `cid`.
- Messages are ordered by receipt time. No sequence numbers in v0.1.
- A conversation starts with a `REQ` or `INF` and ends with a `DONE` or `ERR` (with `retry: false`).
- Multiple conversations may run concurrently between the same agents.

---

## 9. Size Budget

A typical CLowl message is 80-150 tokens. Compare to natural language equivalent at 200-500+ tokens. Expected compression: 40-70% per inter-agent exchange.

The system prompt fragment to teach CLowl to any LLM is under 250 tokens. This is a one-time cost per agent session, amortized across all messages.

---

## 10. Versioning

- Version string follows `MAJOR.MINOR` format.
- v0.x is experimental. Breaking changes permitted.
- v1.0 will be the first stable release.
- Agents MUST include `"cl": "0.1"` in every message. Receivers SHOULD reject unknown versions with `E001`.

---

## 11. Extension Points (Future)

Reserved for future versions:
- `priority` field (low/normal/high/critical)
- `ttl` field (time-to-live in seconds)
- `sig` field (cryptographic signature)
- `batch` mode (array of messages)
- Binary encoding (MessagePack/Protobuf for high-throughput)

---

*CLowl v0.1 - Oscar Sterling Agency - MIT License*
