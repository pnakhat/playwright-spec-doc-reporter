export type TestStatus = "passed" | "failed" | "skipped" | "timedOut" | "interrupted" | "flaky";

export type IssueCategory =
  | "locator_drift"
  | "timing_issue"
  | "environment_issue"
  | "test_data_issue"
  | "assertion_issue"
  | "app_bug"
  | "unknown";

export interface AttachmentInfo {
  name: string;
  contentType?: string;
  path?: string;
}

export interface ConsoleLogEntry {
  stream: "stdout" | "stderr";
  message: string;
}

export interface TestArtifactLinks {
  screenshots: string[];
  videos: string[];
  traces: string[];
}

export interface TestStepInfo {
  title: string;
  category: string;
  durationMs: number;
  status: "passed" | "failed";
  error?: string;
  screenshots: string[];
  startedAt?: string;
}

export interface ApiEntry {
  kind: "request" | "response";
  method?: string;
  url?: string;
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface NormalizedTestResult {
  id: string;
  suite: string;
  file: string;
  title: string;
  fullName: string;
  status: TestStatus;
  expectedStatus: string;
  flaky: boolean;
  retries: number;
  retryIndex: number;
  durationMs: number;
  /** "automated" (default) or "manual" — from a manually-authored results file. */
  source?: "automated" | "manual";
  browser?: string;
  projectName?: string;
  workerIndex?: number;
  errorMessage?: string;
  stackTrace?: string;
  errorSnippet?: {
    file: string;
    line: number;
    column: number;
    lines: { num: number; text: string; isError: boolean }[];
  };
  attachments: AttachmentInfo[];
  artifacts: TestArtifactLinks;
  consoleLogs: ConsoleLogEntry[];
  tags: string[];
  featureMeta?: { name: string; description?: string };
  scenarioDescription?: string;
  behaviours?: string[];
  apiEntries?: ApiEntry[];
  steps: TestStepInfo[];
  startedAt?: string;
  finishedAt?: string;
  /** Relative path to the linked spec file, e.g. "specs/smoke.md" */
  specPath?: string;
  /** Healing event detected for this test (auto-healed or skipped-app-broken). */
  healingEvent?: HealingEventInfo;
}

export interface HealingEventInfo {
  outcome: "auto-healed" | "skipped-app-broken";
  reason?: string;
  patchSummary?: string;
  locatorsBefore?: string[];
  locatorsAfter?: string[];
}

export interface TestSnapshot {
  key: string;        // "file::title" stable identifier
  status: string;
  durationMs: number;
}

export interface RunSnapshot {
  runId: string;
  timestamp: string;
  branch?: string;
  commit?: string;
  passRate: number;
  playwrightVersion?: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
    durationMs: number;
  };
  testSnapshots: TestSnapshot[];
}

export interface HistoryData {
  schemaVersion: string;
  runs: RunSnapshot[];
}

export interface ReportSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  timedOut: number;
  interrupted: number;
  durationMs: number;
  averageDurationMs: number;
}

export interface TraceabilityIndexData {
  specs: Array<{ filePath: string; title: string; scenarios: string[] }>;
  mapping: Record<string, string[]>;
  reverseMapping: Record<string, string>;
}

export interface HealingSummaryData {
  totalAutoHealed: number;
  totalSkippedAppBroken: number;
  flakinessSignal: "low" | "medium" | "high";
  events: HealingEventInfo[];
}

export interface ReportData {
  title: string;
  generatedAt: string;
  environment: {
    nodeVersion: string;
    platform: string;
    os?: string;
    osVersion?: string;
    ci?: string;
    playwrightVersion?: string;
    browsers?: string[];
    projects?: string[];
    startedAt?: string;
    finishedAt?: string;
    workers?: number;
  };
  summary: ReportSummary;
  tests: NormalizedTestResult[];
  trends: {
    schemaVersion: string;
    notes: string;
  };
  aiEnabled: boolean;
  aiAnalyses: AIAnalysisResult[];
  healingPayloads: HealingPayload[];
  healingMarkdown?: string;
  /** Flakiness score (0–100) keyed by "file::title". Computed from run history. */
  flakinessScores?: Record<string, number>;
  /** UI theme applied to the report. Default: "dark-glossy". */
  theme?: "dark-glossy" | "dark" | "light";
  /** Spec-to-test traceability index. Present only when specs/ directory exists. */
  traceabilityIndex?: TraceabilityIndexData;
  /** Summary of Healer agent activity detected during this run. */
  healingSummary?: HealingSummaryData;
}

