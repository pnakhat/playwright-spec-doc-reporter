import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getFailedTestsTool } from "../../src/mcp/tools/get-failed-tests.js";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("get_failed_tests", () => {
  it("returns only failing tests by default", async () => {
    const tool = getFailedTestsTool(fixtures);
    const result = await tool.execute({});

    expect(result.count).toBe(1);
    expect(result.includeFlaky).toBe(false);
    const failed = result.tests[0];
    expect(failed.id).toBe("t-login-fail");
    expect(failed.status).toBe("failed");
    expect(failed.errorMessage).toContain("Timeout");
    expect(failed.hasHealingPayload).toBe(true);
    expect(failed.aiAnalyzed).toBe(true);
  });

  it("includes flaky tests when requested", async () => {
    const tool = getFailedTestsTool(fixtures);
    const result = await tool.execute({ includeFlaky: true });

    expect(result.count).toBe(2);
    expect(result.tests.map(t => t.id).sort()).toEqual(["t-cart-flaky", "t-login-fail"]);
    const flaky = result.tests.find(t => t.id === "t-cart-flaky")!;
    expect(flaky.hasHealingPayload).toBe(false);
    expect(flaky.aiAnalyzed).toBe(false);
  });
});
