// CTRF (Common Test Report Format) export — https://ctrf.io
// Lets the report plug into CTRF tooling (GitHub Actions summaries, Slack, dashboards).
import { stripVTControlCharacters } from "node:util";
import { displayName } from "./prComment/generator.js";
import type { NormalizedTestResult } from "./types/index.js";

type CtrfStatus = "passed" | "failed" | "skipped" | "pending" | "other";

function toCtrfStatus(status: NormalizedTestResult["status"]): CtrfStatus {
  switch (status) {
    case "passed":
    case "flaky":
      return "passed";
    case "failed":
    case "timedOut":
      return "failed";
    case "skipped":
      return "skipped";
    default:
      return "other";
  }
}

export function buildCtrfReport(
  tests: NormalizedTestResult[],
  run: { startedAt?: string; finishedAt?: string } = {}
) {
  const ctrfTests = tests.map((t) => ({
    name: displayName(t.fullName),
    status: toCtrfStatus(t.status),
    duration: t.durationMs,
    ...(t.errorMessage ? { message: stripVTControlCharacters(t.errorMessage) } : {}),
    ...(t.stackTrace ? { trace: stripVTControlCharacters(t.stackTrace) } : {}),
    suite: t.suite,
    filePath: t.file,
    retries: t.retryIndex,
    flaky: t.flaky,
    tags: t.tags,
    ...(t.browser ? { browser: t.browser } : {}),
  }));
  const count = (s: CtrfStatus) => ctrfTests.filter((t) => t.status === s).length;
  return {
    reportFormat: "CTRF",
    specVersion: "0.0.0",
    results: {
      tool: { name: "playwright" },
      summary: {
        tests: ctrfTests.length,
        passed: count("passed"),
        failed: count("failed"),
        pending: count("pending"),
        skipped: count("skipped"),
        other: count("other"),
        start: run.startedAt ? Date.parse(run.startedAt) : 0,
        stop: run.finishedAt ? Date.parse(run.finishedAt) : 0,
      },
      tests: ctrfTests,
    },
  };
}
