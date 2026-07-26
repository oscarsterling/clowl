/**
 * CLowl TS conformance runner (OSA-1153 item 3).
 * Loads fixtures/conformance-cases.json, asserts expected_verdict per case,
 * and writes fixtures/.verdicts/ts.json for the divergence gate.
 */
import { describe, it, expect, afterAll } from "vitest";
import { CLowlMessage } from "../src/index.js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const fixturesPath = resolve(repoRoot, "fixtures", "conformance-cases.json");

type Verdict = "valid" | "invalid" | "roundtrip_ok" | "roundtrip_mismatch";

interface ConformanceCase {
  id: string;
  class: "valid" | "invalid" | "coercible" | "roundtrip";
  expected_verdict: Verdict;
  input: unknown;
  expected_roundtrip?: unknown;
  expected_coercion?: unknown;
}

interface FixtureFile {
  _meta: unknown;
  cases: ConformanceCase[];
}

const fixture: FixtureFile = JSON.parse(readFileSync(fixturesPath, "utf8"));
const verdicts: Record<string, Verdict> = {};

/** Recursive deep equality for roundtrip compare (key order independent). */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return a === b;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bObj, key)) return false;
    if (!deepEqual(aObj[key], bObj[key])) return false;
  }
  return true;
}

function computeVerdict(kase: ConformanceCase): Verdict {
  try {
    const msg = CLowlMessage.fromDict(kase.input as any);
    const valid = msg.isValid();

    if (kase.class === "roundtrip") {
      if (!valid) return "invalid";
      const dict = msg.toDict();
      return deepEqual(dict, kase.expected_roundtrip)
        ? "roundtrip_ok"
        : "roundtrip_mismatch";
    }

    // valid | invalid | coercible
    return valid ? "valid" : "invalid";
  } catch {
    return "invalid";
  }
}

describe("CLowl conformance (fixtures/conformance-cases.json)", () => {
  for (const kase of fixture.cases) {
    it(`${kase.id} (${kase.class}) => ${kase.expected_verdict}`, () => {
      const verdict = computeVerdict(kase);
      verdicts[kase.id] = verdict;
      expect(verdict).toBe(kase.expected_verdict);
    });
  }

  afterAll(() => {
    // Ensure every case has a recorded verdict even if some its failed early.
    for (const kase of fixture.cases) {
      if (!(kase.id in verdicts)) {
        verdicts[kase.id] = computeVerdict(kase);
      }
    }
    const outDir = resolve(repoRoot, "fixtures", ".verdicts");
    mkdirSync(outDir, { recursive: true });
    const outPath = resolve(outDir, "ts.json");
    writeFileSync(outPath, JSON.stringify(verdicts, null, 2) + "\n", "utf8");
  });
});
