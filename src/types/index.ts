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
  provider: "openai" | "anthropic" | "custom";
  model: string;
  apiKey?: string;
  baseURL?: string;
  maxTokens?: number;
  rateLimitPerMinute?: number;
  customPrompt?: string;
}

export interface AIConfig extends AIProviderConfig {
  enabled: boolean;
  maxFailuresToAnalyze?: number;
}

export interface HealingConfig {
  enabled: boolean;
  exportPath?: string;
  exportMarkdownPath?: string;
  analysisOnly?: boolean;
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
  providerFactory?: (config: AIProviderConfig) => AIProvider;
}

export interface AIProvider {
  name: string;
  analyzeFailure(input: AIAnalysisInput, config: AIProviderConfig): Promise<AIAnalysisResult>;
}
