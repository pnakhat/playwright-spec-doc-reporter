import { z } from "zod";
import { loadReport } from "../loader.js";
import { McpToolError, ERR_INVALID_ARGS } from "../types.js";
import type { McpTool, RunSummary } from "../types.js";

const InputSchema = z
  .object({
    outputDir: z.string().optional(), // accepted for ergonomics, ignored
  })
  .strict();

export function getRunSummaryTool(outputDir: string): McpTool<RunSummary> {
  return {
    name: "get_run_summary",
    description:
      "Returns the high-level summary of the most recent Playwright test run: totals, pass rate, environment, and AI/healing status.",
    inputSchema: {
      type: "object",
      properties: {
        outputDir: {
          type: "string",
          description: "Ignored — the server uses its configured outputDir.",
        },
      },
      additionalProperties: false,
    },
    async execute(args: unknown): Promise<RunSummary> {
      const parsed = InputSchema.safeParse(args ?? {});
      if (!parsed.success) {
        throw new McpToolError(ERR_INVALID_ARGS, parsed.error.message);
      }

      const report = loadReport(outputDir);
      const { summary, environment } = report;
      const passRate =
        summary.total > 0
          ? Math.round((summary.passed / summary.total) * 10000) / 100
          : 0;

      return {
        title: report.title,
        generatedAt: report.generatedAt,
        passRate,
        summary,
        environment: {
          nodeVersion: environment.nodeVersion,
          platform: environment.platform,
          os: environment.os,
          ci: environment.ci,
          playwrightVersion: environment.playwrightVersion,
          projects: environment.projects,
          browsers: environment.browsers,
          workers: environment.workers,
        },
        aiEnabled: report.aiEnabled,
        failingTestCount: summary.failed + summary.timedOut + summary.interrupted,
        flakyTestCount: summary.flaky,
        healingPayloadCount: report.healingPayloads?.length ?? 0,
        healing: report.healingSummary,
      };
    },
  };
}
