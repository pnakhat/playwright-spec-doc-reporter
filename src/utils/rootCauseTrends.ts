import type {
  AIAnalysisResult,
  HistoryData,
  IssueCategory,
  NormalizedTestResult,
  TestSnapshot,
} from "../types/index.js";

/**
 * Maps each failed test (keyed by `${file}::${fullName}`, matching how
 * AIAnalysisResult.testName is populated from test.fullName) to its
 * AI-diagnosed root-cause category.
 *
 * Fallback analyses (provider error → confidence 0, issueCategory "unknown")
 * are excluded so they don't get miscounted as a genuine "unknown" root cause.
 *
 * When a test has multiple analyses (e.g. one per failed retry attempt),
 * the last one in `analyses` wins — this relies on analyzeFailures()
 * preserving the chronological order of `failedTests`.
 */
export function resolveIssueCategories(
  analyses: AIAnalysisResult[]
): Map<string, IssueCategory> {
  const byTest = new Map<string, IssueCategory>();
  for (const a of analyses) {
    if (!(a.confidence > 0)) continue;
    byTest.set(`${a.file}::${a.testName}`, a.issueCategory);
  }
  return byTest;
}

/**
 * Builds this run's TestSnapshot list, attaching issueCategory to
 * failed/timedOut tests when a matching (non-fallback) AI analysis exists.
 */
export function buildTestSnapshots(
  tests: NormalizedTestResult[],
  analyses: AIAnalysisResult[]
): TestSnapshot[] {
  const categoryByTest = resolveIssueCategories(analyses);

  // Deduplicate by file::title (last status wins) — same as the run summary.
  const deduped = new Map<string, NormalizedTestResult>();
  for (const t of tests) {
    deduped.set(`${t.file}::${t.title}`, t);
  }

  return [...deduped.entries()].map(([key, t]) => {
    const isFailure = t.status === "failed" || t.status === "timedOut";
    const issueCategory = isFailure
      ? categoryByTest.get(`${t.file}::${t.fullName}`)
      : undefined;
    return { key, status: t.status, durationMs: t.durationMs, issueCategory };
  });
}

export interface RootCauseTrendPoint {
  runId: string;
  timestamp: string;
  totalCategorized: number;
  counts: Partial<Record<IssueCategory, number>>;
  percentages: Partial<Record<IssueCategory, number>>;
}

export interface RootCauseTrendSummary {
  windowSize: number;
  runsConsidered: number;
  runsWithData: number;
  points: RootCauseTrendPoint[];
  latest?: RootCauseTrendPoint;
  earliest?: RootCauseTrendPoint;
  deltas?: Partial<Record<IssueCategory, number>>;
}

/**
 * Aggregates the category mix of failed/timedOut tests across the last
 * `windowSize` runs. Runs with zero categorized failures are excluded from
 * `points` (not zero-filled) — "no data" is distinct from "no failures in
 * that category".
 */
export function aggregateRootCauseTrends(
  history: HistoryData,
  windowSize = 10
): RootCauseTrendSummary {
  const runs = history.runs.slice(-windowSize);
  const points: RootCauseTrendPoint[] = [];

  for (const run of runs) {
    const counts: Partial<Record<IssueCategory, number>> = {};
    let total = 0;
    for (const snap of run.testSnapshots) {
      const isFailure = snap.status === "failed" || snap.status === "timedOut";
      if (!isFailure || !snap.issueCategory) continue;
      counts[snap.issueCategory] = (counts[snap.issueCategory] ?? 0) + 1;
      total++;
    }
    if (total === 0) continue;

    const percentages: Partial<Record<IssueCategory, number>> = {};
    for (const [cat, count] of Object.entries(counts) as [IssueCategory, number][]) {
      percentages[cat] = Math.round((count / total) * 100);
    }

    points.push({
      runId: run.runId,
      timestamp: run.timestamp,
      totalCategorized: total,
      counts,
      percentages,
    });
  }

  const latest = points[points.length - 1];
  const earliest = points[0];

  let deltas: Partial<Record<IssueCategory, number>> | undefined;
  if (points.length >= 2) {
    deltas = {};
    const categories = new Set<IssueCategory>([
      ...(Object.keys(latest.percentages) as IssueCategory[]),
      ...(Object.keys(earliest.percentages) as IssueCategory[]),
    ]);
    for (const cat of categories) {
      deltas[cat] = (latest.percentages[cat] ?? 0) - (earliest.percentages[cat] ?? 0);
    }
  }

  return {
    windowSize,
    runsConsidered: runs.length,
    runsWithData: points.length,
    points,
    latest,
    earliest,
    deltas,
  };
}
