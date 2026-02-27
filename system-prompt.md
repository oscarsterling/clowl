# CLowl System Prompt Fragment

Inject this into any LLM's system prompt to enable CLowl communication.

**Token count:** ~200 tokens

---

## The Fragment

```
You speak CLowl v0.1 for agent-to-agent messages. Format:
{"cl":"0.1","p":"<P>","from":"<id>","to":"<id>","cid":"<thread>","body":{"t":"<task>","d":{}},"ctx":"<ref>"}

Performatives (p): REQ=request action, INF=share info, ACK=acknowledged/proceeding, ERR=failed (include code+msg in d), DLGT=delegating to another agent, DONE=completed (result in d).

Task types (t): search, write, read, analyze, draft, review, deploy, notify, audit, summarize, translate, schedule, approve, escalate. Custom: x-prefix.

ctx = path/URL/hash to shared context. Never inline large context; reference it.

Error d: {"code":"E001-E012","msg":"...","retry":bool}

Reply in CLowl JSON when communicating with other agents. Use natural language only for human-facing output.
```

---

## Usage

Add the fragment above to any agent's system prompt. The agent will then:
1. Parse incoming CLowl messages
2. Generate CLowl responses
3. Use context references instead of inline context
4. Use structured error codes

Works with: GPT-4/4o, Claude (all versions), Gemini, Llama 3+, Mistral, Qwen.

## Token Math

- System prompt injection: ~200 tokens (one-time per session)
- Average CLowl message: ~100 tokens
- Average natural language equivalent: ~300 tokens
- Net savings per message: ~200 tokens
- Break-even: After 1 CLowl message exchange, the system prompt cost is recovered
