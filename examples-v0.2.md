# CLowl v0.2 Examples

These examples show v0.2 features in action. Each includes the CLowl JSON and its human-readable translation.

---

## 1. Basic REQ / ACK / DONE Flow

**Scenario:** Oscar asks Radar to search the web.

```json
// Step 1: Oscar requests a search
{
  "clowl": "0.2",
  "mid": "m001",
  "ts": 1709078400,
  "tid": "t001",
  "pid": null,
  "p": "REQ",
  "from": "oscar",
  "to": "radar",
  "cid": "conv-001",
  "body": { "t": "search", "d": { "q": "CLowl competitors", "scope": "web" } },
  "ctx": { "ref": "projects/clowl/", "inline": null, "hash": null }
}
```
**→** `[2026-02-27 12:00:00 UTC] [t001] [m001…] oscar → radar: REQUEST search — "CLowl competitors" (web) | ctx: ref: projects/clowl/`

```json
// Step 2: Radar acknowledges
{
  "clowl": "0.2",
  "mid": "m002",
  "ts": 1709078401,
  "tid": "t001",
  "pid": "m001",
  "p": "ACK",
  "from": "radar",
  "to": "oscar",
  "cid": "conv-001",
  "body": { "t": "search", "d": { "eta": "60s" } }
}
```
**→** `[2026-02-27 12:00:01 UTC] [t001] radar → oscar: ACKNOWLEDGE Acknowledged search — ETA 60s (re: m001…)`

```json
// Step 3: Radar completes
{
  "clowl": "0.2",
  "mid": "m003",
  "ts": 1709078460,
  "tid": "t001",
  "pid": "m001",
  "p": "DONE",
  "from": "radar",
  "to": "oscar",
  "cid": "conv-001",
  "body": { "t": "search", "d": { "result_path": "research/clowl-comps.md", "sources": 8 } },
  "det": true
}
```
**→** `[2026-02-27 12:01:00 UTC] [t001] radar → oscar: COMPLETE search — result_path: research/clowl-comps.md [deterministic]`

---

## 2. Delegation with delegation_mode: "transfer"

**Scenario:** Oscar hands off analysis to Muse (full transfer — Oscar is done).

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
  "cid": "conv-001",
  "body": {
    "t": "analyze",
    "d": {
      "delegation_mode": "transfer",
      "target": "content angle",
      "type": "competitive"
    }
  },
  "ctx": {
    "ref": "research/clowl-comps.md",
    "inline": null,
    "hash": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
  }
}
```
**→** `[2026-02-27 12:01:01 UTC] [t001] oscar → muse: DELEGATE analyze [transfer] — {"target": "content angle", "type": "competitive"} | ctx: ref: research/clowl-comps.md (sha256: a1b2c3d4e5f6…)`

---

## 3. Broadcast INF to Multiple Agents

**Scenario:** Oscar informs Radar, Muse, and Ink that a new pipeline is starting.

```json
{
  "clowl": "0.2",
  "mid": "m005",
  "ts": 1709078400,
  "tid": "t002",
  "pid": null,
  "p": "INF",
  "from": "oscar",
  "to": ["radar", "muse", "ink"],
  "cid": "conv-002",
  "body": {
    "t": "notify",
    "d": { "message": "Pipeline starting: Q1 competitive analysis. All agents on standby." }
  }
}
```
**→** `[2026-02-27 12:00:00 UTC] [t002] oscar → [radar, muse, ink]: INFORM notify — message: Pipeline starting: Q1 competitive analysis. All agents on standby.`

---

## 4. Error with Retry

**Scenario:** Radar can't access the context file. Oscar retries with inline fallback.

```json
// Radar returns error — context unreachable
{
  "clowl": "0.2",
  "mid": "m006",
  "ts": 1709078405,
  "tid": "t001",
  "pid": "m001",
  "p": "ERR",
  "from": "radar",
  "to": "oscar",
  "cid": "conv-001",
  "body": {
    "t": "error",
    "d": { "code": "E003", "msg": "Context file not accessible: projects/clowl/", "retry": true }
  }
}
```
**→** `[2026-02-27 12:00:05 UTC] [t001] radar → oscar: ERROR [E003] Context file not accessible: projects/clowl/ — retryable`

```json
// Oscar retries with inline fallback
{
  "clowl": "0.2",
  "mid": "m007",
  "ts": 1709078410,
  "tid": "t001",
  "pid": "m006",
  "p": "REQ",
  "from": "oscar",
  "to": "radar",
  "cid": "conv-001",
  "body": { "t": "search", "d": { "q": "CLowl competitors", "scope": "web" } },
  "ctx": {
    "ref": "projects/clowl/",
    "inline": "CLowl is a structured agent communication protocol. Key competitors: A2A, MCP, OpenAgents.",
    "hash": null
  }
}
```
**→** `[2026-02-27 12:00:10 UTC] [t001] oscar → radar: REQUEST search — "CLowl competitors" (web) | ctx: ref: projects/clowl/, (inline fallback available)`

---

## 5. CAPS Capability Advertisement

**Scenario:** Radar announces its capabilities on connection.

```json
{
  "clowl": "0.2",
  "mid": "caps-radar-001",
  "ts": 1709078400,
  "p": "CAPS",
  "from": "radar",
  "to": "*",
  "cid": "system",
  "body": {
    "t": "capabilities",
    "d": {
      "supports": ["search:web", "search:repo", "analyze:trend", "analyze:competitive"],
      "clowl": "0.2"
    }
  }
}
```
**→** `[2026-02-27 12:00:00 UTC] radar → *: CAPABILITIES CLowl v0.2 | supports: search:web, search:repo, analyze:trend, analyze:competitive`

---

## 6. Full 5-Agent Pipeline with Trace IDs

**Scenario:** Oscar → Radar → Muse → Ink pipeline for an X post about MCP vs A2A.  
All messages share `tid: "t001"`.

```json
// 1. Oscar kicks off research
{"clowl":"0.2","mid":"m001","ts":1709078400,"tid":"t001","pid":null,"p":"REQ","from":"oscar","to":"radar","cid":"pipe001","body":{"t":"search","d":{"q":"MCP vs A2A comparison","scope":"web"}}}

