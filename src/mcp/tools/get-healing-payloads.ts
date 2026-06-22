import { z } from "zod";
import { loadReport } from "../loader.js";
import { McpToolError, ERR_INVALID_ARGS } from "../types.js";
import type { McpTool, HealingPayloadsResult } from "../types.js";

const InputSchema = z
  .object({
    testName: z.string().optional(),
    outputDir: z.string().optional(),
  })
  .strict();

export function getHealingPayloadsTool(
  outputDir: string,
): McpTool<HealingPayloadsResult> {
  return {
    name: "get_healing_payloads",
    description:
      "Returns self-healing locator payloads (failed locator, candidate locators, suggested patch, confidence) for tests where the reporter detected locator drift. Optionally filter by testName.",
    inputSchema: {
      type: "object",
      properties: {
        testName: {
          type: "string",
          description: "Filter payloads to a test (substring match on test name, case-insensitive).",
        },
        outputDir: {
          type: "string",
          description: "Ignored — the server uses its configured outputDir.",
        },
      },
      additionalProperties: false,
    },
    async execute(args: unknown): Promise<HealingPayloadsResult> {
      const parsed = InputSchema.safeParse(args ?? {});
      if (!parsed.success) {
        throw new McpToolError(ERR_INVALID_ARGS, parsed.error.message);
      }

      const report = loadReport(outputDir);
      let payloads = report.healingPayloads ?? [];

      const needle = parsed.data.testName?.toLowerCase();
      if (needle) {
        payloads = payloads.filter(p => p.testName.toLowerCase().includes(needle));
      }

      return { count: payloads.length, payloads };
    },
  };
}
