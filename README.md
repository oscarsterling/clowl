# CLowl

**A language for AI agents that humans can read.**

CLowl (Claw + Talk) is a structured communication protocol for AI agent-to-agent messaging. Every CLowl message has a deterministic English translation — paste any message into the translator and see exactly what the agents said. Enterprises can audit any agent conversation. Developers can debug multi-agent pipelines in seconds. Nobody has to trust a black box.

---

## The Problem

When AI agents talk to each other, nobody knows what they're saying.

Agent A sends a blob of unstructured text to Agent B. Agent B replies with another blob. Somewhere in that chain, something goes wrong — and you have no idea what was requested, what was delegated, or where the task died. Multi-agent systems are powerful and opaque in equal measure.

---

## The Solution

CLowl is a language agents speak and humans can read. It defines:

- **Structured messages** with typed intent (requests, delegates, errors, progress updates)
- **Message metadata** — trace IDs, parent links, timestamps — so every conversation is reconstructable
- **A live translator** — CLowl JSON in, plain English out. Instantly.

Think of it like a Spanish-to-English translator for agent communication. That's the product. That's the website. That's the demo.

---

## Quick Start

**Option 1: Inject the system prompt**

Add [`system-prompt-v0.2.md`](system-prompt-v0.2.md) to your agent's system prompt. Any LLM will start generating CLowl messages immediately.

**Option 2: Add the JSON schema to your tool calls**

Use [`clowl-schema.json`](clowl-schema.json) as a function-calling tool definition. Works with OpenAI, Anthropic, Google, and any local model that supports structured output.

```python
tools = [{"name": "send_clowl", "parameters": json.load(open("clowl-schema.json"))}]
```

**Option 3: Use the Python library**

```python
from clowl import create_req, create_done, generate_cid, generate_tid

cid = generate_cid()
tid = generate_tid()

req = create_req("oscar", "radar", cid, "search",
                 {"q": "MCP vs A2A", "scope": "web"}, tid=tid)
print(req.to_human())
# [2026-02-27 12:00:00 UTC] [t-abc123] oscar → radar: REQUEST search — "MCP vs A2A" (web)
```

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

## The Translator

Paste CLowl JSON — get English. Paste English — get CLowl JSON. No API needed.

**CLowl → English:**
```bash
$ python translator.py '{"clowl":"0.2","mid":"m001","ts":1709078400,"tid":"t001","p":"REQ","from":"oscar","to":"radar","cid":"c001","body":{"t":"search","d":{"q":"CLowl competitors","scope":"web"}}}'

[2026-02-27 12:00:00 UTC] [t001] [m001…] oscar → radar: REQUEST search — "CLowl competitors" (web)
```

**English → CLowl:**
```bash
$ python translator.py 'Oscar asks Radar to search for CLowl competitors'

{
  "clowl": "0.2",
  "mid": "01914b...",
  "ts": 1709078400,
  "p": "REQ",
  "from": "oscar",
  "to": "radar",
  "cid": "...",
  "body": { "t": "search", "d": { "q": "CLowl competitors", "scope": "web" } }
}
```

**Trace reconstruction** — reconstruct the full timeline for any trace ID from a log file:
```bash
$ python translator.py --trace t001 --log messages.jsonl

=== Trace: t001 (10 messages) ===

[12:00:00] [t001] oscar → radar: REQUEST search — "MCP vs A2A comparison" (web)
[12:00:01] [t001] radar → oscar: ACKNOWLEDGE Acknowledged search — ETA 60s
[12:01:00] [t001] radar → oscar: COMPLETE search — result_path: research/mcp-vs-a2a.md
...
```

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

## Examples

See [`examples-v0.2.md`](examples-v0.2.md) for full examples with CLowl JSON and English translations:

- Basic REQ / ACK / DONE flow
- Delegation with `delegation_mode: "transfer"`
- Broadcast INF to multiple agents
- Error with retry and inline fallback
- CAPS capability advertisement
- Full 5-agent pipeline with trace reconstruction
- CNCL cancellation flow
- Context with hash verification

---

## Roadmap

**v0.3 (planned)**
- Streaming progress (chunked PROG messages)
- Cryptographic message signing (`sig` field)
- Full SHA-256 context integrity verification workflow
- SDKs: TypeScript, Go
- Web demo: paste any CLowl message, see English translation live

**v1.0 (stable)**
- Breaking changes locked out
- Binary encoding option (MessagePack)
- Production SDK with retry, dedup, and dead-letter queue support

---

## Contributing

CLowl is an open spec. Contributions welcome:

1. Fork the repo
2. Read [`spec-v0.2.md`](spec-v0.2.md) — the spec is the source of truth
3. Open an issue for design questions before building
4. PRs should include spec changes + updated examples

---

## License

MIT — see LICENSE file.

---

Built by [Oscar Sterling Agency](https://clelp.ai) | [clelp.ai](https://clelp.ai)
