# CLowl v0.1 - Real-World Examples

Examples from Oscar Sterling Agency workflows. Each shows CLowl JSON and its human-readable translation.

---

## 1. Oscar delegates research to Radar

```json
{"cl":"0.1","p":"REQ","from":"oscar","to":"radar","cid":"res001","body":{"t":"search","d":{"q":"AI agent token waste benchmarks 2025","scope":"web","limit":10}},"ctx":"memory/projects/clowl/"}
```
> **[Oscar → Radar] REQUEST: Search for "AI agent token waste benchmarks 2025" (context: memory/projects/clowl/)**

---

## 2. Radar acknowledges

```json
{"cl":"0.1","p":"ACK","from":"radar","to":"oscar","cid":"res001","body":{"t":"search","d":{}}}
```
> **[Radar → Oscar] ACKNOWLEDGE: Proceeding with search**

---

## 3. Radar informs Muse of findings

```json
{"cl":"0.1","p":"INF","from":"radar","to":"muse","cid":"res001","body":{"t":"summarize","d":{"findings":12,"key_stat":"29-50% token waste in multi-agent systems","sources":["arXiv:2510.26585","ACL 2025"]}},"ctx":"memory/projects/clowl/research-2026-02-27.md"}
```
> **[Radar → Muse] INFORM: Summarize research-2026-02-27.md (context: memory/projects/clowl/research-2026-02-27.md)**

---

## 4. Muse requests Ink to draft content

```json
{"cl":"0.1","p":"REQ","from":"muse","to":"ink","cid":"cont001","body":{"t":"draft","d":{"type":"post","topic":"Why your AI agents waste 40% of their tokens","platform":"linkedin","tone":"thought-leader"}},"ctx":"memory/projects/clowl/research-2026-02-27.md"}
```
> **[Muse → Ink] REQUEST: Draft post about "Why your AI agents waste 40% of their tokens" (context: memory/projects/clowl/research-2026-02-27.md)**

---

## 5. Ink completes the draft

```json
{"cl":"0.1","p":"DONE","from":"ink","to":"muse","cid":"cont001","body":{"t":"draft","d":{"path":"drafts/linkedin-token-waste.md","word_count":280,"status":"ready_for_review"}}}
```
> **[Ink → Muse] COMPLETE: Draft post about drafts/linkedin-token-waste.md**

---

## 6. Forge acknowledges a build task

```json
{"cl":"0.1","p":"ACK","from":"forge","to":"oscar","cid":"build001","body":{"t":"deploy","d":{"component":"clowl-translator","eta":"2h"}}}
```
> **[Forge → Oscar] ACKNOWLEDGE: Proceeding with deploy**

---

## 7. Shield reports an error

```json
{"cl":"0.1","p":"ERR","from":"shield","to":"oscar","cid":"audit001","body":{"t":"audit","d":{"code":"E008","msg":"Supabase table 'agents' missing RLS policy","retry":true}},"ctx":"memory/projects/clelp/security-audit.md"}
```
> **[Shield → Oscar] ERROR: [E008] Supabase table 'agents' missing RLS policy (retryable) (context: memory/projects/clelp/security-audit.md)**

---

## 8. Oscar delegates to Forge via Muse

```json
{"cl":"0.1","p":"DLGT","from":"muse","to":"forge","cid":"cont001","body":{"t":"deploy","d":{"task":"Build OG image generator for blog posts","specs":"1200x630px, dynamic title overlay"}},"ctx":"projects/clelp/app/"}
```
> **[Muse → Forge] DELEGATE: Deploy to projects/clelp/app/ (context: projects/clelp/app/)**

---

## 9. Oscar escalates to Jason

```json
{"cl":"0.1","p":"REQ","from":"oscar","to":"jason","cid":"esc001","body":{"t":"escalate","d":{"issue":"CLowl naming conflict - existing Clingo logic programming tool","severity":"medium","reason":"Potential trademark concern, need decision on name"}}}
```
> **[Oscar → Jason] REQUEST: Escalate: CLowl naming conflict - existing Clingo logic programming tool (severity: medium)**

---

## 10. Budget exceeded error

```json
{"cl":"0.1","p":"ERR","from":"radar","to":"oscar","cid":"res002","body":{"t":"search","d":{"code":"E012","msg":"Deep research query would exceed 50K token budget","retry":false}}}
```
> **[Radar → Oscar] ERROR: [E012] Deep research query would exceed 50K token budget**

---

## 11. Scheduling a recurring task

```json
{"cl":"0.1","p":"REQ","from":"oscar","to":"forge","cid":"sched001","body":{"t":"schedule","d":{"action":"audit","when":"2026-03-01T09:00:00-05:00","recurrence":"weekly"}}}
```
> **[Oscar → Forge] REQUEST: Schedule audit at 2026-03-01T09:00:00-05:00**

---

## 12. Full Pipeline: Radar → Muse → Ink

A complete content creation flow in CLowl:

```
Step 1: Oscar kicks off research
{"cl":"0.1","p":"REQ","from":"oscar","to":"radar","cid":"pipe001","body":{"t":"search","d":{"q":"MCP vs A2A protocol comparison","scope":"web"}}}

Step 2: Radar delivers findings
{"cl":"0.1","p":"DONE","from":"radar","to":"oscar","cid":"pipe001","body":{"t":"search","d":{"result_path":"memory/research/mcp-vs-a2a.md","sources":8}}}

Step 3: Oscar delegates to Muse for strategy
{"cl":"0.1","p":"DLGT","from":"oscar","to":"muse","cid":"pipe001","body":{"t":"analyze","d":{"target":"content angle for MCP vs A2A","type":"competitive"}},"ctx":"memory/research/mcp-vs-a2a.md"}

Step 4: Muse delegates to Ink for writing
{"cl":"0.1","p":"DLGT","from":"muse","to":"ink","cid":"pipe001","body":{"t":"draft","d":{"type":"post","topic":"MCP vs A2A: What developers actually need to know","platform":"x","tone":"builder"}},"ctx":"memory/research/mcp-vs-a2a.md"}

Step 5: Ink completes
{"cl":"0.1","p":"DONE","from":"ink","to":"muse","cid":"pipe001","body":{"t":"draft","d":{"path":"drafts/x-mcp-a2a.md","word_count":240}}}

Step 6: Muse confirms to Oscar
{"cl":"0.1","p":"DONE","from":"muse","to":"oscar","cid":"pipe001","body":{"t":"draft","d":{"path":"drafts/x-mcp-a2a.md","status":"ready_for_review"}}}
```

**Human-readable translation of the full pipeline:**
```
[Oscar → Radar]  REQUEST: Search for "MCP vs A2A protocol comparison"
[Radar → Oscar]  COMPLETE: Search results at memory/research/mcp-vs-a2a.md (8 sources)
[Oscar → Muse]   DELEGATE: Analyze content angle for MCP vs A2A (context: memory/research/mcp-vs-a2a.md)
[Muse → Ink]     DELEGATE: Draft X post about "MCP vs A2A: What developers actually need to know"
[Ink → Muse]     COMPLETE: Draft at drafts/x-mcp-a2a.md (240 words)
[Muse → Oscar]   COMPLETE: Draft ready for review at drafts/x-mcp-a2a.md
```

**Token comparison:**
- This 6-message pipeline in CLowl: ~600 tokens
- Same pipeline in natural language: ~1,800+ tokens
- Savings: ~67%

---

*CLowl v0.1 - Oscar Sterling Agency*