export interface AIAnalysisInput {
  testName: string;
  file: string;
  errorMessage?: string;
  stackTrace?: string;
  domSnippet?: string;
  failedLocator?: string;
  screenshotPath?: string;
  tracePath?: string;
  additionalContext?: Record<string, unknown>;
}

export interface AIAnalysisResult {
  testName: string;
  file: string;
  summary: string;
  likelyRootCause: string;
  confidence: number;
  suggestedRemediation: string;
  issueCategory: IssueCategory;
  structuredFeedback: {
    actionType: "locator_update" | "wait_strategy" | "data_fix" | "assertion_update" | "infra_fix" | "investigate";
    reasoning: string;
    suggestedPatch?: string;
    candidateLocators?: string[];
  };
  rawModelResponse?: unknown;
}

export interface HealingPayload {
  testName: string;
  file: string;
  stepName?: string;
  failedLocator?: string;
  candidateLocators: string[];
  domContext?: string;
  errorMessage?: string;
  suggestedPatch?: string;
  reasoning: string;
  confidence: number;
  actionType: string;
}

export interface AIProviderConfig {
  provider: "openai" | "anthropic" | "azure" | "azure-claude" | "custom";
  model: string;
  apiKey?: string;
  baseURL?: string;
  /** Azure AI API version (e.g. "2024-05-01-preview"). Only used with provider "azure". */
  apiVersion?: string;
  maxTokens?: number;
  rateLimitPerMinute?: number;
  customPrompt?: string;
}

export interface AIConfig extends AIProviderConfig {
  enabled: boolean;
  maxFailuresToAnalyze?: number;
}

export interface AutofixConfig {
  /**
   * Target VCS platform for PR creation.
   * Default: "github"
   */
  platform?: "github" | "azure";
  /**
   * Base branch the PR will target.
   * Default: "main"
   */
  baseBranch?: string;
  /**
   * GitHub personal access token.
   * Falls back to GITHUB_TOKEN env var.
   */
  githubToken?: string;
  /**
   * GitHub repository in "owner/repo" format.
   * Falls back to GITHUB_REPOSITORY env var.
   */
  githubRepo?: string;
  /**
   * Azure DevOps organisation URL, e.g. https://dev.azure.com/myorg.
   * Falls back to AZDO_ORG env var.
   */
  azureOrg?: string;
  /**
   * Azure DevOps project name.
   * Falls back to AZDO_PROJECT env var.
   */
  azureProject?: string;
  /**
   * Azure DevOps repository name.
   * Falls back to AZDO_REPO env var.
   */
  azureRepo?: string;
  /**
   * Azure DevOps personal access token.
   * Falls back to AZDO_TOKEN env var.
   */
  azureToken?: string;
  /**
   * Open the PR as a draft (mandatory review before merge).
   * Default: true
   */
  draft?: boolean;
  /**
   * Labels to apply to the auto-generated PR.
   * Default: ["auto-fix", "test-failure", "ai-generated"]
   */
  labels?: string[];
  /**
   * Minimum AI confidence score (0–1) required before a patch is applied.
   * Suggestions below this threshold are listed in the PR description but
   * not applied automatically.
   * Default: 0.7
   */
  minConfidence?: number;
  /**
   * Save a .backup copy of each file before patching it.
   * Default: true
   */
  createBackup?: boolean;
}

export interface HealingConfig {
  enabled: boolean;
  exportPath?: string;
  exportMarkdownPath?: string;
  analysisOnly?: boolean;
  /**
   * Automatically generate a topic branch, apply AI-suggested patches,
   * and open a draft PR after the run.
   * Requires `ai.enabled: true` and valid VCS credentials in `autofix`.
   */
  generatePR?: boolean;
  /** Configuration for the auto-PR workflow. */
  autofix?: AutofixConfig;
}

export interface PrCommentConfig {
  /** Enable PR comment markdown generation. */
  enabled: boolean;
  /**
   * Path to write the markdown file.
   * Default: `<outputDir>/pr-comment.md`
   */
  outputPath?: string;
  /**
   * URL to the full HTML report artifact.
   * Falls back to `REPORT_ARTIFACT_URL` env var.
   */
  artifactUrl?: string;
  /** Optional title/branch label for the comment header. */
  title?: string;
  /** Maximum number of failed tests to list inline. Default: 10 */
  maxFailures?: number;
}

