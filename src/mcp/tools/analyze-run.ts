import { z } from "zod";
import { loadHistory, loadReport } from "../loader.js";
import {
  McpToolError,
  ERR_INVALID_ARGS,
  type AgenticRunAnalysis,
  type AgenticRecommendation,
  type RunHealth,
  type TrendDirection,
} from "../types.js";
import type { McpTool } from "../types.js";
import {
  detectOverlaps,
  scoreApiConvertibility,
  correlateTimingAndApi,
} from "../../utils/stepAnalysis.js";

const InputSchema = z
  .object({
    overlapThreshold: z.number().min(0).max(1).optional(),
    minConversionScore: z.number().min(0).max(1).optional(),
    includePassedTests: z.boolean().optional(),
    outputDir: z.string().optional(),
  })
  .strict();

// ─── Run-health helpers ───────────────────────────────────────────────────────

function computeRunHealth(
  passRate: number,
  total: number,
  failed: number,
  flaky: number,
  prevPassRate: number | undefined,
): RunHealth {
  let trendDirection: TrendDirection = "no_history";
  let passRateDelta: number | undefined;

  if (prevPassRate !== undefined) {
    passRateDelta = Math.round((passRate - prevPassRate) * 100) / 100;
    if (passRateDelta > 1) trendDirection = "improving";
    else if (passRateDelta < -1) trendDirection = "degrading";
    else trendDirection = "stable";
  }

  return {
    passRate,
    totalTests: total,
    failedTests: failed,
    flakyTests: flaky,
    trendDirection,
    passRateDelta,
  };
}

// ─── Recommendation builder ───────────────────────────────────────────────────

function buildRecommendations(
  analysis: Pick<
    AgenticRunAnalysis,
    "overlapGroups" | "apiCandidates" | "timingIssueApiCorrelations"
  >,
): AgenticRecommendation[] {
  const recs: AgenticRecommendation[] = [];

  // Overlap → page-object extraction (high priority when many shared steps)
  for (const group of analysis.overlapGroups) {
    if (group.recommendation === "extract_page_object") {
      recs.push({
        priority: "high",
        type: "extract_page_object",
        affectedTestIds: group.testIds,
        action: `${group.testIds.length} tests share ${group.sharedSteps.length} steps (similarity ${group.similarity}). Extract a Page Object or shared fixture covering: ${group.sharedSteps.slice(0, 3).join(", ")}${group.sharedSteps.length > 3 ? ", …" : ""}.`,
      });
    } else if (group.recommendation === "refactor_into_shared_fixture") {
      recs.push({
        priority: "medium",
        type: "refactor_overlap",
        affectedTestIds: group.testIds,
        action: `${group.testIds.length} tests share ${group.sharedSteps.length} step(s) (similarity ${group.similarity}). Refactor into a shared beforeEach fixture: ${group.sharedSteps.slice(0, 3).join(", ")}${group.sharedSteps.length > 3 ? ", …" : ""}.`,
      });
    } else {
      recs.push({
        priority: "low",
        type: "refactor_overlap",
        affectedTestIds: group.testIds,
        action: `${group.testIds.length} tests share similar steps (similarity ${group.similarity}). Consider parameterising them with test.each.`,
      });
    }
  }

  // API conversion candidates
  for (const candidate of analysis.apiCandidates) {
    if (candidate.conversionClass === "pure-api" || candidate.conversionClass === "network-interception") {
      recs.push({
        priority: candidate.conversionClass === "pure-api" ? "high" : "medium",
        type: candidate.conversionClass === "pure-api" ? "convert_to_api" : "add_network_interception",
        affectedTestIds: [candidate.testId],
        action: candidate.suggestion,
      });
    }
  }

  // Timing + API correlations
  for (const corr of analysis.timingIssueApiCorrelations) {
    recs.push({
      priority: "high",
      type: "add_network_interception",
      affectedTestIds: [corr.testId],
      action: corr.suggestion,
    });
  }

  // Sort: high → medium → low, then by type alphabetically for determinism
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  recs.sort((a, b) => (order[a.priority] ?? 3) - (order[b.priority] ?? 3) || a.type.localeCompare(b.type));

  return recs;
}

// ─── Summary builder ──────────────────────────────────────────────────────────

