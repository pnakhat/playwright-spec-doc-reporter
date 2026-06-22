import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getTraceabilityTool } from "../../src/mcp/tools/get-traceability.js";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("get_traceability", () => {
  it("returns the full index with coverage stats", async () => {
    const tool = getTraceabilityTool(fixtures);
    const result = await tool.execute({});
    expect(result.specCount).toBe(2);
    expect(result.coveredSpecCount).toBe(1);
    expect(result.uncoveredSpecCount).toBe(1);
    expect(result.index.mapping["specs/login.md"]).toEqual(["t-login-ok", "t-login-fail"]);
  });

  it("narrows to a single spec path", async () => {
    const tool = getTraceabilityTool(fixtures);
    const result = await tool.execute({ specPath: "specs/login.md" });
    expect(result.specCount).toBe(1);
    expect(result.index.specs[0].filePath).toBe("specs/login.md");
    expect(Object.keys(result.index.reverseMapping).sort()).toEqual([
      "t-login-fail",
      "t-login-ok",
    ]);
  });
});
