import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getRootCauseTrendsTool } from "../../src/mcp/tools/get-root-cause-trends.js";

const rootCauseFixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures-rootcause");
const legacyFixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("get_root_cause_trends", () => {
  it("returns latest/earliest mix and deltas across categorized runs", async () => {
    const tool = getRootCauseTrendsTool(rootCauseFixtures);
    const result = await tool.execute({});
    expect(result.runsWithData).toBe(2);
    expect(result.latest?.percentages.app_bug).toBe(100);
    expect(result.earliest?.percentages.locator_drift).toBe(100);
    expect(result.deltas?.app_bug).toBe(100);
    expect(result.deltas?.locator_drift).toBe(-100);
  });

  it("respects a custom windowSize", async () => {
    const tool = getRootCauseTrendsTool(rootCauseFixtures);
    const result = await tool.execute({ windowSize: 1 });
    expect(result.runsConsidered).toBe(1);
    expect(result.latest?.percentages.app_bug).toBe(100);
  });

  it("excludes old-schema runs lacking issueCategory instead of throwing", async () => {
    const tool = getRootCauseTrendsTool(legacyFixtures);
    const result = await tool.execute({});
    expect(result.runsWithData).toBe(0);
    expect(result.points).toEqual([]);
  });

  it("returns an empty summary when history is absent", async () => {
    const tool = getRootCauseTrendsTool(path.join(rootCauseFixtures, "empty"));
    const result = await tool.execute({});
    expect(result.runsWithData).toBe(0);
    expect(result.latest).toBeUndefined();
  });

  it("rejects invalid windowSize input", async () => {
    const tool = getRootCauseTrendsTool(rootCauseFixtures);
    await expect(tool.execute({ windowSize: -1 })).rejects.toThrow();
  });
});
