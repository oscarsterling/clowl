/**
 * CLowl TS conformance runner (OSA-1153 items 3 + 1).
 * Loads fixtures/conformance-cases.json, asserts the strict and lenient
 * expected_verdict per case (plus expected_coercions when present), and writes
 * fixtures/.verdicts/ts.json ({strict, lenient} per case) for the divergence gate.
 */
import { describe, it, expect, afterAll } from "vitest";
import { CLowlMessage } from "../src/index.js";
import type { CoercionWarning } from "../src/index.js";
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
  expected_lenient_verdict?: Verdict;
  expected_coercions?: CoercionWarning[];
  input: unknown;
  expected_roundtrip?: unknown;
}

interface FixtureFile {
  _meta: unknown;
  cases: ConformanceCase[];
}

const fixture: FixtureFile = JSON.parse(readFileSync(fixturesPath, "utf8"));
const verdicts: Record<string, { strict: Verdict; lenient: Verdict }> = {};

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

interface Evaluated {
  verdict: Verdict;
  warnings: CoercionWarning[];
}

function evaluate(kase: ConformanceCase, lenient: boolean): Evaluated {
  try {
    const msg = lenient
      ? CLowlMessage.parseLenient(kase.input as any)
      : CLowlMessage.fromDict(kase.input as any);
    const warnings = msg.coercionWarnings;
    const valid = msg.isValid();
    if (kase.class === "roundtrip") {
      if (!valid) return { verdict: "invalid", warnings };
      return {
        verdict: deepEqual(msg.toDict(), kase.expected_roundtrip)
          ? "roundtrip_ok"
          : "roundtrip_mismatch",
        warnings,
      };
    }
    return { verdict: valid ? "valid" : "invalid", warnings };
  } catch {
    return { verdict: "invalid", warnings: [] };
  }
}

/** Order-independent normalization of coercion warnings for comparison. */
function normWarnings(ws: CoercionWarning[]): CoercionWarning[] {
  return [...ws]
    .map((w) => ({ field: w.field, original: w.original, coerced: w.coerced, reason: w.reason }))
    .sort((a, b) => (a.field + "|" + a.reason).localeCompare(b.field + "|" + b.reason));
}

function record(kase: ConformanceCase): void {
  verdicts[kase.id] = {
    strict: evaluate(kase, false).verdict,
    lenient: evaluate(kase, true).verdict,
  };
}

describe("CLowl conformance (fixtures/conformance-cases.json)", () => {
  for (const kase of fixture.cases) {
    it(`${kase.id} (${kase.class}) strict => ${kase.expected_verdict}`, () => {
      const { verdict } = evaluate(kase, false);
      expect(verdict).toBe(kase.expected_verdict);
    });

    const expectedLenient = kase.expected_lenient_verdict ?? kase.expected_verdict;
    it(`${kase.id} (${kase.class}) lenient => ${expectedLenient}`, () => {
      const { verdict, warnings } = evaluate(kase, true);
      expect(verdict).toBe(expectedLenient);
      if (kase.expected_coercions) {
        expect(normWarnings(warnings)).toEqual(normWarnings(kase.expected_coercions));
      }
    });
  }

  afterAll(() => {
    for (const kase of fixture.cases) {
      if (!(kase.id in verdicts)) record(kase);
    }
    // Ensure every case is recorded regardless of per-test failures.
    for (const kase of fixture.cases) record(kase);
    const outDir = resolve(repoRoot, "fixtures", ".verdicts");
    mkdirSync(outDir, { recursive: true });
    const outPath = resolve(outDir, "ts.json");
    writeFileSync(outPath, JSON.stringify(verdicts, null, 2) + "\n", "utf8");
  });
});
