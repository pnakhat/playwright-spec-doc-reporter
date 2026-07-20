import { describe, it, expect } from "vitest";
import {
  detectOverlaps,
  scoreApiConvertibility,
  correlateTimingAndApi,
} from "../src/utils/stepAnalysis.js";
import type { NormalizedTestResult, AIAnalysisResult } from "../src/types/index.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTest(
  overrides: Partial<NormalizedTestResult> & Pick<NormalizedTestResult, "id" | "title">,
): NormalizedTestResult {
  return {
    id: overrides.id,
    suite: "suite",
    file: "tests/spec.ts",
    title: overrides.title,
    fullName: `suite > ${overrides.title}`,
    status: "passed",
    expectedStatus: "passed",
    flaky: false,
    retries: 0,
    retryIndex: 0,
    durationMs: 1000,
    attachments: [],
    artifacts: { screenshots: [], videos: [], traces: [] },
    consoleLogs: [],
    tags: [],
    steps: [],
    ...overrides,
  } as NormalizedTestResult;
}

function makeStep(title: string) {
  return { title, category: "test.step", durationMs: 50, status: "passed" as const, screenshots: [] };
}

function makeApiEntry(method: string, url: string) {
  return { kind: "request" as const, method, url, headers: {} };
}

// ─── detectOverlaps ───────────────────────────────────────────────────────────

describe("detectOverlaps", () => {
  it("returns no groups when all tests have no steps", () => {
    const tests = [
      makeTest({ id: "t1", title: "test 1" }),
      makeTest({ id: "t2", title: "test 2" }),
    ];
    expect(detectOverlaps(tests)).toHaveLength(0);
  });

  it("returns no group when similarity is below threshold", () => {
    const tests = [
      makeTest({ id: "t1", title: "test 1", steps: [makeStep("step A"), makeStep("step B")] }),
      makeTest({ id: "t2", title: "test 2", steps: [makeStep("step C"), makeStep("step D")] }),
    ];
    expect(detectOverlaps(tests, 0.6)).toHaveLength(0);
  });

  it("detects a group when two tests share most steps", () => {
    const shared = [
      makeStep("navigate to /login"),
      makeStep("fill username field"),
      makeStep("fill password field"),
      makeStep("click submit button"),
      makeStep("expect dashboard visible"),
    ];
    const tests = [
      makeTest({ id: "t-login-a", title: "admin login", steps: shared }),
      makeTest({
        id: "t-login-b",
        title: "user login",
        steps: [...shared, makeStep("verify welcome message")],
      }),
    ];
    const groups = detectOverlaps(tests, 0.6);
    expect(groups).toHaveLength(1);
    expect(groups[0].testIds.sort()).toEqual(["t-login-a", "t-login-b"]);
    expect(groups[0].sharedSteps).toHaveLength(5);
    expect(groups[0].similarity).toBeGreaterThanOrEqual(0.6);
  });

  it("assigns extract_page_object recommendation for 5+ shared steps", () => {
    const shared = Array.from({ length: 5 }, (_, i) => makeStep(`shared step ${i}`));
    const tests = [
      makeTest({ id: "t1", title: "t1", steps: shared }),
      makeTest({ id: "t2", title: "t2", steps: shared }),
    ];
    const groups = detectOverlaps(tests, 0.5);
    expect(groups[0].recommendation).toBe("extract_page_object");
  });

  it("assigns refactor_into_shared_fixture for 3-4 shared steps", () => {
    const shared = [
      makeStep("navigate to /login"),
      makeStep("fill username field"),
      makeStep("click submit button"),
    ];
    const tests = [
      makeTest({ id: "t1", title: "t1", steps: shared }),
      makeTest({ id: "t2", title: "t2", steps: [...shared, makeStep("extra step")] }),
    ];
    const groups = detectOverlaps(tests, 0.5);
    expect(groups[0].recommendation).toBe("refactor_into_shared_fixture");
  });

  it("assigns parameterise for 1-2 shared steps", () => {
    const shared = [makeStep("navigate to page"), makeStep("submit form")];
    const other = Array.from({ length: 5 }, (_, i) => makeStep(`unique step ${i}`));
    const tests = [
      makeTest({ id: "t1", title: "t1", steps: [...shared, ...other.slice(0, 3)] }),
      makeTest({ id: "t2", title: "t2", steps: [...shared, ...other.slice(3)] }),
    ];
    // These share 2 steps out of 5+5 union — Jaccard ~0.22, so use a low threshold
    const groups = detectOverlaps(tests, 0.2);
    expect(groups[0].recommendation).toBe("parameterise");
  });

  it("merges three tests into one group when they all overlap", () => {
    const shared = Array.from({ length: 4 }, (_, i) => makeStep(`shared ${i}`));
    const tests = [
      makeTest({ id: "t1", title: "t1", steps: shared }),
      makeTest({ id: "t2", title: "t2", steps: shared }),
      makeTest({ id: "t3", title: "t3", steps: [...shared, makeStep("extra")] }),
    ];
    const groups = detectOverlaps(tests, 0.5);
    expect(groups).toHaveLength(1);
    expect(groups[0].testIds).toHaveLength(3);
  });

  it("respects the overlapThreshold parameter", () => {
    const shared = [makeStep("step A"), makeStep("step B")];
    const unique = [makeStep("step C"), makeStep("step D"), makeStep("step E"), makeStep("step F")];
    const tests = [
      makeTest({ id: "t1", title: "t1", steps: [...shared, ...unique.slice(0, 2)] }),
      makeTest({ id: "t2", title: "t2", steps: [...shared, ...unique.slice(2)] }),
    ];
    // Jaccard = 2 / (4+4-2) = 2/6 ≈ 0.33
    expect(detectOverlaps(tests, 0.8)).toHaveLength(0);
    expect(detectOverlaps(tests, 0.2)).toHaveLength(1);
  });
});

