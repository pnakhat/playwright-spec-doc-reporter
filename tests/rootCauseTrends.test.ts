import { describe, expect, it } from "vitest";
import {
  aggregateRootCauseTrends,
  buildTestSnapshots,
  resolveIssueCategories,
} from "../src/utils/rootCauseTrends.js";
import type {
  AIAnalysisResult,
  HistoryData,
  NormalizedTestResult,
  RunSnapshot,
} from "../src/types/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTest(overrides: Partial<NormalizedTestResult> = {}): NormalizedTestResult {
  return {
    id: overrides.id ?? "id",
    suite: "suite",
    file: "a.spec.ts",
    title: "does a thing",
    fullName: "suite > does a thing",
    status: "failed",
    expectedStatus: "passed",
    flaky: false,
    retries: 0,
    retryIndex: 0,
    durationMs: 100,
    attachments: [],
    artifacts: { screenshots: [], videos: [], traces: [] },
    consoleLogs: [],
    tags: [],
    steps: [],
    ...overrides,
  };
}

function makeAnalysis(overrides: Partial<AIAnalysisResult> = {}): AIAnalysisResult {
  return {
    testName: "suite > does a thing",
    file: "a.spec.ts",
    summary: "summary",
    likelyRootCause: "root cause",
    confidence: 0.9,
    suggestedRemediation: "fix it",
    issueCategory: "locator_drift",
    structuredFeedback: { actionType: "locator_update", reasoning: "reasoning" },
    ...overrides,
  };
}

function makeRun(
  snapshots: Array<{ key: string; status: string; issueCategory?: string }>
): RunSnapshot {
  return {
    runId: Math.random().toString(36).slice(2),
    timestamp: new Date().toISOString(),
    passRate: 80,
    summary: { total: snapshots.length, passed: 0, failed: 0, skipped: 0, flaky: 0, durationMs: 0 },
    testSnapshots: snapshots.map(s => ({
      key: s.key,
      status: s.status,
      durationMs: 100,
      issueCategory: s.issueCategory as any,
    })),
  };
}

function makeHistory(runs: RunSnapshot[]): HistoryData {
  return { schemaVersion: "1.0", runs };
}

// ---------------------------------------------------------------------------
// resolveIssueCategories
// ---------------------------------------------------------------------------

describe("resolveIssueCategories", () => {
  it("joins by file+testName (fullName), not title", () => {
    const analyses = [makeAnalysis({ file: "a.spec.ts", testName: "suite > does a thing" })];
    const map = resolveIssueCategories(analyses);
    expect(map.get("a.spec.ts::suite > does a thing")).toBe("locator_drift");
    expect(map.get("a.spec.ts::does a thing")).toBeUndefined();
  });

  it("excludes fallback analyses with confidence 0", () => {
    const analyses = [makeAnalysis({ confidence: 0, issueCategory: "unknown" })];
    const map = resolveIssueCategories(analyses);
    expect(map.size).toBe(0);
  });

  it("includes a genuine 'unknown' category when confidence > 0", () => {
    const analyses = [makeAnalysis({ confidence: 0.4, issueCategory: "unknown" })];
    const map = resolveIssueCategories(analyses);
    expect(map.get("a.spec.ts::suite > does a thing")).toBe("unknown");
  });

  it("last analysis wins when multiple share the same file+testName (retries)", () => {
    const analyses = [
      makeAnalysis({ issueCategory: "timing_issue" }),
      makeAnalysis({ issueCategory: "app_bug" }),
    ];
    const map = resolveIssueCategories(analyses);
    expect(map.get("a.spec.ts::suite > does a thing")).toBe("app_bug");
  });
});

// ---------------------------------------------------------------------------
// buildTestSnapshots
// ---------------------------------------------------------------------------

describe("buildTestSnapshots", () => {
  it("attaches issueCategory only to failed/timedOut tests", () => {
    const tests = [
      makeTest({ file: "a.spec.ts", title: "fails", fullName: "s > fails", status: "failed" }),
      makeTest({ file: "a.spec.ts", title: "passes", fullName: "s > passes", status: "passed" }),
      makeTest({ file: "a.spec.ts", title: "times out", fullName: "s > times out", status: "timedOut" }),
      makeTest({ file: "a.spec.ts", title: "skips", fullName: "s > skips", status: "skipped" }),
    ];
    const analyses = [
      makeAnalysis({ file: "a.spec.ts", testName: "s > fails", issueCategory: "app_bug" }),
      makeAnalysis({ file: "a.spec.ts", testName: "s > passes", issueCategory: "app_bug" }),
      makeAnalysis({ file: "a.spec.ts", testName: "s > times out", issueCategory: "timing_issue" }),
      makeAnalysis({ file: "a.spec.ts", testName: "s > skips", issueCategory: "app_bug" }),
    ];
    const snapshots = buildTestSnapshots(tests, analyses);
    const byKey = Object.fromEntries(snapshots.map(s => [s.key, s.issueCategory]));
    expect(byKey["a.spec.ts::fails"]).toBe("app_bug");
    expect(byKey["a.spec.ts::times out"]).toBe("timing_issue");
    expect(byKey["a.spec.ts::passes"]).toBeUndefined();
    expect(byKey["a.spec.ts::skips"]).toBeUndefined();
  });

  it("leaves issueCategory undefined for every snapshot when AI is disabled (no analyses)", () => {
    const tests = [makeTest({ status: "failed" })];
    const snapshots = buildTestSnapshots(tests, []);
    expect(snapshots[0].issueCategory).toBeUndefined();
  });

  it("dedupes by file::title, keeping the last test's status (unchanged behavior)", () => {
    const tests = [
      makeTest({ file: "a.spec.ts", title: "t", fullName: "s > t", status: "failed" }),
      makeTest({ file: "a.spec.ts", title: "t", fullName: "s > t", status: "passed" }),
    ];
    const snapshots = buildTestSnapshots(tests, []);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].status).toBe("passed");
  });
});

