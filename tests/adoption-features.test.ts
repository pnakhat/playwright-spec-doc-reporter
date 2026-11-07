import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildCtrfReport } from "../src/ctrf.js";
import { writeGithubSummary } from "../src/prComment/generator.js";
import { initConfig } from "../src/mcp/cli.js";
import type { NormalizedTestResult, ReportSummary } from "../src/types/index.js";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "spec-doc-"));

function t(status: NormalizedTestResult["status"], title = status): NormalizedTestResult {
  return {
    id: title, suite: "s", file: "a.spec.ts", title, fullName: `s > ${title}`, status,
    expectedStatus: "passed", flaky: status === "flaky", retries: 0, retryIndex: 0, durationMs: 10,
    attachments: [], artifacts: {} as NormalizedTestResult["artifacts"], consoleLogs: [], tags: [], steps: [],
    ...(status === "failed" ? { errorMessage: "boom" } : {}),
  };
}

const summary: ReportSummary = {
  total: 2, passed: 1, failed: 1, skipped: 0, flaky: 0, timedOut: 0, interrupted: 0, durationMs: 20, averageDurationMs: 10,
};

describe("buildCtrfReport", () => {
  it("maps statuses and counts", () => {
    const r = buildCtrfReport(
      [t("passed"), t("flaky"), t("failed"), t("timedOut"), t("skipped"), t("interrupted")],
      { startedAt: "2026-01-01T00:00:00Z", finishedAt: "2026-01-01T00:00:01Z" }
    );
    expect(r.reportFormat).toBe("CTRF");
    expect(r.results.summary).toMatchObject({ tests: 6, passed: 2, failed: 2, skipped: 1, pending: 0, other: 1 });
    expect(r.results.summary.stop - r.results.summary.start).toBe(1000);
    const ansi = buildCtrfReport([{ ...t("failed"), fullName: " ›  › a.spec.ts › x", errorMessage: "\u001b[31mred\u001b[39m" }]);
    expect(ansi.results.tests[0]).toMatchObject({ name: "a.spec.ts › x", message: "red" });
    expect(r.results.tests[2]).toMatchObject({ name: "s > failed", status: "failed", message: "boom", filePath: "a.spec.ts" });
  });
});

describe("writeGithubSummary", () => {
  const prev = process.env.GITHUB_STEP_SUMMARY;
  afterEach(() => {
    if (prev === undefined) delete process.env.GITHUB_STEP_SUMMARY;
    else process.env.GITHUB_STEP_SUMMARY = prev;
  });

  it("appends markdown when GITHUB_STEP_SUMMARY is set, skips when disabled", async () => {
    const file = path.join(tmp(), "summary.md");
    process.env.GITHUB_STEP_SUMMARY = file;
    await writeGithubSummary([t("passed"), t("failed")], summary, [], {});
    expect(fs.readFileSync(file, "utf-8")).toContain("s > failed");

    fs.writeFileSync(file, "");
    await writeGithubSummary([t("failed")], summary, [], { githubSummary: false });
    expect(fs.readFileSync(file, "utf-8")).toBe("");
  });
});

describe("initConfig", () => {
  it("replaces the default `reporter: 'html'` and updates .gitignore", () => {
    const dir = tmp();
    fs.writeFileSync(path.join(dir, "playwright.config.ts"), "export default defineConfig({\n  reporter: 'html',\n});\n");
    fs.writeFileSync(path.join(dir, ".gitignore"), "node_modules\n");
    expect(initConfig(dir)).toMatch(/Added/);
    const cfg = fs.readFileSync(path.join(dir, "playwright.config.ts"), "utf-8");
    expect(cfg).toContain(`reporter: [["html"], ["playwright-spec-doc-reporter"]],`);
    expect(cfg).not.toContain("'html'");
    expect(fs.readFileSync(path.join(dir, ".gitignore"), "utf-8")).toContain("/spec-doc-report/");
    expect(initConfig(dir)).toMatch(/already/);
  });

  it("inserts a reporter when none exists", () => {
    const dir = tmp();
    fs.writeFileSync(path.join(dir, "playwright.config.js"), "module.exports = defineConfig({\n  testDir: 'tests',\n});\n");
    initConfig(dir);
    expect(fs.readFileSync(path.join(dir, "playwright.config.js"), "utf-8")).toContain(`["playwright-spec-doc-reporter"]`);
  });

  it("leaves custom reporter setups alone and prints the entry", () => {
    const dir = tmp();
    const src = "export default defineConfig({ reporter: process.env.CI ? 'dot' : 'list' });\n";
    fs.writeFileSync(path.join(dir, "playwright.config.ts"), src);
    expect(initConfig(dir)).toMatch(/Couldn't safely edit/);
    expect(fs.readFileSync(path.join(dir, "playwright.config.ts"), "utf-8")).toBe(src);
  });
});
