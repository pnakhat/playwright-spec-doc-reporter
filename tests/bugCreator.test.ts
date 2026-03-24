/**
 * Unit tests for Jira Auto-Bug Creator
 *
 * Tests cover:
 * - fingerprintLabel: deterministic slug generation
 * - createJiraBugs: filtering, deduplication (in-memory + Jira label-based),
 *   issue creation details, attachments, error handling, env var fallback
 */
import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createJiraBugs, fingerprintLabel } from "../src/jira/bugCreator.js";
import type { AIAnalysisResult, JiraAutoBugConfig, NormalizedTestResult } from "../src/types/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseTest(overrides: Partial<NormalizedTestResult> = {}): NormalizedTestResult {
  return {
    id: "t1",
    suite: "Checkout",
    file: "tests/checkout.spec.ts",
    title: "checkout completes successfully",
    fullName: "Checkout › checkout completes successfully",
    status: "failed",
    expectedStatus: "passed",
    flaky: false,
    retries: 0,
    retryIndex: 0,
    durationMs: 3500,
    attachments: [],
    artifacts: { screenshots: [], videos: [], traces: [] },
    consoleLogs: [],
    tags: [],
    steps: [],
    ...overrides,
  };
}

function baseAnalysis(overrides: Partial<AIAnalysisResult> = {}): AIAnalysisResult {
  return {
    testName: "checkout completes successfully",
    summary: "Locator for submit button has drifted",
    likelyRootCause: "DOM structure changed after UI update",
    issueCategory: "locator_drift",
    confidence: 0.85,
    suggestedRemediation: "Update selector to use data-testid",
    structuredFeedback: {
      actionType: "locator_update",
      suggestedPatch: "- page.click('#submit')\n+ page.click('[data-testid=submit]')",
      candidateLocators: ["[data-testid=submit]"],
      failedLocator: "#submit",
    },
    ...overrides,
  };
}

function baseBugConfig(overrides: Partial<JiraAutoBugConfig> = {}): JiraAutoBugConfig {
  return {
    enabled: true,
    projectKey: "TEST",
    issueType: "Bug",
    defaultPriority: "Medium",
    labels: ["auto-generated", "playwright"],
    onlyForAIAnalyzed: false,
    deduplicateByTestName: false,
    includeScreenshots: true,
    includeVideos: true,
    includeApiTraffic: true,
    ...overrides,
  };
}

/** Find the issue-creation fetch call (not search or picker) */
function findCreateCall(calls: unknown[][]): unknown[] | undefined {
  return calls.find((args) => {
    const url = args[0] as string;
    return url.includes("/rest/api/3/issue") && !url.includes("picker") && !url.includes("search");
  });
}

// ---------------------------------------------------------------------------
// Setup mocked fetch
// ---------------------------------------------------------------------------

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url.includes("/search")) {
      return Promise.resolve({ ok: true, json: async () => ({ issues: [] }) });
    }
    // Create issue
    return Promise.resolve({ ok: true, json: async () => ({ key: "TEST-1" }) });
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// fingerprintLabel
// ---------------------------------------------------------------------------

describe("fingerprintLabel", () => {
  it("returns a glossy: prefixed label", () => {
    expect(fingerprintLabel("login works")).toMatch(/^glossy:/);
  });

  it("slugifies spaces and special characters", () => {
    expect(fingerprintLabel("Checkout › add item to cart")).toBe("glossy:checkout-add-item-to-cart");
  });

  it("lowercases the result", () => {
    expect(fingerprintLabel("MY TEST NAME")).toBe("glossy:my-test-name");
  });

  it("trims leading and trailing hyphens", () => {
    const label = fingerprintLabel("  spaced  ");
    expect(label).not.toMatch(/^glossy:-/);
    expect(label).not.toMatch(/-$/);
  });

  it("truncates to 50 chars after the prefix", () => {
    const long = "a".repeat(100);
    const label = fingerprintLabel(long);
    expect(label.replace("glossy:", "").length).toBeLessThanOrEqual(50);
  });

  it("two different test names produce different labels", () => {
    expect(fingerprintLabel("test A")).not.toBe(fingerprintLabel("test B"));
  });

  it("is deterministic — same input always produces same output", () => {
    expect(fingerprintLabel("login works")).toBe(fingerprintLabel("login works"));
  });
});

