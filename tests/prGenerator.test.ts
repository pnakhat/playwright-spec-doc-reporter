/**
 * Unit tests for prGenerator.ts (generateAutofixPR)
 *
 * All git operations and HTTP calls are mocked.
 * Tests cover:
 * - Early exit when no payloads have suggestedPatch
 * - GitHub PR creation: correct endpoint, headers, body fields
 * - Azure DevOps PR creation: correct endpoint, body
 * - Label creation + application (GitHub)
 * - Returns null on branch creation failure
 * - Returns null on API failure
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AIAnalysisResult, AutofixConfig, HealingPayload } from "../src/types/index.js";

// ---------------------------------------------------------------------------
// Mock branchManager so no real git runs
// ---------------------------------------------------------------------------

const mockBranchResult = {
  branchName: "autofix/login-test-2024-01-01T00-00-00",
  commitSha: "abc1234",
  patchedFiles: ["tests/login.spec.ts"],
  skippedFiles: [],
};

vi.mock("../src/autofix/branchManager.js", () => ({
  createAutofixBranch: vi.fn().mockResolvedValue(mockBranchResult),
  currentBranch: vi.fn().mockReturnValue("main"),
}));

const { createAutofixBranch } = await import("../src/autofix/branchManager.js");
const { generateAutofixPR } = await import("../src/autofix/prGenerator.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function basePayload(overrides: Partial<HealingPayload> = {}): HealingPayload {
  return {
    testName: "login works",
    file: "tests/login.spec.ts",
    confidence: 0.9,
    actionType: "update_locator",
    failedLocator: "#old-btn",
    candidateLocators: ["[data-testid=btn]"],
    suggestedPatch: "- page.click('#old-btn')\n+ page.click('[data-testid=btn]')",
    reasoning: "DOM updated",
    ...overrides,
  };
}

function baseAnalysis(overrides: Partial<AIAnalysisResult> = {}): AIAnalysisResult {
  return {
    testName: "login works",
    summary: "Locator drifted",
    likelyRootCause: "DOM changed",
    issueCategory: "locator_drift",
    confidence: 0.9,
    suggestedRemediation: "Update selector",
    structuredFeedback: {
      actionType: "update_locator",
      candidateLocators: [],
    },
    ...overrides,
  };
}

function githubConfig(overrides: Partial<AutofixConfig> = {}): AutofixConfig {
  return {
    platform: "github",
    githubToken: "ghp_testtoken",
    githubRepo: "owner/testrepo",
    baseBranch: "main",
    draft: true,
    labels: ["auto-fix", "test-failure"],
    minConfidence: 0.7,
    createBackup: false,
    ...overrides,
  };
}

function azureConfig(overrides: Partial<AutofixConfig> = {}): AutofixConfig {
  return {
    platform: "azure",
    azureToken: "azure-pat",
    azureOrg: "https://dev.azure.com/myorg",
    azureProject: "MyProject",
    azureRepo: "my-repo",
    baseBranch: "main",
    draft: false,
    labels: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup fetch mock
// ---------------------------------------------------------------------------

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ number: 42, html_url: "https://github.com/owner/testrepo/pull/42", pullRequestId: 7 }),
    text: async () => "",
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(createAutofixBranch).mockResolvedValue(mockBranchResult);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Early exit conditions
// ---------------------------------------------------------------------------

describe("generateAutofixPR — early exit", () => {
  it("returns null when no payloads have suggestedPatch", async () => {
    const result = await generateAutofixPR({
      payloads: [basePayload({ suggestedPatch: undefined })],
      analyses: [],
      autofixConfig: githubConfig(),
      cwd: "/repo",
    });
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null when createAutofixBranch throws", async () => {
    vi.mocked(createAutofixBranch).mockRejectedValueOnce(new Error("git push failed"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await generateAutofixPR({
      payloads: [basePayload()],
      analyses: [],
      autofixConfig: githubConfig(),
      cwd: "/repo",
    });

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Auto-PR branch creation failed"),
      expect.stringContaining("git push failed")
    );
  });

  it("returns null when GitHub API returns error", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 422, text: async () => "invalid base" });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await generateAutofixPR({
      payloads: [basePayload()],
      analyses: [],
      autofixConfig: githubConfig(),
      cwd: "/repo",
    });

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Auto-PR API call failed"),
      expect.any(String)
    );
  });
});

// ---------------------------------------------------------------------------
// GitHub PR creation
// ---------------------------------------------------------------------------

describe("generateAutofixPR — GitHub", () => {
  it("calls GitHub pulls API with correct URL", async () => {
    await generateAutofixPR({
      payloads: [basePayload()],
      analyses: [],
      autofixConfig: githubConfig(),
      cwd: "/repo",
    });

    const prCall = fetchMock.mock.calls.find(
      ([url]: [string]) => url === "https://api.github.com/repos/owner/testrepo/pulls"
    );
    expect(prCall).toBeTruthy();
  });

  it("uses Bearer token auth", async () => {
    await generateAutofixPR({
      payloads: [basePayload()],
      analyses: [],
      autofixConfig: githubConfig({ githubToken: "ghp_mytoken" }),
      cwd: "/repo",
    });

    const prCall = fetchMock.mock.calls.find(
      ([url]: [string]) => url === "https://api.github.com/repos/owner/testrepo/pulls"
    );
    const [, opts] = prCall as [string, RequestInit];
    expect((opts.headers as Record<string, string>)["Authorization"]).toBe("Bearer ghp_mytoken");
  });

  it("sets draft=true in request body", async () => {
    await generateAutofixPR({
      payloads: [basePayload()],
      analyses: [],
      autofixConfig: githubConfig({ draft: true }),
      cwd: "/repo",
    });

    const prCall = fetchMock.mock.calls.find(
      ([url]: [string]) => url === "https://api.github.com/repos/owner/testrepo/pulls"
    );
    const [, opts] = prCall as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as { draft: boolean; head: string; base: string };
    expect(body.draft).toBe(true);
    expect(body.head).toBe(mockBranchResult.branchName);
    expect(body.base).toBe("main");
  });

  it("returns correct platform and prUrl on success", async () => {
    const result = await generateAutofixPR({
      payloads: [basePayload()],
      analyses: [],
      autofixConfig: githubConfig(),
      cwd: "/repo",
    });

    expect(result).not.toBeNull();
    expect(result!.platform).toBe("github");
    expect(result!.prUrl).toBe("https://github.com/owner/testrepo/pull/42");
    expect(result!.branchName).toBe(mockBranchResult.branchName);
    expect(result!.commitSha).toBe(mockBranchResult.commitSha);
    expect(result!.patchedFiles).toEqual(mockBranchResult.patchedFiles);
  });

  it("falls back to GITHUB_TOKEN env var when githubToken not set", async () => {
    vi.stubEnv("GITHUB_TOKEN", "env-token");
    vi.stubEnv("GITHUB_REPOSITORY", "owner/testrepo");

    await generateAutofixPR({
      payloads: [basePayload()],
      analyses: [],
      autofixConfig: { platform: "github", baseBranch: "main" }, // no explicit token
      cwd: "/repo",
    });

    const prCall = fetchMock.mock.calls.find(
      ([url]: [string]) => url === "https://api.github.com/repos/owner/testrepo/pulls"
    );
    const [, opts] = prCall as [string, RequestInit];
    expect((opts.headers as Record<string, string>)["Authorization"]).toBe("Bearer env-token");
  });

  it("throws (returns null) when githubToken is missing", async () => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_REPOSITORY;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await generateAutofixPR({
      payloads: [basePayload()],
      analyses: [],
      autofixConfig: { platform: "github", baseBranch: "main" },
      cwd: "/repo",
    });

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Auto-PR API call failed"),
      expect.stringContaining("GITHUB_TOKEN")
    );
  });

  it("creates labels via GitHub API when labels are provided", async () => {
    await generateAutofixPR({
      payloads: [basePayload()],
      analyses: [],
      autofixConfig: githubConfig({ labels: ["auto-fix", "test-failure"] }),
      cwd: "/repo",
    });

    const labelCreationCalls = fetchMock.mock.calls.filter(
      ([url]: [string]) => url === "https://api.github.com/repos/owner/testrepo/labels"
    );
    expect(labelCreationCalls.length).toBe(2); // one per label

    const labelApplicationCall = fetchMock.mock.calls.find(
      ([url]: [string]) => url === "https://api.github.com/repos/owner/testrepo/issues/42/labels"
    );
    expect(labelApplicationCall).toBeTruthy();
  });

  it("skips label API calls when labels array is empty", async () => {
    await generateAutofixPR({
      payloads: [basePayload()],
      analyses: [],
      autofixConfig: githubConfig({ labels: [] }),
      cwd: "/repo",
    });

    const labelCalls = fetchMock.mock.calls.filter(
      ([url]: [string]) => url.includes("/labels")
    );
    expect(labelCalls).toHaveLength(0);
  });

  it("PR body includes test name in title", async () => {
    await generateAutofixPR({
      payloads: [basePayload({ testName: "My special test" })],
      analyses: [],
      autofixConfig: githubConfig(),
      cwd: "/repo",
    });

    const prCall = fetchMock.mock.calls.find(
      ([url]: [string]) => url === "https://api.github.com/repos/owner/testrepo/pulls"
    );
    const [, opts] = prCall as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as { title: string };
    expect(body.title).toContain("My special test");
  });

  it("PR body includes AI analysis data", async () => {
    await generateAutofixPR({
      payloads: [basePayload()],
      analyses: [baseAnalysis({ suggestedRemediation: "Use data-testid" })],
      autofixConfig: githubConfig(),
      cwd: "/repo",
    });

    const prCall = fetchMock.mock.calls.find(
      ([url]: [string]) => url === "https://api.github.com/repos/owner/testrepo/pulls"
    );
    const [, opts] = prCall as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as { body: string };
    expect(body.body).toContain("Use data-testid");
  });
});

// ---------------------------------------------------------------------------
// Azure DevOps PR creation
// ---------------------------------------------------------------------------

describe("generateAutofixPR — Azure DevOps", () => {
  it("calls Azure pullrequests API", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ pullRequestId: 99 }),
      text: async () => "",
    });

    await generateAutofixPR({
      payloads: [basePayload()],
      analyses: [],
      autofixConfig: azureConfig(),
      cwd: "/repo",
    });

    const azureCall = fetchMock.mock.calls.find(
      ([url]: [string]) => url.includes("pullrequests")
    );
    expect(azureCall).toBeTruthy();
    const [url] = azureCall as [string];
    expect(url).toContain("api-version=7.1");
    expect(url).toContain("MyProject");
    expect(url).toContain("my-repo");
  });

  it("uses Basic auth with base64 PAT for Azure", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ pullRequestId: 99 }),
      text: async () => "",
    });

    await generateAutofixPR({
      payloads: [basePayload()],
      analyses: [],
      autofixConfig: azureConfig({ azureToken: "my-pat" }),
      cwd: "/repo",
    });

    const azureCall = fetchMock.mock.calls.find(
      ([url]: [string]) => url.includes("pullrequests")
    );
    const [, opts] = azureCall as [string, RequestInit];
    const expected = `Basic ${Buffer.from(":my-pat").toString("base64")}`;
    expect((opts.headers as Record<string, string>)["Authorization"]).toBe(expected);
  });

  it("sets isDraft in Azure body", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ pullRequestId: 7 }),
      text: async () => "",
    });

    await generateAutofixPR({
      payloads: [basePayload()],
      analyses: [],
      autofixConfig: azureConfig({ draft: true }),
      cwd: "/repo",
    });

    const azureCall = fetchMock.mock.calls.find(
      ([url]: [string]) => url.includes("pullrequests")
    );
    const [, opts] = azureCall as [string, RequestInit];
    const body = JSON.parse(opts.body as string) as { isDraft: boolean; sourceRefName: string; targetRefName: string };
    expect(body.isDraft).toBe(true);
    expect(body.sourceRefName).toContain(mockBranchResult.branchName);
    expect(body.targetRefName).toBe("refs/heads/main");
  });

  it("returns correct platform and prUrl on success", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ pullRequestId: 55 }),
      text: async () => "",
    });

    const result = await generateAutofixPR({
      payloads: [basePayload()],
      analyses: [],
      autofixConfig: azureConfig(),
      cwd: "/repo",
    });

    expect(result).not.toBeNull();
    expect(result!.platform).toBe("azure");
    expect(result!.prUrl).toContain("pullrequest/55");
  });

  it("returns null when Azure API fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => "Bad Request" });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await generateAutofixPR({
      payloads: [basePayload()],
      analyses: [],
      autofixConfig: azureConfig(),
      cwd: "/repo",
    });

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("throws (returns null) when azureToken is missing", async () => {
    delete process.env.AZDO_TOKEN;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await generateAutofixPR({
      payloads: [basePayload()],
      analyses: [],
      autofixConfig: { platform: "azure", azureOrg: "https://dev.azure.com/org", azureProject: "proj", azureRepo: "repo" },
      cwd: "/repo",
    });

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Auto-PR API call failed"),
      expect.stringContaining("AZDO_TOKEN")
    );
  });
});
