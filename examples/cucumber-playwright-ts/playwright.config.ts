import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

/**
 * playwright-bdd configuration.
 * Converts .feature files into Playwright tests at build time.
 *
 * Feature files: features/*.feature
 * Step defs:     steps/*.ts + support/fixtures.ts
 *
 * Run:
 *   npx bddgen         — generate .features-gen/ from .feature files
 *   npx playwright test — run the generated tests + glossy reporter
 */
const testDir = defineBddConfig({
  features: "features/**/*.feature",
  steps: ["steps/**/*.ts", "support/fixtures.ts"],
});

export default defineConfig({
  testDir,
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL ?? "https://www.saucedemo.com",
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
        reportTitle: "Cucumber + Playwright TS — Glossy Report",
        includeScreenshots: true,
        includeVideos: true,
        includeTraces: true,
        // Enable playwright-bdd detection: extracts Feature/Scenario/tags from
        // generated tests and enriches the report with BDD metadata.
        cucumber: {
          enhancePlaywrightBdd: true,
          autoTags: ["@cucumber", "@playwright-bdd"],
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
