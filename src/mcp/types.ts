import type {
  ReportSummary,
  NormalizedTestResult,
  HealingPayload,
  AIAnalysisResult,
  RunSnapshot,
  TraceabilityIndexData,
  HealingSummaryData,
  IssueCategory,
} from "../types/index.js";
import type { RootCauseTrendPoint } from "../utils/rootCauseTrends.js";

// ─── Server config & lifecycle ───

export interface McpServerConfig {
  /** Directory the reporter wrote its artifacts into (results.json, etc.). */
  outputDir: string;
  /** Minimum log level emitted to stderr. Default: "warn". */
  logLevel?: LogLevel;
  /** Watch the output dir and emit change notifications (SSE only). */
  watch?: boolean;
}

export type LogLevel = "error" | "warn" | "info" | "debug";

export interface SseOptions {
  port: number;
  token?: string;
  corsOrigin?: string;
}

export interface McpServer {
  /** Start serving over stdio (for local AI agents like Claude Code). */
  startStdio(): Promise<void>;
  /** Start serving over HTTP/SSE. */
  startSse(opts: SseOptions): Promise<void>;
  /** Shut the server (and any transports/watchers) down. */
  stop(): Promise<void>;
}

// ─── Tool contract ───

export interface JsonSchema {
  type: "object";
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface McpTool<TResult = unknown> {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  execute(args: unknown): Promise<TResult>;
}

/**
 * Error carrying a JSON-RPC error code. Thrown by tools when an expected
 * artifact is missing or an argument is invalid.
 */
export class McpToolError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = "McpToolError";
    this.code = code;
  }
}

// JSON-RPC application error codes used by this server.
export const ERR_ARTIFACT_NOT_FOUND = -32001;
export const ERR_INVALID_ARGS = -32602;
export const ERR_RERUN_FAILED = -32002;

// ─── Tool result shapes ───

export interface RunSummary {
  title: string;
  generatedAt: string;
  passRate: number;
  summary: ReportSummary;
  environment: {
    nodeVersion: string;
    platform: string;
    os?: string;
    ci?: string;
    playwrightVersion?: string;
    projects?: string[];
    browsers?: string[];
    workers?: number;
  };
  aiEnabled: boolean;
  failingTestCount: number;
  flakyTestCount: number;
  healingPayloadCount: number;
  healing?: HealingSummaryData;
}

export interface FailedTestEntry {
  id: string;
  title: string;
  fullName: string;
  file: string;
  suite: string;
  status: NormalizedTestResult["status"];
  flaky: boolean;
  retries: number;
  durationMs: number;
  errorMessage?: string;
  tags: string[];
  specPath?: string;
  hasHealingPayload: boolean;
  aiAnalyzed: boolean;
}

export interface FailedTestsResult {
  count: number;
  includeFlaky: boolean;
  tests: FailedTestEntry[];
}

export interface TestDetailResult {
  test: NormalizedTestResult;
  aiAnalysis?: AIAnalysisResult;
  healingPayloads: HealingPayload[];
}

export interface HealingPayloadsResult {
  count: number;
  payloads: HealingPayload[];
}

export interface TrendsResult {
  schemaVersion: string;
  totalRuns: number;
  returned: number;
  runs: RunSnapshot[];
}

export interface RootCauseTrendsResult {
  schemaVersion: string;
  windowSize: number;
  runsConsidered: number;
  runsWithData: number;
  points: RootCauseTrendPoint[];
  latest?: RootCauseTrendPoint;
  earliest?: RootCauseTrendPoint;
  deltas?: Partial<Record<IssueCategory, number>>;
}

export interface TraceabilityResult {
  specCount: number;
  coveredSpecCount: number;
  uncoveredSpecCount: number;
  index: TraceabilityIndexData;
}

export interface RerunResult {
  command: string;
  exitCode: number | null;
  durationMs: number;
  stdout: string;
  stderr: string;
  truncated: boolean;
}

/** Injectable process runner — lets tests stub out real Playwright execution. */
export interface RerunRunner {
  (
    command: string,
    args: string[],
    onChunk: (stream: "stdout" | "stderr", chunk: string) => void,
  ): Promise<{ exitCode: number | null }>;
}
