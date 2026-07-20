// ─── Step Analysis Utility ───────────────────────────────────────────────────
// Zero-dependency module that analyses NormalizedTestResult[] from a completed
// run and produces overlap groups, API-convertibility scores, and timing/API
// correlations used by the `analyze_run` MCP tool.

import type { AIAnalysisResult, ApiEntry, NormalizedTestResult } from "../types/index.js";

// ─── Public types ─────────────────────────────────────────────────────────────

export type OverlapRecommendation =
  | "refactor_into_shared_fixture"
  | "extract_page_object"
  | "parameterize";

export interface StepOverlapGroup {
  /** Stable test IDs of the members of this overlap group. */
  testIds: string[];
  /** Human-readable test titles (parallel to testIds). */
  testTitles: string[];
  /** Step titles shared by ALL tests in the group. */
  sharedSteps: string[];
  /** Jaccard similarity (0–1) of the pair or cluster. */
  similarity: number;
  recommendation: OverlapRecommendation;
}

export type ApiConversionClass =
  | "pure-api"
  | "network-interception"
  | "hybrid"
  | "ui-only";

export interface ApiConversionCandidate {
  testId: string;
  testTitle: string;
  file: string;
  conversionScore: number;
  conversionClass: ApiConversionClass;
  /** Step titles that have no corresponding API entry. */
  uiOnlySteps: string[];
  /** Step titles whose timing / keyword overlaps with an API entry. */
  apiCoveredSteps: string[];
  /** Deduplicated list of endpoint URLs captured in apiEntries. */
  endpoints: string[];
  suggestion: string;
}

