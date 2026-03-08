import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const reportPath = path.resolve(repoRoot, "examples/saucedemo-demo/spec-doc-report/results.json");
const outputPath = path.resolve(repoRoot, "examples/saucedemo-demo/spec-doc-report/index.html");
const historyPath = path.resolve(repoRoot, "examples/saucedemo-demo/spec-doc-report/spec-doc-history.json");

function makeRun(daysAgo, failedIdxs, branch, commit, pwVer, durMult, allKeys, allStatuses, allDurations) {
  const ts = new Date(Date.now() - daysAgo * 86400 * 1000).toISOString();
  const snapshots = allKeys.map((key, i) => ({
    key,
    status: failedIdxs.includes(i) ? "failed" : allStatuses[i],
    durationMs: Math.round(allDurations[i] * durMult),
  }));
  const passed = snapshots.filter(s => s.status === "passed").length;
  const failed = snapshots.filter(s => s.status === "failed").length;
  const total = snapshots.length;
  return {
    runId: createHash("sha1").update(ts + commit).digest("hex").slice(0, 16),
    timestamp: ts,
    branch,
    commit,
    passRate: Math.round((passed / total) * 100),
    playwrightVersion: pwVer,
    summary: { total, passed, failed, skipped: 0, flaky: 0, durationMs: snapshots.reduce((a, s) => a + s.durationMs, 0) },
    testSnapshots: snapshots,
  };
}

async function main() {
  const sdk = await import(path.resolve(repoRoot, "dist/index.js"));
  const { buildGlossyHtml } = sdk;

  const report = JSON.parse(await readFile(reportPath, "utf-8"));

  // Add healingMarkdown from payloads if missing
  if (!report.healingMarkdown && Array.isArray(report.healingPayloads) && report.healingPayloads.length > 0) {
    try {
      const { healingPayloadsToMarkdown } = await import(path.resolve(repoRoot, "dist/healing/payload.js"));
      if (typeof healingPayloadsToMarkdown === "function") {
        report.healingMarkdown = healingPayloadsToMarkdown(report.healingPayloads);
      }
    } catch { /* ignore */ }
  }

  const allKeys = report.tests.map(t => `${t.file}::${t.title}`);
  const allStatuses = report.tests.map(t => t.status);
  const allDurations = report.tests.map(t => t.durationMs || 1000);

  const history = {
    schemaVersion: "1.0",
    runs: [
      makeRun(18, [],      "main",          "a1b2c3d4", "1.49.0", 0.82, allKeys, allStatuses, allDurations),
      makeRun(15, [],      "main",          "e5f6a7b8", "1.49.0", 0.91, allKeys, allStatuses, allDurations),
      makeRun(12, [3],     "feature/cart",  "c9d0e1f2", "1.49.1", 1.08, allKeys, allStatuses, allDurations),
      makeRun(9,  [3, 5],  "feature/cart",  "a3b4c5d6", "1.50.0", 1.22, allKeys, allStatuses, allDurations),
      makeRun(7,  [],      "main",          "e7f8a9b0", "1.50.0", 0.94, allKeys, allStatuses, allDurations),
      makeRun(5,  [],      "main",          "c1d2e3f4", "1.50.1", 1.60, allKeys, allStatuses, allDurations),
      makeRun(3,  [1],     "main",          "a5b6c7d8", "1.50.1", 1.35, allKeys, allStatuses, allDurations),
      makeRun(1,  [],      "main",          "e9f0a1b2", "1.50.1", 1.02, allKeys, allStatuses, allDurations),
      makeRun(0.3,[],      "main",          "c3d4e5f6", "1.51.0", 0.87, allKeys, allStatuses, allDurations),
    ],
  };

  // Append current run as latest
  const curTs = report.generatedAt || new Date().toISOString();
  const curSnapshots = report.tests.map(t => ({
    key: `${t.file}::${t.title}`,
    status: t.status,
    durationMs: t.durationMs || 0,
  }));
  const curPassed = curSnapshots.filter(s => s.status === "passed").length;
  const curFailed = curSnapshots.filter(s => s.status === "failed").length;
  history.runs.push({
    runId: createHash("sha1").update(curTs).digest("hex").slice(0, 16),
    timestamp: curTs,
    branch: "main",
    commit: "f1e2d3c4",
    passRate: Math.round((curPassed / curSnapshots.length) * 100),
    playwrightVersion: report.environment?.playwrightVersion || "1.51.0",
    summary: {
      total: curSnapshots.length,
      passed: curPassed,
      failed: curFailed,
      skipped: 0,
      flaky: report.summary?.flaky || 0,
      durationMs: report.summary?.durationMs || 0,
    },
    testSnapshots: curSnapshots,
  });

  await writeFile(historyPath, JSON.stringify(history, null, 2));
  console.log(`History seeded: ${history.runs.length} runs -> ${historyPath}`);

  const outputDir = path.dirname(outputPath);
  const html = buildGlossyHtml(report, { outputDir, history });
  await writeFile(outputPath, html, "utf-8");
  console.log(`Report rendered -> ${outputPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
