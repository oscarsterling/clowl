# CLowl TypeScript Library

A structured communication language for AI agent-to-agent messaging. Zero runtime dependencies, full TypeScript types.

## Install

```bash
npm install clowl
```

## Quick Start

```typescript
import { createReq, createDone, generateCid, generateTid } from "clowl";

const cid = generateCid();
const tid = generateTid();

// Create a request
const req = createReq("oscar", "radar", cid, "search", { q: "MCP vs A2A" }, { tid });
console.log(req.toHuman());
// [2026-02-27 12:00:00 UTC] [t-abc123] oscar > radar: REQUEST search - {"q":"MCP vs A2A"}

// Create a completion
const done = createDone("radar", "oscar", cid, "search", { results: 8 }, { tid, pid: req.mid });
console.log(done.toHuman());
```

## Features

- All 10 CLowl v0.2 performatives: REQ, INF, ACK, ERR, DLGT, DONE, CNCL, QRY, PROG, CAPS
- Message creation, validation, and serialization
- Human-readable English translation
- Conversation state machine (9 states, 11 events)
- UUIDv7-style time-ordered message IDs
- Trace ID propagation
- JSON Schema validation
- Zero runtime dependencies
- Full TypeScript types (no `any`)

## API

### Message Creation

```typescript
import {
  createReq,   // Request
  createAck,   // Acknowledge
  createDone,  // Complete
  createErr,   // Error
  createDlgt,  // Delegate
  createProg,  // Progress
  createCaps,  // Capabilities
  createCncl,  // Cancel
  createInf,   // Inform
  createQry,   // Query
} from "clowl";
```

### State Machine

```typescript
import { ConversationTracker } from "clowl";

const tracker = new ConversationTracker("conv-001");
tracker.apply("SEND_REQ");   // IDLE -> REQUESTED
tracker.apply("RECV_ACK");   // REQUESTED -> ACKNOWLEDGED
tracker.apply("RECV_DONE");  // ACKNOWLEDGED -> COMPLETED
console.log(tracker.isTerminal); // true
```

### Translator

```typescript
import { translateToHuman, translateTrace, parseJsonl } from "clowl";

// Single message
const human = translateToHuman(messageData);

// Full trace timeline
const messages = parseJsonl(logFileContent);
const timeline = translateTrace(messages, "t-abc123");
```

### Schema Validation

```typescript
import { validateSchema } from "clowl";

const result = validateSchema(unknownData);
if (!result.valid) {
  console.error(result.errors);
}
```

## License

MIT - Oscar Sterling Agency

Full spec: [clowl.dev](https://clowl.dev)