// ---------------------------------------------------------------------------
// createJiraBugs — basic filtering
// ---------------------------------------------------------------------------

describe("createJiraBugs — filtering", () => {
  const commonOpts = {
    jiraBaseUrl: "https://example.atlassian.net",
    email: "test@example.com",
    apiToken: "token123",
    outputDirAbs: "/tmp",
  };

  it("returns empty array and warns when projectKey is missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const results = await createJiraBugs({
      ...commonOpts,
      tests: [baseTest()],
      analyses: [],
      bugConfig: baseBugConfig({ projectKey: "" }),
    });
    expect(results).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("projectKey is not set"));
  });

  it("falls back to JIRA_PROJECT_KEY env var when projectKey is empty", async () => {
    vi.stubEnv("JIRA_PROJECT_KEY", "ENV-PROJ");
    const results = await createJiraBugs({
      ...commonOpts,
      tests: [baseTest()],
      analyses: [],
      bugConfig: baseBugConfig({ projectKey: "" }),
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe("created");
  });

  it("skips passed tests — only processes failed/timedOut", async () => {
    const results = await createJiraBugs({
      ...commonOpts,
      tests: [baseTest({ status: "passed" })],
      analyses: [],
      bugConfig: baseBugConfig(),
    });
    expect(results).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("processes timedOut tests as failures", async () => {
    const results = await createJiraBugs({
      ...commonOpts,
      tests: [baseTest({ status: "timedOut" })],
      analyses: [],
      bugConfig: baseBugConfig(),
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe("created");
  });

  it("skips test with no AI analysis when onlyForAIAnalyzed=true", async () => {
    const results = await createJiraBugs({
      ...commonOpts,
      tests: [baseTest()],
      analyses: [],
      bugConfig: baseBugConfig({ onlyForAIAnalyzed: true }),
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe("skipped");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates bug when onlyForAIAnalyzed=false and no AI analysis", async () => {
    const results = await createJiraBugs({
      ...commonOpts,
      tests: [baseTest()],
      analyses: [],
      bugConfig: baseBugConfig({ onlyForAIAnalyzed: false }),
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe("created");
  });

  it("creates bug when analysis is present regardless of onlyForAIAnalyzed", async () => {
    const results = await createJiraBugs({
      ...commonOpts,
      tests: [baseTest()],
      analyses: [baseAnalysis()],
      bugConfig: baseBugConfig({ onlyForAIAnalyzed: true }),
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe("created");
  });
});

// ---------------------------------------------------------------------------
// createJiraBugs — deduplication
// ---------------------------------------------------------------------------

describe("createJiraBugs — deduplication", () => {
  const commonOpts = {
    jiraBaseUrl: "https://example.atlassian.net",
    email: "test@example.com",
    apiToken: "token123",
    outputDirAbs: "/tmp",
  };

  it("skips creation when Jira label search finds an existing open bug", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/search")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ issues: [{ key: "TEST-99" }] }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ key: "TEST-1" }) });
    });

    const results = await createJiraBugs({
      ...commonOpts,
      tests: [baseTest()],
      analyses: [],
      bugConfig: baseBugConfig({ deduplicateByTestName: true }),
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe("duplicate");
    expect(results[0]!.issueKey).toBe("TEST-99");
  });

  it("creates bug even when existing bugs exist if deduplicateByTestName=false", async () => {
    const results = await createJiraBugs({
      ...commonOpts,
      tests: [baseTest()],
      analyses: [],
      bugConfig: baseBugConfig({ deduplicateByTestName: false }),
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe("created");
  });

  it("dedup JQL query uses label fingerprint, not fuzzy summary", async () => {
    await createJiraBugs({
      ...commonOpts,
      tests: [baseTest()],
      analyses: [],
      bugConfig: baseBugConfig({ deduplicateByTestName: true }),
    });
    const searchCall = (fetchMock.mock.calls as unknown[][]).find((args) =>
      (args[0] as string).includes("/search")
    );
    expect(searchCall).toBeTruthy();
    const url = searchCall![0] as string;
    // Must query by label fingerprint, not summary ~
    expect(decodeURIComponent(url)).toContain("labels");
    expect(decodeURIComponent(url)).toContain("glossy:");
    expect(decodeURIComponent(url)).not.toContain("summary ~");
  });

  it("dedup JQL excludes Closed and Resolved statuses, not just Done", async () => {
    await createJiraBugs({
      ...commonOpts,
      tests: [baseTest()],
      analyses: [],
      bugConfig: baseBugConfig({ deduplicateByTestName: true }),
    });
    const searchCall = (fetchMock.mock.calls as unknown[][]).find((args) =>
      (args[0] as string).includes("/search")
    );
    const url = decodeURIComponent(searchCall![0] as string);
    expect(url).toContain("Closed");
    expect(url).toContain("Resolved");
  });

  it("in-memory dedup prevents a second bug for the same title within one run", async () => {
    let createCount = 0;
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/search")) {
        return Promise.resolve({ ok: true, json: async () => ({ issues: [] }) });
      }
      createCount++;
      return Promise.resolve({ ok: true, json: async () => ({ key: `TEST-${createCount}` }) });
    });

    // Same title twice — should only create one bug
    const results = await createJiraBugs({
      ...commonOpts,
      tests: [
        baseTest({ id: "t1", title: "login fails" }),
        baseTest({ id: "t2", title: "login fails" }), // exact duplicate title
      ],
      analyses: [],
      bugConfig: baseBugConfig({ deduplicateByTestName: false }), // Jira dedup off, only in-memory
    });

    expect(results).toHaveLength(2);
    expect(results[0]!.status).toBe("created");
    expect(results[1]!.status).toBe("duplicate");
    expect(results[1]!.message).toContain("already created in this session");
    expect(createCount).toBe(1); // only one actual Jira API call
  });
});

// ---------------------------------------------------------------------------
// createJiraBugs — fingerprint label stamped on created bugs
// ---------------------------------------------------------------------------

describe("createJiraBugs — fingerprint label", () => {
  const commonOpts = {
    jiraBaseUrl: "https://example.atlassian.net",
    email: "test@example.com",
    apiToken: "token123",
    outputDirAbs: "/tmp",
  };

  it("stamps a glossy: fingerprint label on every created bug", async () => {
    await createJiraBugs({
      ...commonOpts,
      tests: [baseTest({ title: "checkout completes successfully" })],
      analyses: [],
      bugConfig: baseBugConfig(),
    });
    const createCall = findCreateCall(fetchMock.mock.calls as unknown[][]);
    expect(createCall).toBeTruthy();
    const [, opts] = createCall as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as { fields: { labels: string[] } };
    expect(body.fields.labels).toContain("glossy:checkout-completes-successfully");
  });

  it("fingerprint label is included alongside user-configured labels", async () => {
    await createJiraBugs({
      ...commonOpts,
      tests: [baseTest()],
      analyses: [],
      bugConfig: baseBugConfig({ labels: ["auto-generated", "e2e"] }),
    });
    const createCall = findCreateCall(fetchMock.mock.calls as unknown[][]);
    const [, opts] = createCall as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as { fields: { labels: string[] } };
    expect(body.fields.labels).toContain("auto-generated");
    expect(body.fields.labels).toContain("e2e");
    expect(body.fields.labels.some((l: string) => l.startsWith("glossy:"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createJiraBugs — issue creation details
// ---------------------------------------------------------------------------

describe("createJiraBugs — issue creation", () => {
  const commonOpts = {
    jiraBaseUrl: "https://example.atlassian.net",
    email: "test@example.com",
    apiToken: "token123",
    outputDirAbs: "/tmp",
  };

  it("returns correct issueKey and issueUrl on success", async () => {
    const results = await createJiraBugs({
      ...commonOpts,
      tests: [baseTest()],
      analyses: [],
      bugConfig: baseBugConfig(),
    });
    expect(results[0]!.issueKey).toBe("TEST-1");
    expect(results[0]!.issueUrl).toBe("https://example.atlassian.net/browse/TEST-1");
  });

  it("posts to the correct Jira REST endpoint", async () => {
    await createJiraBugs({
      ...commonOpts,
      tests: [baseTest()],
      analyses: [],
      bugConfig: baseBugConfig(),
    });
    const createCall = findCreateCall(fetchMock.mock.calls as unknown[][]);
    expect(createCall).toBeTruthy();
    expect(createCall![0]).toBe("https://example.atlassian.net/rest/api/3/issue");
  });

  it("sends correct projectKey, issueType, priority in body", async () => {
    await createJiraBugs({
      ...commonOpts,
      tests: [baseTest()],
      analyses: [],
      bugConfig: baseBugConfig({ projectKey: "MYPROJ", issueType: "Story", defaultPriority: "High" }),
    });
    const createCall = findCreateCall(fetchMock.mock.calls as unknown[][]);
    const [, opts] = createCall as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as {
      fields: { project: { key: string }; issuetype: { name: string }; priority: { name: string } };
    };
    expect(body.fields.project.key).toBe("MYPROJ");
    expect(body.fields.issuetype.name).toBe("Story");
    expect(body.fields.priority.name).toBe("High");
  });

  it("summary is prefixed with [Playwright] and includes test title", async () => {
    await createJiraBugs({
      ...commonOpts,
      tests: [baseTest({ title: "add item to cart" })],
      analyses: [],
      bugConfig: baseBugConfig(),
    });
    const createCall = findCreateCall(fetchMock.mock.calls as unknown[][]);
    const [, opts] = createCall as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as { fields: { summary: string } };
    expect(body.fields.summary).toMatch(/^\[Playwright\]/);
    expect(body.fields.summary).toContain("add item to cart");
  });

  it("description is an ADF doc node", async () => {
    await createJiraBugs({
      ...commonOpts,
      tests: [baseTest()],
      analyses: [baseAnalysis()],
      bugConfig: baseBugConfig(),
    });
    const createCall = findCreateCall(fetchMock.mock.calls as unknown[][]);
    const [, opts] = createCall as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as { fields: { description: { type: string; version: number } } };
    expect(body.fields.description.type).toBe("doc");
    expect(body.fields.description.version).toBe(1);
  });

  it("description includes AI analysis data when analysis is present", async () => {
    await createJiraBugs({
      ...commonOpts,
      tests: [baseTest()],
      analyses: [baseAnalysis({ summary: "Button selector changed" })],
      bugConfig: baseBugConfig(),
    });
    const createCall = findCreateCall(fetchMock.mock.calls as unknown[][]);
    const [, opts] = createCall as [string, RequestInit];
    expect(opts.body as string).toContain("Button selector changed");
  });

  it("handles error status from Jira API gracefully", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/search")) {
        return Promise.resolve({ ok: true, json: async () => ({ issues: [] }) });
      }
      return Promise.resolve({ ok: false, status: 400, text: async () => "Bad Request" });
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const results = await createJiraBugs({
      ...commonOpts,
      tests: [baseTest()],
      analyses: [],
      bugConfig: baseBugConfig(),
    });
    expect(results[0]!.status).toBe("error");
    expect(results[0]!.message).toContain("400");
    expect(errorSpy).toHaveBeenCalled();
  });

  it("uses Basic auth header for issue creation", async () => {
    await createJiraBugs({
      ...commonOpts,
      email: "admin@org.com",
      apiToken: "secret",
      tests: [baseTest()],
      analyses: [],
      bugConfig: baseBugConfig(),
    });
    const createCall = findCreateCall(fetchMock.mock.calls as unknown[][]);
    const [, opts] = createCall as [string, RequestInit];
    const expected = `Basic ${Buffer.from("admin@org.com:secret").toString("base64")}`;
    expect((opts.headers as Record<string, string>)["Authorization"]).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// createJiraBugs — attachments
// ---------------------------------------------------------------------------

describe("createJiraBugs — attachments", () => {
  const commonOpts = {
    jiraBaseUrl: "https://example.atlassian.net",
    email: "test@example.com",
    apiToken: "token123",
  };

  it("skips screenshot attachment when file does not exist", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    const results = await createJiraBugs({
      ...commonOpts,
      outputDirAbs: "/tmp",
      tests: [baseTest({ artifacts: { screenshots: ["screenshot.png"], videos: [], traces: [] } })],
      analyses: [],
      bugConfig: baseBugConfig({ includeScreenshots: true }),
    });
    expect(results[0]!.status).toBe("created");
    const attachCalls = (fetchMock.mock.calls as unknown[][]).filter((args) =>
      (args[0] as string).includes("/attachments")
    );
    expect(attachCalls).toHaveLength(0);
  });

  it("does not attempt screenshot attachment when includeScreenshots=false", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(Buffer.from("fake-image"));
    await createJiraBugs({
      ...commonOpts,
      outputDirAbs: "/tmp",
      tests: [baseTest({ artifacts: { screenshots: ["screenshot.png"], videos: [], traces: [] } })],
      analyses: [],
      bugConfig: baseBugConfig({ includeScreenshots: false }),
    });
    const attachCalls = (fetchMock.mock.calls as unknown[][]).filter((args) =>
      (args[0] as string).includes("/attachments")
    );
    expect(attachCalls).toHaveLength(0);
  });

  it("does not attempt video attachment when includeVideos=false", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(Buffer.from("fake-video"));
    await createJiraBugs({
      ...commonOpts,
      outputDirAbs: "/tmp",
      tests: [baseTest({ artifacts: { screenshots: [], videos: ["test.webm"], traces: [] } })],
      analyses: [],
      bugConfig: baseBugConfig({ includeVideos: false }),
    });
    const attachCalls = (fetchMock.mock.calls as unknown[][]).filter((args) =>
      (args[0] as string).includes("/attachments")
    );
    expect(attachCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// createJiraBugs — multiple tests
// ---------------------------------------------------------------------------

describe("createJiraBugs — multiple tests", () => {
  it("creates one bug per failing test", async () => {
    let callCount = 0;
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/search")) {
        return Promise.resolve({ ok: true, json: async () => ({ issues: [] }) });
      }
      callCount++;
      return Promise.resolve({ ok: true, json: async () => ({ key: `TEST-${callCount}` }) });
    });

    const results = await createJiraBugs({
      jiraBaseUrl: "https://example.atlassian.net",
      email: "test@example.com",
      apiToken: "token123",
      outputDirAbs: "/tmp",
      tests: [
        baseTest({ id: "t1", title: "test A" }),
        baseTest({ id: "t2", title: "test B" }),
      ],
      analyses: [],
      bugConfig: baseBugConfig(),
    });
    expect(results).toHaveLength(2);
    expect(results.every(r => r.status === "created")).toBe(true);
  });

  it("skips passed tests and creates bugs only for failed tests", async () => {
    const results = await createJiraBugs({
      jiraBaseUrl: "https://example.atlassian.net",
      email: "test@example.com",
      apiToken: "token123",
      outputDirAbs: "/tmp",
      tests: [
        baseTest({ id: "t1", title: "failing test", status: "failed" }),
        baseTest({ id: "t2", title: "passing test", status: "passed" }),
        baseTest({ id: "t3", title: "timed out test", status: "timedOut" }),
      ],
      analyses: [],
      bugConfig: baseBugConfig(),
    });
    expect(results).toHaveLength(2);
    expect(results.every(r => r.status === "created")).toBe(true);
  });
});
