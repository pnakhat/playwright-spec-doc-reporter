import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getTrendsTool } from "../../src/mcp/tools/get-trends.js";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("get_trends", () => {
  it("returns runs most-recent first", async () => {
    const tool = getTrendsTool(fixtures);
    const result = await tool.execute({});
    expect(result.totalRuns).toBe(3);
    expect(result.runs[0].runId).toBe("run-3");
    expect(result.runs[2].runId).toBe("run-1");
  });

  it("respects the limit", async () => {
    const tool = getTrendsTool(fixtures);
    const result = await tool.execute({ limit: 1 });
    expect(result.returned).toBe(1);
    expect(result.runs[0].runId).toBe("run-3");
  });

  it("returns empty history when the file is absent", async () => {
    const tool = getTrendsTool(path.join(fixtures, "empty"));
    const result = await tool.execute({});
    expect(result.totalRuns).toBe(0);
    expect(result.runs).toEqual([]);
  });
});
