import { defineConfig } from "@playwright/test";
import { SpecDocReporter } from "../../dist/index.js";

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
      SpecDocReporter,
      {
        outputDir: "spec-doc-report",
        reportTitle: "Example Spec Doc Report",
        includeScreenshots: true,
        includeVideos: true,
        includeTraces: true,
        ai: {
          enabled: true,
          provider: "openai",
          model: "gpt-4.1",
          maxFailuresToAnalyze: 5,
          apiKey: process.env.OPENAI_API_KEY
        },
        healing: {
          enabled: true,
          exportPath: "spec-doc-report/healing.json",
          exportMarkdownPath: "spec-doc-report/healing.md",
          analysisOnly: true
        }
      }
    ]
  ]
});
