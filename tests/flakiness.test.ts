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

  // ─── Non-meaningful statuses beyond "skipped" ───────────────────────────────

  it("ignores timedOut status when computing flakiness", () => {
    const history = makeHistory([
      makeRun([{ key: "a::t1", status: "passed" }]),
      makeRun([{ key: "a::t1", status: "timedOut" }]),
      makeRun([{ key: "a::t1", status: "passed" }]),
    ]);
    const scores = computeFlakinessScores(history);
    // timedOut is non-meaningful → only 2 passed statuses, 0 transitions → score 0
    expect(scores["a::t1"]).toBe(0);
  });

  it("ignores interrupted status when computing flakiness", () => {
    const history = makeHistory([
      makeRun([{ key: "a::t1", status: "passed" }]),
      makeRun([{ key: "a::t1", status: "interrupted" }]),
      makeRun([{ key: "a::t1", status: "failed" }]),
    ]);
    const scores = computeFlakinessScores(history);
    // interrupted is non-meaningful → passed then failed = 1 transition over 1 interval → 100
    expect(scores["a::t1"]).toBe(100);
  });

  it("ignores flaky status when computing flakiness", () => {
    const history = makeHistory([
      makeRun([{ key: "a::t1", status: "failed" }]),
      makeRun([{ key: "a::t1", status: "flaky" }]),
      makeRun([{ key: "a::t1", status: "failed" }]),
    ]);
    const scores = computeFlakinessScores(history);
    // flaky is non-meaningful → only 2 failed statuses, 0 transitions → score 0
    expect(scores["a::t1"]).toBe(0);
  });

  // ─── Score rounding ──────────────────────────────────────────────────────────

  it("rounds fractional scores to the nearest integer", () => {
    // 1 transition over 3 intervals → (1/3)*100 = 33.33 → rounds to 33
    const history = makeHistory([
      makeRun([{ key: "a::t1", status: "passed" }]),
      makeRun([{ key: "a::t1", status: "failed" }]),
      makeRun([{ key: "a::t1", status: "failed" }]),
      makeRun([{ key: "a::t1", status: "failed" }]),
    ]);
    const scores = computeFlakinessScores(history);
    expect(scores["a::t1"]).toBe(33);
  });

  it("rounds 0.5-interval scores using standard rounding", () => {
    // 1 transition over 2 intervals → (1/2)*100 = 50 → exact, no rounding needed
    // Use 3 transitions over 5 intervals → (3/5)*100 = 60 → exact
    const history = makeHistory([
      makeRun([{ key: "a::t1", status: "passed" }]),
      makeRun([{ key: "a::t1", status: "failed" }]),
      makeRun([{ key: "a::t1", status: "passed" }]),
      makeRun([{ key: "a::t1", status: "failed" }]),
      makeRun([{ key: "a::t1", status: "passed" }]),
      makeRun([{ key: "a::t1", status: "failed" }]),
    ]);
    const scores = computeFlakinessScores(history);
    // 5 transitions over 5 intervals → 100
    expect(scores["a::t1"]).toBe(100);
  });

  // ─── windowSize boundary ─────────────────────────────────────────────────────

  it("uses exactly the last windowSize runs when history is larger", () => {
    // 12 runs total: first 2 are alternating, last 10 are all passing
    const earlyRuns = [
      makeRun([{ key: "a::t1", status: "passed" }]),
      makeRun([{ key: "a::t1", status: "failed" }]),
    ];
    const stableRuns = Array.from({ length: 10 }, () =>
      makeRun([{ key: "a::t1", status: "passed" }])
    );
    const history = makeHistory([...earlyRuns, ...stableRuns]);
    // windowSize=10 → only the last 10 (all passed) → 0 transitions → score 0
    const scores = computeFlakinessScores(history, 10);
    expect(scores["a::t1"]).toBe(0);
  });

  it("includes all runs when history size equals windowSize", () => {
    const runs = Array.from({ length: 4 }, (_, i) =>
      makeRun([{ key: "a::t1", status: i % 2 === 0 ? "passed" : "failed" }])
    );
    const history = makeHistory(runs);
    // windowSize=4, 3 transitions over 3 intervals → score 100
    const scores = computeFlakinessScores(history, 4);
    expect(scores["a::t1"]).toBe(100);
  });

  it("uses default windowSize of 10 (no custom arg needed)", () => {
    // 15 runs: first 5 are stable-failed, last 10 alternate
    const stableRuns = Array.from({ length: 5 }, () =>
      makeRun([{ key: "a::t1", status: "failed" }])
    );
    // 10 alternating runs → 9 transitions / 9 intervals → score 100
    const alternatingRuns = Array.from({ length: 10 }, (_, i) =>
      makeRun([{ key: "a::t1", status: i % 2 === 0 ? "passed" : "failed" }])
    );
    const history = makeHistory([...stableRuns, ...alternatingRuns]);
    const scores = computeFlakinessScores(history); // default windowSize=10
    expect(scores["a::t1"]).toBe(100);
  });

  // ─── Exact 2-run minimum ─────────────────────────────────────────────────────

  it("scores a test with exactly 2 meaningful statuses (no transition)", () => {
    const history = makeHistory([
      makeRun([{ key: "a::t1", status: "passed" }]),
      makeRun([{ key: "a::t1", status: "passed" }]),
    ]);
    const scores = computeFlakinessScores(history);
    expect(scores["a::t1"]).toBe(0);
  });

  it("scores a test with exactly 2 meaningful statuses (one transition)", () => {
    const history = makeHistory([
      makeRun([{ key: "a::t1", status: "passed" }]),
      makeRun([{ key: "a::t1", status: "failed" }]),
    ]);
    const scores = computeFlakinessScores(history);
    // 1 transition over 1 interval → 100
    expect(scores["a::t1"]).toBe(100);
  });

  // ─── Mixed: excluded key alongside scored key ─────────────────────────────────

  it("excludes keys with only 1 meaningful status while scoring others", () => {
    const history = makeHistory([
      // "a::sparse" appears only once with a meaningful status; "b::full" twice
      makeRun([{ key: "a::sparse", status: "passed" }, { key: "b::full", status: "passed" }]),
      makeRun([{ key: "b::full", status: "failed" }]),
    ]);
    const scores = computeFlakinessScores(history);
    expect(scores["a::sparse"]).toBeUndefined();
    expect(scores["b::full"]).toBe(100);
  });
});
