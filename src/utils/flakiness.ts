import type { HistoryData } from "../types/index.js";

/**
 * Compute a flakiness score (0–100) for each test key from run history.
 *
 * Algorithm: look at the last `windowSize` runs that contain a meaningful
 * status (passed or failed) for each test. Count status transitions
 * (pass→fail or fail→pass). Score = (transitions / (N - 1)) * 100.
 *
 * Score interpretation:
 *   0        → perfectly stable
 *   1–29     → occasionally flaky (low)
 *   30–69    → moderately flaky (medium)
 *   70–100   → highly unstable (high)
 */
export function computeFlakinessScores(
  history: HistoryData,
  windowSize = 10
): Record<string, number> {
  const runs = history.runs.slice(-windowSize);
  if (runs.length < 2) return {};

  // Collect statuses per test key across runs (oldest → newest)
  const statusesByKey: Record<string, string[]> = {};

  for (const run of runs) {
    for (const snap of run.testSnapshots) {
      const s = snap.status;
      if (s !== "passed" && s !== "failed") continue;
      if (!statusesByKey[snap.key]) statusesByKey[snap.key] = [];
      statusesByKey[snap.key].push(s);
    }
  }

  const scores: Record<string, number> = {};

  for (const [key, statuses] of Object.entries(statusesByKey)) {
    if (statuses.length < 2) continue;
    let transitions = 0;
    for (let i = 1; i < statuses.length; i++) {
      if (statuses[i] !== statuses[i - 1]) transitions++;
    }
    scores[key] = Math.round((transitions / (statuses.length - 1)) * 100);
  }

  return scores;
}

export function flakinessLevel(score: number): "high" | "medium" | "low" | "stable" {
  if (score >= 70) return "high";
  if (score >= 30) return "medium";
  if (score > 0)   return "low";
  return "stable";
}
