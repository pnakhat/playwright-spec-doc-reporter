import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getTestDetailTool } from "../../src/mcp/tools/get-test-detail.js";
import { McpToolError } from "../../src/mcp/types.js";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("get_test_detail", () => {
  it("finds a test by id and attaches AI analysis + healing payloads", async () => {
    const tool = getTestDetailTool(fixtures);
    const result = await tool.execute({ testId: "t-login-fail" });

    expect(result.test.title).toBe("rejects an invalid password");
    expect(result.aiAnalysis?.issueCategory).toBe("locator_drift");
    expect(result.healingPayloads).toHaveLength(1);
    expect(result.healingPayloads[0].failedLocator).toBe("#login-btn");
  });

  it("finds a test by partial, case-insensitive name", async () => {
    const tool = getTestDetailTool(fixtures);
    const result = await tool.execute({ testName: "INVALID password" });
    expect(result.test.id).toBe("t-login-fail");
  });

  it("requires testId or testName", async () => {
    const tool = getTestDetailTool(fixtures);
    await expect(tool.execute({})).rejects.toBeInstanceOf(McpToolError);
  });

  it("throws when no test matches", async () => {
    const tool = getTestDetailTool(fixtures);
    await expect(tool.execute({ testId: "nope" })).rejects.toMatchObject({ code: -32001 });
  });
});
