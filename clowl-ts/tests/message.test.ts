import { describe, it, expect } from "vitest";
import {
  CLowlMessage,
  generateMid,
  generateCid,
  generateTid,
  createReq,
  createAck,
  createDone,
  createErr,
  createDlgt,
  createProg,
  createCaps,
  createCncl,
  createInf,
  createQry,
  CLOWL_VERSION,
} from "../src/index.js";

describe("ID Generation", () => {
  it("generateMid returns time-ordered hex IDs", () => {
    const id1 = generateMid();
    const id2 = generateMid();
    expect(id1).toMatch(/^[0-9a-f]{12}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    // Time-ordered: id2 should sort >= id1
    expect(id2 >= id1).toBe(true);
  });

  it("generateCid returns 16-char hex", () => {
    const cid = generateCid();
    expect(cid).toMatch(/^[0-9a-f]{16}$/);
  });

  it("generateTid returns t- prefixed ID", () => {
    const tid = generateTid();
    expect(tid).toMatch(/^t-[0-9a-f]{12}$/);
  });
});

describe("CLowlMessage", () => {
  const cid = "test-conv-001";
  const tid = "t-abc123def456";

  it("creates a valid message with all required fields", () => {
    const msg = new CLowlMessage("REQ", "oscar", "radar", cid, "search", { q: "test" });
    expect(msg.clowl).toBe(CLOWL_VERSION);
    expect(msg.p).toBe("REQ");
    expect(msg.from).toBe("oscar");
    expect(msg.to).toBe("radar");
    expect(msg.cid).toBe(cid);
    expect(msg.body.t).toBe("search");
    expect(msg.body.d).toEqual({ q: "test" });
    expect(msg.mid).toBeTruthy();
    expect(msg.ts).toBeGreaterThan(0);
    expect(msg.isValid()).toBe(true);
  });

  it("creates a message with optional fields", () => {
    const msg = new CLowlMessage("REQ", "oscar", "radar", cid, "search", {}, {
      tid,
      pid: "parent-123",
      auth: "token-abc",
      det: true,
      ctx: { ref: "file.md", inline: null, hash: null },
    });
    expect(msg.tid).toBe(tid);
    expect(msg.pid).toBe("parent-123");
    expect(msg.auth).toBe("token-abc");
    expect(msg.det).toBe(true);
    expect(msg.ctx).toEqual({ ref: "file.md", inline: null, hash: null });
    expect(msg.isValid()).toBe(true);
  });

  it("serializes to dict and back (round-trip)", () => {
    const msg = createReq("oscar", "radar", cid, "search", { q: "MCP vs A2A" }, { tid });
    const dict = msg.toDict();
    const msg2 = CLowlMessage.fromDict(dict);

    expect(msg2.mid).toBe(msg.mid);
    expect(msg2.ts).toBe(msg.ts);
    expect(msg2.p).toBe(msg.p);
    expect(msg2.from).toBe(msg.from);
    expect(msg2.to).toBe(msg.to);
    expect(msg2.cid).toBe(msg.cid);
    expect(msg2.body).toEqual(msg.body);
    expect(msg2.tid).toBe(msg.tid);
  });

  it("serializes to JSON and back", () => {
    const msg = createReq("oscar", "radar", cid, "search", { q: "test" });
    const json = msg.toJson();
    const msg2 = CLowlMessage.fromJson(json);
    expect(msg2.mid).toBe(msg.mid);
    expect(msg2.body).toEqual(msg.body);
  });

  it("omits optional fields from dict when not set", () => {
    const msg = createReq("oscar", "radar", cid, "search");
    const dict = msg.toDict();
    expect("tid" in dict).toBe(false);
    expect("pid" in dict).toBe(false);
    expect("ctx" in dict).toBe(false);
    expect("auth" in dict).toBe(false);
    expect("det" in dict).toBe(false);
  });

  it("includes det in dict when true", () => {
    const msg = createDone("radar", "oscar", cid, "search", {}, { det: true });
    const dict = msg.toDict();
    expect(dict.det).toBe(true);
  });

  it("toString returns a descriptive string", () => {
    const msg = createReq("oscar", "radar", cid, "search");
    expect(msg.toString()).toContain("CLowlMessage");
    expect(msg.toString()).toContain("REQ");
    expect(msg.toString()).toContain("oscar");
  });
});

describe("Validation", () => {
  it("rejects invalid performative", () => {
    const msg = new CLowlMessage("INVALID" as "REQ", "a", "b", "c", "t");
    const errors = msg.validate();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("performative"))).toBe(true);
  });

  it("rejects missing body.t", () => {
    const msg = new CLowlMessage("REQ", "a", "b", "c", "");
    const errors = msg.validate();
    expect(errors.some((e) => e.includes("body.t"))).toBe(true);
  });

  it("rejects DLGT without delegation_mode", () => {
    const msg = new CLowlMessage("DLGT", "a", "b", "c", "task", {});
    const errors = msg.validate();
    expect(errors.some((e) => e.includes("delegation_mode"))).toBe(true);
  });

  it("accepts DLGT with valid delegation_mode", () => {
    const msg = new CLowlMessage("DLGT", "a", "b", "c", "task", {
      delegation_mode: "transfer",
    });
    expect(msg.isValid()).toBe(true);
  });

  it("rejects ctx.inline over 2000 chars", () => {
    const msg = new CLowlMessage("REQ", "a", "b", "c", "task", {}, {
      ctx: { ref: null, inline: "x".repeat(2001), hash: null },
    });
    const errors = msg.validate();
    expect(errors.some((e) => e.includes("2000"))).toBe(true);
  });

  it("rejects ctx.hash that is not 64 chars", () => {
    const msg = new CLowlMessage("REQ", "a", "b", "c", "task", {}, {
      ctx: { ref: "file.md", inline: null, hash: "tooshort" },
    });
    const errors = msg.validate();
    expect(errors.some((e) => e.includes("64-char"))).toBe(true);
  });

  it("accepts valid ctx.hash of 64 chars", () => {
    const hash = "a".repeat(64);
    const msg = new CLowlMessage("REQ", "a", "b", "c", "task", {}, {
      ctx: { ref: "file.md", inline: null, hash },
    });
    expect(msg.isValid()).toBe(true);
  });
});

