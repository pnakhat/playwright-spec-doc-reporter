# playwright-spec-doc-reporter

A beautiful, production-ready Playwright reporter with BDD-style annotations, inline API request/response display, AI-powered failure analysis, test history trends, and self-healing payload exports.

---

## Screenshots

### Dashboard Overview
![Dashboard](docs/screenshots/dashboard.png)

### BDD Feature & Scenario View
![BDD View](docs/screenshots/api-viewer.png)

### Inline API Request / Response Viewer
![API Viewer](docs/screenshots/test-detail.png)

### Run History & Trends
![Trends](docs/screenshots/trends.png)

### AI Insights
![AI Insights](docs/screenshots/ai-insights.png)

---

## Features

- **Glossy HTML dashboard** — dark-themed interactive report with filter, sort, search, and failure drill-down
- **BDD annotations** — add Feature, Scenario, and Behaviour metadata directly in your tests
- **Inline API viewer** — attach request/response JSON directly to test results with syntax highlighting
- **AI failure analysis** — automatic root-cause analysis for failed tests (OpenAI, Anthropic, or custom)
- **Healing payloads** — structured JSON + Markdown export of suggested locator fixes and patches
- **History & trends** — pass-rate and duration charts across runs via `glossy-history.json`
- **Zero runtime dependencies** — single self-contained HTML file output

---

## Install

```bash
npm install -D playwright-spec-doc-reporter
```

`@playwright/test >= 1.44.0` is a peer dependency.

---

## Quick start

In `playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["list"],
    [
      "playwright-spec-doc-reporter",
      {
        outputDir: "spec-doc-report",
        reportTitle: "E2E Quality Report",
        includeScreenshots: true,
        includeVideos: true,
        includeTraces: true
      }
    ]
  ]
});
```

After each test run, `spec-doc-report/` will contain:

| File | Description |
|------|-------------|
| `index.html` | Self-contained interactive HTML report |
| `results.json` | Full normalized JSON for CI/CD processing |
| `spec-doc-history.json` | Per-run history for trend charts |
| `healing.json` | AI-suggested locator fixes (optional) |
| `healing.md` | Human-readable healing summary (optional) |

---

## BDD Annotations

Import annotation helpers from the `/annotations` sub-path and call them inside `test()` bodies.

```ts
import { addFeature, addScenario, addBehaviour } from "playwright-spec-doc-reporter/annotations";
```

### `addFeature(name, description?)`

Sets the Feature name and optional Gherkin-style narrative. Call once per `describe` block via `beforeEach`.

```ts
test.describe("Shopping Cart", () => {
  test.beforeEach(() => {
    addFeature(
      "Shopping Cart",
      "As a customer I want to add products to my cart so I can purchase them"
    );
  });

  test("add item to cart", async ({ page }) => { /* ... */ });
});
```

### `addScenario(description)`

Sets a scenario-level description (context / acceptance criteria) for the current test.

```ts
test("standard user can login and add item to cart", async ({ page }) => {
  addScenario("Verifies the happy-path for a standard user adding one item");
  // ...
});
```

### `addBehaviour(description)`

Adds a high-level human-readable behaviour step. These replace low-level Playwright step names in the BDD view and exported documentation.

```ts
test("login flow", async ({ page }) => {
  addBehaviour("User submits valid credentials on the login page");
  await page.goto("/login");
  await page.fill("#email", "user@example.com");
  await page.click("button[type=submit]");

  addBehaviour("User is redirected to the dashboard");
  await expect(page).toHaveURL("/dashboard");
});
```

---

## Inline API Request / Response

Attach request and response data so they appear inline in the report with syntax-highlighted JSON.

```ts
import {
  addFeature, addScenario, addBehaviour,
  addApiRequest, addApiResponse
} from "playwright-spec-doc-reporter/annotations";

test.describe("Posts API", () => {
  test.beforeEach(() => {
    addFeature("Posts API", "As a developer I want to validate the posts endpoints");
  });

  test("POST /posts creates a resource", async ({ request, baseURL }) => {
    addScenario("Verifies a new post is created and returned with an id");

    const payload = { title: "Hello", body: "World", userId: 1 };

    addBehaviour("Client sends POST request with post data");
    addApiRequest("POST", `${baseURL}/posts`, payload);
    const res = await request.post(`${baseURL}/posts`, { data: payload });
    const body = await res.json();
    addApiResponse(res.status(), body);

    addBehaviour("Response is 201 with the new resource including an id");
    expect(res.status()).toBe(201);
    expect(body).toMatchObject(payload);
  });
});
```

