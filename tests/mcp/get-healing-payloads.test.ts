import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getHealingPayloadsTool } from "../../src/mcp/tools/get-healing-payloads.js";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("get_healing_payloads", () => {
  it("returns all healing payloads", async () => {
    const tool = getHealingPayloadsTool(fixtures);
    const result = await tool.execute({});
    expect(result.count).toBe(1);
    expect(result.payloads[0].candidateLocators).toContain("[data-testid=submit]");
  });

  it("filters by test name", async () => {
    const tool = getHealingPayloadsTool(fixtures);
    expect((await tool.execute({ testName: "invalid" })).count).toBe(1);
    expect((await tool.execute({ testName: "no-such-test" })).count).toBe(0);
  });
});
