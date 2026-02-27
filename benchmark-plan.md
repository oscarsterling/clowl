# CLowl Benchmark Plan

**Goal:** Measure actual token savings when using CLowl vs natural language for agent-to-agent communication.  
**Target:** 29-50% minimum compression (based on research baselines).

---

## 5 Workflows to Benchmark

### 1. Content Pipeline (Radar → Muse → Ink)
- **Task:** Research a topic, create content strategy, draft a LinkedIn post
- **Agents:** 3 (Radar, Muse, Ink)
- **Messages:** ~6-8 inter-agent exchanges
- **Why:** Our most common workflow. High context passing.

### 2. Security Audit (Oscar → Shield → Oscar)
- **Task:** Audit a Supabase table for RLS policies
- **Agents:** 2 (Oscar, Shield)
- **Messages:** ~4 (request, ack, findings, done)
- **Why:** Error reporting is a key CLowl feature. Tests ERR performative.

### 3. Research Delegation (Oscar → Radar → Oscar)
- **Task:** Web search with synthesis and summary
- **Agents:** 2 (Oscar, Radar)
- **Messages:** ~3-4
- **Why:** Tests context referencing. Radar's results are large - ctx reference vs inline.

### 4. Code Deploy (Oscar → Forge → Oscar)
- **Task:** Deploy a Vercel project with pre-deploy checks
- **Agents:** 2 (Oscar, Forge)
- **Messages:** ~5 (request, ack, status updates, done)
- **Why:** Tests sequential ACK/status pattern.

### 5. Multi-Agent Escalation (Radar → Oscar → Jason)
- **Task:** Radar finds a problem, Oscar evaluates severity, escalates to Jason
- **Agents:** 3 (Radar, Oscar, Jason)
- **Messages:** ~4
- **Why:** Tests DLGT and escalate task type. Real delegation chain.

---

## Measurement Method

For each workflow, run twice:

### A. Baseline (Natural Language)
- Agents communicate in plain English
- Full context passed inline in messages
- Count tokens using `tiktoken` (cl100k_base encoding)
- Measure: total prompt tokens, completion tokens, wall-clock time

### B. CLowl
- Agents communicate using CLowl v0.1 messages
- Context passed by reference (ctx field)
- Same token counting method
- Measure: same metrics + system prompt overhead (one-time ~200 tokens)

### Metrics Per Workflow

| Metric | How |
|--------|-----|
| **Prompt tokens** | tiktoken count of all input tokens across all agents |
| **Completion tokens** | tiktoken count of all output tokens |
| **Total tokens** | Prompt + completion |
| **Compression ratio** | 1 - (CLowl total / baseline total) |
| **Context tokens saved** | Tokens NOT passed inline due to ctx referencing |
| **Accuracy** | Did the task complete correctly? (binary + quality score 1-5) |
| **Latency** | Wall-clock time from first message to final DONE |

### Measurement Script

```python
import tiktoken

enc = tiktoken.get_encoding("cl100k_base")

def count_tokens(messages: list[str]) -> int:
    return sum(len(enc.encode(m)) for m in messages)

# Compare
baseline_tokens = count_tokens(baseline_messages)
clowl_tokens = count_tokens(clowl_messages)
savings = 1 - (clowl_tokens / baseline_tokens)
print(f"Compression: {savings:.1%}")
```

---

## Expected Results

| Workflow | Baseline (est.) | CLowl (est.) | Savings (est.) |
|----------|-----------------|---------------|----------------|
| Content Pipeline | ~1,800 tokens | ~600 tokens | ~67% |
| Security Audit | ~800 tokens | ~350 tokens | ~56% |
| Research Delegation | ~2,500 tokens | ~900 tokens | ~64% |
| Code Deploy | ~1,000 tokens | ~450 tokens | ~55% |
| Multi-Agent Escalation | ~1,200 tokens | ~500 tokens | ~58% |

**Conservative target: 40% average compression across all workflows.**

Note: These estimates exclude context tokens. With ctx referencing (avoiding inline context), savings could be dramatically higher for context-heavy workflows - potentially 80%+ for research tasks where Radar's full brief would otherwise be inlined.

---

## Timeline

| Week | Activity |
|------|----------|
| Week 1 (Mar 3-7) | Set up measurement harness. Run Workflow 1 baseline. |
| Week 2 (Mar 10-14) | Run all 5 workflows baseline + CLowl. Collect data. |
| Week 3 (Mar 17-21) | Analyze results. Write benchmark report. |
| Week 4 (Mar 24-28) | Iterate on spec based on findings. Publish results. |

---

## Success Criteria

- **Minimum:** 29% average token reduction (matches SupervisorAgent baseline)
- **Target:** 50% average token reduction
- **Stretch:** 65%+ with context referencing
- **Hard requirement:** Zero accuracy degradation. CLowl messages must be parsed correctly 100% of the time.

---

*Plan authored by Forge, 2026-02-27*
