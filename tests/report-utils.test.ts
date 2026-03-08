import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { toReportSummary, classifyArtifacts, shortId, safeTextFromBuffer } from "../src/utils/report.js";
import { healingPayloadsToMarkdown, createHealingPayloads } from "../src/healing/payload.js";
import { generateReport } from "../src/generator/reportGenerator.js";
import type { AIAnalysisResult, ApiEntry, NormalizedTestResult } from "../src/types/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "spec-doc-test-"));
}

function baseTest(overrides: Partial<NormalizedTestResult> = {}): NormalizedTestResult {
  return {
    id: "t1",
    suite: "Login",
    file: "tests/login.spec.ts",
    title: "login with valid credentials",
    fullName: "Login › login with valid credentials",
    status: "passed",
    expectedStatus: "passed",
    flaky: false,
    retries: 0,
    retryIndex: 0,
    durationMs: 1200,
    attachments: [],
    artifacts: { screenshots: [], videos: [], traces: [] },
    consoleLogs: [],
    tags: [],
    steps: [],
    ...overrides
  };
}

function baseAnalysis(overrides: Partial<AIAnalysisResult> = {}): AIAnalysisResult {
  return {
    testName: "Login › login with valid credentials",
    file: "tests/login.spec.ts",
    summary: "Element not found",
    likelyRootCause: "Selector changed after deploy",
    confidence: 0.85,
    suggestedRemediation: "Update locator to getByTestId",
    issueCategory: "locator_drift",
    structuredFeedback: {
      actionType: "locator_update",
      reasoning: "Button id was changed",
      suggestedPatch: "- page.click('#old')\n+ page.getByTestId('submit').click()",
      candidateLocators: ["getByTestId('submit')", "getByRole('button', {name:'Login'})"]
    },
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// toReportSummary
// ---------------------------------------------------------------------------

describe("toReportSummary", () => {
  it("aggregates passed and failed counts", () => {
    const summary = toReportSummary([
      baseTest({ id: "1", status: "passed", durationMs: 100 }),
      baseTest({ id: "2", status: "failed", durationMs: 300 })
    ]);
    expect(summary.total).toBe(2);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.durationMs).toBe(400);
    expect(summary.averageDurationMs).toBe(200);
  });

  it("counts skipped and timedOut correctly", () => {
    const summary = toReportSummary([
      baseTest({ id: "1", status: "passed", durationMs: 500 }),
      baseTest({ id: "2", status: "skipped", durationMs: 0 }),
      baseTest({ id: "3", status: "timedOut", durationMs: 30000 })
    ]);
    expect(summary.skipped).toBe(1);
    expect(summary.timedOut).toBe(1);
    expect(summary.failed).toBe(0);
  });

  it("counts flaky tests separately", () => {
    const summary = toReportSummary([
      baseTest({ id: "1", status: "passed", flaky: true, durationMs: 800 }),
      baseTest({ id: "2", status: "passed", flaky: false, durationMs: 200 })
    ]);
    expect(summary.flaky).toBe(1);
    expect(summary.passed).toBe(2);
  });

  it("handles empty test list", () => {
    const summary = toReportSummary([]);
    expect(summary.total).toBe(0);
    expect(summary.durationMs).toBe(0);
    expect(summary.averageDurationMs).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// classifyArtifacts
// ---------------------------------------------------------------------------

describe("classifyArtifacts", () => {
  it("classifies screenshots, videos, and traces", () => {
    const artifacts = classifyArtifacts([
      { name: "screenshot", contentType: "image/png", path: "report/screenshot.png" },
      { name: "video", contentType: "video/webm", path: "report/video.webm" },
      { name: "trace", contentType: "application/zip", path: "report/trace.zip" }
    ]);
    expect(artifacts.screenshots).toEqual(["report/screenshot.png"]);
    expect(artifacts.videos).toEqual(["report/video.webm"]);
    expect(artifacts.traces).toEqual(["report/trace.zip"]);
  });

  it("ignores attachments without a path", () => {
    const artifacts = classifyArtifacts([
      { name: "screenshot", contentType: "image/png" }
    ]);
    expect(artifacts.screenshots).toHaveLength(0);
  });

  it("returns empty arrays when no attachments", () => {
    const artifacts = classifyArtifacts([]);
    expect(artifacts.screenshots).toEqual([]);
    expect(artifacts.videos).toEqual([]);
    expect(artifacts.traces).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// shortId
// ---------------------------------------------------------------------------

describe("shortId", () => {
  it("returns a non-empty string", () => {
    expect(shortId("tests/a.spec.ts:10:my test:0")).toMatch(/^[a-z0-9]+$/);
  });

  it("is deterministic for same input", () => {
    const id1 = shortId("tests/a.spec.ts:10:my test:0");
    const id2 = shortId("tests/a.spec.ts:10:my test:0");
    expect(id1).toBe(id2);
  });

  it("produces different ids for different inputs", () => {
    expect(shortId("tests/a.spec.ts:10:test A:0")).not.toBe(
      shortId("tests/a.spec.ts:11:test B:0")
    );
  });
});

// ---------------------------------------------------------------------------
// safeTextFromBuffer
// ---------------------------------------------------------------------------

describe("safeTextFromBuffer", () => {
  it("returns a string for Buffer input", () => {
    const result = safeTextFromBuffer(Buffer.from("hello"));
    expect(result).toBe("hello");
  });

  it("returns a string for string input", () => {
    expect(safeTextFromBuffer("world")).toBe("world");
  });
});

// ---------------------------------------------------------------------------
// healingPayloadsToMarkdown
// ---------------------------------------------------------------------------

describe("healingPayloadsToMarkdown", () => {
  it("renders readable markdown", () => {
    const markdown = healingPayloadsToMarkdown([
      {
        testName: "suite b",
        file: "b.spec.ts",
        stepName: "click login button",
        failedLocator: "#old",
        candidateLocators: ["getByTestId('submit')", "getByRole('button',{name:'Login'})"],
        errorMessage: "Timeout waiting for element",
        suggestedPatch: "+ page.getByTestId('submit').click()",
        reasoning: "Locator drift after redesign",
        confidence: 0.85,
        actionType: "locator_update"
      }
    ]);

    expect(markdown).toContain("# Healing Suggestions");
    expect(markdown).toContain("locator_update");
    expect(markdown).toContain("suite b");
    expect(markdown).toContain("getByTestId");
  });

  it("handles empty list", () => {
    expect(healingPayloadsToMarkdown([])).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// createHealingPayloads
// ---------------------------------------------------------------------------

describe("createHealingPayloads", () => {
  it("creates a payload for a locator_drift failure with matching analysis", () => {
    const failed = baseTest({ status: "failed", errorMessage: "Locator not found" });
    const analysis = baseAnalysis({ issueCategory: "locator_drift" });

    const payloads = createHealingPayloads([failed], [analysis]);
    expect(payloads).toHaveLength(1);
    expect(payloads[0].testName).toBe("Login › login with valid credentials");
    expect(payloads[0].confidence).toBe(0.85);
    expect(payloads[0].candidateLocators).toContain("getByTestId('submit')");
    expect(payloads[0].suggestedPatch).toContain("getByTestId");
  });

  it("returns a payload with zero confidence when no matching analysis", () => {
    const failed = baseTest({ status: "failed" });
    const payloads = createHealingPayloads([failed], []);
    expect(payloads).toHaveLength(1);
    expect(payloads[0].confidence).toBe(0);
    expect(payloads[0].actionType).toBe("investigate");
  });

  it("returns payload with analysis data even for non-locator categories", () => {
    const failed = baseTest({ status: "failed" });
    const analysis = baseAnalysis({ issueCategory: "timing_issue" });
    const payloads = createHealingPayloads([failed], [analysis]);
    expect(payloads).toHaveLength(1);
    expect(payloads[0].confidence).toBe(0.85);
    expect(payloads[0].actionType).toBe("locator_update");
  });
});

// ---------------------------------------------------------------------------
// API entries — data pipeline
// ---------------------------------------------------------------------------

describe("apiEntries — data pipeline", () => {
  it("preserves apiEntries through generateReport", async () => {
    const tmpDir = makeTmpDir();
    try {
      const entries: ApiEntry[] = [
        { kind: "request", method: "POST", url: "https://api.example.com/posts", body: { title: "hello" } },
        { kind: "response", status: 201, body: { id: 101, title: "hello" } }
      ];
      const test = baseTest({ apiEntries: entries });
      const report = await generateReport([test], [], [], { outputDir: tmpDir });

      expect(report.tests[0].apiEntries).toHaveLength(2);
      expect(report.tests[0].apiEntries![0].method).toBe("POST");
      expect(report.tests[0].apiEntries![1].status).toBe(201);

      const onDisk = JSON.parse(
        fs.readFileSync(path.join(tmpDir, "results.json"), "utf-8")
      );
      expect(onDisk.tests[0].apiEntries).toHaveLength(2);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("leaves apiEntries undefined when none provided", async () => {
    const tmpDir = makeTmpDir();
    try {
      const report = await generateReport([baseTest()], [], [], { outputDir: tmpDir });
      expect(report.tests[0].apiEntries).toBeUndefined();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("handles request without body", async () => {
    const tmpDir = makeTmpDir();
    try {
      const test = baseTest({
        apiEntries: [{ kind: "request", method: "GET", url: "https://api.example.com/posts" }]
      });
      const report = await generateReport([test], [], [], { outputDir: tmpDir });
      const entry = report.tests[0].apiEntries![0];
      expect(entry.body).toBeUndefined();
      expect(entry.url).toBe("https://api.example.com/posts");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// API entries — extraction logic (mirrors reporter's extractApiEntries)
// ---------------------------------------------------------------------------

describe("apiEntries — extraction logic", () => {
  function extractApiEntries(annotations: { type: string; description?: string }[]): ApiEntry[] {
    return annotations
      .filter(a => a.type === "glossy:request" || a.type === "glossy:response")
      .map(a => {
        try { return JSON.parse(a.description ?? "{}") as ApiEntry; } catch { return null; }
      })
      .filter(Boolean) as ApiEntry[];
  }

  it("parses request annotation", () => {
    const entry: ApiEntry = { kind: "request", method: "POST", url: "https://api.test/", body: { x: 1 } };
    const entries = extractApiEntries([{ type: "glossy:request", description: JSON.stringify(entry) }]);
    expect(entries).toHaveLength(1);
    expect(entries[0].method).toBe("POST");
    expect(entries[0].body).toEqual({ x: 1 });
  });

  it("parses response annotation", () => {
    const entry: ApiEntry = { kind: "response", status: 200, body: { ok: true } };
    const entries = extractApiEntries([{ type: "glossy:response", description: JSON.stringify(entry) }]);
    expect(entries[0].status).toBe(200);
  });

  it("returns empty for unrelated annotations", () => {
    const entries = extractApiEntries([
      { type: "behaviour", description: "User logs in" },
      { type: "feature", description: "Auth" }
    ]);
    expect(entries).toHaveLength(0);
  });

  it("skips malformed JSON gracefully", () => {
    const entries = extractApiEntries([
      { type: "glossy:request", description: "not-valid-json{{{" }
    ]);
    expect(entries).toHaveLength(0);
  });

  it("preserves order of interleaved request/response", () => {
    const req: ApiEntry = { kind: "request", method: "GET", url: "/a" };
    const res: ApiEntry = { kind: "response", status: 200 };
    const entries = extractApiEntries([
      { type: "glossy:request", description: JSON.stringify(req) },
      { type: "glossy:response", description: JSON.stringify(res) }
    ]);
    expect(entries[0].kind).toBe("request");
    expect(entries[1].kind).toBe("response");
  });
});

// ---------------------------------------------------------------------------
// Feature / Scenario / Behaviour — data pipeline
// ---------------------------------------------------------------------------

describe("featureMeta and scenarioDescription — data pipeline", () => {
  it("preserves featureMeta in the generated report", async () => {
    const tmpDir = makeTmpDir();
    try {
      const test = baseTest({
        featureMeta: { name: "Shopping Cart", description: "As a customer I want to add items" }
      });
      const report = await generateReport([test], [], [], { outputDir: tmpDir });
      expect(report.tests[0].featureMeta?.name).toBe("Shopping Cart");
      expect(report.tests[0].featureMeta?.description).toBe("As a customer I want to add items");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("preserves scenarioDescription in the generated report", async () => {
    const tmpDir = makeTmpDir();
    try {
      const test = baseTest({ scenarioDescription: "Verifies the happy-path login flow" });
      const report = await generateReport([test], [], [], { outputDir: tmpDir });
      expect(report.tests[0].scenarioDescription).toBe("Verifies the happy-path login flow");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("featureMeta is optional — absent when not set", async () => {
    const tmpDir = makeTmpDir();
    try {
      const report = await generateReport([baseTest()], [], [], { outputDir: tmpDir });
      expect(report.tests[0].featureMeta).toBeUndefined();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Behaviour annotations — data pipeline
// ---------------------------------------------------------------------------

describe("behaviour annotations — data pipeline", () => {
  it("preserves behaviours in the generated report JSON", async () => {
    const tmpDir = makeTmpDir();
    try {
      const test = baseTest({
        behaviours: [
          "User navigates to the login page",
          "User submits valid credentials",
          "User is redirected to the dashboard"
        ]
      });

      const report = await generateReport([test], [], [], { outputDir: tmpDir });

      expect(report.tests[0].behaviours).toEqual([
        "User navigates to the login page",
        "User submits valid credentials",
        "User is redirected to the dashboard"
      ]);

      const onDisk = JSON.parse(
        fs.readFileSync(path.join(tmpDir, "results.json"), "utf-8")
      );
      expect(onDisk.tests[0].behaviours).toEqual(report.tests[0].behaviours);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("leaves behaviours undefined for tests without annotations", async () => {
    const tmpDir = makeTmpDir();
    try {
      const report = await generateReport([baseTest()], [], [], { outputDir: tmpDir });
      expect(report.tests[0].behaviours).toBeUndefined();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("handles multiple tests where only some have behaviours", async () => {
    const tmpDir = makeTmpDir();
    try {
      const report = await generateReport(
        [
          baseTest({ id: "t1", title: "with behaviours", behaviours: ["User logs in", "User sees dashboard"] }),
          baseTest({ id: "t2", title: "without behaviours" })
        ],
        [], [], { outputDir: tmpDir }
      );

      const byId = Object.fromEntries(report.tests.map(t => [t.id, t]));
      expect(byId["t1"].behaviours).toEqual(["User logs in", "User sees dashboard"]);
      expect(byId["t2"].behaviours).toBeUndefined();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Behaviour annotations — BDD hierarchy logic (mirrors scriptUtils browser code)
// ---------------------------------------------------------------------------

describe("behaviour annotations — BDD hierarchy logic", () => {
  function buildScenario(test: NormalizedTestResult) {
    const behaviours =
      Array.isArray(test.behaviours) && test.behaviours.length > 0 ? test.behaviours : null;
    const steps = (test.steps ?? []).map(s => ({ name: s.title, status: s.status }));
    return { behaviours, steps };
  }

  function renderScenarioLines(sc: { behaviours: string[] | null; steps: { name: string }[] }): string[] {
    if (sc.behaviours && sc.behaviours.length > 0) {
      return sc.behaviours.map(b => "- " + b);
    }
    return sc.steps
      .filter(s => s.name && s.name !== "Test execution")
      .map(s => "- " + s.name);
  }

  it("scenario carries behaviours when set", () => {
    const sc = buildScenario(baseTest({ behaviours: ["User adds item to cart", "User checks out"] }));
    expect(sc.behaviours).toEqual(["User adds item to cart", "User checks out"]);
  });

  it("scenario behaviours is null when none set", () => {
    expect(buildScenario(baseTest()).behaviours).toBeNull();
  });

  it("scenario behaviours is null for empty array", () => {
    expect(buildScenario(baseTest({ behaviours: [] })).behaviours).toBeNull();
  });

  it("doc generation prefers behaviours over steps", () => {
    const sc = {
      behaviours: ["User logs in", "User lands on dashboard"],
      steps: [{ name: "page.goto('/login')" }, { name: "page.click('#submit')" }]
    };
    expect(renderScenarioLines(sc)).toEqual(["- User logs in", "- User lands on dashboard"]);
  });

  it("doc generation falls back to steps when no behaviours", () => {
    const sc = {
      behaviours: null,
      steps: [{ name: "page.goto('/login')" }, { name: "page.click('#submit')" }]
    };
    expect(renderScenarioLines(sc)).toEqual(["- page.goto('/login')", "- page.click('#submit')"]);
  });

  it("doc generation filters out 'Test execution' placeholder step", () => {
    const sc = {
      behaviours: null,
      steps: [{ name: "Test execution" }, { name: "page.click('#btn')" }]
    };
    expect(renderScenarioLines(sc)).toEqual(["- page.click('#btn')"]);
  });
});

// ---------------------------------------------------------------------------
// Feature meta extraction (mirrors reporter's extractFeatureMeta)
// ---------------------------------------------------------------------------

describe("feature meta extraction logic", () => {
  function extractFeatureMeta(annotations: { type: string; description?: string }[]) {
    const name = annotations.find(a => a.type === "feature")?.description;
    const description = annotations.find(a => a.type === "feature.description")?.description;
    if (!name) return undefined;
    return description ? { name, description } : { name };
  }

  it("returns name and description when both set", () => {
    const result = extractFeatureMeta([
      { type: "feature", description: "Shopping Cart" },
      { type: "feature.description", description: "As a customer I want to add items" }
    ]);
    expect(result).toEqual({ name: "Shopping Cart", description: "As a customer I want to add items" });
  });

  it("returns only name when description not set", () => {
    const result = extractFeatureMeta([{ type: "feature", description: "Shopping Cart" }]);
    expect(result).toEqual({ name: "Shopping Cart" });
  });

  it("returns undefined when no feature annotation", () => {
    expect(extractFeatureMeta([{ type: "behaviour", description: "User logs in" }])).toBeUndefined();
  });
});