export interface TimingApiCorrelation {
  testId: string;
  testTitle: string;
  file: string;
  aiRootCause: string;
  endpoints: string[];
  suggestion: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Build a Set of normalised step titles for a test. */
function stepTitleSet(test: NormalizedTestResult): Set<string> {
  const titles = new Set<string>();
  for (const step of test.steps ?? []) {
    const t = step.title.trim().toLowerCase();
    if (t) titles.add(t);
  }
  return titles;
}

/** Jaccard similarity of two sets. */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Pick a recommendation based on the number of shared steps. */
function pickRecommendation(sharedCount: number): OverlapRecommendation {
  if (sharedCount >= 5) return "extract_page_object";
  if (sharedCount >= 3) return "refactor_into_shared_fixture";
  return "parameterize";
}

/** Return deduplicated endpoint URLs from a list of ApiEntry items. */
function endpointList(entries: ApiEntry[]): string[] {
  const urls = new Set<string>();
  for (const e of entries) {
    if (e.url) {
      // Normalise by stripping query strings so similar endpoints group together
      try {
        const u = new URL(e.url);
        urls.add(`${e.method ?? "GET"} ${u.pathname}`);
      } catch {
        urls.add(`${e.method ?? "GET"} ${e.url}`);
      }
    }
  }
  return [...urls];
}

/**
 * Determine whether a step title semantically relates to API traffic.
 * A step is considered "API-covered" when:
 * - Its title contains an HTTP verb (GET/POST/PUT/PATCH/DELETE), or
 * - Its title mentions "request", "response", "api", "fetch", or "xhr", or
 * - Any ApiEntry URL path token appears in the step title.
 */
function isApiCoveredStep(stepTitle: string, entries: ApiEntry[]): boolean {
  const lower = stepTitle.toLowerCase();
  const httpVerbs = ["get ", "post ", "put ", "patch ", "delete "];
  if (httpVerbs.some(v => lower.includes(v))) return true;
  const keywords = ["request", "response", " api", "fetch", "xhr", "intercept"];
  if (keywords.some(k => lower.includes(k))) return true;
  for (const entry of entries) {
    if (!entry.url) continue;
    try {
      const parts = new URL(entry.url).pathname.split("/").filter(p => p.length > 2);
      if (parts.some(p => lower.includes(p.toLowerCase()))) return true;
    } catch {
      // ignore malformed URLs
    }
  }
  return false;
}

/** Derive a human-readable suggestion from the conversion class. */
function conversionSuggestion(
  cls: ApiConversionClass,
  endpoints: string[],
): string {
  const ep = endpoints.length > 0 ? ` (${endpoints.slice(0, 3).join(", ")})` : "";
  switch (cls) {
    case "pure-api":
      return `All interactions use API traffic${ep}. Migrate this test to a pure API test.`;
    case "network-interception":
      return `Most interactions correlate with API calls${ep}. Introduce network interception (page.route) to assert at the API layer and reduce render-wait timeouts.`;
    case "hybrid":
      return `About half the steps are API-adjacent${ep}. Extract the API assertions into a separate API test and keep only UI-specific assertions here.`;
    case "ui-only":
      return "No API traffic detected. Keep as UI test; consider adding addApiRequest/addApiResponse annotations if the page makes network calls.";
  }
}

// ─── Exported analysis functions ─────────────────────────────────────────────

/**
 * Detect groups of tests that share a high proportion of step titles.
 * Tests are paired exhaustively; any pair whose Jaccard similarity ≥ threshold
 * forms an overlap group. If a test participates in multiple pairs it is merged
 * into the same group (union-find style).
 */
export function detectOverlaps(
  tests: NormalizedTestResult[],
  threshold = 0.6,
): StepOverlapGroup[] {
  // Only consider tests that have at least one step
  const candidates = tests.filter(t => (t.steps ?? []).length > 0);
  const stepSets = candidates.map(t => stepTitleSet(t));

  // Union-find to merge overlapping pairs
  const parent = candidates.map((_, i) => i);
  function find(x: number): number {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }
  function union(x: number, y: number): void {
    parent[find(x)] = find(y);
  }

  // Record per-pair similarity so we can surface the average in the group
  const pairSims: Map<string, number> = new Map();

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const sim = jaccard(stepSets[i], stepSets[j]);
      if (sim >= threshold) {
        pairSims.set(`${i}:${j}`, sim);
        union(i, j);
      }
    }
  }

  // Collect members per root
  const roots = new Map<number, number[]>();
  for (let i = 0; i < candidates.length; i++) {
    const r = find(i);
    if (!roots.has(r)) roots.set(r, []);
    roots.get(r)!.push(i);
  }

  const groups: StepOverlapGroup[] = [];
  for (const members of roots.values()) {
    if (members.length < 2) continue;

    // Compute shared steps (intersection of all member sets)
    let shared = new Set(stepSets[members[0]]);
    for (let m = 1; m < members.length; m++) {
      shared = new Set([...shared].filter(s => stepSets[members[m]].has(s)));
    }

    // Average pairwise similarity within the group
    let simSum = 0;
    let simCount = 0;
    for (let a = 0; a < members.length; a++) {
      for (let b = a + 1; b < members.length; b++) {
        const key = `${members[a]}:${members[b]}`;
        const alt = `${members[b]}:${members[a]}`;
        const s = pairSims.get(key) ?? pairSims.get(alt);
        if (s !== undefined) { simSum += s; simCount++; }
      }
    }
    const avgSim = simCount > 0 ? Math.round((simSum / simCount) * 100) / 100 : threshold;

    groups.push({
      testIds: members.map(i => candidates[i].id),
      testTitles: members.map(i => candidates[i].title),
      sharedSteps: [...shared],
      similarity: avgSim,
      recommendation: pickRecommendation(shared.size),
    });
  }

  // Sort by descending similarity then descending shared step count
  return groups.sort(
    (a, b) => b.similarity - a.similarity || b.sharedSteps.length - a.sharedSteps.length,
  );
}

/**
 * Score each test for how convertible it is to an API test based on the
 * presence and content of its apiEntries and step titles.
 * Only tests with minConversionScore or higher are returned.
 */