// 2. Radar acknowledges
{"clowl":"0.2","mid":"m002","ts":1709078401,"tid":"t001","pid":"m001","p":"ACK","from":"radar","to":"oscar","cid":"pipe001","body":{"t":"search","d":{"eta":"60s"}}}

// 3. Radar delivers findings
{"clowl":"0.2","mid":"m003","ts":1709078460,"tid":"t001","pid":"m001","p":"DONE","from":"radar","to":"oscar","cid":"pipe001","body":{"t":"search","d":{"result_path":"research/mcp-vs-a2a.md","sources":8}},"det":true}

// 4. Oscar delegates to Muse (transfer)
{"clowl":"0.2","mid":"m004","ts":1709078461,"tid":"t001","pid":"m003","p":"DLGT","from":"oscar","to":"muse","cid":"pipe001","body":{"t":"analyze","d":{"delegation_mode":"transfer","target":"content angle","type":"competitive"}},"ctx":{"ref":"research/mcp-vs-a2a.md","inline":null,"hash":null}}

// 5. Muse queries Radar for clarification
{"clowl":"0.2","mid":"m005","ts":1709078470,"tid":"t001","pid":"m004","p":"QRY","from":"muse","to":"radar","cid":"pipe001","body":{"t":"search","d":{"q":"Which protocol has more GitHub stars?"}}}

// 6. Radar responds to query
{"clowl":"0.2","mid":"m006","ts":1709078475,"tid":"t001","pid":"m005","p":"INF","from":"radar","to":"muse","cid":"pipe001","body":{"t":"search","d":{"answer":"MCP: 42k stars, A2A: 8k stars"}}}

// 7. Muse delegates to Ink (fork — Muse continues review)
{"clowl":"0.2","mid":"m007","ts":1709078480,"tid":"t001","pid":"m004","p":"DLGT","from":"muse","to":"ink","cid":"pipe001","body":{"t":"draft","d":{"delegation_mode":"fork","type":"post","topic":"MCP vs A2A","platform":"x"}},"ctx":{"ref":"research/mcp-vs-a2a.md","inline":null,"hash":null}}

// 8. Ink reports progress
{"clowl":"0.2","mid":"m008","ts":1709078500,"tid":"t001","pid":"m007","p":"PROG","from":"ink","to":"muse","cid":"pipe001","body":{"t":"draft","d":{"pct":50,"note":"Outline complete, writing body"}}}

// 9. Ink completes
{"clowl":"0.2","mid":"m009","ts":1709078540,"tid":"t001","pid":"m007","p":"DONE","from":"ink","to":"muse","cid":"pipe001","body":{"t":"draft","d":{"path":"drafts/x-mcp-a2a.md","word_count":240}}}

