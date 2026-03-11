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
  HistoryData,
  NormalizedTestResult,
  ReportData,
  RunSnapshot,
} from "../types/index.js";
import { healingPayloadsToMarkdown } from "../healing/payload.js";
import { computeFlakinessScores } from "../utils/flakiness.js";

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
  env: ReportData["environment"]
): RunSnapshot {
  const runId = createHash("sha1")
    .update(`${new Date().toISOString()}:${summary.total}:${summary.passed}`)
    .digest("hex")
    .slice(0, 16);

  // Deduplicate by file::title (last status wins, same as uniqueById logic)
  const deduped = new Map<string, NormalizedTestResult>();
  for (const t of tests) {
    const key = `${t.file}::${t.title}`;
    deduped.set(key, t);
  }

  const testSnapshots = [...deduped.entries()].map(([key, t]) => ({
    key,
    status: t.status,
    durationMs: t.durationMs
  }));

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
  runMeta?: { startedAt?: string; finishedAt?: string; workers?: number }
): Promise<ReportData> {
  const outputDir = config.outputDir ?? defaultConfig.outputDir;
  await ensureDir(outputDir);

  const environment = collectEnvironmentMeta(tests, runMeta);
  const summary = toReportSummary(tests);

  // Load history early so we can compute flakiness before saving the report
  const history = loadHistory(outputDir);
  const flakinessScores = computeFlakinessScores(history);

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
  };

  // Update and save history
  const snapshot = buildRunSnapshot(tests, summary, environment);
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
