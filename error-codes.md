# CLowl Error Code Catalog

**Version:** 0.2
**Date:** 2026-02-27

---

## Error Message Format

```json
{
  "p": "ERR",
  "body": {
    "t": "<original_task>",
    "d": {
      "code": "E001",
      "msg": "Human-readable description",
      "retry": true,
      "cascade_err": "E007"
    }
  }
}
```

- `code`: Required. Error code from catalog below.
- `msg`: Required. Human-readable description.
- `retry`: Required. Whether sender should retry.
- `cascade_err`: Optional. Root cause error code from a downstream agent.

---

## Error Codes

| Code | Category | Meaning | Retryable | Notes |
|------|----------|---------|-----------|-------|
| E001 | Parse | Malformed CLowl message | Yes | Fix JSON and resend |
| E002 | Auth | Sender not authorized | No | Check auth token/scopes |
| E003 | Context | Referenced context not found or inaccessible | Yes | Provide valid ctx ref, or use inline fallback |
| E004 | Capacity | Agent rate-limited or at capacity | Yes | Retry after delay (respect backoff) |
| E005 | Task | Unknown task type (agent doesn't support it) | No | Check agent CAPS first |
| E006 | Timeout | Task exceeded time limit | Yes | Consider increasing timeout or simplifying task |
| E007 | Dependency | Required upstream result missing | Yes | Ensure prerequisite tasks completed |
| E008 | Validation | Task data failed validation | Yes | Fix body.d and resend |
| E009 | Internal | Unexpected internal error | Yes | Agent-side bug; retry may work |
| E010 | Delegation | No suitable agent to delegate to | No | No agent with matching capabilities available |
| E011 | Conflict | Conflicting concurrent operation | Yes | Retry after brief delay |
| E012 | Budget | Token or cost budget exceeded | No | Reduce scope or increase budget |
| E013 | Cancelled | Task was aborted via CNCL | No | Intentional cancellation |
| E014 | Version | Incompatible CLowl versions | No | Upgrade sender or receiver |
| E015 | Cycle | Delegation cycle detected | No | A -> B -> C -> A loop caught |
| E016 | Security | Security policy violation | No | Beyond auth - content/action blocked by policy |

---

## Error Cascading Convention

When an error propagates through a delegation chain, each agent wraps the downstream error:

```
audit-bot ERR:  { "code": "E007", "msg": "Disk space critical: 99% full", "retry": false }
deploy-node ERR: { "code": "E009", "msg": "Pre-flight audit failed", "retry": false, "cascade_err": "E007" }
```

The `cascade_err` field preserves the root cause without requiring upstream agents to parse nested error objects. Observability tools can reconstruct the full error lineage from trace records.

---

## Reserved Range

- E001-E016: Core protocol errors (defined above)
- E100-E199: Reserved for transport-layer errors
- E200-E299: Reserved for coordination-layer errors
- E900-E999: Application-specific errors (user-defined)
