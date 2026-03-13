import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AzureProvider } from "../src/ai/providers/azureProvider.js";
import { resolveProvider } from "../src/ai/analysisService.js";
import type { AIAnalysisInput, AIProviderConfig } from "../src/types/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseInput(overrides: Partial<AIAnalysisInput> = {}): AIAnalysisInput {
  return {
    testName: "Login › should log in",
    file: "tests/login.spec.ts",
    errorMessage: "Element not found: locator('#submit')",
    stackTrace: "Error: ...\n  at ...",
    ...overrides
  };
}

function baseConfig(overrides: Partial<AIProviderConfig> = {}): AIProviderConfig {
  return {
    provider: "azure",
    model: "claude-3-7-sonnet",
    apiKey: "test-azure-key",
    baseURL: "https://my-resource.services.ai.azure.com",
    ...overrides
  };
}

const validAIPayload = {
  summary: "Element not found due to locator drift",
  likelyRootCause: "Button id changed after deploy",
  confidence: 0.88,
  suggestedRemediation: "Use getByTestId instead of CSS id",
  issueCategory: "locator_drift",
  structuredFeedback: {
    actionType: "locator_update",
    reasoning: "Selector changed",
    suggestedPatch: "- page.click('#submit')\n+ page.getByTestId('submit').click()",
    candidateLocators: ["getByTestId('submit')"]
  }
};

function mockFetchSuccess(payload: object) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(payload) } }]
    })
  });
}

// ---------------------------------------------------------------------------
// AzureProvider — unit tests
// ---------------------------------------------------------------------------

describe("AzureProvider", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.AZURE_API_KEY;
  });

  it("throws when apiKey is missing and env var is not set", async () => {
    const provider = new AzureProvider();
    await expect(
      provider.analyzeFailure(baseInput(), baseConfig({ apiKey: undefined }))
    ).rejects.toThrow("Azure API key missing");
  });

  it("uses AZURE_API_KEY env var when apiKey not in config", async () => {
    process.env.AZURE_API_KEY = "env-azure-key";
    global.fetch = mockFetchSuccess(validAIPayload) as unknown as typeof fetch;

    const provider = new AzureProvider();
    const result = await provider.analyzeFailure(baseInput(), baseConfig({ apiKey: undefined }));
    expect(result.summary).toBe(validAIPayload.summary);
  });

  it("throws when baseURL is not provided", async () => {
    const provider = new AzureProvider();
    await expect(
      provider.analyzeFailure(baseInput(), baseConfig({ baseURL: undefined }))
    ).rejects.toThrow("Azure provider requires ai.baseURL");
  });

  it("returns a valid AIAnalysisResult on success", async () => {
    global.fetch = mockFetchSuccess(validAIPayload) as unknown as typeof fetch;

    const provider = new AzureProvider();
    const result = await provider.analyzeFailure(baseInput(), baseConfig());

    expect(result.testName).toBe("Login › should log in");
    expect(result.file).toBe("tests/login.spec.ts");
    expect(result.summary).toBe(validAIPayload.summary);
    expect(result.likelyRootCause).toBe(validAIPayload.likelyRootCause);
    expect(result.confidence).toBe(0.88);
    expect(result.issueCategory).toBe("locator_drift");
    expect(result.structuredFeedback.actionType).toBe("locator_update");
    expect(result.rawModelResponse).toBeDefined();
  });

  it("sends request to correct URL with default apiVersion", async () => {
    let capturedUrl = "";
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      capturedUrl = url;
      return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(validAIPayload) } }] }) };
    }) as unknown as typeof fetch;

    const provider = new AzureProvider();
    await provider.analyzeFailure(baseInput(), baseConfig());

    expect(capturedUrl).toBe(
      "https://my-resource.services.ai.azure.com/chat/completions?api-version=2024-05-01-preview"
    );
  });

  it("uses custom apiVersion when provided", async () => {
    let capturedUrl = "";
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      capturedUrl = url;
      return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(validAIPayload) } }] }) };
    }) as unknown as typeof fetch;

    const provider = new AzureProvider();
    await provider.analyzeFailure(baseInput(), baseConfig({ apiVersion: "2025-01-01-preview" }));

    expect(capturedUrl).toContain("api-version=2025-01-01-preview");
  });

  it("strips trailing slash from baseURL", async () => {
    let capturedUrl = "";
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      capturedUrl = url;
      return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(validAIPayload) } }] }) };
    }) as unknown as typeof fetch;

    const provider = new AzureProvider();
    await provider.analyzeFailure(
      baseInput(),
      baseConfig({ baseURL: "https://my-resource.services.ai.azure.com/" })
    );

    expect(capturedUrl).toBe(
      "https://my-resource.services.ai.azure.com/chat/completions?api-version=2024-05-01-preview"
    );
  });

  it("sends api-key header (not Authorization Bearer)", async () => {
    let capturedHeaders: Record<string, string> = {};
    global.fetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      capturedHeaders = init.headers as Record<string, string>;
      return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(validAIPayload) } }] }) };
    }) as unknown as typeof fetch;

    const provider = new AzureProvider();
    await provider.analyzeFailure(baseInput(), baseConfig());

    expect(capturedHeaders["api-key"]).toBe("test-azure-key");
    expect(capturedHeaders["Authorization"]).toBeUndefined();
  });

  it("throws on non-200 response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized"
    }) as unknown as typeof fetch;

    const provider = new AzureProvider();
    await expect(
      provider.analyzeFailure(baseInput(), baseConfig())
    ).rejects.toThrow("Azure AI request failed (401)");
  });

  it("throws when response has no choices content", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] })
    }) as unknown as typeof fetch;

    const provider = new AzureProvider();
    await expect(
      provider.analyzeFailure(baseInput(), baseConfig())
    ).rejects.toThrow("Azure AI response did not include text content");
  });

  it("parses fenced JSON blocks in response", async () => {
    const fenced = "```json\n" + JSON.stringify(validAIPayload) + "\n```";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: fenced } }] })
    }) as unknown as typeof fetch;

    const provider = new AzureProvider();
    const result = await provider.analyzeFailure(baseInput(), baseConfig());
    expect(result.confidence).toBe(0.88);
  });

  it("provider name is 'azure'", () => {
    expect(new AzureProvider().name).toBe("azure");
  });
});

// ---------------------------------------------------------------------------
// resolveProvider — azure integration
// ---------------------------------------------------------------------------

describe("resolveProvider with azure", () => {
  it("returns AzureProvider for provider='azure'", () => {
    const provider = resolveProvider(baseConfig());
    expect(provider).toBeInstanceOf(AzureProvider);
    expect(provider.name).toBe("azure");
  });

  it("still throws for unknown provider", () => {
    expect(() =>
      resolveProvider({ ...baseConfig(), provider: "custom" })
    ).toThrow("Custom AI provider selected but no providerFactory supplied.");
  });
});