function buildSummary(
  health: RunHealth,
  analysis: Pick<
    AgenticRunAnalysis,
    "overlapGroups" | "apiCandidates" | "timingIssueApiCorrelations" | "recommendations"
  >,
): string {
  const parts: string[] = [];

  const trend =
    health.trendDirection === "improving"
      ? `↑ improving (${health.passRateDelta! > 0 ? "+" : ""}${health.passRateDelta}%)`
      : health.trendDirection === "degrading"
        ? `↓ degrading (${health.passRateDelta}%)`
        : health.trendDirection === "stable"
          ? "→ stable"
          : "no prior run";
  parts.push(
    `Run health: ${health.passRate}% pass rate across ${health.totalTests} tests` +
    ` (${health.failedTests} failing, ${health.flakyTests} flaky) — trend ${trend}.`,
  );

  if (analysis.overlapGroups.length > 0) {
    const totalTests = new Set(analysis.overlapGroups.flatMap(g => g.testIds)).size;
    const maxShared = Math.max(...analysis.overlapGroups.map(g => g.sharedSteps.length));
    parts.push(
      `${analysis.overlapGroups.length} step-overlap group(s) found across ${totalTests} tests (up to ${maxShared} shared steps); refactoring these would reduce duplication significantly.`,
    );
  }

  const highApiCandidates = analysis.apiCandidates.filter(
    c => c.conversionClass === "pure-api" || c.conversionClass === "network-interception",
  );
  if (highApiCandidates.length > 0) {
    parts.push(
      `${highApiCandidates.length} test(s) are strong API-conversion candidates (network-interception or pure-api class) — converting them would eliminate render-wait timeouts and speed up the suite.`,
    );
  }

  if (analysis.timingIssueApiCorrelations.length > 0) {
    parts.push(
      `${analysis.timingIssueApiCorrelations.length} test(s) diagnosed with timing issues also have captured API traffic — these are the highest-value targets for page.route() interception.`,
    );
  }

  const highPrio = analysis.recommendations.filter(r => r.priority === "high").length;
  if (highPrio > 0) {
    parts.push(`${highPrio} high-priority recommendation(s) require immediate attention.`);
  }

  if (parts.length === 1) {
    parts.push("No significant overlap or API-conversion opportunities detected in this run.");
  }

  return parts.join(" ");
}

// ─── Tool factory ─────────────────────────────────────────────────────────────

export function analyzeRunTool(outputDir: string): McpTool<AgenticRunAnalysis> {
  return {
    name: "analyze_run",
    description:
      "Performs an agentic analysis of the most recent Playwright run: detects step overlap groups that should be refactored, scores each test for API-convertibility, correlates AI-diagnosed timing issues with captured API traffic, and returns a prioritised recommendation list with a prose summary.",
    inputSchema: {
      type: "object",
      properties: {
        overlapThreshold: {
          type: "number",
          description: "Jaccard similarity cut-off for step-overlap detection (0–1). Default: 0.6.",
        },
        minConversionScore: {
          type: "number",
          description: "Minimum API-convertibility score (0–1) for a test to appear in apiCandidates. Default: 0.5.",
        },
        includePassedTests: {
          type: "boolean",
          description: "Include passing tests in overlap and API-convertibility analysis. Default: true.",
        },
        outputDir: {
          type: "string",
          description: "Ignored — the server uses its configured outputDir.",
        },
      },
      additionalProperties: false,
    },

    async execute(args: unknown): Promise<AgenticRunAnalysis> {
      const parsed = InputSchema.safeParse(args ?? {});
      if (!parsed.success) {
        throw new McpToolError(ERR_INVALID_ARGS, parsed.error.message);
      }

      const overlapThreshold = parsed.data.overlapThreshold ?? 0.6;
      const minConversionScore = parsed.data.minConversionScore ?? 0.5;
      const includePassedTests = parsed.data.includePassedTests ?? true;

      const report = loadReport(outputDir);
      const history = loadHistory(outputDir);

      // Determine pass rate and previous run for trend
      const { summary } = report;
      const passRate =
        summary.total > 0
          ? Math.round((summary.passed / summary.total) * 10000) / 100
          : 0;

      const lastRun = history.runs.length > 0
        ? history.runs[history.runs.length - 1]
        : undefined;
      const prevPassRate = lastRun?.passRate;

      const runHealth = computeRunHealth(
        passRate,
        summary.total,
        summary.failed + summary.timedOut + summary.interrupted,
        summary.flaky,
        prevPassRate,
      );

      // Select tests for analysis
      const testsForAnalysis = includePassedTests
        ? report.tests
        : report.tests.filter(t => t.status !== "passed" && t.status !== "skipped");

      const overlapGroups = detectOverlaps(testsForAnalysis, overlapThreshold);
      const apiCandidates = scoreApiConvertibility(testsForAnalysis, minConversionScore);
      const timingIssueApiCorrelations = correlateTimingAndApi(
        report.tests,
        report.aiAnalyses ?? [],
      );

      const intermediate = { overlapGroups, apiCandidates, timingIssueApiCorrelations };
      const recommendations = buildRecommendations(intermediate);
      const summary_ = buildSummary(runHealth, { ...intermediate, recommendations });

      return {
        runHealth,
        overlapGroups,
        apiCandidates,
        timingIssueApiCorrelations,
        recommendations,
        summary: summary_,
      };
    },
  };
}
