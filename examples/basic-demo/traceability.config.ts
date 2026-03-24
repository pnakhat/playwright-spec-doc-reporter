import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  retries: 1,
  use: { screenshot: "only-on-failure", video: "off" },
  reporter: [
    ["list"],
    ["./node_modules/playwright-spec-doc-reporter/dist/reporter-entry.js", {
      outputDir: "spec-doc-report",
      reportTitle: "Basic Demo — Traceability + AI Report",
      includeScreenshots: true,
      includeVideos: false,
      includeTraces: false,
      ai: {
        enabled: true,
        provider: "anthropic",
        model: "claude-opus-4-5",
        apiKey: process.env.ANTHROPIC_API_KEY,
        maxFailuresToAnalyze: 5
      },
      healing: {
        enabled: true
      }
    }]
  ]
});
