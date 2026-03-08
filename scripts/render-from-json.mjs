import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

async function main() {
  const inputArg = process.argv[2] ?? "samples/normalized-results.json";
  const outputArg = process.argv[3] ?? "samples/preview/index.html";

  const inputPath = path.resolve(repoRoot, inputArg);
  const outputPath = path.resolve(repoRoot, outputArg);

  let sdk;
  try {
    sdk = await import(path.resolve(repoRoot, "dist/index.js"));
  } catch {
    console.error("Missing dist build. Run: npm run build");
    process.exit(1);
  }

  const { buildGlossyHtml } = sdk;
  if (typeof buildGlossyHtml !== "function") {
    console.error("buildGlossyHtml export not found in dist/index.js");
    process.exit(1);
  }

  const raw = await readFile(inputPath, "utf-8");
  const reportData = JSON.parse(raw);

  /* Auto-generate healingMarkdown from payloads if missing */
  if (!reportData.healingMarkdown && Array.isArray(reportData.healingPayloads) && reportData.healingPayloads.length > 0) {
    try {
      const { healingPayloadsToMarkdown } = await import(path.resolve(repoRoot, "dist/healing/payload.js"));
      if (typeof healingPayloadsToMarkdown === "function") {
        reportData.healingMarkdown = healingPayloadsToMarkdown(reportData.healingPayloads);
      }
    } catch { /* ignore */ }
  }

  /* Auto-load spec-doc-history.json from the same directory as the input */
  let history;
  const historyPath = path.join(path.dirname(inputPath), "spec-doc-history.json");
  try {
    await access(historyPath);
    const historyRaw = await readFile(historyPath, "utf-8");
    history = JSON.parse(historyRaw);
    console.log(`Loaded history: ${history.runs?.length ?? 0} runs from ${historyPath}`);
  } catch { /* no history file — use empty */ }

  /* Ensure the current report's run appears in history.
     generateReport normally adds it, but when re-rendering from saved JSON
     (e.g. after CI artifacts are downloaded) the run may be absent. */
  const runTs = reportData.generatedAt || new Date().toISOString();
  if (!history) history = { schemaVersion: "1.0", runs: [] };
  const alreadyPresent = history.runs.some(r => r.timestamp === runTs);
  if (!alreadyPresent) {
    const snapshots = (reportData.tests || []).map(t => ({
      key: `${t.file}::${t.title}`,
      status: t.status,
      durationMs: t.durationMs || 0,
    }));
    const passed = snapshots.filter(s => s.status === "passed").length;
    const failed = snapshots.filter(s => s.status === "failed" || s.status === "timedOut").length;
    const total = snapshots.length;
    history.runs.push({
      runId: createHash("sha1").update(runTs).digest("hex").slice(0, 16),
      timestamp: runTs,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      playwrightVersion: reportData.environment?.playwrightVersion,
      summary: {
        total,
        passed,
        failed,
        skipped: reportData.summary?.skipped || 0,
        flaky: reportData.summary?.flaky || 0,
        durationMs: reportData.summary?.durationMs || 0,
      },
      testSnapshots: snapshots,
    });
    console.log(`Injected current run (${runTs}) into history for display.`);
  }

  const outputDir = path.dirname(outputPath);
  const html = buildGlossyHtml(reportData, { outputDir, history });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf-8");

  console.log(`Rendered ${inputArg} -> ${outputArg}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
