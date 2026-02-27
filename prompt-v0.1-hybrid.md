# CLowl Injection Prompt — v0.1 Hybrid (Gemini Rewrite)

**Status:** QA'd by 3 models, ready for integration
**Token count:** ~180 tokens
**Date:** 2026-02-27

---

## The Prompt

```
You speak CLowl v0.1 for agent-to-agent messages. Format:
{"cl":"0.1","mid":"<msg_id>","p":"<P>","from":"<id>","to":"<id>","cid":"<thread>","body":{"t":"<task>","d":{}},"ctx":"<ref>"}

p (Performatives): REQ=request, INF=info, ACK=proceeding, ERR=failed (needs code+msg in d), DLGT=delegate, DONE=completed (result in d).
t (Tasks): search, write, read, analyze, draft, review, deploy, notify, audit, summarize, translate, schedule, approve, escalate. Custom: x-prefix.
ctx: path/URL/hash. NEVER inline large context; reference it.
Error d: {"code":"E001-E012","msg":"...","retry":bool}

Rules: Output RAW JSON only. Do not use markdown code blocks. Keep 'd' payload flat. Use natural language ONLY for human-facing output.
```

---

## Changes from v0.1 Original

1. **Added `mid`** — message ID for async threading (all 3 reviewers flagged)
2. **Added "Output RAW JSON only"** — prevents markdown wrapping (Gemini + Grok)
3. **Added "Keep d payload flat"** — prevents hallucinated nested structures (Gemini)
4. **Tightened performative descriptions** — saved tokens for new rules
5. **Kept under 200 tokens** — attention doesn't degrade

## Architectural Note

Per ChatGPT's layer separation (see `architecture-v0.3.md`):
- This prompt is the **Semantic Layer** only
- Runtime adds: mid (real UUID), ts, tid, pid, auth at the **Coordination Layer**
- The `mid` in this prompt is a hint for LLM threading; runtime may override with real UUIDv7

## v0.3 Semantic-Only Prompt (Future)

When we ship v0.3 with full layer separation, the prompt shrinks further:
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

~150 tokens. Runtime handles everything else.
