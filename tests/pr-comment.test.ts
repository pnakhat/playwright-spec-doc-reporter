import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPrCommentMarkdown, writePrComment } from "../src/prComment/generator.js";
import type { AIAnalysisResult, NormalizedTestResult, ReportSummary } from "../src/types/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pr-comment-test-"));
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
    ...overrides,
  };
}

function baseSummary(overrides: Partial<ReportSummary> = {}): ReportSummary {
  return {
    total: 10,
    passed: 8,
    failed: 1,
    skipped: 1,
    flaky: 0,
    timedOut: 0,
    interrupted: 0,
    durationMs: 45_000,
    averageDurationMs: 4_500,
    ...overrides,
  };
}

function baseAnalysis(overrides: Partial<AIAnalysisResult> = {}): AIAnalysisResult {
  return {
    testName: "Login › login with valid credentials",
    file: "tests/login.spec.ts",
    summary: "Element not found: selector drift detected in the login form",
    likelyRootCause: "The #submit-btn selector was renamed to [data-testid='submit']",
    confidence: 0.92,
    suggestedRemediation: "Update selector to [data-testid='submit']",
    issueCategory: "locator_drift",
    structuredFeedback: {
      actionType: "locator_update",
      reasoning: "Locator mismatch",
      candidateLocators: ["[data-testid='submit']"],
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// buildPrCommentMarkdown — unit tests (pure function)
// ---------------------------------------------------------------------------

describe("buildPrCommentMarkdown", () => {
  it("includes header with branch and run number", () => {
    const md = buildPrCommentMarkdown([], baseSummary(), [], { enabled: true }, {
      branch: "feat/payment-flow",
      runNumber: "142",
    });
    expect(md).toContain("## 🎭 Test Report — `feat/payment-flow` · Run #142");
  });

  it("uses config.title when no branch is provided", () => {
    const md = buildPrCommentMarkdown([], baseSummary(), [], {
      enabled: true,
      title: "my-branch",
    }, {});
    expect(md).toContain("`my-branch`");
  });

  it("renders generic header when no branch or title", () => {
    const md = buildPrCommentMarkdown([], baseSummary(), [], { enabled: true }, {});
    expect(md).toContain("## 🎭 Test Report");
    expect(md).not.toContain("Run #");
  });

  it("includes commit label when provided", () => {
    const md = buildPrCommentMarkdown([], baseSummary(), [], { enabled: true }, {
      commit: "abc12345",
    });
    expect(md).toContain("commit `abc12345`");
  });

  it("renders passed count in summary table", () => {
    const md = buildPrCommentMarkdown([], baseSummary({ passed: 84, total: 89 }), [], { enabled: true });
    expect(md).toContain("| ✅ Passed | 84 |");
    expect(md).toContain("| 📊 Total | 89 |");
  });

  it("shows failed count only when > 0", () => {
    const withFailed = buildPrCommentMarkdown([], baseSummary({ failed: 3 }), [], { enabled: true });
    expect(withFailed).toContain("| ❌ Failed | 3 |");

    const noFailed = buildPrCommentMarkdown([], baseSummary({ failed: 0 }), [], { enabled: true });
    expect(noFailed).not.toContain("❌ Failed");
  });

  it("shows skipped and flaky only when > 0", () => {
    const md = buildPrCommentMarkdown([], baseSummary({ skipped: 2, flaky: 1 }), [], { enabled: true });
    expect(md).toContain("| ⏭️ Skipped | 2 |");
    expect(md).toContain("| ⚠️ Flaky | 1 |");
  });

  it("shows timedOut count when > 0", () => {
    const md = buildPrCommentMarkdown([], baseSummary({ timedOut: 1 }), [], { enabled: true });
    expect(md).toContain("| ⏱️ Timed Out | 1 |");
  });

  it("formats duration correctly", () => {
    const md = buildPrCommentMarkdown([], baseSummary({ durationMs: 252_000 }), [], { enabled: true });
    expect(md).toContain("4m 12s");
  });

  it("formats sub-minute duration without minutes", () => {
    const md = buildPrCommentMarkdown([], baseSummary({ durationMs: 45_000 }), [], { enabled: true });
    expect(md).toContain("45s");
  });

  it("formats sub-second duration in ms", () => {
    const md = buildPrCommentMarkdown([], baseSummary({ durationMs: 800 }), [], { enabled: true });
    expect(md).toContain("800ms");
  });

  it("lists failed tests with error message excerpt", () => {
    const tests = [
      baseTest({ status: "failed", fullName: "Checkout › Payment › 3DS", errorMessage: "Element not found: [data-testid='confirm-btn']" }),
    ];
    const md = buildPrCommentMarkdown(tests, baseSummary(), [], { enabled: true });
    expect(md).toContain("### ❌ Failed Tests");
    expect(md).toContain("`Checkout › Payment › 3DS`");
    expect(md).toContain("Element not found: [data-testid='confirm-btn']");
  });

  it("lists timedOut tests with ⏱️ icon", () => {
    const tests = [
      baseTest({ status: "timedOut", fullName: "Auth › SSO Redirect" }),
    ];
    const md = buildPrCommentMarkdown(tests, baseSummary(), [], { enabled: true });
    expect(md).toContain("⏱️ `Auth › SSO Redirect`");
  });

  it("truncates error message to 120 chars", () => {
    const longError = "A".repeat(200);
    const tests = [baseTest({ status: "failed", errorMessage: longError })];
    const md = buildPrCommentMarkdown(tests, baseSummary(), [], { enabled: true });
    expect(md).toContain("A".repeat(120));
    expect(md).not.toContain("A".repeat(121));
  });

  it("respects maxFailures limit", () => {
    const tests = Array.from({ length: 15 }, (_, i) =>
      baseTest({ id: `t${i}`, status: "failed", fullName: `Suite › Test ${i}` })
    );
    const md = buildPrCommentMarkdown(tests, baseSummary(), [], { enabled: true, maxFailures: 5 });
    expect(md).toContain("Test 4");
    expect(md).not.toContain("Test 5");
    expect(md).toContain("…and 10 more");
  });

  it("does not show failed section when no failures", () => {
    const tests = [baseTest({ status: "passed" })];
    const md = buildPrCommentMarkdown(tests, baseSummary({ failed: 0 }), [], { enabled: true });
    expect(md).not.toContain("### ❌ Failed Tests");
  });

  it("includes AI analysis summary with confidence", () => {
    const analyses = [baseAnalysis({ confidence: 0.92 })];
    const md = buildPrCommentMarkdown([], baseSummary(), analyses, { enabled: true });
    expect(md).toContain("🤖 **AI Analysis**");
    expect(md).toContain("92% confidence");
    expect(md).toContain("Element not found: selector drift detected");
  });

  it("includes AI analysis count when multiple analyses", () => {
    const analyses = [baseAnalysis(), baseAnalysis({ testName: "Other test" })];
    const md = buildPrCommentMarkdown([], baseSummary(), analyses, { enabled: true });
    expect(md).toContain("(2 failures analysed)");
  });

  it("includes artifact URL in report link", () => {
    const md = buildPrCommentMarkdown([], baseSummary(), [], {
      enabled: true,
      artifactUrl: "https://ci.example.com/report.html",
    });
    expect(md).toContain("[📊 Full Report →](https://ci.example.com/report.html)");
  });

  it("includes artifact URL in AI analysis link", () => {
    const analyses = [baseAnalysis()];
    const md = buildPrCommentMarkdown([], baseSummary(), analyses, {
      enabled: true,
      artifactUrl: "https://ci.example.com/report.html",
    });
    expect(md).toContain("[View full analysis →](https://ci.example.com/report.html)");
  });

  it("falls back to REPORT_ARTIFACT_URL env var for artifact link", () => {
    process.env.REPORT_ARTIFACT_URL = "https://env-url.example.com/report.html";
    try {
      const md = buildPrCommentMarkdown([], baseSummary(), [], { enabled: true });
      expect(md).toContain("[📊 Full Report →](https://env-url.example.com/report.html)");
    } finally {
      delete process.env.REPORT_ARTIFACT_URL;
    }
  });

  it("omits report link when no artifactUrl and no env var", () => {
    delete process.env.REPORT_ARTIFACT_URL;
    const md = buildPrCommentMarkdown([], baseSummary(), [], { enabled: true });
    expect(md).not.toContain("Full Report →");
  });

  it("full output includes all sections in order", () => {
    const tests = [
      baseTest({ status: "failed", fullName: "Suite › Test A", errorMessage: "Oops" }),
    ];
    const analyses = [baseAnalysis()];
    const md = buildPrCommentMarkdown(tests, baseSummary(), analyses, {
      enabled: true,
      artifactUrl: "https://ci.example.com/report.html",
    }, { branch: "main", runNumber: "10" });

    const headerIdx   = md.indexOf("## 🎭 Test Report");
    const tableIdx    = md.indexOf("| ✅ Passed");
    const failedIdx   = md.indexOf("### ❌ Failed Tests");
    const aiIdx       = md.indexOf("🤖 **AI Analysis**");
    const footerIdx   = md.indexOf("📊 Full Report →");

    expect(headerIdx).toBeLessThan(tableIdx);
    expect(tableIdx).toBeLessThan(failedIdx);
    expect(failedIdx).toBeLessThan(aiIdx);
    expect(aiIdx).toBeLessThan(footerIdx);
  });
});

// ---------------------------------------------------------------------------
// writePrComment — integration tests (writes file)
// ---------------------------------------------------------------------------

describe("writePrComment", () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it("writes pr-comment.md to outputDir by default", async () => {
    const tests = [baseTest({ status: "passed" })];
    const summary = baseSummary();
    await writePrComment(tests, summary, [], {
      outputDir: tmpDir,
      prComment: { enabled: true },
    });
    const content = fs.readFileSync(path.join(tmpDir, "pr-comment.md"), "utf-8");
    expect(content).toContain("## 🎭 Test Report");
    expect(content).toContain("| ✅ Passed |");
  });

  it("writes to custom outputPath when specified", async () => {
    const customPath = path.join(tmpDir, "custom", "comment.md");
    fs.mkdirSync(path.dirname(customPath), { recursive: true });
    await writePrComment([], baseSummary(), [], {
      outputDir: tmpDir,
      prComment: { enabled: true, outputPath: customPath },
    });
    expect(fs.existsSync(customPath)).toBe(true);
  });

  it("does nothing when prComment.enabled is false", async () => {
    await writePrComment([], baseSummary(), [], {
      outputDir: tmpDir,
      prComment: { enabled: false },
    });
    expect(fs.existsSync(path.join(tmpDir, "pr-comment.md"))).toBe(false);
  });

  it("does nothing when prComment config is absent", async () => {
    await writePrComment([], baseSummary(), [], { outputDir: tmpDir });
    expect(fs.existsSync(path.join(tmpDir, "pr-comment.md"))).toBe(false);
  });

  it("reads branch/commit from env vars and includes in output", async () => {
    vi.stubEnv("GITHUB_REF_NAME", "feat/pr-comment");
    vi.stubEnv("GITHUB_SHA", "deadbeef12345");
    try {
      await writePrComment([], baseSummary(), [], {
        outputDir: tmpDir,
        prComment: { enabled: true },
      });
      const content = fs.readFileSync(path.join(tmpDir, "pr-comment.md"), "utf-8");
      expect(content).toContain("`feat/pr-comment`");
      expect(content).toContain("`deadbeef`");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("includes artifact URL from config in written file", async () => {
    await writePrComment([], baseSummary(), [], {
      outputDir: tmpDir,
      prComment: {
        enabled: true,
        artifactUrl: "https://artifacts.example.com/report.html",
      },
    });
    const content = fs.readFileSync(path.join(tmpDir, "pr-comment.md"), "utf-8");
    expect(content).toContain("[📊 Full Report →](https://artifacts.example.com/report.html)");
  });
});
