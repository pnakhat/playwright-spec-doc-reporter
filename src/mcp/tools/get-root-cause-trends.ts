import { z } from "zod";
import { loadHistory } from "../loader.js";
import { aggregateRootCauseTrends } from "../../utils/rootCauseTrends.js";
import { McpToolError, ERR_INVALID_ARGS } from "../types.js";
import type { McpTool, RootCauseTrendsResult } from "../types.js";

const InputSchema = z
  .object({
    windowSize: z.number().int().positive().max(30).optional(),
    outputDir: z.string().optional(),
  })
  .strict();

export function getRootCauseTrendsTool(outputDir: string): McpTool<RootCauseTrendsResult> {
  return {
    name: "get_root_cause_trends",
    description:
      "Returns a pre-aggregated summary of AI-diagnosed root-cause categories (locator_drift, timing_issue, app_bug, etc.) across failed tests over the last N runs — the category mix of the latest run, the earliest run in the window, and the percentage-point delta between them per category. Runs with no AI-analyzed failures are excluded, not zero-filled.",
    inputSchema: {
      type: "object",
      properties: {
        windowSize: {
          type: "number",
          description: "Number of most-recent runs to consider. Default: 10.",
        },
        outputDir: {
          type: "string",
          description: "Ignored — the server uses its configured outputDir.",
        },
      },
      additionalProperties: false,
    },
    async execute(args: unknown): Promise<RootCauseTrendsResult> {
      const parsed = InputSchema.safeParse(args ?? {});
      if (!parsed.success) {
        throw new McpToolError(ERR_INVALID_ARGS, parsed.error.message);
      }
      const windowSize = parsed.data.windowSize ?? 10;

      const history = loadHistory(outputDir);
      const summary = aggregateRootCauseTrends(history, windowSize);

      return {
        schemaVersion: history.schemaVersion,
        ...summary,
      };
    },
  };
}
