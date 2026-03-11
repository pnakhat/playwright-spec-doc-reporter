import path from "node:path";
import { writeText } from "../utils/fs.js";
import type {
  AIAnalysisResult,
  GlossyReporterConfig,
  NormalizedTestResult,
  PrCommentConfig,
  ReportSummary,
} from "../types/index.js";

export type { PrCommentConfig } from "../types/index.js";

export interface PrCommentRunMeta {
  branch?: string;
  commit?: string;
  runNumber?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function statusIcon(status: string): string {
  switch (status) {
    case "passed":   return "✅";
    case "failed":   return "❌";
    case "timedOut": return "⏱️";
    case "skipped":  return "⏭️";
    case "flaky":    return "⚠️";
    default:         return "❓";
  }
}

function resolveRunMeta(): PrCommentRunMeta {
  return {
    branch:
      process.env.GITHUB_HEAD_REF ??
      process.env.GITHUB_REF_NAME ??
      process.env.GIT_BRANCH ??
      process.env.CI_COMMIT_BRANCH ??
      process.env.BRANCH_NAME ??
      undefined,
    commit: (
      process.env.GITHUB_SHA ??
      process.env.GIT_COMMIT ??
      process.env.CI_COMMIT_SHA
    )?.slice(0, 8) ?? undefined,
    runNumber:
      process.env.GITHUB_RUN_NUMBER ??
      process.env.CI_PIPELINE_IID ??
      undefined,
  };
}

// ---------------------------------------------------------------------------
// Core markdown builder (pure function — easy to unit-test)
// ---------------------------------------------------------------------------

export function buildPrCommentMarkdown(
  tests: NormalizedTestResult[],
  summary: ReportSummary,
  analyses: AIAnalysisResult[],
  prConfig: PrCommentConfig,
  runMeta: PrCommentRunMeta = {}
): string {
  const artifactUrl = prConfig.artifactUrl ?? process.env.REPORT_ARTIFACT_URL;
  const maxFailures = prConfig.maxFailures ?? 10;

  // ── Header ────────────────────────────────────────────────────────────────
  const branchLabel =
    runMeta.branch
      ? `\`${runMeta.branch}\``
      : prConfig.title
      ? `\`${prConfig.title}\``
      : "";
  const runLabel = runMeta.runNumber ? ` · Run #${runMeta.runNumber}` : "";
  const header = branchLabel
    ? `## 🎭 Test Report — ${branchLabel}${runLabel}`
    : `## 🎭 Test Report${runLabel}`;

  const commitLabel = runMeta.commit ? `commit \`${runMeta.commit}\`` : "";

  // ── Summary table ─────────────────────────────────────────────────────────
  const rows: string[] = [
    `| | Result |`,
    `|---|---|`,
    `| ✅ Passed | ${summary.passed} |`,
  ];
  if (summary.failed > 0)   rows.push(`| ❌ Failed | ${summary.failed} |`);
  if (summary.flaky > 0)    rows.push(`| ⚠️ Flaky | ${summary.flaky} |`);
  if (summary.skipped > 0)  rows.push(`| ⏭️ Skipped | ${summary.skipped} |`);
  if (summary.timedOut > 0) rows.push(`| ⏱️ Timed Out | ${summary.timedOut} |`);
  rows.push(`| 📊 Total | ${summary.total} |`);
  rows.push(`| ⏱️ Duration | ${formatDuration(summary.durationMs)} |`);

  // ── Failed tests ──────────────────────────────────────────────────────────
  const failedTests = tests.filter(
    (t) => t.status === "failed" || t.status === "timedOut"
  );
  let failedSection = "";
  if (failedTests.length > 0) {
    const items = failedTests.slice(0, maxFailures).map((t) => {
      const firstLine = t.errorMessage?.split("\n")[0]?.slice(0, 120) ?? "";
      const errorSuffix = firstLine ? ` — *${firstLine}*` : "";
      return `- ${statusIcon(t.status)} \`${t.fullName}\`${errorSuffix}`;
    });
    if (failedTests.length > maxFailures) {
      items.push(`- *…and ${failedTests.length - maxFailures} more*`);
    }
    failedSection = `### ❌ Failed Tests\n${items.join("\n")}`;
  }

  // ── AI analysis summary ───────────────────────────────────────────────────
  let aiSection = "";
  if (analyses.length > 0) {
    const top = analyses[0];
    const confidence = Math.round(top.confidence * 100);
    const snippet = top.summary.slice(0, 200);
    const analysisCount = analyses.length > 1 ? ` (${analyses.length} failures analysed)` : "";
    const reportLink = artifactUrl ? ` [View full analysis →](${artifactUrl})` : "";
    aiSection = `> 🤖 **AI Analysis**${analysisCount} (${confidence}% confidence): ${snippet}${reportLink}`;
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const footer = artifactUrl ? `[📊 Full Report →](${artifactUrl})` : "";

  // ── Assemble ──────────────────────────────────────────────────────────────
  const headerBlock = [header, commitLabel].filter(Boolean).join("\n");
  const parts = [headerBlock, rows.join("\n")];
  if (failedSection) parts.push(failedSection);
  if (aiSection) parts.push(aiSection);
  if (footer) parts.push(footer);

  return parts.join("\n\n");
}

// ---------------------------------------------------------------------------
// File writer — called from the reporter
// ---------------------------------------------------------------------------

export async function writePrComment(
  tests: NormalizedTestResult[],
  summary: ReportSummary,
  analyses: AIAnalysisResult[],
  config: GlossyReporterConfig
): Promise<void> {
  if (!config.prComment?.enabled) return;

  const outputDir = config.outputDir ?? "spec-doc-report";
  const outputPath =
    config.prComment.outputPath ?? path.join(outputDir, "pr-comment.md");
  const runMeta = resolveRunMeta();
  const markdown = buildPrCommentMarkdown(
    tests,
    summary,
    analyses,
    config.prComment,
    runMeta
  );
  await writeText(outputPath, markdown);
}
