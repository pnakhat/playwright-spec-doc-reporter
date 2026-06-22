import fs from "node:fs";
import path from "node:path";
import type {
  ReportData,
  HistoryData,
  TraceabilityIndexData,
} from "../types/index.js";
import { McpToolError, ERR_ARTIFACT_NOT_FOUND } from "./types.js";

// Artifact filenames written by the reporter into outputDir.
export const RESULTS_FILE = "results.json";
export const HISTORY_FILE = "spec-doc-history.json";
export const TRACEABILITY_FILE = "traceability.json";

function readJsonOrThrow<T>(filePath: string, label: string): T {
  if (!fs.existsSync(filePath)) {
    throw new McpToolError(
      ERR_ARTIFACT_NOT_FOUND,
      `${label} not found at ${filePath}. Run your Playwright suite with playwright-spec-doc-reporter first.`,
    );
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch (err) {
    throw new McpToolError(
      ERR_ARTIFACT_NOT_FOUND,
      `Failed to parse ${label} at ${filePath}: ${(err as Error).message}`,
    );
  }
}

/** Load the most recent run report (results.json). Throws if absent. */
export function loadReport(outputDir: string): ReportData {
  return readJsonOrThrow<ReportData>(
    path.join(outputDir, RESULTS_FILE),
    "results.json",
  );
}

/** Load run history (spec-doc-history.json). Returns empty history if absent. */
export function loadHistory(outputDir: string): HistoryData {
  const filePath = path.join(outputDir, HISTORY_FILE);
  if (!fs.existsSync(filePath)) {
    return { schemaVersion: "1", runs: [] };
  }
  return readJsonOrThrow<HistoryData>(filePath, "spec-doc-history.json");
}

/**
 * Load the traceability index. Prefers the standalone traceability.json,
 * falling back to the index embedded in results.json. Throws if neither exists.
 */
export function loadTraceability(outputDir: string): TraceabilityIndexData {
  const filePath = path.join(outputDir, TRACEABILITY_FILE);
  if (fs.existsSync(filePath)) {
    return readJsonOrThrow<TraceabilityIndexData>(filePath, "traceability.json");
  }
  const report = loadReport(outputDir);
  if (report.traceabilityIndex) {
    return report.traceabilityIndex;
  }
  throw new McpToolError(
    ERR_ARTIFACT_NOT_FOUND,
    `No traceability data found in ${outputDir}. Add a specs/ directory with // spec: comments to enable traceability.`,
  );
}