// 10. Muse confirms to Oscar
{"clowl":"0.2","mid":"m010","ts":1709078541,"tid":"t001","pid":"m004","p":"DONE","from":"muse","to":"oscar","cid":"pipe001","body":{"t":"draft","d":{"path":"drafts/x-mcp-a2a.md","status":"ready_for_review"}}}
```

**Human-readable timeline (--trace t001):**
```
=== Trace: t001 (10 messages) ===

[12:00:00] [t001] oscar → radar: REQUEST search — "MCP vs A2A comparison" (web)
[12:00:01] [t001] radar → oscar: ACKNOWLEDGE Acknowledged search — ETA 60s
[12:01:00] [t001] radar → oscar: COMPLETE search — result_path: research/mcp-vs-a2a.md [deterministic]
[12:01:01] [t001] oscar → muse: DELEGATE analyze [transfer] — {"target": "content angle", "type": "competitive"} | ctx: ref: research/mcp-vs-a2a.md
[12:01:10] [t001] muse → radar: QUERY search — "Which protocol has more GitHub stars?"
[12:01:15] [t001] radar → muse: INFORM search — MCP: 42k stars, A2A: 8k stars
[12:01:20] [t001] muse → ink: DELEGATE draft [fork] — {"type": "post", "topic": "MCP vs A2A", "platform": "x"} | ctx: ref: research/mcp-vs-a2a.md
[12:01:40] [t001] ink → muse: PROGRESS draft — 50% Outline complete, writing body
[12:02:20] [t001] ink → muse: COMPLETE draft — path: drafts/x-mcp-a2a.md
[12:02:21] [t001] muse → oscar: COMPLETE draft — status: ready_for_review

=== End of trace t001 ===
```

---

## 7. CNCL Cancellation Flow

**Scenario:** Oscar cancels an in-progress search because scope changed.

```json
// Oscar sends cancel
{
  "clowl": "0.2",
  "mid": "m011",
  "ts": 1709078430,
  "tid": "t003",
  "pid": "m001",
  "p": "CNCL",
  "from": "oscar",
  "to": "radar",
  "cid": "conv-003",
  "body": { "t": "search", "d": { "reason": "Scope changed, no longer needed" } }
}
```
**→** `[2026-02-27 12:00:30 UTC] [t003] oscar → radar: CANCEL Cancel search — Scope changed, no longer needed`

```json
// Radar acknowledges the cancel
{
  "clowl": "0.2",
  "mid": "m012",
  "ts": 1709078431,
  "tid": "t003",
  "pid": "m011",
  "p": "ACK",
  "from": "radar",
  "to": "oscar",
  "cid": "conv-003",
  "body": { "t": "search", "d": { "status": "cancelled" } }
}
```
**→** `[2026-02-27 12:00:31 UTC] [t003] radar → oscar: ACKNOWLEDGE Acknowledged search (re: m011…)`

---

## 8. Context with Hash Verification

**Scenario:** Oscar delegates with a hash for immutability verification. Receiver verifies before use.

```json
{
  "clowl": "0.2",
  "mid": "m013",
  "ts": 1709078461,
  "tid": "t004",
  "pid": null,
  "p": "DLGT",
  "from": "oscar",
  "to": "muse",
  "cid": "conv-004",
  "body": {
    "t": "draft",
    "d": {
      "delegation_mode": "assist",
      "type": "post",
      "platform": "linkedin"
    }
  },
  "ctx": {
    "ref": "research/q1-trends.md",
    "inline": null,
    "hash": "3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c5d6e7f8a3b4c"
  }
}
```
**→** `[2026-02-27 12:01:01 UTC] [t004] oscar → muse: DELEGATE draft [assist] — {"type": "post", "platform": "linkedin"} | ctx: ref: research/q1-trends.md (sha256: 3b4c5d6e7f8a…)`

Muse computes `sha256(research/q1-trends.md)` and compares to the hash before using the context. If it doesn't match, Muse returns `ERR E003`.

---

## Running the Translator

```bash
# CLowl JSON → English
python translator.py '{"clowl":"0.2","mid":"m001","ts":1709078400,"tid":"t001","p":"REQ","from":"oscar","to":"radar","cid":"c001","body":{"t":"search","d":{"q":"CLowl competitors","scope":"web"}}}'

# English → CLowl JSON
python translator.py 'Oscar asks Radar to search for CLowl competitors'

# Trace reconstruction from log file
python translator.py --trace t001 --log messages.jsonl
```

---

*CLowl v0.2 Examples — Oscar Sterling Agency — MIT License*
