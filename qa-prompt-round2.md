# CLowl QA Prompt - Round 2: Validation (Copy/Paste to Gemini, ChatGPT, Grok)

---

Thanks for tearing apart CLingo v0.1. I took every piece of feedback seriously and rebuilt it as **CLowl v0.2** (renamed from CLingo to avoid the Clingo logic programming solver collision). CLowl = Claw + Talk.

I want to validate the changes. Tell me: did I fix the right things? Did I break anything? What's still wrong?

## What Changed (v0.1 → v0.2)

### Renamed: CLingo → CLowl
Avoids Clingo (ASP solver) name collision. CLowl = short, memorable, no conflicts.

### Reframed Value Proposition
**Old pitch:** "Save 40-70% on agent tokens."
**New pitch:** "A language agents speak that humans can read. Every message, auditable. Every handoff, deterministic."

Token savings is a real byproduct, but the core value is:
1. **Agents understand each other with precision** - structured intent, no ambiguity
2. **Humans can read every word** - a live translator converts CLowl to/from English instantly
3. **Trust and auditability** - the market fears AI agents they can't understand. CLowl is the answer. Paste any CLowl message, see exactly what the agents said in plain English.

Think of it like a Spanish-to-English translator, but for agent communication. That's the product. That's the website. That's the demo.

### Added Message Metadata
Every message now includes:

```json
{
  "clowl": "0.2",
  "mid": "<message_uuid>",
  "ts": 1709078400,
  "tid": "<trace_id>",
  "pid": "<parent_message_id>",
  "p": "<performative>",
  "from": "<agent_id>",
  "to": "<agent_id>",
  "cid": "<conversation_id>",
  "body": {
    "t": "<task_type>",
    "d": {}
  },
  "ctx": "<context_reference>",
  "auth": "<optional_token>"
}
```

New fields:
- `mid` - unique message ID (idempotency, dedup)
- `ts` - Unix epoch timestamp
- `tid` - trace ID (follows a task across multiple agents for debugging)
- `pid` - parent message ID (links replies to requests)
- `auth` - optional auth token for context access verification

### Expanded Performatives (6 → 9)

| Code | Name | Meaning |
|------|------|---------|
| REQ | Request | "Do this thing." |
| INF | Inform | "Here is information." |
| ACK | Acknowledge | "Got it, proceeding." |
| ERR | Error | "Failed. Here's why." |
| DLGT | Delegate | "Passing to someone better suited." (kept - delegation is a distinct, traceable speech act in multi-agent systems, not just re-routing) |
| DONE | Complete | "Finished. Here's the result." |
| **CNCL** | **Cancel** | **NEW: "Abort this task."** |
| **QRY** | **Query** | **NEW: "What's the status / give me info without action."** |
| **PROG** | **Progress** | **NEW: "Here's a progress update on the running task."** |

### Free-Form Task Types
Dropped the hardcoded 14. The `body.t` field is now **free-form** - any string. Agents advertise their capabilities; callers use whatever task name makes sense.

Common examples (advisory, not enforced): search, write, read, analyze, draft, review, deploy, notify, audit, summarize, translate, schedule, approve, escalate, execute, debug, integrate, predict.

No `x-` prefix. No rigid taxonomy. Just strings.

### Context Referencing with Fallback
The `ctx` field still supports reference-by-path/URL/hash (the core innovation). But v0.2 adds a fallback mechanism:

```json
// Option A: Reference (preferred, token-efficient)
"ctx": "memory/projects/clowl/research.md"

// Option B: Inline fallback (when shared storage unavailable)
"ctx": {
  "ref": "memory/projects/clowl/research.md",
  "inline": "Key findings: 29-50% token waste proven...",
  "mode": "fallback"
}
```

Rules:
- Reference mode is default and preferred
- Inline fallback is available for cross-cloud, sandboxed, or ephemeral agents
- `mode: "fallback"` signals this is a degraded path (monitoring/alerting can flag it)
- Sender still responsible for accessibility; receiver returns ERR E003 if unreachable AND no inline provided

### Security Basics
- `auth` field: optional token for verifying sender identity and context access rights
- Messages can be signed (reserved `sig` field for v0.3)
- Context references can include access scopes

