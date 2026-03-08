import path from "node:path";
import type { HistoryData, ReportData } from "../types/index.js";
import {
  getStyles,
  getMarkup,
  getScriptUtils,
  getScriptRenderers,
  getScriptInteractions,
  getScriptInit,
} from "./template/index.js";

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeJson(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function makeRelativePath(filePath: string, outputDir: string): string {
  if (!filePath) return filePath;
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  if (!path.isAbsolute(filePath)) return filePath;
  return path.relative(outputDir, filePath).split(path.sep).join('/');
}

function normalizeReportPaths(report: ReportData, outputDir: string): ReportData {
  const data: ReportData = JSON.parse(JSON.stringify(report));
  for (const test of data.tests) {
    if (test.artifacts) {
      test.artifacts.screenshots = test.artifacts.screenshots.map(p => makeRelativePath(p, outputDir));
      test.artifacts.videos = test.artifacts.videos.map(p => makeRelativePath(p, outputDir));
      test.artifacts.traces = test.artifacts.traces.map(p => makeRelativePath(p, outputDir));
    }
    if (test.attachments) {
      for (const att of test.attachments) {
        if (att.path) att.path = makeRelativePath(att.path, outputDir);
      }
    }
    if (test.steps) {
      for (const step of test.steps) {
        if (step.screenshots) step.screenshots = step.screenshots.map(p => makeRelativePath(p, outputDir));
      }
    }
  }
  return data;
}

export interface BuildHtmlOptions {
  outputDir?: string;
  history?: HistoryData;
}

export function buildGlossyHtml(report: ReportData, options?: BuildHtmlOptions): string {
  const processedReport = options?.outputDir
    ? normalizeReportPaths(report, options.outputDir)
    : report;

  const jsonData = safeJson(processedReport);
  const historyJson = safeJson(options?.history ?? { schemaVersion: "1.0", runs: [] });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(report.title)} — Glossy Test Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..900;1,14..32,300..900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>${getStyles()}</style>
</head>
<body>
${getMarkup()}
<script id="report-data" type="application/json">${jsonData}</script>
<script id="history-data" type="application/json">${historyJson}</script>
<script>
${getScriptUtils()}
${getScriptRenderers()}
${getScriptInteractions()}
${getScriptInit()}
</script>
</body>
</html>`;
}
