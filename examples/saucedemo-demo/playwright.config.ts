import { defineConfig } from "@playwright/test";

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
        reportTitle: "SauceDemo + API Validation Report",
        includeScreenshots: true,
        includeVideos: true,
        includeTraces: true,
        ai: {
          enabled: true,
          provider: "anthropic",
          model: "claude-sonnet-4-20250514",
          apiKey: process.env.ANTHROPIC_API_KEY,
          maxFailuresToAnalyze: 5
        },
        healing: {
          enabled: true,
          exportPath: "spec-doc-report/healing.json",
          exportMarkdownPath: "spec-doc-report/healing.md",
          analysisOnly: true
        }
      }
    ]
  ],
  use: {
    trace: "on-first-retry",
    screenshot: "on",
    video: "on"
  },
  projects: [
    {
      name: "chromium-ui",
      testMatch: /tests\/ui\/.*\.spec\.ts/,
      use: {
        browserName: "chromium",
        baseURL: "https://www.saucedemo.com"
      }
    },
    {
      name: "api",
      testMatch: /tests\/api\/.*\.spec\.ts/,
      use: {
        baseURL: "https://jsonplaceholder.typicode.com"
      }
    }
  ]
});
