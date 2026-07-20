import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { buildGlossyHtml } from "./htmlTemplate.js";
import { defaultConfig } from "../config/defaults.js";
import { ensureDir, writeJson, writeText } from "../utils/fs.js";
import { toReportSummary } from "../utils/report.js";
import type {
  AIAnalysisResult,
  GlossyReporterConfig,
  HealingPayload,
  HealingSummaryData,
  HistoryData,
  NormalizedTestResult,
  ReportData,
  RunSnapshot,
  TraceabilityIndexData,
} from "../types/index.js";
import type { AgenticInsightsData } from "../types/agenticInsights.js";
import { healingPayloadsToMarkdown } from "../healing/payload.js";
import { computeFlakinessScores } from "../utils/flakiness.js";
import { buildTestSnapshots } from "../utils/rootCauseTrends.js";
import {
  detectOverlaps,
  scoreApiConvertibility,
  correlateTimingAndApi,
} from "../utils/stepAnalysis.js";

const HISTORY_MAX_RUNS = 30;
const HISTORY_FILE = "spec-doc-history.json";

function getPlaywrightVersion(): string | undefined {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require("@playwright/test/package.json") as { version?: string };
    return pkg.version;
  } catch {
    return undefined;
  }
}

function collectEnvironmentMeta(
  tests: NormalizedTestResult[],
  extra?: { startedAt?: string; finishedAt?: string; workers?: number }
) {
  const browsers = [...new Set(tests.map(t => t.browser).filter(Boolean))] as string[];
  const projects = [...new Set(tests.map(t => t.projectName).filter(Boolean))] as string[];

  const startTimes = tests.map(t => t.startedAt).filter(Boolean) as string[];
  const finishTimes = tests.map(t => t.finishedAt).filter(Boolean) as string[];
  const startedAt = extra?.startedAt
    ?? (startTimes.length > 0 ? startTimes.reduce((a, b) => (a < b ? a : b)) : undefined);
  const finishedAt = extra?.finishedAt
    ?? (finishTimes.length > 0 ? finishTimes.reduce((a, b) => (a > b ? a : b)) : undefined);
  const workers = extra?.workers
    ?? (tests.length > 0 ? Math.max(...tests.map(t => t.workerIndex ?? 0)) + 1 : undefined);

  return {
    nodeVersion: process.version,
    platform: process.platform,
    os: os.type(),
    osVersion: os.release(),
    ci: process.env.CI,
    playwrightVersion: getPlaywrightVersion(),
    browsers: browsers.length > 0 ? browsers : undefined,
    projects: projects.length > 0 ? projects : undefined,
    startedAt,
    finishedAt,
    workers
  };
}

function loadHistory(outputDir: string): HistoryData {
  const filePath = path.join(outputDir, HISTORY_FILE);
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as HistoryData;
    if (parsed.schemaVersion && Array.isArray(parsed.runs)) return parsed;
  } catch {
    // no history yet or corrupt file — start fresh
  }
  return { schemaVersion: "1.0", runs: [] };
}

function buildRunSnapshot(
  tests: NormalizedTestResult[],
  summary: ReportData["summary"],
  env: ReportData["environment"],
  analyses: AIAnalysisResult[]
): RunSnapshot {
  const runId = createHash("sha1")
    .update(`${new Date().toISOString()}:${summary.total}:${summary.passed}`)
    .digest("hex")
    .slice(0, 16);

  const testSnapshots = buildTestSnapshots(tests, analyses);

  return {
    runId,
    timestamp: new Date().toISOString(),
    branch: process.env.GITHUB_REF_NAME
      ?? process.env.GIT_BRANCH
      ?? process.env.CI_COMMIT_BRANCH
      ?? process.env.BRANCH_NAME
      ?? undefined,
    commit: (
      process.env.GITHUB_SHA
      ?? process.env.GIT_COMMIT
      ?? process.env.CI_COMMIT_SHA
    )?.slice(0, 8) ?? undefined,
    passRate: summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0,
    playwrightVersion: env.playwrightVersion,
    summary: {
      total: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      skipped: summary.skipped,
      flaky: summary.flaky,
      durationMs: summary.durationMs
    },
    testSnapshots
  };
}