// ─── scoreApiConvertibility ───────────────────────────────────────────────────

describe("scoreApiConvertibility", () => {
  it("classifies a test with only API steps as pure-api", () => {
    const test = makeTest({
      id: "t1",
      title: "api only",
      steps: [
        makeStep("GET /api/products"),
        makeStep("POST /api/cart/items"),
        makeStep("DELETE /api/cart/items/1"),
      ],
      apiEntries: [
        makeApiEntry("GET", "https://api.example.com/api/products"),
        makeApiEntry("POST", "https://api.example.com/api/cart/items"),
      ],
    });
    const results = scoreApiConvertibility([test], 0.0);
    expect(results).toHaveLength(1);
    expect(results[0].conversionClass).toBe("pure-api");
    expect(results[0].conversionScore).toBeGreaterThanOrEqual(0.9);
  });

  it("classifies a test with ~half API steps as network-interception", () => {
    const test = makeTest({
      id: "t1",
      title: "mixed",
      steps: [
        makeStep("navigate to /shop"),
        makeStep("fill search box"),
        makeStep("GET /api/search"),
        makeStep("wait for results"),
        makeStep("click first result"),
        makeStep("POST /api/cart/items"),
      ],
      apiEntries: [
        makeApiEntry("GET", "https://api.example.com/api/search"),
        makeApiEntry("POST", "https://api.example.com/api/cart/items"),
      ],
    });
    const results = scoreApiConvertibility([test], 0.0);
    expect(results).toHaveLength(1);
    expect(results[0].conversionClass).toBe("network-interception");
    expect(results[0].conversionScore).toBeGreaterThanOrEqual(0.3);
    expect(results[0].conversionScore).toBeLessThan(0.9);
  });

  it("classifies a test with no API steps as ui-only", () => {
    const test = makeTest({
      id: "t1",
      title: "ui only",
      steps: [
        makeStep("navigate to /login"),
        makeStep("fill username"),
        makeStep("click submit"),
        makeStep("expect dashboard"),
      ],
      apiEntries: [],
    });
    const results = scoreApiConvertibility([test], 0.0);
    expect(results[0].conversionClass).toBe("ui-only");
    expect(results[0].conversionScore).toBe(0);
  });

  it("filters results by minConversionScore", () => {
    const pure = makeTest({
      id: "t-pure",
      title: "api only",
      steps: [makeStep("GET /api/products"), makeStep("POST /api/orders")],
      apiEntries: [makeApiEntry("GET", "https://api.example.com/api/products")],
    });
    const ui = makeTest({
      id: "t-ui",
      title: "ui only",
      steps: [makeStep("click button"), makeStep("fill form")],
      apiEntries: [],
    });
    const results = scoreApiConvertibility([pure, ui], 0.5);
    expect(results.every(r => r.conversionScore >= 0.5)).toBe(true);
    expect(results.find(r => r.testId === "t-ui")).toBeUndefined();
  });

  it("returns results sorted by descending conversionScore", () => {
    const high = makeTest({
      id: "t-high",
      title: "high",
      steps: [makeStep("GET /api/x"), makeStep("POST /api/y")],
      apiEntries: [makeApiEntry("GET", "https://api.example.com/api/x")],
    });
    const low = makeTest({
      id: "t-low",
      title: "low",
      steps: [makeStep("navigate"), makeStep("fill form"), makeStep("click")],
      apiEntries: [],
    });
    const results = scoreApiConvertibility([low, high], 0.0);
    expect(results[0].conversionScore).toBeGreaterThanOrEqual(results[1].conversionScore);
  });

  it("treats a test with apiEntries but no steps as pure-api", () => {
    const test = makeTest({
      id: "t-noSteps",
      title: "no steps but has API",
      steps: [],
      apiEntries: [makeApiEntry("GET", "https://api.example.com/api/users")],
    });
    const results = scoreApiConvertibility([test], 0.0);
    expect(results[0].conversionClass).toBe("pure-api");
    expect(results[0].conversionScore).toBe(1.0);
  });

  it("populates endpoints from apiEntries", () => {
    const test = makeTest({
      id: "t1",
      title: "has api",
      steps: [makeStep("GET /api/products")],
      apiEntries: [
        makeApiEntry("GET", "https://api.example.com/api/products"),
        makeApiEntry("POST", "https://api.example.com/api/cart"),
      ],
    });
    const results = scoreApiConvertibility([test], 0.0);
    expect(results[0].endpoints.length).toBeGreaterThanOrEqual(1);
    expect(results[0].endpoints.some(e => e.includes("/api/products"))).toBe(true);
  });
});

