// @ts-check
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: 1,
  fullyParallel: true,
  reporter: [
    ["list"],
    [
      "./reporter.mjs",
      {
        outputDir: "spec-doc-report",
        reportTitle: "Multi-Browser Stress Test Report",
        includeScreenshots: true,
        includeVideos: true,
        includeTraces: true,
        ai: {
          enabled: true,
          provider: "anthropic",
          model: "claude-sonnet-4-6",
          apiKey: process.env.ANTHROPIC_API_KEY,
          maxFailuresToAnalyze: 5
        },
        healing: {
          enabled: true,
          exportPath: "spec-doc-report/healing.json",
          exportMarkdownPath: "spec-doc-report/healing.md",
          analysisOnly: true
        },
        prComment: {
          enabled: true,
          artifactUrl: process.env.REPORT_ARTIFACT_URL,  // set by CI to the GitHub Pages live report URL
          maxFailures: 10
        },
        jira: {
          enabled: !!process.env.JIRA_API_TOKEN,
          baseUrl: process.env.JIRA_BASE_URL,   // e.g. https://yourorg.atlassian.net
          email: process.env.JIRA_EMAIL,
          apiToken: process.env.JIRA_API_TOKEN,
          includeScreenshots: true,
          includeApiTraffic: true,
          commentCooldownMs: 0,                 // set e.g. 3_600_000 to limit to once/hour
        },
        manualTests: {
          resultsPath: "tests/manual-results.md",
        }
      }
    ]
  ],
  use: {
    screenshot: "on",
    video: "on",
    trace: "on-first-retry"
  },
  projects: [
    // ── API (browser-agnostic, runs once) ───────────────────────────────────
    {
      name: "api",
      testMatch: /tests\/api\/.*\.spec\.js/,
      use: {
        baseURL: "https://jsonplaceholder.typicode.com"
      }
    },

    // ── UI — three browsers ─────────────────────────────────────────────────
    {
      name: "chromium",
      testMatch: /tests\/ui\/.*\.spec\.js/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "https://www.saucedemo.com"
      }
    },
    {
      name: "firefox",
      testMatch: /tests\/ui\/.*\.spec\.js/,
      use: {
        ...devices["Desktop Firefox"],
        baseURL: "https://www.saucedemo.com"
      }
    },
    {
      name: "webkit",
      testMatch: /tests\/ui\/.*\.spec\.js/,
      use: {
        ...devices["Desktop Safari"],
        baseURL: "https://www.saucedemo.com"
      }
    }
  ]
});