### Function Calling Mode
CLowl can be provided as a **JSON Schema tool definition** for any LLM, not just a system prompt injection. This means:
- LLMs use their native structured output / function calling to generate CLowl messages
- Guaranteed valid JSON (no parsing failures)
- Works with OpenAI, Anthropic, Google, and local model tool-calling APIs

The system prompt (~200 tokens) remains available as a lightweight alternative for systems that don't support tool calling.

### Error Codes Updated
Added based on feedback:

| Code | Meaning |
|------|---------|
| E001 | Parse error (malformed message) |
| E002 | Authentication failure |
| E003 | Context not found / inaccessible |
| E004 | Rate limited / at capacity |
| E005 | Unknown task type |
| E006 | Timeout |
| E007 | Missing dependency |
| E008 | Validation error |
| E009 | Internal error |
| E010 | No suitable delegate |
| E011 | Conflict (concurrent operation) |
| E012 | Budget exceeded |
| **E013** | **Cancelled (task was aborted via CNCL)** |
| **E014** | **Version mismatch (incompatible CLowl versions)** |
| **E015** | **Delegation cycle detected** |
| **E016** | **Security violation (auth/permission denied beyond E002)** |

---

## The Translator (Core Product)

The translator is not a nice-to-have. It IS the product.

**CLowl → English:**
```
Input:  {"clowl":"0.2","mid":"a1b2","ts":1709078400,"tid":"trace-99","pid":null,"p":"REQ","from":"oscar","to":"radar","cid":"pipe001","body":{"t":"search","d":{"q":"CLowl competitors","scope":"web"}},"ctx":"projects/clowl/"}

Output: [2026-02-27 12:00:00] [trace-99] Oscar → Radar: REQUEST search - "CLowl competitors" (web scope) | Context: projects/clowl/
```

**English → CLowl:**
```
Input:  "Oscar asks Radar to search the web for CLowl competitors, referencing the CLowl project folder"

Output: {"clowl":"0.2","mid":"<auto>","ts":<now>,"tid":"<auto>","pid":null,"p":"REQ","from":"oscar","to":"radar","cid":"<auto>","body":{"t":"search","d":{"q":"CLowl competitors","scope":"web"}},"ctx":"projects/clowl/"}
```

**The website:** Paste CLowl, see English. Paste English, see CLowl. Real-time. Developers can audit any agent conversation instantly. Enterprises can prove compliance. Nobody needs to fear what agents are saying to each other.

---

## Full Example: 3-Agent Pipeline in CLowl v0.2