The report shows each request/response pair with method badge (colour-coded), URL, collapsible body with JSON syntax highlighting, and HTTP status badge.

### `addApiRequest(method, url, body?, headers?)`

| Param | Type | Description |
|-------|------|-------------|
| `method` | `string` | HTTP method (`GET`, `POST`, etc.) |
| `url` | `string` | Full request URL |
| `body` | `unknown` | Request body (JSON-serialized in the report) |
| `headers` | `Record<string, string>` | Request headers (shown collapsed) |

### `addApiResponse(status, body?, headers?)`

| Param | Type | Description |
|-------|------|-------------|
| `status` | `number` | HTTP status code |
| `body` | `unknown` | Response body (JSON-serialized in the report) |
| `headers` | `Record<string, string>` | Response headers (shown collapsed) |

---

## Reporter configuration

```ts
type GlossyReporterConfig = {
  /** Output directory. Default: "spec-doc-report" */
  outputDir?: string;

  /** Report title shown in the dashboard header. */
  reportTitle?: string;

  /** Include screenshots in the report. Default: true */
  includeScreenshots?: boolean;

  /** Include video recordings. Default: true */
  includeVideos?: boolean;

  /** Include Playwright traces. Default: true */
  includeTraces?: boolean;

  /** Visual theme. Currently only "dark-glossy". */
  theme?: "dark-glossy";

  /** AI failure analysis configuration. */
  ai?: {
    enabled: boolean;
    provider: "openai" | "anthropic" | "custom";
    model: string;
    apiKey?: string;
    baseURL?: string;
    maxTokens?: number;
    rateLimitPerMinute?: number;
    maxFailuresToAnalyze?: number;
    customPrompt?: string;
  };

  /** Healing payload export configuration. */
  healing?: {
    enabled: boolean;
    exportPath?: string;
    exportMarkdownPath?: string;
    analysisOnly?: boolean;
  };

  /** Factory for a custom AI provider. */
  providerFactory?: (config: AIProviderConfig) => AIProvider;
};
```

---

## AI failure analysis

When a test fails, the reporter automatically calls your configured AI provider to analyse the error, stack trace, and screenshot. Results appear inline in the report on the **AI Insights** tab and next to each failing test.

![AI Insights tab](docs/screenshots/ai-insights.png)

### What the AI analyses

For each failing test the AI receives:
- Full error message and stack trace
- Source code snippet around the failure line
- Screenshot path (if captured)
- Trace path (if captured)
- Console logs

### Analysis output schema

```ts
interface AIAnalysisResult {
  testName: string;
  file: string;

  /** One-sentence summary of the failure. */
  summary: string;

  /** Root cause hypothesis. */
  likelyRootCause: string;

  /** 0–1 confidence score. */
  confidence: number;

  /** Concrete suggested fix. */
  suggestedRemediation: string;

  /** Failure category for grouping/filtering. */
  issueCategory:
    | "locator_drift"    // selector no longer matches
    | "timing_issue"     // race condition / missing wait
    | "environment_issue"// env var, network, dependency
    | "test_data_issue"  // stale fixture or test data
    | "assertion_issue"  // wrong expected value
    | "app_bug"          // genuine regression
    | "unknown";

  structuredFeedback: {
    actionType:
      | "locator_update"  // replace the failing selector
      | "wait_strategy"   // add/change a wait
      | "data_fix"        // fix test data
      | "assertion_update"// update expected value
      | "infra_fix"       // environment-level fix
      | "investigate";    // needs manual investigation

    reasoning: string;

    /** Ready-to-paste code patch (when actionType = locator_update). */
    suggestedPatch?: string;

    /** Ranked alternative selectors (when actionType = locator_update). */
    candidateLocators?: string[];
  };
}
```

### OpenAI

