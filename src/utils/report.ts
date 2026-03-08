import path from "node:path";
import { createHash } from "node:crypto";
import type { AttachmentInfo, NormalizedTestResult, ReportSummary } from "../types/index.js";

export function toReportSummary(tests: NormalizedTestResult[]): ReportSummary {
  const summary: ReportSummary = {
    total: tests.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    flaky: 0,
    timedOut: 0,
    interrupted: 0,
    durationMs: 0,
    averageDurationMs: 0
  };

  for (const test of tests) {
    summary.durationMs += test.durationMs;
    if (test.flaky) summary.flaky += 1;
    switch (test.status) {
      case "passed":
        summary.passed += 1;
        break;
      case "failed":
        summary.failed += 1;
        break;
      case "skipped":
        summary.skipped += 1;
        break;
      case "timedOut":
        summary.timedOut += 1;
        break;
      case "interrupted":
        summary.interrupted += 1;
        break;
    }
  }

  summary.averageDurationMs = summary.total > 0 ? Math.round(summary.durationMs / summary.total) : 0;
  return summary;
}

export function classifyArtifacts(attachments: AttachmentInfo[]): { screenshots: string[]; videos: string[]; traces: string[] } {
  const screenshots: string[] = [];
  const videos: string[] = [];
  const traces: string[] = [];

  for (const attachment of attachments) {
    if (!attachment.path) continue;
    const ext = path.extname(attachment.path).toLowerCase();
    const name = attachment.name.toLowerCase();
    const contentType = (attachment.contentType ?? "").toLowerCase();

    if (ext === ".png" || contentType.includes("image") || name.includes("screenshot")) {
      screenshots.push(attachment.path);
      continue;
    }
    if (ext === ".webm" || contentType.includes("video") || name.includes("video")) {
      videos.push(attachment.path);
      continue;
    }
    if (ext === ".zip" || name.includes("trace")) {
      traces.push(attachment.path);
    }
  }

  return { screenshots, videos, traces };
}

export function safeTextFromBuffer(value: string | Buffer): string {
  return typeof value === "string" ? value : value.toString("utf-8");
}

export function shortId(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 18);
}
