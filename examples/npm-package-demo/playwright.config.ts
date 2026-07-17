import { defineConfig } from "@playwright/test";

// This demo intentionally consumes the reporter exactly as a published-npm
// consumer would: `playwright-spec-doc-reporter` resolves from the registry
// (see the "^1.0.0" range in package.json), not from a local file: path.
export default defineConfig({
  testDir: "./tests",
  retries: 1,
  use: {
    trace: "on-first-retry",
    screenshot: "on",
    video: "on"
  },
  reporter: [
    ["list"],
    [
      "./reporter.mjs",
      {
        outputDir: "spec-doc-report",
        reportTitle: "npm Package Demo Report",
        includeScreenshots: true,
        includeVideos: true,
        includeTraces: true
      }
    ]
  ]
});
