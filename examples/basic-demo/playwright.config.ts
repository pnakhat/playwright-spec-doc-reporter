import { defineConfig } from "@playwright/test";

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
        reportTitle: "Example Spec Doc Report",
        includeScreenshots: true,
        includeVideos: true,
        includeTraces: true,
        ai: {
          enabled: !!process.env.ANTHROPIC_API_KEY,
          provider: "anthropic",
          model: "claude-sonnet-4-6",
          apiKey: process.env.ANTHROPIC_API_KEY,
          maxFailuresToAnalyze: 5,
        },
        healing: {
          enabled: true,
          exportPath: "spec-doc-report/healing.json",
          exportMarkdownPath: "spec-doc-report/healing.md",
          analysisOnly: true,
          generatePR: !!process.env.GITHUB_TOKEN,
          autofix: {
            platform: "github",
            baseBranch: "main",
            draft: true,
            labels: ["auto-fix", "test-failure", "ai-generated"],
            minConfidence: 0.7,
            createBackup: true,
          },
        },
        jira: {
          enabled: !!process.env.JIRA_API_TOKEN,
          baseUrl: process.env.JIRA_BASE_URL ?? "https://yourorg.atlassian.net",
          email: process.env.JIRA_EMAIL,
          apiToken: process.env.JIRA_API_TOKEN,
          includeScreenshots: true,
          includeApiTraffic: true,
          autoBugs: {
            enabled: !!process.env.JIRA_API_TOKEN,
            projectKey: process.env.JIRA_PROJECT_KEY ?? "SCRUM",
            issueType: "Bug",
            defaultPriority: "Medium",
            labels: ["auto-generated", "playwright"],
            onlyForAIAnalyzed: false,
            deduplicateByTestName: true,
            includeScreenshots: true,
            includeVideos: true,
            includeApiTraffic: true,
          },
        },
      }
    ]
  ]
});
