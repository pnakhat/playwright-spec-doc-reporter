import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeRunTool } from "../../src/mcp/tools/analyze-run.js";
import { McpToolError } from "../../src/mcp/types.js";
import type { AgenticRunAnalysis } from "../../src/mcp/types.js";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures-analyze");
const emptyFixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "empty");

describe("analyze_run tool", () => {
  // ── basic contract ─────────────────────────────────────────────────────────

  it("returns a valid AgenticRunAnalysis shape", async () => {
    const tool = analyzeRunTool(fixtures);
    const result = await tool.execute({}) as AgenticRunAnalysis;

    expect(result).toHaveProperty("runHealth");
    expect(result).toHaveProperty("overlapGroups");
    expect(result).toHaveProperty("apiCandidates");
    expect(result).toHaveProperty("timingIssueApiCorrelations");
    expect(result).toHaveProperty("recommendations");
    expect(result).toHaveProperty("summary");
    expect(typeof result.summary).toBe("string");
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it("rejects unknown arguments", async () => {
    const tool = analyzeRunTool(fixtures);
    await expect(tool.execute({ bogus: true })).rejects.toBeInstanceOf(McpToolError);
  });

  it("throws ARTIFACT_NOT_FOUND when results.json is missing", async () => {
    const tool = analyzeRunTool(emptyFixtures);
    await expect(tool.execute({})).rejects.toMatchObject({ code: -32001 });
  });

  it("ignores the outputDir argument", async () => {
    const tool = analyzeRunTool(fixtures);
    const result = await tool.execute({ outputDir: "/somewhere/else" }) as AgenticRunAnalysis;
    expect(result.runHealth.totalTests).toBe(6);
  });

  // ── runHealth ──────────────────────────────────────────────────────────────

  it("computes runHealth pass rate and counts correctly", async () => {
    const tool = analyzeRunTool(fixtures);
    const { runHealth } = await tool.execute({}) as AgenticRunAnalysis;

    // Fixture: 6 total, 3 passed, 2 failed, 1 flaky
    expect(runHealth.totalTests).toBe(6);
    expect(runHealth.failedTests).toBe(2);
    expect(runHealth.flakyTests).toBe(1);
    expect(runHealth.passRate).toBeCloseTo(50, 0);
  });

  it("detects degrading trend from history", async () => {
    const tool = analyzeRunTool(fixtures);
    const { runHealth } = await tool.execute({}) as AgenticRunAnalysis;

    // History last run: 67% → current: ~50% — should be degrading
    expect(runHealth.trendDirection).toBe("degrading");
    expect(runHealth.passRateDelta).toBeDefined();
    expect(runHealth.passRateDelta!).toBeLessThan(0);
  });

  // ── overlap detection ──────────────────────────────────────────────────────

  it("detects overlap group for the two auth login tests", async () => {
    const tool = analyzeRunTool(fixtures);
    const { overlapGroups } = await tool.execute({}) as AgenticRunAnalysis;

    expect(overlapGroups.length).toBeGreaterThan(0);
    const authGroup = overlapGroups.find(g =>
      g.testIds.includes("t-login-a") && g.testIds.includes("t-login-b"),
    );
    expect(authGroup).toBeDefined();
    expect(authGroup!.sharedSteps.length).toBeGreaterThanOrEqual(5);
    expect(authGroup!.similarity).toBeGreaterThanOrEqual(0.6);
  });

  it("excludes failed-only tests from overlap when includePassedTests is false", async () => {
    const tool = analyzeRunTool(fixtures);
    const { overlapGroups } = await tool.execute({ includePassedTests: false }) as AgenticRunAnalysis;

    // When passed tests are excluded, the two passing auth tests won't form a group
    const authGroup = overlapGroups.find(g =>
      g.testIds.includes("t-login-a") && g.testIds.includes("t-login-b"),
    );
    expect(authGroup).toBeUndefined();
  });

  it("respects a custom overlapThreshold", async () => {
    const tool = analyzeRunTool(fixtures);

    // Very high threshold — the two login tests share 5/6 steps (~0.83 Jaccard)
    // At 0.95 they should not form a group
    const { overlapGroups: strictGroups } = await tool.execute({ overlapThreshold: 0.95 }) as AgenticRunAnalysis;
    const authGroup95 = strictGroups.find(g =>
      g.testIds.includes("t-login-a") && g.testIds.includes("t-login-b"),
    );
    expect(authGroup95).toBeUndefined();

    // At 0.3 they definitely should
    const { overlapGroups: looseGroups } = await tool.execute({ overlapThreshold: 0.3 }) as AgenticRunAnalysis;
    expect(looseGroups.length).toBeGreaterThan(0);
  });

  // ── API convertibility ─────────────────────────────────────────────────────

  it("includes API conversion candidates at default minConversionScore 0.5", async () => {
    const tool = analyzeRunTool(fixtures);
    const { apiCandidates } = await tool.execute({}) as AgenticRunAnalysis;

    expect(apiCandidates.length).toBeGreaterThan(0);
    const cartRemove = apiCandidates.find(c => c.testId === "t-cart-remove");
    expect(cartRemove).toBeDefined();
    // t-cart-remove has 3 API steps out of 4 total → score 0.75
    expect(cartRemove!.conversionScore).toBeGreaterThanOrEqual(0.5);
  });

  it("returns candidates sorted by descending conversionScore", async () => {
    const tool = analyzeRunTool(fixtures);
    const { apiCandidates } = await tool.execute({ minConversionScore: 0.0 }) as AgenticRunAnalysis;

    for (let i = 1; i < apiCandidates.length; i++) {
      expect(apiCandidates[i - 1].conversionScore).toBeGreaterThanOrEqual(
        apiCandidates[i].conversionScore,
      );
    }
  });

  it("raises the bar with minConversionScore 0.8", async () => {
    const tool = analyzeRunTool(fixtures);
    const { apiCandidates: all } = await tool.execute({ minConversionScore: 0.0 }) as AgenticRunAnalysis;
    const { apiCandidates: high } = await tool.execute({ minConversionScore: 0.8 }) as AgenticRunAnalysis;

    expect(high.length).toBeLessThanOrEqual(all.length);
    expect(high.every(c => c.conversionScore >= 0.8)).toBe(true);
  });

  // ── timing / API correlation ───────────────────────────────────────────────

  it("correlates timing_issue AI analyses with tests that have apiEntries", async () => {
    const tool = analyzeRunTool(fixtures);
    const { timingIssueApiCorrelations } = await tool.execute({}) as AgenticRunAnalysis;

    // Fixture has 2 timing_issue analyses (t-cart-add, t-checkout), both have apiEntries
    expect(timingIssueApiCorrelations.length).toBeGreaterThanOrEqual(2);
    expect(timingIssueApiCorrelations.some(c => c.testId === "t-cart-add")).toBe(true);
    expect(timingIssueApiCorrelations.some(c => c.testId === "t-checkout")).toBe(true);
  });

  it("includes endpoint info in correlation entries", async () => {
    const tool = analyzeRunTool(fixtures);
    const { timingIssueApiCorrelations } = await tool.execute({}) as AgenticRunAnalysis;

    const cart = timingIssueApiCorrelations.find(c => c.testId === "t-cart-add");
    expect(cart!.endpoints.length).toBeGreaterThan(0);
    expect(cart!.suggestion).toContain("page.route");
  });

  // ── recommendations ────────────────────────────────────────────────────────

  it("produces a non-empty recommendations list", async () => {
    const tool = analyzeRunTool(fixtures);
    const { recommendations } = await tool.execute({}) as AgenticRunAnalysis;
    expect(recommendations.length).toBeGreaterThan(0);
  });

  it("recommendations are sorted high → medium → low priority", async () => {
    const tool = analyzeRunTool(fixtures);
    const { recommendations } = await tool.execute({}) as AgenticRunAnalysis;

    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    for (let i = 1; i < recommendations.length; i++) {
      expect(order[recommendations[i - 1].priority]).toBeLessThanOrEqual(
        order[recommendations[i].priority],
      );
    }
  });

  it("includes a high-priority recommendation for timing_issue + API tests", async () => {
    const tool = analyzeRunTool(fixtures);
    const { recommendations } = await tool.execute({}) as AgenticRunAnalysis;

    const highNetworkIntercept = recommendations.filter(
      r => r.priority === "high" && r.type === "add_network_interception",
    );
    expect(highNetworkIntercept.length).toBeGreaterThanOrEqual(1);
  });

  it("each recommendation references at least one test id", async () => {
    const tool = analyzeRunTool(fixtures);
    const { recommendations } = await tool.execute({}) as AgenticRunAnalysis;

    for (const rec of recommendations) {
      expect(rec.affectedTestIds.length).toBeGreaterThan(0);
      expect(typeof rec.action).toBe("string");
      expect(rec.action.length).toBeGreaterThan(0);
    }
  });

  // ── summary ────────────────────────────────────────────────────────────────

  it("summary mentions pass rate", async () => {
    const tool = analyzeRunTool(fixtures);
    const { summary } = await tool.execute({}) as AgenticRunAnalysis;
    expect(summary).toMatch(/pass rate/i);
  });

  it("summary mentions timing issues when they exist", async () => {
    const tool = analyzeRunTool(fixtures);
    const { summary } = await tool.execute({}) as AgenticRunAnalysis;
    expect(summary).toMatch(/timing/i);
  });
});
