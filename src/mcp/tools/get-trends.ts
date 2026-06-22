import { z } from "zod";
import { loadHistory } from "../loader.js";
import { McpToolError, ERR_INVALID_ARGS } from "../types.js";
import type { McpTool, TrendsResult } from "../types.js";

const InputSchema = z
  .object({
    limit: z.number().int().positive().max(500).optional(),
    outputDir: z.string().optional(),
  })
  .strict();

export function getTrendsTool(outputDir: string): McpTool<TrendsResult> {
  return {
    name: "get_trends",
    description:
      "Returns historical run snapshots (pass rate, totals, per-test status) recorded across runs, most-recent first. Use limit to cap how many runs are returned.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of most-recent runs to return. Default: 20.",
        },
        outputDir: {
          type: "string",
          description: "Ignored — the server uses its configured outputDir.",
        },
      },
      additionalProperties: false,
    },
    async execute(args: unknown): Promise<TrendsResult> {
      const parsed = InputSchema.safeParse(args ?? {});
      if (!parsed.success) {
        throw new McpToolError(ERR_INVALID_ARGS, parsed.error.message);
      }
      const limit = parsed.data.limit ?? 20;

      const history = loadHistory(outputDir);
      // History is appended chronologically; return most-recent first.
      const ordered = [...history.runs].reverse();
      const runs = ordered.slice(0, limit);

      return {
        schemaVersion: history.schemaVersion,
        totalRuns: history.runs.length,
        returned: runs.length,
        runs,
      };
    },
  };
}