describe("Factory Functions", () => {
  const cid = "factory-test";

  it("createReq creates REQ message", () => {
    const msg = createReq("oscar", "radar", cid, "search", { q: "test" });
    expect(msg.p).toBe("REQ");
    expect(msg.body.t).toBe("search");
    expect(msg.isValid()).toBe(true);
  });

  it("createAck creates ACK message", () => {
    const msg = createAck("radar", "oscar", cid, "search", { eta: "30s" });
    expect(msg.p).toBe("ACK");
    expect(msg.isValid()).toBe(true);
  });

  it("createDone creates DONE message", () => {
    const msg = createDone("radar", "oscar", cid, "search", { result: "found" });
    expect(msg.p).toBe("DONE");
    expect(msg.isValid()).toBe(true);
  });

  it("createErr creates ERR message", () => {
    const msg = createErr("radar", "oscar", cid, "E003", "Context not found", true);
    expect(msg.p).toBe("ERR");
    expect(msg.body.d).toEqual({ code: "E003", msg: "Context not found", retry: true });
    expect(msg.isValid()).toBe(true);
  });

  it("createDlgt creates DLGT message with delegation_mode", () => {
    const msg = createDlgt("oscar", "muse", cid, "analyze", "fork", { target: "angle" });
    expect(msg.p).toBe("DLGT");
    expect(msg.body.d.delegation_mode).toBe("fork");
    expect(msg.body.d.target).toBe("angle");
    expect(msg.isValid()).toBe(true);
  });

  it("createDlgt throws on invalid delegation_mode", () => {
    expect(() => {
      createDlgt("oscar", "muse", cid, "analyze", "invalid" as "transfer");
    }).toThrow("delegation_mode");
  });

  it("createProg creates PROG message", () => {
    const msg = createProg("radar", "oscar", cid, "search", 50, "Halfway done");
    expect(msg.p).toBe("PROG");
    expect(msg.body.d.pct).toBe(50);
    expect(msg.body.d.note).toBe("Halfway done");
    expect(msg.isValid()).toBe(true);
  });

  it("createCaps creates CAPS message broadcasting to *", () => {
    const msg = createCaps("radar", ["search:web", "analyze:trend"]);
    expect(msg.p).toBe("CAPS");
    expect(msg.to).toBe("*");
    expect(msg.cid).toBe("system");
    expect(msg.body.d.supports).toEqual(["search:web", "analyze:trend"]);
    expect(msg.body.d.clowl).toBe(CLOWL_VERSION);
    expect(msg.isValid()).toBe(true);
  });

  it("createCncl creates CNCL message", () => {
    const msg = createCncl("oscar", "radar", cid, "search", "No longer needed");
    expect(msg.p).toBe("CNCL");
    expect(msg.body.d.reason).toBe("No longer needed");
    expect(msg.isValid()).toBe(true);
  });

  it("createInf creates INF message", () => {
    const msg = createInf("oscar", ["radar", "muse"], cid, "notify", { message: "Starting" });
    expect(msg.p).toBe("INF");
    expect(msg.to).toEqual(["radar", "muse"]);
    expect(msg.isValid()).toBe(true);
  });

  it("createQry creates QRY message", () => {
    const msg = createQry("oscar", "radar", cid, "status");
    expect(msg.p).toBe("QRY");
    expect(msg.isValid()).toBe(true);
  });
});