```ts
ai: {
  enabled: true,
  provider: "openai",
  model: "gpt-4.1",              // or "gpt-4o", "gpt-4o-mini"
  apiKey: process.env.OPENAI_API_KEY,
  maxFailuresToAnalyze: 10,
  maxTokens: 1200,
  rateLimitPerMinute: 20          // avoid 429s on free tiers
}
```

### Anthropic

```ts
ai: {
  enabled: true,
  provider: "anthropic",
  model: "claude-sonnet-4-6",    // or "claude-opus-4-6", "claude-haiku-4-5"
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxFailuresToAnalyze: 10
}
```

### Custom prompt

Override the system prompt to focus analysis on your stack, framework, or naming conventions:

```ts
ai: {
  enabled: true,
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  apiKey: process.env.ANTHROPIC_API_KEY,
  customPrompt: `
    You are an expert in Playwright + React testing.
    Prioritise data-testid selectors over CSS classes.
    Suggest fixes that are compatible with our design system (MUI v5).
    Always provide a ready-to-paste code patch when the issue is a locator.
  `
}
```

### Custom provider

Bring your own LLM or internal AI service:

```ts
import type { AIProvider, AIProviderConfig } from "playwright-spec-doc-reporter";

const providerFactory = (_cfg: AIProviderConfig): AIProvider => ({
  name: "internal-llm",
  async analyzeFailure(input, cfg) {
    const response = await fetch("https://ai.internal/analyze", {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({ error: input.errorMessage, stack: input.stackTrace })
    });
    const data = await response.json();
    return {
      testName: input.testName,
      file: input.file,
      summary: data.summary,
      likelyRootCause: data.rootCause,
      confidence: data.confidence,
      suggestedRemediation: data.fix,
      issueCategory: data.category ?? "unknown",
      structuredFeedback: {
        actionType: data.actionType ?? "investigate",
        reasoning: data.reasoning,
        suggestedPatch: data.patch
      }
    };
  }
});
```

Pass the factory to the reporter config:

```ts
// playwright.config.ts
import { providerFactory } from "./my-ai-provider.js";

reporter: [["playwright-spec-doc-reporter", { ai: { enabled: true }, providerFactory }]]
```

### CI/CD environment variables

```bash
# .env or CI secrets
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

The `apiKey` field in config falls back to `process.env.OPENAI_API_KEY` / `process.env.ANTHROPIC_API_KEY` automatically when not set explicitly.

---

## Healing payloads

When AI analysis identifies locator issues (`issueCategory: "locator_drift"`), structured healing payloads are generated alongside the report.

```ts
healing: {
  enabled: true,
  exportPath: "spec-doc-report/healing.json",
  exportMarkdownPath: "spec-doc-report/healing.md",
  analysisOnly: true  // never auto-modifies test files
}
```

**Payload schema:**

```ts
interface HealingPayload {
  testName: string;
  file: string;
  stepName?: string;
  failedLocator?: string;
  candidateLocators: string[];  // ranked alternatives
  domContext?: string;          // surrounding HTML snippet
  errorMessage?: string;
  suggestedPatch?: string;      // ready-to-apply code change
  reasoning: string;
  confidence: number;           // 0–1
  actionType: string;
}
```

The `healing.md` export is human-readable and CI-comment-friendly.

---

## History & trends

The reporter automatically maintains `glossy-history.json` and records each run's pass rate, duration, and per-test status. The dashboard's **Trends** tab shows pass-rate charts and per-test stability indicators across runs.

---

## SDK

Use the internals directly without running Playwright:

```ts
import {
  buildGlossyHtml,
  generateReport,
  analyzeFailures,
  createHealingPayloads,
  healingPayloadsToMarkdown
} from "playwright-spec-doc-reporter";

// Render an HTML report from a saved results.json
const html = buildGlossyHtml(reportData, { outputDir: "." });
```

---

## TypeScript types

```ts
import type {
  GlossyReporterConfig,
  NormalizedTestResult,
  ApiEntry,
  AIAnalysisResult,
  HealingPayload,
  ReportData
} from "playwright-spec-doc-reporter";
```

---

## Requirements

- Node.js >= 18
- `@playwright/test` >= 1.44.0 (peer dependency)

---

## License

[MIT](LICENSE)
