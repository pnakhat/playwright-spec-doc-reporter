import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { triggerRerunTool } from "../../src/mcp/tools/trigger-rerun.js";
import { McpToolError } from "../../src/mcp/types.js";
import type { RerunRunner } from "../../src/mcp/types.js";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

// A mock runner that records the argv it was given and emits canned output.
function mockRunner(exitCode = 0): { runner: RerunRunner; calls: string[][] } {
  const calls: string[][] = [];
  const runner: RerunRunner = async (_command, args, onChunk) => {
    calls.push(args);
    onChunk("stdout", "Running 1 test\n");
    onChunk("stdout", "1 passed\n");
    return { exitCode };
  };
  return { runner, calls };
}

describe("trigger_rerun", () => {
  it("builds the playwright argv and captures output", async () => {
    const { runner, calls } = mockRunner(0);
    const tool = triggerRerunTool(fixtures, runner);
    const result = await tool.execute({ grep: "checkout flow", project: "chromium" });

    expect(calls[0]).toEqual(["playwright", "test", "--grep", "checkout flow", "--project", "chromium"]);
    expect(result.command).toBe("npx playwright test --grep checkout flow --project chromium");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("1 passed");
    expect(result.truncated).toBe(false);
  });

  it("propagates a non-zero exit code", async () => {
    const { runner } = mockRunner(1);
    const tool = triggerRerunTool(fixtures, runner);
    const result = await tool.execute({});
    expect(result.exitCode).toBe(1);
  });

  it("rejects a grep containing control characters", async () => {
    const { runner } = mockRunner(0);
    const tool = triggerRerunTool(fixtures, runner);
    await expect(tool.execute({ grep: "evil\nrm -rf" })).rejects.toBeInstanceOf(McpToolError);
  });

  it("surfaces launch failures as McpToolError", async () => {
    const failing: RerunRunner = async () => {
      throw new Error("spawn ENOENT");
    };
    const tool = triggerRerunTool(fixtures, failing);
    await expect(tool.execute({})).rejects.toMatchObject({ code: -32002 });
  });
});