```json
// Step 1: Oscar kicks off research
{"clowl":"0.2","mid":"m001","ts":1709078400,"tid":"t001","pid":null,"p":"REQ","from":"oscar","to":"radar","cid":"pipe001","body":{"t":"search","d":{"q":"MCP vs A2A comparison","scope":"web"}}}

// Step 2: Radar acknowledges
{"clowl":"0.2","mid":"m002","ts":1709078401,"tid":"t001","pid":"m001","p":"ACK","from":"radar","to":"oscar","cid":"pipe001","body":{"t":"search","d":{"eta":"60s"}}}

// Step 3: Radar delivers findings
{"clowl":"0.2","mid":"m003","ts":1709078460,"tid":"t001","pid":"m001","p":"DONE","from":"radar","to":"oscar","cid":"pipe001","body":{"t":"search","d":{"result_path":"research/mcp-vs-a2a.md","sources":8}}}

// Step 4: Oscar delegates to Muse
{"clowl":"0.2","mid":"m004","ts":1709078461,"tid":"t001","pid":"m003","p":"DLGT","from":"oscar","to":"muse","cid":"pipe001","body":{"t":"analyze","d":{"target":"content angle","type":"competitive"}},"ctx":"research/mcp-vs-a2a.md"}

// Step 5: Muse queries Radar for clarification
{"clowl":"0.2","mid":"m005","ts":1709078470,"tid":"t001","pid":"m004","p":"QRY","from":"muse","to":"radar","cid":"pipe001","body":{"t":"search","d":{"q":"Which protocol has more GitHub stars?"}}}

// Step 6: Radar responds to query
{"clowl":"0.2","mid":"m006","ts":1709078475,"tid":"t001","pid":"m005","p":"INF","from":"radar","to":"muse","cid":"pipe001","body":{"t":"search","d":{"answer":"MCP: 42k stars, A2A: 8k stars"}}}

// Step 7: Muse delegates to Ink
{"clowl":"0.2","mid":"m007","ts":1709078480,"tid":"t001","pid":"m004","p":"DLGT","from":"muse","to":"ink","cid":"pipe001","body":{"t":"draft","d":{"type":"post","topic":"MCP vs A2A","platform":"x"}},"ctx":"research/mcp-vs-a2a.md"}

// Step 8: Ink reports progress
{"clowl":"0.2","mid":"m008","ts":1709078500,"tid":"t001","pid":"m007","p":"PROG","from":"ink","to":"muse","cid":"pipe001","body":{"t":"draft","d":{"pct":50,"note":"Draft outline complete, writing body"}}}

// Step 9: Ink completes
{"clowl":"0.2","mid":"m009","ts":1709078540,"tid":"t001","pid":"m007","p":"DONE","from":"ink","to":"muse","cid":"pipe001","body":{"t":"draft","d":{"path":"drafts/x-mcp-a2a.md","word_count":240}}}

// Step 10: Muse confirms to Oscar
{"clowl":"0.2","mid":"m010","ts":1709078541,"tid":"t001","pid":"m004","p":"DONE","from":"muse","to":"oscar","cid":"pipe001","body":{"t":"draft","d":{"path":"drafts/x-mcp-a2a.md","status":"ready_for_review"}}}
```

**Human-readable translation (what the translator shows):**
```
[12:00:00] [t001] Oscar → Radar: REQUEST search - "MCP vs A2A comparison" (web)
[12:00:01] [t001] Radar → Oscar: ACKNOWLEDGE search - ETA 60s
[12:01:00] [t001] Radar → Oscar: COMPLETE search - 8 sources at research/mcp-vs-a2a.md
[12:01:01] [t001] Oscar → Muse: DELEGATE analyze - content angle, competitive | Ctx: research/mcp-vs-a2a.md
[12:01:10] [t001] Muse → Radar: QUERY search - "Which protocol has more GitHub stars?"
[12:01:15] [t001] Radar → Muse: INFORM search - MCP: 42k stars, A2A: 8k stars
[12:01:20] [t001] Muse → Ink: DELEGATE draft - X post about "MCP vs A2A" | Ctx: research/mcp-vs-a2a.md
[12:01:40] [t001] Ink → Muse: PROGRESS draft - 50% "Draft outline complete, writing body"
[12:02:20] [t001] Ink → Muse: COMPLETE draft - 240 words at drafts/x-mcp-a2a.md
[12:02:21] [t001] Muse → Oscar: COMPLETE draft - Ready for review at drafts/x-mcp-a2a.md
```

---

## What I Need From You (Round 2)

1. **Did I fix the right things?** Review each change above. Did I address your v0.1 concerns correctly, or did I miss the point on any of them?

2. **Did I break anything?** By adding metadata fields, expanding performatives, and making task types free-form, did I introduce new problems?

3. **Context fallback:** Is the inline fallback mechanism the right solution for distributed environments? Or is there a better approach?

4. **The translator as core product:** I've made the translator the centerpiece. The pitch is "a language agents speak that humans can read." Does this resonate? Is the trust/auditability angle strong enough to drive adoption?

5. **Function calling mode:** Is providing CLowl as a JSON Schema tool definition (alongside the system prompt) the right approach for reliable LLM output?

6. **What's still missing?** After all these changes, what gaps remain? What would stop you from using this in production?

7. **Market viability:** With the reframed pitch (auditability + trust + language, not just token savings), does this have legs? Would you recommend this to a team building multi-agent systems?

8. **Scale check:** Does this schema hold up at 100 agents? 1,000 messages/second? What breaks at scale?

9. **Final verdict:** Ship it, iterate more, or kill it?

Be honest. I'd rather hear "kill it" now than after launch.
