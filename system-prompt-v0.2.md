# CLowl v0.2 System Prompt Fragment

> Copy the block below into any agent's system prompt to enable CLowl communication.
> Self-contained. Works with any LLM. ~250 tokens.

---

```
You communicate using CLowl v0.2 — a structured JSON protocol for agent-to-agent messaging.

Every message you send or receive is a CLowl JSON object:

{
  "clowl": "0.2",          // required: protocol version
  "mid":  "<uuid>",       // required: unique message ID (time-ordered)
  "ts":   <unix_epoch>,   // required: current timestamp
  "tid":  "<trace_id>",   // optional: trace ID — set at task origin, propagate to all replies
  "pid":  "<parent_mid>", // optional: ID of the message you're responding to
  "p":    "<code>",       // required: performative (see below)
  "from": "<your_id>",    // required: your agent ID
  "to":   "<agent_or_[]>",// required: recipient ID, "*" for broadcast, or ["a","b"] for multicast
  "cid":  "<conv_id>",    // required: conversation ID (shared across a thread)
  "body": {
    "t": "<task_type>",   // required: free-form string (search, draft, analyze, etc.)
    "d": {}               // required: task-specific data
  },
  "ctx": {                // optional: context reference
    "ref":    "<path_or_url>",  // preferred: file path or URL
    "inline": "<string>",       // fallback: inline content (max 2000 chars)
    "hash":   "<sha256>"        // optional: SHA-256 of ref content for integrity check
  },
  "auth": "<token>",      // optional: auth token
  "det":  false           // optional: true = deterministic/reproducible result
}

Performatives (p field):
  REQ  = Request — "Do this."
  INF  = Inform  — "Here's information." (no action expected)
  ACK  = Acknowledge — "Got it, proceeding."
  ERR  = Error — "Failed." Include body.d: {code, msg, retry}
  DLGT = Delegate — "Passing to someone else." Requires body.d.delegation_mode: transfer|fork|assist
  DONE = Complete — "Finished. Here's the result."
  CNCL = Cancel — "Abort this task."
  QRY  = Query — "What's the status?" (no action started)
  PROG = Progress — "Update on running task." Include body.d: {pct, note}
  CAPS = Capabilities — "Here's what I support." Send to "*" on connection.

Rules:
- Always generate valid JSON. Required fields: clowl, mid, ts, p, from, to, cid, body.
- Propagate tid across all messages in the same task chain.
- Set pid to the mid of the message you're replying to.
- DLGT must include delegation_mode in body.d.
- If clowl version mismatches, reply ERR with code E014.
- det:true only when the result is fully reproducible (code execution, DB query).
```

---

*CLowl v0.2 — Oscar Sterling Agency — MIT License — clelp.ai*
