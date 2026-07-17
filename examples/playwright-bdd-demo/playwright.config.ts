import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

/**
 * playwright-bdd configuration.
 * `npx bddgen` compiles features/*.feature into Playwright tests under
 * .features-gen/, then `npx playwright test` runs them.
 *
 * The glossy reporter detects the generated tests, follows each spec's
 * "// Generated from:" header back to the source .feature file, and enriches
 * the report with the feature narrative, scenario descriptions, Rule names,
 * Examples rows, and Gherkin tags.
 */
const testDir = defineBddConfig({
  features: "features/**/*.feature",
  steps: "steps/**/*.ts",
});

export default defineConfig({
  testDir,
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
        reportTitle: "playwright-bdd Demo — Glossy Report",
        includeScreenshots: true,
        includeVideos: true,
        includeTraces: true,
        cucumber: {
          // Default is true — shown here for clarity. Detects playwright-bdd
          // generated tests and enriches them from the source .feature files.
          enhancePlaywrightBdd: true,
          autoTags: ["@cucumber", "@playwright-bdd"],
        },
        // Optional AI failure analysis — activates when the key is present.
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
