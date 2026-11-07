# MCP server

Expose report data to AI agents over the Model Context Protocol.

Expose your latest run to AI coding agents (Claude Code, Cursor, etc.) over the
[Model Context Protocol](https://modelcontextprotocol.io). The server reads the
artifacts the reporter already writes (`results.json`, `spec-doc-history.json`,
`traceability.json`) and serves them as tools, so an agent can ask "what failed?"
or "show me the healing payload for the login test" and act on the answer.

## Quick start (stdio)

```bash
# 1. Install the optional MCP dependencies (kept out of the core install)
npm install @modelcontextprotocol/sdk zod express

# 2. Run your suite so the reporter writes spec-doc-report/
npx playwright test

# 3. Start the server over stdio, pointed at the reporter's output dir
npx playwright-spec-doc-reporter mcp --stdio --output spec-doc-report
```

## Claude Code / `mcp.json`

```json
{
  "mcpServers": {
    "spec-doc-reporter": {
      "command": "npx",
      "args": [
        "playwright-spec-doc-reporter",
        "mcp",
        "--stdio",
        "--output",
        "spec-doc-report"
      ]
    }
  }
}
```

## Tools

| Tool | Purpose |
|------|---------|
| `get_run_summary` | Totals, pass rate, environment, AI/healing status |
| `get_failed_tests` | Failed (and optionally flaky) tests with error messages |
| `get_test_detail` | Full detail for one test + AI analysis + healing payloads |
| `get_healing_payloads` | Self-healing locator suggestions |
| `get_trends` | Historical run snapshots (most recent first) |
| `get_root_cause_trends` | Category-mix-over-time summary (locator_drift vs app_bug etc.), pre-aggregated |
| `get_traceability` | Spec-to-test mapping and coverage stats |
| `trigger_rerun` | Re-run the suite (optional `--grep`/`--project`), capture output |
| `analyze_run` | **Agentic run analysis** — step-overlap groups, API-convertibility scores, timing/API correlations, prioritised refactoring recommendations |

## `analyze_run` — Agentic Run Analysis

`analyze_run` is the flagship agentic tool. It analyses the most recent run and tells an AI agent exactly where to focus refactoring effort:

**Input parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `overlapThreshold` | number (0–1) | `0.6` | Jaccard similarity cut-off for step-overlap groups |
| `minConversionScore` | number (0–1) | `0.5` | Minimum API-convertibility score to include a candidate |
| `includePassedTests` | boolean | `true` | Include passing tests in overlap/API analysis |

**Output shape:**

```json
{
  "runHealth": {
    "passRate": 50,
    "totalTests": 6,
    "failedTests": 2,
    "flakyTests": 1,
    "trendDirection": "degrading",
    "passRateDelta": -17
  },
  "overlapGroups": [
    {
      "testIds": ["t-login-a", "t-login-b"],
      "testTitles": ["admin login", "user login"],
      "sharedSteps": ["navigate to /login", "fill username field", "click submit button", ...],
      "similarity": 0.83,
      "recommendation": "extract_page_object"
    }
  ],
  "apiCandidates": [
    {
      "testId": "t-cart-remove",
      "conversionClass": "network-interception",
      "conversionScore": 0.75,
      "endpoints": ["GET /api/cart", "DELETE /api/cart/items"],
      "suggestion": "Introduce network interception (page.route) ..."
    }
  ],
  "timingIssueApiCorrelations": [...],
  "recommendations": [
    { "priority": "high", "type": "add_network_interception", "affectedTestIds": [...], "action": "..." }
  ],
  "summary": "Run health: 50% pass rate ... trend degrading. 1 step-overlap group(s) ..."
}
```

**Example agentic workflow** (Claude Code + MCP server):

```
# 1. Start the MCP server pointing at your last report
npx playwright-spec-doc-reporter mcp --stdio --output spec-doc-report

# 2. In your AI agent session:
#    "Call analyze_run and tell me what to refactor first"

# 3. The agent calls analyze_run, reads the recommendations list,
#    and generates the exact fixture/helper code to address the
#    highest-priority overlap groups and API-conversion candidates.
```

## Enabling the Agentic Insights UI widget

When `agenticAnalysis.enabled: true` is set in the reporter config, the analysis is computed at the end of each run and embedded directly in the HTML report as an **Agentic Insights** section on the Overview page. No separate tool call is needed.

```ts
// playwright.config.ts
["playwright-spec-doc-reporter", {
  agenticAnalysis: {
    enabled: true,
    overlapThreshold: 0.6,       // optional — default 0.6
    minConversionScore: 0.5,     // optional — default 0.5
  }
}]
```

The widget shows:
- A one-paragraph prose summary of the run's key issues
- A prioritised recommendation list (🔴 high / 🟡 medium / 🟢 low)
- A collapsible **Step Overlap Groups** panel listing tests sharing similar setup steps
- A collapsible **API Conversion Opportunities** panel sorted by conversion score

## Adding API traffic for better analysis

To give `analyze_run` the richest signal, annotate your tests with the request/response entries they make:

```ts
import { addApiRequest, addApiResponse } from "playwright-spec-doc-reporter/annotations";

test("checkout completes", async ({ page, request }) => {
  const res = await request.post("/api/orders", { data: { cartId: "c1" } });

  addApiRequest(test, "POST", "/api/orders", { cartId: "c1" });
  addApiResponse(test, res.status(), await res.json());

  // ... rest of the test
});
```

Tests with captured `apiEntries` get precise API-convertibility scores. Tests without them are scored only on step-title keywords (`GET`, `POST`, `fetch`, `request`, etc.).

**Migration note for E2E test suites:** When `analyze_run` reports an `extract_page_object` overlap group, the recommended refactoring is to use `test.extend` from `@playwright/test` to create a typed fixture that centralizes the shared navigation/setup steps. This eliminates repeated `beforeEach` boilerplate and makes tests more readable.

```ts
// tests/e2e/fixtures.ts
import { test as base } from "@playwright/test";

export const test = base.extend({
  loginPage: async ({}, use) => {
    await use({
      async login(page, username, password) {
        await page.goto("/login");
        await page.fill("#username", username);
        await page.fill("#password", password);
        await page.click("[type=submit]");
      }
    });
  }
});
```

## Transports & flags

| Flag | Description |
|------|-------------|
| `--stdio` | Stdio transport (local agents) |
| `--port <n>` | HTTP/SSE transport on this port |
| `--output <path>` | Reporter output directory (default `spec-doc-report`) |
| `--token <secret>` | Require `Authorization: Bearer <secret>` (SSE) |
| `--cors <origin>` | CORS allow-origin for SSE (default `*`) |
| `--log-level <level>` | `error` \| `warn` \| `info` \| `debug` (default `warn`) |
| `--watch` | Watch the output dir and emit change notifications (needs `chokidar`) |

The MCP dependencies are **optional** — the core reporter stays dependency-free.
If they are missing, the `mcp` command prints an install hint and exits.