describe("toHuman", () => {
  it("translates REQ to human-readable", () => {
    const msg = createReq("oscar", "radar", "c1", "search", { q: "test" }, { ts: 1709078400 });
    const human = msg.toHuman();
    expect(human).toContain("oscar");
    expect(human).toContain("radar");
    expect(human).toContain("REQUEST");
    expect(human).toContain("search");
  });

  it("translates ERR with code and retry", () => {
    const msg = createErr("radar", "oscar", "c1", "E003", "Not found", true, { ts: 1709078400 });
    const human = msg.toHuman();
    expect(human).toContain("ERROR");
    expect(human).toContain("E003");
    expect(human).toContain("Not found");
    expect(human).toContain("retryable");
  });

  it("translates ACK with ETA", () => {
    const msg = createAck("radar", "oscar", "c1", "search", { eta: "60s" }, { ts: 1709078400 });
    const human = msg.toHuman();
    expect(human).toContain("ACKNOWLEDGE");
    expect(human).toContain("ETA 60s");
  });

  it("translates CAPS", () => {
    const msg = createCaps("radar", ["search:web"], { ts: 1709078400 });
    const human = msg.toHuman();
    expect(human).toContain("CAPABILITIES");
    expect(human).toContain("search:web");
  });

  it("translates DLGT with mode", () => {
    const msg = createDlgt("oscar", "muse", "c1", "analyze", "transfer", {}, { ts: 1709078400 });
    const human = msg.toHuman();
    expect(human).toContain("DELEGATE");
    expect(human).toContain("[transfer]");
  });

  it("translates PROG with percentage", () => {
    const msg = createProg("radar", "oscar", "c1", "search", 75, "Almost done", { ts: 1709078400 });
    const human = msg.toHuman();
    expect(human).toContain("PROGRESS");
    expect(human).toContain("75%");
  });

  it("includes tid, pid, det, and auth tags", () => {
    const msg = createDone("radar", "oscar", "c1", "search", {}, {
      ts: 1709078400,
      tid: "t-abc",
      pid: "parent-12345678",
      det: true,
      auth: "token",
    });
    const human = msg.toHuman();
    expect(human).toContain("[t-abc]");
    expect(human).toContain("(re: parent-1");
    expect(human).toContain("[deterministic]");
    expect(human).toContain("[authenticated]");
  });

  it("includes context ref and hash", () => {
    const hash = "abcdef1234567890".repeat(4);
    const msg = createReq("oscar", "radar", "c1", "search", {}, {
      ts: 1709078400,
      ctx: { ref: "research/file.md", inline: null, hash },
    });
    const human = msg.toHuman();
    expect(human).toContain("ctx: research/file.md");
    expect(human).toContain("sha256: abcdef123456...");
  });

  it("handles multicast to array", () => {
    const msg = createInf("oscar", ["radar", "muse", "ink"], "c1", "notify", {}, { ts: 1709078400 });
    const human = msg.toHuman();
    expect(human).toContain("[radar, muse, ink]");
  });
});
