# CLowl

**A language for AI agents that humans can read.**

CLowl (Claw + Talk) is a structured communication protocol for AI agent-to-agent messaging. It defines a minimal JSON schema with typed performatives, message metadata, and context referencing that runs on top of any transport (MCP, A2A, HTTP, WebSocket, stdio, etc.). Every CLowl message has a deterministic English translation, so enterprises can audit any agent conversation and developers can debug multi-agent pipelines in seconds.

---

## Install

**TypeScript / Node.js:**
```bash
npm install clowl-protocol
```

**Python:**
```bash
pip install clowl
```

---

## Quick Start

**TypeScript:**
```typescript
import { createReq, generateCid, generateTid } from "clowl";

const cid = generateCid();
const req = createReq("oscar", "radar", cid, "search", { q: "MCP vs A2A" }, { tid: generateTid() });
console.log(req.toHuman());
```

**Python:**
```python
from clowl import create_req, generate_cid, generate_tid

cid = generate_cid()
req = create_req("oscar", "radar", cid, "search", {"q": "MCP vs A2A"}, tid=generate_tid())
print(req.to_human())
```

---

## The Problem

When AI agents talk to each other, nobody knows what they're saying.

Agent A sends a blob of unstructured text to Agent B. Agent B replies with another blob. Somewhere in that chain, something goes wrong, and you have no idea what was requested, what was delegated, or where the task died. Multi-agent systems are powerful and opaque in equal measure.

---

## The Solution

CLowl is a language agents speak and humans can read. It defines:

- **Structured messages** with typed intent (requests, delegates, errors, progress updates)
- **Message metadata** for tracing, dedup, and conversation reconstruction
- **A live translator** that converts CLowl JSON to plain English instantly

---

## Message Format

Every CLowl message is a JSON object with 8 required fields:

```json
{
  "clowl": "0.2",
  "mid":  "01914b2c-7abc-...",
  "ts":   1709078400,
  "p":    "REQ",
  "from": "oscar",
  "to":   "radar",
  "cid":  "conv-001",
  "body": {
    "t": "search",
    "d": { "q": "MCP vs A2A", "scope": "web" }
  }
}
```

Optional fields: `tid` (trace ID), `pid` (parent message), `ctx` (context reference), `auth` (auth token), `det` (determinism flag).

See the [full spec](spec-v0.2.md) for complete field definitions.

---

## Performatives

| Code | Name | Meaning |
|------|------|---------|
| `REQ` | Request | "Do this thing." Initiates a task. |
| `INF` | Inform | "Here is information." No action expected. |
| `ACK` | Acknowledge | "Got it, proceeding." |
| `ERR` | Error | "Failed. Here's why." Structured error code + message. |
| `DLGT` | Delegate | "Passing to someone better suited." Requires `delegation_mode`: `transfer`, `fork`, or `assist`. |
| `DONE` | Complete | "Finished. Here's the result." |
| `CNCL` | Cancel | "Abort this task." |
| `QRY` | Query | "What's the status?" or "Give me info without acting." |
| `PROG` | Progress | "Here's an update on the running task." |
| `CAPS` | Capabilities | "Here's what I can do." Broadcast on connection. |

---

## The Translator

Paste CLowl JSON, get English. Paste English, get CLowl JSON. No API needed.

```bash
$ python translator.py '{"clowl":"0.2","mid":"m001","ts":1709078400,"tid":"t001","p":"REQ","from":"oscar","to":"radar","cid":"c001","body":{"t":"search","d":{"q":"CLowl competitors","scope":"web"}}}'

[2026-02-27 12:00:00 UTC] [t001] [m001...] oscar > radar: REQUEST search
```

---

## Integration Options

**Option 1: Inject the system prompt**

Add [`system-prompt-v0.2.md`](system-prompt-v0.2.md) to your agent's system prompt. Any LLM will start generating CLowl messages immediately.

**Option 2: Add the JSON schema to your tool calls**

Use [`clowl-schema.json`](clowl-schema.json) as a function-calling tool definition. Works with OpenAI, Anthropic, Google, and any local model that supports structured output.

**Option 3: Use the libraries**

TypeScript and Python libraries provide message creation, validation, state tracking, and translation with zero external dependencies.

---

## Examples

See [`examples-v0.2.md`](examples-v0.2.md) for full examples with CLowl JSON and English translations.

---

## Roadmap

**v0.3 (planned)**
- Three-layer architecture (Semantic / Coordination / Transport)
- Streaming progress (chunked PROG messages)
- Cryptographic message signing
- Go SDK

**v1.0 (stable)**
- Breaking changes locked out
- Binary encoding option (MessagePack)
- Production SDK with retry, dedup, and dead-letter queue support

---

## Contributing

CLowl is an open spec. Contributions welcome:

1. Fork the repo
2. Read [`spec-v0.2.md`](spec-v0.2.md) for the source of truth
3. Open an issue for design questions before building
4. PRs should include spec changes + updated examples

---

## License

MIT

---

Built by [Oscar Sterling Agency](https://clowl.dev) | [clowl.dev](https://clowl.dev)