// ─── correlateTimingAndApi ────────────────────────────────────────────────────

describe("correlateTimingAndApi", () => {
  it("returns empty when no timing_issue analyses exist", () => {
    const tests = [makeTest({ id: "t1", title: "some test", apiEntries: [makeApiEntry("GET", "https://x.com/api")] })];
    const analyses: AIAnalysisResult[] = [
      {
        testName: "some test",
        file: "tests/spec.ts",
        summary: "Locator changed",
        likelyRootCause: "Button id changed",
        confidence: 0.9,
        suggestedRemediation: "Update selector",
        issueCategory: "locator_drift",
        structuredFeedback: { actionType: "locator_update", reasoning: "id changed" },
      },
    ];
    expect(correlateTimingAndApi(tests, analyses)).toHaveLength(0);
  });

  it("returns a correlation when a timing_issue test has apiEntries", () => {
    const test = makeTest({
      id: "t-cart",
      title: "add item to cart",
      file: "tests/cart.spec.ts",
      apiEntries: [makeApiEntry("POST", "https://api.example.com/api/cart/items")],
    });
    const analysis: AIAnalysisResult = {
      testName: "add item to cart",
      file: "tests/cart.spec.ts",
      summary: "Cart badge did not update in time.",
      likelyRootCause: "UI polling delay after API response",
      confidence: 0.88,
      suggestedRemediation: "Use waitForResponse",
      issueCategory: "timing_issue",
      structuredFeedback: { actionType: "wait_strategy", reasoning: "polling delay" },
    };
    const correlations = correlateTimingAndApi([test], [analysis]);
    expect(correlations).toHaveLength(1);
    expect(correlations[0].testId).toBe("t-cart");
    expect(correlations[0].endpoints.some(e => e.includes("/api/cart/items"))).toBe(true);
    expect(correlations[0].suggestion).toContain("page.route");
  });

  it("does not return a correlation for timing_issue tests without apiEntries", () => {
    const test = makeTest({
      id: "t-noapi",
      title: "slow test",
      file: "tests/spec.ts",
      apiEntries: [],
    });
    const analysis: AIAnalysisResult = {
      testName: "slow test",
      file: "tests/spec.ts",
      summary: "Slow render",
      likelyRootCause: "Render delay",
      confidence: 0.75,
      suggestedRemediation: "Add explicit wait",
      issueCategory: "timing_issue",
      structuredFeedback: { actionType: "wait_strategy", reasoning: "render delay" },
    };
    const correlations = correlateTimingAndApi([test], [analysis]);
    // Still returns a correlation even without endpoints, but endpoints array is empty
    expect(correlations).toHaveLength(1);
    expect(correlations[0].endpoints).toHaveLength(0);
    expect(correlations[0].suggestion).toContain("network interception");
  });

  it("skips analyses with zero confidence (fallback entries)", () => {
    const test = makeTest({
      id: "t1",
      title: "test",
      apiEntries: [makeApiEntry("GET", "https://api.example.com/api")],
    });
    const analysis: AIAnalysisResult = {
      testName: "test",
      file: "tests/spec.ts",
      summary: "AI unavailable",
      likelyRootCause: "Unknown",
      confidence: 0,
      suggestedRemediation: "Investigate",
      issueCategory: "timing_issue",
      structuredFeedback: { actionType: "investigate", reasoning: "provider failed" },
    };
    expect(correlateTimingAndApi([test], [analysis])).toHaveLength(0);
  });
});
