# Configuration reference

Every reporter option, with defaults.

```ts
type SpecDocReporterConfig = {
  /** Output directory. Default: "spec-doc-report" */
  outputDir?: string;

  /** Report title shown in the dashboard header. */
  reportTitle?: string;

  /** Include screenshots in the report. Default: true */
  includeScreenshots?: boolean;

  /** Include video recordings. Default: true */
  includeVideos?: boolean;

  /** Include Playwright traces. Default: true */
  includeTraces?: boolean;

  /** Write ctrf.json (https://ctrf.io). Default: true */
  ctrf?: boolean;

  /** Append a summary to $GITHUB_STEP_SUMMARY when set. Default: true */
  githubSummary?: boolean;

  /** AI failure analysis configuration. */
  ai?: {
    enabled: boolean;
    provider: "openai" | "anthropic" | "azure" | "azure-claude" | "custom";
    model: string;
    apiKey?: string;
    baseURL?: string;
    maxTokens?: number;
    rateLimitPerMinute?: number;
    maxFailuresToAnalyze?: number;
    customPrompt?: string;
  };

  /** Healing payload export + auto-PR configuration. */
  healing?: {
    enabled: boolean;
    exportPath?: string;
    exportMarkdownPath?: string;
    analysisOnly?: boolean;

    /**
     * Automatically create a topic branch, apply AI patches, and open a
     * draft PR after each run. Requires ai.enabled: true + autofix credentials.
     */
    generatePR?: boolean;

    /** Platform, branch, and credentials for the auto-PR workflow. */
    autofix?: {
      platform?: "github" | "azure";   // default: "github"
      baseBranch?: string;             // default: "main"
      draft?: boolean;                 // default: true
      labels?: string[];               // default: ["auto-fix","test-failure","ai-generated"]
      minConfidence?: number;          // 0–1, default: 0.7
      createBackup?: boolean;          // backup original files, default: true
      githubToken?: string;            // falls back to GITHUB_TOKEN
      githubRepo?: string;             // "owner/repo", falls back to GITHUB_REPOSITORY
      azureOrg?: string;               // https://dev.azure.com/myorg, falls back to AZDO_ORG
      azureProject?: string;           // falls back to AZDO_PROJECT
      azureRepo?: string;              // falls back to AZDO_REPO
      azureToken?: string;             // falls back to AZDO_TOKEN
    };
  };

  /**
   * Spec-to-test traceability (Playwright Agent pipeline).
   * Automatically active when specs/ directory and // spec: comments are present.
   * No configuration required — set healing.enabled: true to also surface the
   * Healer signal (auto-healed / app-broken) on the Traceability tab.
   */
  // traceability is auto-detected, no config key needed

  /** PR comment markdown generation. */
  prComment?: {
    enabled: boolean;
    outputPath?: string;       // default: <outputDir>/pr-comment.md
    artifactUrl?: string;      // falls back to REPORT_ARTIFACT_URL env var
    title?: string;            // branch/label shown in the header
    maxFailures?: number;      // max failed tests to list inline, default 10
  };

  /** Merge manual test results from a Markdown file into the report. */
  manualTests?: {
    resultsPath: string;          // path to your manual-results.md file
  };

  /** Jira issue commenting + auto-bug creation. */
  jira?: {
    enabled: boolean;
    baseUrl: string;              // https://yourorg.atlassian.net
    email?: string;               // falls back to JIRA_EMAIL env var
    apiToken?: string;            // falls back to JIRA_API_TOKEN env var
    commentOnPass?: boolean;         // default: true
    commentOnFail?: boolean;         // default: true
    commentOnSkip?: boolean;         // default: false
    commentOnStatusChange?: boolean; // only comment when pass↔fail flips, default: false
    includeScreenshots?: boolean;    // upload & embed screenshots inline, default: true
    includeApiTraffic?: boolean;     // include API request/response logs, default: true
    commentCooldownMs?: number;      // skip if a comment was posted within this window, default: 0

    /**
     * Automatically create Jira Bug tickets for failed tests.
     * No @PROJECT-123 tag required — bugs are created in the configured project.
     */
    autoBugs?: {
      enabled: boolean;
      projectKey: string;             // e.g. "QA" — falls back to JIRA_PROJECT_KEY env var
      issueType?: string;             // default: "Bug"
      defaultPriority?: string;       // default: "Medium"
      labels?: string[];              // default: ["auto-generated","playwright"]
      onlyForAIAnalyzed?: boolean;    // skip tests without AI analysis, default: true
      deduplicateByTestName?: boolean;// skip if open bug exists, default: true
      includeScreenshots?: boolean;   // attach screenshots, default: true
      includeVideos?: boolean;        // attach video recordings, default: true
      includeApiTraffic?: boolean;    // embed API traffic in description, default: true
    };
  };

  /** Factory for a custom AI provider. */
  providerFactory?: (config: AIProviderConfig) => AIProvider;
};
```
