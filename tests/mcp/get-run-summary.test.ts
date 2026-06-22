import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getRunSummaryTool } from "../../src/mcp/tools/get-run-summary.js";
import { McpToolError } from "../../src/mcp/types.js";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("get_run_summary", () => {
  it("computes the run summary and pass rate", async () => {
    const tool = getRunSummaryTool(fixtures);
    const result = await tool.execute({});

    expect(result.title).toBe("Demo Suite");
    expect(result.summary.total).toBe(4);
    expect(result.passRate).toBe(50);
    expect(result.failingTestCount).toBe(1);
    expect(result.flakyTestCount).toBe(1);
    expect(result.healingPayloadCount).toBe(1);
    expect(result.aiEnabled).toBe(true);
    expect(result.healing?.flakinessSignal).toBe("medium");
  });

  it("ignores the outputDir argument", async () => {
    const tool = getRunSummaryTool(fixtures);
    const result = await tool.execute({ outputDir: "/somewhere/else" });
    expect(result.summary.total).toBe(4);
  });

  it("rejects unknown arguments", async () => {
    const tool = getRunSummaryTool(fixtures);
    await expect(tool.execute({ bogus: 1 })).rejects.toBeInstanceOf(McpToolError);
  });

  it("throws ARTIFACT_NOT_FOUND when results.json is missing", async () => {
    const tool = getRunSummaryTool(path.join(fixtures, "empty"));
    await expect(tool.execute({})).rejects.toMatchObject({ code: -32001 });
  });
});