export function scoreApiConvertibility(
  tests: NormalizedTestResult[],
  minConversionScore = 0.0,
): ApiConversionCandidate[] {
  const results: ApiConversionCandidate[] = [];

  for (const test of tests) {
    const steps = test.steps ?? [];
    const apiEntries = test.apiEntries ?? [];

    // A test with no steps at all gets a conversionScore of 0 unless it has apiEntries
    const totalSteps = steps.length;
    let apiCoveredCount = 0;

    if (totalSteps === 0 && apiEntries.length > 0) {
      // No steps but has API entries — treat as pure-api
      const eps = endpointList(apiEntries);
      const cls: ApiConversionClass = "pure-api";
      if (1.0 >= minConversionScore) {
        results.push({
          testId: test.id,
          testTitle: test.title,
          file: test.file,
          conversionScore: 1.0,
          conversionClass: cls,
          uiOnlySteps: [],
          apiCoveredSteps: [],
          endpoints: eps,
          suggestion: conversionSuggestion(cls, eps),
        });
      }
      continue;
    }

    if (totalSteps === 0) {
      // No steps, no API entries — score 0
      if (0 >= minConversionScore) {
        results.push({
          testId: test.id,
          testTitle: test.title,
          file: test.file,
          conversionScore: 0,
          conversionClass: "ui-only",
          uiOnlySteps: [],
          apiCoveredSteps: [],
          endpoints: [],
          suggestion: conversionSuggestion("ui-only", []),
        });
      }
      continue;
    }

    const uiOnly: string[] = [];
    const apiCovered: string[] = [];

    for (const step of steps) {
      if (isApiCoveredStep(step.title, apiEntries)) {
        apiCovered.push(step.title);
        apiCoveredCount++;
      } else {
        uiOnly.push(step.title);
      }
    }

    const score = Math.round((apiCoveredCount / totalSteps) * 100) / 100;
    const cls: ApiConversionClass =
      score >= 0.9 ? "pure-api"
        : score >= 0.5 ? "network-interception"
          : score >= 0.3 ? "hybrid"
            : "ui-only";

    const eps = endpointList(apiEntries);

    if (score >= minConversionScore) {
      results.push({
        testId: test.id,
        testTitle: test.title,
        file: test.file,
        conversionScore: score,
        conversionClass: cls,
        uiOnlySteps: uiOnly,
        apiCoveredSteps: apiCovered,
        endpoints: eps,
        suggestion: conversionSuggestion(cls, eps),
      });
    }
  }

  // Sort by descending conversionScore
  return results.sort((a, b) => b.conversionScore - a.conversionScore);
}

/**
 * Find tests where AI diagnosed a timing_issue AND the test has apiEntries —
 * these are strong candidates for network interception.
 */
export function correlateTimingAndApi(
  tests: NormalizedTestResult[],
  analyses: AIAnalysisResult[],
): TimingApiCorrelation[] {
  const timingTests = new Set(
    analyses
      .filter(a => a.issueCategory === "timing_issue" && a.confidence > 0)
      .map(a => `${a.file}::${a.testName}`),
  );

  const correlations: TimingApiCorrelation[] = [];

  for (const test of tests) {
    const key = `${test.file}::${test.title}`;
    const keyFull = `${test.file}::${test.fullName}`;
    if (!timingTests.has(key) && !timingTests.has(keyFull)) continue;

    const apiEntries = test.apiEntries ?? [];
    const eps = endpointList(apiEntries);

    const analysis = analyses.find(
      a =>
        (a.file === test.file && a.testName === test.title) ||
        (a.file === test.file && a.testName === test.fullName),
    );

    correlations.push({
      testId: test.id,
      testTitle: test.title,
      file: test.file,
      aiRootCause: analysis?.likelyRootCause ?? "timing_issue",
      endpoints: eps,
      suggestion:
        eps.length > 0
          ? `Replace UI wait with page.route() interception on ${eps.slice(0, 2).join(", ")} to assert state immediately after the API responds.`
          : "Add network interception to assert app state immediately after the relevant API responds rather than waiting for DOM updates.",
    });
  }

  return correlations;
}