export interface JiraConfig {
  /** Enable Jira comment posting. */
  enabled: boolean;
  /** Jira base URL, e.g. https://yourorg.atlassian.net */
  baseUrl: string;
  /**
   * Jira account email for Basic auth.
   * Falls back to JIRA_EMAIL env var.
   */
  email?: string;
  /**
   * Jira API token.
   * Falls back to JIRA_API_TOKEN env var.
   */
  apiToken?: string;
  /** Post a comment when a test passes. Default: true */
  commentOnPass?: boolean;
  /** Post a comment when a test fails. Default: true */
  commentOnFail?: boolean;
  /** Post a comment when a test is skipped. Default: false */
  commentOnSkip?: boolean;
  /**
   * Include API request/response entries in the comment (for tests
   * that use glossy:request / glossy:response annotations). Default: true
   */
  includeApiTraffic?: boolean;
  /**
   * Upload Playwright screenshots as Jira attachments and embed them inline
   * in the comment. Default: true
   */
  includeScreenshots?: boolean;
  /**
   * Only post a comment when a test's status has changed since the previous
   * run (e.g. pass→fail or fail→pass). Tests that stay at the same status
   * across runs are silently skipped — this is the best way to prevent
   * comment spam on frequent regression pipelines.
   * Default: false (always post). Set to true to enable.
   */
  commentOnStatusChange?: boolean;
  /**
   * Minimum milliseconds between successive comments on the same issue.
   * If the reporter already posted a comment within this window it will
   * skip posting again — useful for frequent regression runs.
   * Default: 0 (always post). Example: 3_600_000 = 1 hour.
   */
  commentCooldownMs?: number;
}

export interface JiraAutoBugConfig {
  /**
   * Enable automatic bug creation for failed tests.
   * Default: false
   */
  enabled: boolean;
  /**
   * Jira project key to create bugs in, e.g. "QA".
   * Falls back to JIRA_PROJECT_KEY env var.
   */
  projectKey: string;
  /**
   * Jira issue type for auto-created bugs.
   * Default: "Bug"
   */
  issueType?: string;
  /**
   * Priority assigned to auto-created bugs.
   * Default: "Medium"
   */
  defaultPriority?: string;
  /**
   * Labels attached to auto-created bugs.
   * Default: ["auto-generated", "playwright"]
   */
  labels?: string[];
  /**
   * Only create bugs for tests that have an AI analysis result.
   * Default: true
   */
  onlyForAIAnalyzed?: boolean;
  /**
   * Skip creation when an open bug with the same test name already exists.
   * Default: true
   */
  deduplicateByTestName?: boolean;
  /**
   * Attach Playwright screenshots to the created Jira bug.
   * Default: true
   */
  includeScreenshots?: boolean;
  /**
   * Attach Playwright video recordings to the created Jira bug.
   * Default: true
   */
  includeVideos?: boolean;
  /**
   * Embed API request/response entries (glossy:request / glossy:response
   * annotations) in the bug description.
   * Default: true
   */
  includeApiTraffic?: boolean;
}

export interface ManualTestsConfig {
  /**
   * Path to the manual test results Markdown file.
   * Supports Gherkin (Given/When/Then) and plain prose blocks.
   * Example: "tests/manual-results.md"
   */
  resultsPath: string;
}

export interface GlossyReporterConfig {
  outputDir?: string;
  reportTitle?: string;
  includeScreenshots?: boolean;
  includeTraces?: boolean;
  includeVideos?: boolean;
  theme?: "dark-glossy" | "dark" | "light";
  ai?: AIConfig;
  healing?: HealingConfig;
  prComment?: PrCommentConfig;
  jira?: JiraConfig & { autoBugs?: JiraAutoBugConfig };
  /**
   * Merge manual test results from a Markdown file into the report.
   * Manual tests appear alongside automated tests with a "manual" badge
   * and can be filtered via the @manual tag.
   */
  manualTests?: ManualTestsConfig;
  providerFactory?: (config: AIProviderConfig) => AIProvider;
}

export interface AIProvider {
  name: string;
  analyzeFailure(input: AIAnalysisInput, config: AIProviderConfig): Promise<AIAnalysisResult>;
}