export async function generateReport(
  tests: NormalizedTestResult[],
  analyses: AIAnalysisResult[],
  healingPayloads: HealingPayload[],
  config: GlossyReporterConfig,
  runMeta?: { startedAt?: string; finishedAt?: string; workers?: number },
  traceabilityIndex?: TraceabilityIndexData,
  healingSummary?: HealingSummaryData
): Promise<ReportData> {
  const outputDir = config.outputDir ?? defaultConfig.outputDir;
  await ensureDir(outputDir);

  const environment = collectEnvironmentMeta(tests, runMeta);
  const summary = toReportSummary(tests);

  // Load history early so we can compute flakiness before saving the report
  const history = loadHistory(outputDir);
  const flakinessScores = computeFlakinessScores(history);

  // Agentic insights (optional — computed only when agenticAnalysis.enabled)
  let agenticInsights: AgenticInsightsData | undefined;
  if (config.agenticAnalysis?.enabled) {
    const threshold = config.agenticAnalysis.overlapThreshold ?? 0.6;
    const minScore = config.agenticAnalysis.minConversionScore ?? 0.5;
    const overlapGroups = detectOverlaps(tests, threshold);
    const apiCandidates = scoreApiConvertibility(tests, minScore);
    const timingCorrelations = correlateTimingAndApi(tests, analyses);

    // Build prioritised recommendation list (mirrors analyzeRunTool logic)
    const recommendations: AgenticInsightsData["recommendations"] = [];
    for (const g of overlapGroups) {
      recommendations.push({
        priority: g.recommendation === "extract_page_object" ? "high" : g.recommendation === "refactor_into_shared_fixture" ? "medium" : "low",
        type: g.recommendation === "extract_page_object" ? "extract_page_object" : "refactor_overlap",
        affectedTestTitles: g.testTitles,
        action: `${g.testTitles.length} tests share ${g.sharedSteps.length} step(s) (similarity ${g.similarity}): ${g.sharedSteps.slice(0, 3).join(", ")}${g.sharedSteps.length > 3 ? ", …" : ""}.`,
      });
    }
    for (const c of apiCandidates) {
      if (c.conversionClass === "pure-api" || c.conversionClass === "network-interception") {
        recommendations.push({
          priority: c.conversionClass === "pure-api" ? "high" : "medium",
          type: c.conversionClass === "pure-api" ? "convert_to_api" : "add_network_interception",
          affectedTestTitles: [c.testTitle],
          action: c.suggestion,
        });
      }
    }
    for (const t of timingCorrelations) {
      recommendations.push({
        priority: "high",
        type: "add_network_interception",
        affectedTestTitles: [t.testTitle],
        action: t.suggestion,
      });
    }
    recommendations.sort((a, b) => {
      const o: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (o[a.priority] ?? 3) - (o[b.priority] ?? 3);
    });

    const parts: string[] = [];
    if (overlapGroups.length > 0) {
      parts.push(`${overlapGroups.length} step-overlap group(s) found — consider refactoring shared setup into fixtures.`);
    }
    const highApi = apiCandidates.filter(c => c.conversionClass === "pure-api" || c.conversionClass === "network-interception");
    if (highApi.length > 0) {
      parts.push(`${highApi.length} test(s) are API-convertibility candidates.`);
    }
    if (timingCorrelations.length > 0) {
      parts.push(`${timingCorrelations.length} timing-issue test(s) have captured API traffic — use page.route() interception.`);
    }
    if (parts.length === 0) parts.push("No significant overlap or API-conversion opportunities detected.");

    agenticInsights = {
      summary: parts.join(" "),
      overlapGroups: overlapGroups.map(g => ({
        testTitles: g.testTitles,
        sharedSteps: g.sharedSteps,
        similarity: g.similarity,
        recommendation: g.recommendation,
      })),
      apiCandidates: apiCandidates.map(c => ({
        testTitle: c.testTitle,
        conversionClass: c.conversionClass,
        conversionScore: c.conversionScore,
        endpoints: c.endpoints,
        suggestion: c.suggestion,
      })),
      timingIssueApiCorrelations: timingCorrelations.map(t => ({
        testTitle: t.testTitle,
        endpoints: t.endpoints,
        suggestion: t.suggestion,
      })),
      recommendations,
    };
  }

  const report: ReportData = {
    title: config.reportTitle ?? defaultConfig.reportTitle,
    generatedAt: new Date().toISOString(),
    environment,
    summary,
    tests,
    trends: {
      schemaVersion: "1.0",
      notes: "Trend-ready schema. Persist snapshots externally to compute multi-run trends."
    },
    aiEnabled: config.ai?.enabled === true,
    aiAnalyses: analyses,
    healingPayloads,
    healingMarkdown: healingPayloads.length > 0 ? healingPayloadsToMarkdown(healingPayloads) : undefined,
    flakinessScores: Object.keys(flakinessScores).length > 0 ? flakinessScores : undefined,
    theme: config.theme ?? "dark-glossy",
    traceabilityIndex,
    healingSummary,
    agenticInsights,
  };

  // Update and save history
  const snapshot = buildRunSnapshot(tests, summary, environment, analyses);
  history.runs.push(snapshot);
  if (history.runs.length > HISTORY_MAX_RUNS) {
    history.runs = history.runs.slice(-HISTORY_MAX_RUNS);
  }
  await writeJson(path.join(outputDir, HISTORY_FILE), history);

  const absOutputDir = path.resolve(outputDir);
  const html = buildGlossyHtml(report, { outputDir: absOutputDir, history });
  await writeJson(path.join(outputDir, "results.json"), report);
  await writeText(path.join(outputDir, "index.html"), html);

  if (config.healing?.enabled) {
    if (config.healing.exportPath) {
      await writeJson(config.healing.exportPath, healingPayloads);
    }
    if (config.healing.exportMarkdownPath) {
      await writeText(config.healing.exportMarkdownPath, healingPayloadsToMarkdown(healingPayloads));
    }
  }

  return report;
}
