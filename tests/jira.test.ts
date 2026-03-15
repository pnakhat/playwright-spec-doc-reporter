import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildJiraCommentAdf } from "../src/jira/commentBuilder.js";
import { postJiraTestResults } from "../src/jira/index.js";
import type { HistoryData, JiraConfig, NormalizedTestResult } from "../src/types/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    tags: ["@SCRUM-1"],
    steps: [],
    ...overrides,
  };
}

function baseJiraConfig(overrides: Partial<JiraConfig> = {}): JiraConfig {
  return {
    enabled: true,
    baseUrl: "https://example.atlassian.net",
    email: "test@example.com",
    apiToken: "token123",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// buildJiraCommentAdf — unit tests
// ---------------------------------------------------------------------------

describe("buildJiraCommentAdf", () => {
  it("returns a valid ADF doc node", () => {
    const adf = buildJiraCommentAdf("SCRUM-1", [baseTest()], {}, true);
    expect(adf).toMatchObject({ type: "doc", version: 1 });
    expect(Array.isArray((adf as { content: unknown[] }).content)).toBe(true);
  });

  it("includes the issue key in the heading", () => {
    const adf = buildJiraCommentAdf("SCRUM-1", [baseTest()], {}, true);
    const json = JSON.stringify(adf);
    expect(json).toContain("SCRUM-1");
  });

  it("includes test fullName", () => {
    const adf = buildJiraCommentAdf("SCRUM-99", [baseTest()], {}, true);
    const json = JSON.stringify(adf);
    expect(json).toContain("Login › login with valid credentials");
  });

  it("includes error message for failed test", () => {
    const test = baseTest({
      status: "failed",
      errorMessage: "Expected element to be visible",
    });
    const adf = buildJiraCommentAdf("SCRUM-1", [test], {}, true);
    expect(JSON.stringify(adf)).toContain("Expected element to be visible");
  });

  it("includes step details when present", () => {
    const test = baseTest({
      steps: [
        { title: "Navigate to /login", category: "action", durationMs: 100, status: "passed", screenshots: [] },
        { title: "Click submit", category: "action", durationMs: 50, status: "failed", error: "Timeout", screenshots: [] },
      ],
    });
    const json = JSON.stringify(buildJiraCommentAdf("SCRUM-1", [test], {}, true));
    expect(json).toContain("Navigate to /login");
    expect(json).toContain("Click submit");
  });

  it("includes API traffic when entries present and includeApiTraffic=true", () => {
    const test = baseTest({
      apiEntries: [
        { kind: "request",  method: "POST", url: "/api/login", body: { email: "user@test.com" } },
        { kind: "response", status: 200,    url: "/api/login", body: { token: "abc" } },
      ],
    });
    const json = JSON.stringify(buildJiraCommentAdf("SCRUM-22", [test], {}, true));
    expect(json).toContain("POST");
    expect(json).toContain("/api/login");
    expect(json).toContain("codeBlock");
  });

  it("omits API traffic section when includeApiTraffic=false", () => {
    const test = baseTest({
      apiEntries: [
        { kind: "request", method: "GET", url: "/api/items" },
      ],
    });
    const adf = buildJiraCommentAdf("SCRUM-1", [test], {}, false);
    // codeBlock is only used for API traffic in this test case
    expect(JSON.stringify(adf)).not.toContain("codeBlock");
  });

  it("includes branch and commit in meta when provided", () => {
    const json = JSON.stringify(
      buildJiraCommentAdf("SCRUM-1", [baseTest()], { branch: "feat/login", commit: "abc1234" }, true)
    );
    expect(json).toContain("feat/login");
    expect(json).toContain("abc1234");
  });

  it("includes summary counts", () => {
    const tests = [
      baseTest({ id: "t1", status: "passed" }),
      baseTest({ id: "t2", status: "failed", errorMessage: "Boom" }),
    ];
    const json = JSON.stringify(buildJiraCommentAdf("SCRUM-5", tests, {}, true));
    expect(json).toContain("2 tests");
    expect(json).toContain("1 passed");
    expect(json).toContain("1 failed");
  });
});

// ---------------------------------------------------------------------------
// postJiraTestResults — unit tests (mocked fetch)
// ---------------------------------------------------------------------------

describe("postJiraTestResults", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("does nothing when jira.enabled is false", async () => {
    await postJiraTestResults([baseTest()], { jira: baseJiraConfig({ enabled: false }) });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing when jira config is absent", async () => {
    await postJiraTestResults([baseTest()], {});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing when no tests have Jira tags", async () => {
    const test = baseTest({ tags: ["@regression"] });
    await postJiraTestResults([test], { jira: baseJiraConfig() });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts one comment per unique issue key", async () => {
    const tests = [
      baseTest({ id: "t1", tags: ["@SCRUM-1"] }),
      baseTest({ id: "t2", tags: ["@SCRUM-1"] }),  // same key — should be one POST
      baseTest({ id: "t3", tags: ["@SCRUM-2"] }),  // different key — second POST
    ];
    await postJiraTestResults(tests, { jira: baseJiraConfig() });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("posts to the correct Jira comment endpoint", async () => {
    await postJiraTestResults(
      [baseTest({ tags: ["@SCRUM-42"] })],
      { jira: baseJiraConfig({ baseUrl: "https://myorg.atlassian.net" }) }
    );
    const [url] = fetchMock.mock.calls[0] as [string, unknown];
    expect(url).toBe("https://myorg.atlassian.net/rest/api/3/issue/SCRUM-42/comment");
  });

  it("uses Basic auth header with base64 email:token", async () => {
    await postJiraTestResults(
      [baseTest()],
      { jira: baseJiraConfig({ email: "user@example.com", apiToken: "mytoken" }) }
    );
    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    const expected = `Basic ${Buffer.from("user@example.com:mytoken").toString("base64")}`;
    expect((opts.headers as Record<string, string>)["Authorization"]).toBe(expected);
  });

  it("sends ADF body", async () => {
    await postJiraTestResults([baseTest()], { jira: baseJiraConfig() });
    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as { body: { type: string } };
    expect(body.body.type).toBe("doc");
  });

  it("falls back to JIRA_EMAIL and JIRA_API_TOKEN env vars", async () => {
    vi.stubEnv("JIRA_EMAIL", "env@example.com");
    vi.stubEnv("JIRA_API_TOKEN", "envtoken");
    await postJiraTestResults(
      [baseTest()],
      { jira: baseJiraConfig({ email: undefined, apiToken: undefined }) }
    );
    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    const expected = `Basic ${Buffer.from("env@example.com:envtoken").toString("base64")}`;
    expect((opts.headers as Record<string, string>)["Authorization"]).toBe(expected);
  });

  it("skips posting when email/token are missing", async () => {
    delete process.env.JIRA_EMAIL;
    delete process.env.JIRA_API_TOKEN;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await postJiraTestResults(
      [baseTest()],
      { jira: baseJiraConfig({ email: undefined, apiToken: undefined }) }
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("JIRA_EMAIL"));
    warnSpy.mockRestore();
  });

  it("skips passed test when commentOnPass=false", async () => {
    const test = baseTest({ status: "passed", tags: ["@SCRUM-1"] });
    await postJiraTestResults([test], { jira: baseJiraConfig({ commentOnPass: false }) });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips failed test when commentOnFail=false", async () => {
    const test = baseTest({ status: "failed", tags: ["@SCRUM-1"] });
    await postJiraTestResults([test], { jira: baseJiraConfig({ commentOnFail: false }) });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips skipped test by default (commentOnSkip defaults to false)", async () => {
    const test = baseTest({ status: "skipped", tags: ["@SCRUM-1"] });
    await postJiraTestResults([test], { jira: baseJiraConfig() });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts skipped test when commentOnSkip=true", async () => {
    const test = baseTest({ status: "skipped", tags: ["@SCRUM-1"] });
    await postJiraTestResults([test], { jira: baseJiraConfig({ commentOnSkip: true }) });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("handles a test tagged with multiple issue keys", async () => {
    const test = baseTest({ tags: ["@SCRUM-1", "@SCRUM-5"] });
    await postJiraTestResults([test], { jira: baseJiraConfig() });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("logs an error but does not throw when the API returns non-ok", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: async () => "Not allowed",
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      postJiraTestResults([baseTest()], { jira: baseJiraConfig() })
    ).resolves.not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Jira comment failed"),
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });

  // commentOnStatusChange tests
  describe("commentOnStatusChange", () => {
    function makeHistory(prevStatus: string): HistoryData {
      return {
        schemaVersion: "1.0",
        runs: [
          // previous run
          {
            runId: "prev",
            timestamp: new Date().toISOString(),
            passRate: 100,
            summary: { total: 1, passed: 1, failed: 0, skipped: 0, flaky: 0, durationMs: 0 },
            testSnapshots: [{ key: "tests/login.spec.ts::login with valid credentials", status: prevStatus, durationMs: 0 }],
          },
          // current run (appended by generateReport before Jira runs)
          {
            runId: "curr",
            timestamp: new Date().toISOString(),
            passRate: 100,
            summary: { total: 1, passed: 1, failed: 0, skipped: 0, flaky: 0, durationMs: 0 },
            testSnapshots: [{ key: "tests/login.spec.ts::login with valid credentials", status: "passed", durationMs: 0 }],
          },
        ],
      };
    }

    it("skips comment when status is unchanged from previous run", async () => {
      vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(makeHistory("passed")));
      const test = baseTest({ status: "passed" });
      await postJiraTestResults([test], { jira: baseJiraConfig({ commentOnStatusChange: true }) });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("posts comment when status changed (fail→pass)", async () => {
      vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(makeHistory("failed")));
      const test = baseTest({ status: "passed" });
      await postJiraTestResults([test], { jira: baseJiraConfig({ commentOnStatusChange: true }) });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("posts comment on first run (no previous history)", async () => {
      vi.spyOn(fs, "readFileSync").mockImplementation(() => { throw new Error("ENOENT"); });
      const test = baseTest({ status: "passed" });
      await postJiraTestResults([test], { jira: baseJiraConfig({ commentOnStatusChange: true }) });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    afterEach(() => { vi.restoreAllMocks(); });
  });
});