// ---------------------------------------------------------------------------
// aggregateRootCauseTrends
// ---------------------------------------------------------------------------

describe("aggregateRootCauseTrends", () => {
  it("returns empty summary for no history", () => {
    const summary = aggregateRootCauseTrends(makeHistory([]));
    expect(summary.runsWithData).toBe(0);
    expect(summary.points).toEqual([]);
    expect(summary.latest).toBeUndefined();
    expect(summary.deltas).toBeUndefined();
  });

  it("computes correct percentage math for a run with 3 categorized failures", () => {
    const history = makeHistory([
      makeRun([
        { key: "a::t1", status: "failed", issueCategory: "locator_drift" },
        { key: "a::t2", status: "failed", issueCategory: "locator_drift" },
        { key: "a::t3", status: "failed", issueCategory: "app_bug" },
      ]),
    ]);
    const summary = aggregateRootCauseTrends(history);
    expect(summary.points).toHaveLength(1);
    expect(summary.points[0].totalCategorized).toBe(3);
    expect(summary.points[0].percentages.locator_drift).toBe(67);
    expect(summary.points[0].percentages.app_bug).toBe(33);
  });

  it("excludes runs with zero categorized failures instead of zero-filling", () => {
    const history = makeHistory([
      makeRun([{ key: "a::t1", status: "passed" }]),
      makeRun([{ key: "a::t1", status: "failed" }]), // no issueCategory
      makeRun([{ key: "a::t1", status: "failed", issueCategory: "app_bug" }]),
    ]);
    const summary = aggregateRootCauseTrends(history);
    expect(summary.runsConsidered).toBe(3);
    expect(summary.runsWithData).toBe(1);
    expect(summary.points).toHaveLength(1);
  });

  it("skips old-schema testSnapshots lacking issueCategory without crashing", () => {
    const history = makeHistory([
      makeRun([{ key: "a::t1", status: "failed" }]),
      makeRun([{ key: "a::t1", status: "failed" }]),
    ]);
    expect(() => aggregateRootCauseTrends(history)).not.toThrow();
    expect(aggregateRootCauseTrends(history).runsWithData).toBe(0);
  });

  it("omits deltas when fewer than 2 qualifying runs", () => {
    const history = makeHistory([
      makeRun([{ key: "a::t1", status: "failed", issueCategory: "app_bug" }]),
    ]);
    const summary = aggregateRootCauseTrends(history);
    expect(summary.deltas).toBeUndefined();
    expect(summary.latest).toBeDefined();
  });

  it("computes deltas between earliest and latest qualifying runs", () => {
    const history = makeHistory([
      makeRun([
        { key: "a::t1", status: "failed", issueCategory: "locator_drift" },
        { key: "a::t2", status: "failed", issueCategory: "locator_drift" },
      ]), // 100% locator_drift
      makeRun([
        { key: "a::t1", status: "failed", issueCategory: "app_bug" },
        { key: "a::t2", status: "failed", issueCategory: "app_bug" },
      ]), // 100% app_bug
    ]);
    const summary = aggregateRootCauseTrends(history);
    expect(summary.deltas?.locator_drift).toBe(-100);
    expect(summary.deltas?.app_bug).toBe(100);
  });

  it("respects windowSize by only looking at the last N runs", () => {
    const oldRuns = Array.from({ length: 5 }, () =>
      makeRun([{ key: "a::t1", status: "failed", issueCategory: "timing_issue" }])
    );
    const recentRuns = Array.from({ length: 3 }, () =>
      makeRun([{ key: "a::t1", status: "failed", issueCategory: "app_bug" }])
    );
    const history = makeHistory([...oldRuns, ...recentRuns]);
    const summary = aggregateRootCauseTrends(history, 3);
    expect(summary.runsConsidered).toBe(3);
    expect(summary.points.every(p => p.percentages.app_bug === 100)).toBe(true);
  });
});
