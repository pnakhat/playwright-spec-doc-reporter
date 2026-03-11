import { describe, expect, it } from "vitest";
import { computeFlakinessScores, flakinessLevel } from "../src/utils/flakiness.js";
import type { HistoryData, RunSnapshot } from "../src/types/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRun(snapshots: Array<{ key: string; status: string }>): RunSnapshot {
  return {
    runId: Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
    passRate: 80,
    summary: { total: snapshots.length, passed: 0, failed: 0, skipped: 0, flaky: 0, durationMs: 0 },
    testSnapshots: snapshots.map(s => ({ key: s.key, status: s.status, durationMs: 100 })),
  };
}

function makeHistory(runs: RunSnapshot[]): HistoryData {
  return { schemaVersion: "1.0", runs };
}

// ---------------------------------------------------------------------------
// flakinessLevel
// ---------------------------------------------------------------------------

describe("flakinessLevel", () => {
  it("returns 'stable' for score 0", () => {
    expect(flakinessLevel(0)).toBe("stable");
  });
  it("returns 'low' for score 1–29", () => {
    expect(flakinessLevel(1)).toBe("low");
    expect(flakinessLevel(29)).toBe("low");
  });
  it("returns 'medium' for score 30–69", () => {
    expect(flakinessLevel(30)).toBe("medium");
    expect(flakinessLevel(69)).toBe("medium");
  });
  it("returns 'high' for score >= 70", () => {
    expect(flakinessLevel(70)).toBe("high");
    expect(flakinessLevel(100)).toBe("high");
  });
});

// ---------------------------------------------------------------------------
// computeFlakinessScores
// ---------------------------------------------------------------------------

describe("computeFlakinessScores", () => {
  it("returns empty object when fewer than 2 runs", () => {
    const history = makeHistory([makeRun([{ key: "file::test", status: "passed" }])]);
    expect(computeFlakinessScores(history)).toEqual({});
  });

  it("returns empty object with no runs", () => {
    expect(computeFlakinessScores(makeHistory([]))).toEqual({});
  });

  it("returns 0 score for a consistently passing test", () => {
    const history = makeHistory([
      makeRun([{ key: "a::t1", status: "passed" }]),
      makeRun([{ key: "a::t1", status: "passed" }]),
      makeRun([{ key: "a::t1", status: "passed" }]),
    ]);
    const scores = computeFlakinessScores(history);
    expect(scores["a::t1"]).toBe(0);
  });

  it("returns 0 score for a consistently failing test", () => {
    const history = makeHistory([
      makeRun([{ key: "a::t1", status: "failed" }]),
      makeRun([{ key: "a::t1", status: "failed" }]),
      makeRun([{ key: "a::t1", status: "failed" }]),
    ]);
    const scores = computeFlakinessScores(history);
    expect(scores["a::t1"]).toBe(0);
  });

  it("returns 100 score for a test that alternates every run", () => {
    const history = makeHistory([
      makeRun([{ key: "a::t1", status: "passed" }]),
      makeRun([{ key: "a::t1", status: "failed" }]),
      makeRun([{ key: "a::t1", status: "passed" }]),
    ]);
    const scores = computeFlakinessScores(history);
    // 2 transitions over 2 intervals = 100%
    expect(scores["a::t1"]).toBe(100);
  });

  it("returns 50 for a test that flips once in 3 runs", () => {
    const history = makeHistory([
      makeRun([{ key: "a::t1", status: "passed" }]),
      makeRun([{ key: "a::t1", status: "passed" }]),
      makeRun([{ key: "a::t1", status: "failed" }]),
    ]);
    const scores = computeFlakinessScores(history);
    // 1 transition over 2 intervals = 50%
    expect(scores["a::t1"]).toBe(50);
  });

  it("ignores skipped statuses when computing flakiness", () => {
    const history = makeHistory([
      makeRun([{ key: "a::t1", status: "passed" }]),
      makeRun([{ key: "a::t1", status: "skipped" }]),
      makeRun([{ key: "a::t1", status: "passed" }]),
    ]);
    const scores = computeFlakinessScores(history);
    // 2 meaningful statuses (both passed), 0 transitions → score 0
    expect(scores["a::t1"]).toBe(0);
  });

  it("handles multiple keys independently", () => {
    const history = makeHistory([
      makeRun([
        { key: "a::stable", status: "passed" },
        { key: "b::flaky", status: "passed" },
      ]),
      makeRun([
        { key: "a::stable", status: "passed" },
        { key: "b::flaky", status: "failed" },
      ]),
      makeRun([
        { key: "a::stable", status: "passed" },
        { key: "b::flaky", status: "passed" },
      ]),
    ]);
    const scores = computeFlakinessScores(history);
    expect(scores["a::stable"]).toBe(0);
    expect(scores["b::flaky"]).toBe(100);
  });

  it("respects windowSize by only looking at the last N runs", () => {
    const runs = [
      // First 5 runs: alternating (very flaky)
      makeRun([{ key: "a::t1", status: "passed" }]),
      makeRun([{ key: "a::t1", status: "failed" }]),
      makeRun([{ key: "a::t1", status: "passed" }]),
      makeRun([{ key: "a::t1", status: "failed" }]),
      makeRun([{ key: "a::t1", status: "passed" }]),
      // Last 3 runs: all passing (stable)
      makeRun([{ key: "a::t1", status: "passed" }]),
      makeRun([{ key: "a::t1", status: "passed" }]),
      makeRun([{ key: "a::t1", status: "passed" }]),
    ];
    const history = makeHistory(runs);
    const scores = computeFlakinessScores(history, 3);
    // Only the last 3 runs (all passed) → 0 transitions → score 0
    expect(scores["a::t1"]).toBe(0);
  });

  it("does not include tests with fewer than 2 meaningful statuses in result", () => {
    const history = makeHistory([
      makeRun([{ key: "a::t1", status: "skipped" }]),
      makeRun([{ key: "a::t1", status: "skipped" }]),
    ]);
    const scores = computeFlakinessScores(history);
    expect(scores["a::t1"]).toBeUndefined();
  });

  it("handles a test that appears only in some runs", () => {
    const history = makeHistory([
      makeRun([{ key: "a::t1", status: "passed" }]),
      makeRun([]),  // test not in this run
      makeRun([{ key: "a::t1", status: "failed" }]),
    ]);
    const scores = computeFlakinessScores(history);
    // 2 meaningful statuses, 1 transition → 100%
    expect(scores["a::t1"]).toBe(100);
  });
});
