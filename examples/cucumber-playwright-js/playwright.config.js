// @ts-check
import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config that ingests a Cucumber JSON report produced by
 * `npm run test:cucumber` and merges it into the glossy HTML report.
 *
 * This config also contains regular Playwright tests in tests/ for
 * demonstrating side-by-side display of both kinds of results.
 *
 * Workflow:
 *   1. npm run test:cucumber         → runs @cucumber/cucumber → cucumber-report.json
 *   2. npm run test:playwright       → runs Playwright tests → glossy-report/
 *      (the glossy reporter reads cucumber-report.json and merges it in)
 *   3. open glossy-report/index.html
 */
export default defineConfig({
  testDir: "./tests",
  retries: 1,
  use: {
    screenshot: "on",
    video: "on-first-retry",
    trace: "on-first-retry",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  reporter: [
    ["list"],
    [
      "./reporter.mjs",
      {
        outputDir: "glossy-report",
        reportTitle: "Cucumber + Playwright JS Report",
        includeScreenshots: true,
        includeVideos: true,
        includeTraces: true,
        // Ingest the Cucumber JSON report produced by `npm run test:cucumber`
        // and merge all scenarios into the glossy report alongside any
        // regular Playwright tests in tests/
        cucumber: {
          jsonReports: "cucumber-report.json",
          enhancePlaywrightBdd: true,
          autoTags: ["@cucumber"],
        },
        ai: {
          enabled: !!process.env.ANTHROPIC_API_KEY,
          provider: "anthropic",
          model: "claude-sonnet-4-6",
          apiKey: process.env.ANTHROPIC_API_KEY,
          maxFailuresToAnalyze: 5,
        },
      },
    ],
  ],
});
