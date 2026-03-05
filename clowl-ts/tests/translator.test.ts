import { describe, it, expect } from "vitest";
import {
  translateToHuman,
  translateJsonToHuman,
  translateBatch,
  translateTrace,
  translateConversation,
  parseJsonl,
  createReq,
  createAck,
  createDone,
  createErr,
  type CLowlMessageData,
} from "../src/index.js";

const baseTs = 1709078400;

function makeReqData(overrides: Partial<CLowlMessageData> = {}): CLowlMessageData {
  return {
    clowl: "0.2",
    mid: "m001",
    ts: baseTs,
    p: "REQ",
    from: "oscar",
    to: "radar",
    cid: "conv-001",
    body: { t: "search", d: { q: "MCP vs A2A" } },
    ...overrides,
  };
}

describe("translateToHuman", () => {
  it("translates a CLowl message data object to English", () => {
    const result = translateToHuman(makeReqData());
    expect(result).toContain("oscar");
    expect(result).toContain("radar");
    expect(result).toContain("REQUEST");
    expect(result).toContain("search");
  });

  it("handles ERR messages", () => {
    const data = makeReqData({
      p: "ERR",
      body: { t: "error", d: { code: "E003", msg: "Not found", retry: true } },
    });
    const result = translateToHuman(data);
    expect(result).toContain("ERROR");
    expect(result).toContain("E003");
    expect(result).toContain("retryable");
  });
});

describe("translateJsonToHuman", () => {
  it("translates a JSON string to English", () => {
    const json = JSON.stringify(makeReqData());
    const result = translateJsonToHuman(json);
    expect(result).toContain("REQUEST");
    expect(result).toContain("oscar");
  });
});

describe("translateBatch", () => {
  it("translates multiple messages sorted by timestamp", () => {
    const messages: CLowlMessageData[] = [
      makeReqData({ ts: baseTs + 10, mid: "m003", p: "DONE", body: { t: "search", d: {} } }),
      makeReqData({ ts: baseTs, mid: "m001" }),
      makeReqData({ ts: baseTs + 5, mid: "m002", p: "ACK", body: { t: "search", d: { eta: "30s" } } }),
    ];

    const results = translateBatch(messages);
    expect(results).toHaveLength(3);
    // First result should be the earliest timestamp (m001)
    expect(results[0]).toContain("REQUEST");
    expect(results[1]).toContain("ACKNOWLEDGE");
    expect(results[2]).toContain("COMPLETE");
  });
});

describe("translateTrace", () => {
  it("filters and translates messages by trace ID", () => {
    const messages: CLowlMessageData[] = [
      makeReqData({ tid: "t-001", mid: "m001", ts: baseTs }),
      makeReqData({ tid: "t-002", mid: "m002", ts: baseTs + 1 }),
      makeReqData({ tid: "t-001", mid: "m003", ts: baseTs + 2, p: "ACK", body: { t: "search", d: {} } }),
    ];

    const result = translateTrace(messages, "t-001");
    expect(result).toContain("Trace: t-001 (2 messages)");
    expect(result).toContain("REQUEST");
    expect(result).toContain("ACKNOWLEDGE");
    expect(result).not.toContain("m002");
  });

  it("returns not-found message for missing trace", () => {
    const result = translateTrace([], "t-missing");
    expect(result).toContain("No messages found");
  });
});

describe("translateConversation", () => {
  it("filters and translates messages by conversation ID", () => {
    const messages: CLowlMessageData[] = [
      makeReqData({ cid: "conv-001", mid: "m001", ts: baseTs }),
      makeReqData({ cid: "conv-002", mid: "m002", ts: baseTs + 1 }),
      makeReqData({ cid: "conv-001", mid: "m003", ts: baseTs + 2, p: "DONE", body: { t: "search", d: {} } }),
    ];

    const result = translateConversation(messages, "conv-001");
    expect(result).toContain("Conversation: conv-001 (2 messages)");
    expect(result).toContain("REQUEST");
    expect(result).toContain("COMPLETE");
  });

  it("returns not-found message for missing conversation", () => {
    const result = translateConversation([], "conv-missing");
    expect(result).toContain("No messages found");
  });
});

describe("parseJsonl", () => {
  it("parses newline-delimited JSON into message data", () => {
    const lines = [
      JSON.stringify(makeReqData({ mid: "m001" })),
      JSON.stringify(makeReqData({ mid: "m002", p: "ACK", body: { t: "search", d: {} } })),
    ].join("\n");

    const messages = parseJsonl(lines);
    expect(messages).toHaveLength(2);
    expect(messages[0].mid).toBe("m001");
    expect(messages[1].mid).toBe("m002");
  });

  it("skips malformed lines", () => {
    const lines = [
      JSON.stringify(makeReqData()),
      "not valid json",
      "{}",
      JSON.stringify(makeReqData({ mid: "m002" })),
    ].join("\n");

    const messages = parseJsonl(lines);
    expect(messages).toHaveLength(2);
  });

  it("handles empty input", () => {
    expect(parseJsonl("")).toHaveLength(0);
    expect(parseJsonl("\n\n")).toHaveLength(0);
  });
});

describe("End-to-end translation", () => {
  it("matches Python library output format", () => {
    const req = createReq("oscar", "radar", "c1", "search", { q: "MCP vs A2A" }, {
      ts: 1709078400,
      tid: "t-001",
    });
    const human = req.toHuman();

    // Should match Python format: [timestamp] [tid] from > to: PERFORMATIVE detail
    expect(human).toMatch(/^\[.+UTC\]/);
    expect(human).toContain("[t-001]");
    expect(human).toContain("oscar");
    expect(human).toContain("radar");
    expect(human).toContain("REQUEST");
  });
});
