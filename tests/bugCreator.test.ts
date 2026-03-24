/**
 * Unit tests for Jira Auto-Bug Creator
 *
 * Tests cover:
 * - ADF description building (via exported internal helpers exposed through output shape)
 * - createJiraBugs: skipping, deduplication, issue creation, attachment, error handling
 * - projectKey env var fallback
 */
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createJiraBugs } from "../src/jira/bugCreator.js";
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
      actionType: "update_locator",
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

// ---------------------------------------------------------------------------
// Setup mocked fetch
// ---------------------------------------------------------------------------

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Default: JQL dedup returns no issues, create returns a new issue key
  fetchMock = vi.fn().mockImplementation((url: string) => {
    if (typeof url === "string" && url.includes("/search")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ issues: [] }),
      });
    }
    if (typeof url === "string" && url.includes("/issue/picker")) {
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }
    // Create issue
    return Promise.resolve({
      ok: true,
      json: async () => ({ key: "TEST-1" }),
    });
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
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
    // Should attempt bug creation (no warning), returns a result
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

  it("skips creation when existing open bug found (deduplicateByTestName=true)", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/issue/picker")) {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      if (typeof url === "string" && url.includes("/search")) {
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

  it("creates bug even if JQL search exists when deduplicateByTestName=false", async () => {
    const results = await createJiraBugs({
      ...commonOpts,
      tests: [baseTest()],
      analyses: [],
      bugConfig: baseBugConfig({ deduplicateByTestName: false }),
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe("created");
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
    const createCall = fetchMock.mock.calls.find(
      ([url]: [string]) => url.includes("/rest/api/3/issue") && !url.includes("picker") && !url.includes("search")
    );
    expect(createCall).toBeTruthy();
    const [url] = createCall as [string];
    expect(url).toBe("https://example.atlassian.net/rest/api/3/issue");
  });

  it("sends correct projectKey, issueType, priority, and labels in body", async () => {
    await createJiraBugs({
      ...commonOpts,
      tests: [baseTest()],
      analyses: [],
      bugConfig: baseBugConfig({ projectKey: "MYPROJ", issueType: "Story", defaultPriority: "High", labels: ["e2e"] }),
    });
    const createCall = fetchMock.mock.calls.find(
      ([url]: [string]) => url.includes("/rest/api/3/issue") && !url.includes("picker") && !url.includes("search")
    );
    const [, opts] = createCall as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as {
      fields: { project: { key: string }; issuetype: { name: string }; priority: { name: string }; labels: string[] };
    };
    expect(body.fields.project.key).toBe("MYPROJ");
    expect(body.fields.issuetype.name).toBe("Story");
    expect(body.fields.priority.name).toBe("High");
    expect(body.fields.labels).toContain("e2e");
  });

  it("summary is prefixed with [Playwright] and includes test title", async () => {
    await createJiraBugs({
      ...commonOpts,
      tests: [baseTest({ title: "add item to cart" })],
      analyses: [],
      bugConfig: baseBugConfig(),
    });
    const createCall = fetchMock.mock.calls.find(
      ([url]: [string]) => url.includes("/rest/api/3/issue") && !url.includes("picker") && !url.includes("search")
    );
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
    const createCall = fetchMock.mock.calls.find(
      ([url]: [string]) => url.includes("/rest/api/3/issue") && !url.includes("picker") && !url.includes("search")
    );
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
    const createCall = fetchMock.mock.calls.find(
      ([url]: [string]) => url.includes("/rest/api/3/issue") && !url.includes("picker") && !url.includes("search")
    );
    const [, opts] = createCall as [string, RequestInit];
    const bodyStr = opts.body as string;
    expect(bodyStr).toContain("Button selector changed");
  });

  it("handles error status from Jira API gracefully", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === "string" && (url.includes("/search") || url.includes("/picker"))) {
        return Promise.resolve({ ok: true, json: async () => ({ issues: [] }) });
      }
      return Promise.resolve({
        ok: false,
        status: 400,
        text: async () => "Bad Request",
      });
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
    const createCall = fetchMock.mock.calls.find(
      ([url]: [string]) => url.includes("/rest/api/3/issue") && !url.includes("picker") && !url.includes("search")
    );
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
    // No attachment API calls (only the issue creation + dedup calls)
    const attachCalls = fetchMock.mock.calls.filter(([url]: [string]) => url.includes("/attachments"));
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
    const attachCalls = fetchMock.mock.calls.filter(([url]: [string]) => url.includes("/attachments"));
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
    const attachCalls = fetchMock.mock.calls.filter(([url]: [string]) => url.includes("/attachments"));
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
      if (typeof url === "string" && (url.includes("/search") || url.includes("/picker"))) {
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
    // Only 2 bugs: failed + timedOut
    expect(results).toHaveLength(2);
    expect(results.every(r => r.status === "created")).toBe(true);
  });
});
