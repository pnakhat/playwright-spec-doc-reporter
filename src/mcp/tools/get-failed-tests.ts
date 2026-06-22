import { z } from "zod";
import { loadReport } from "../loader.js";
import { McpToolError, ERR_INVALID_ARGS } from "../types.js";
import type {
  McpTool,
  FailedTestsResult,
  FailedTestEntry,
} from "../types.js";
import type { NormalizedTestResult } from "../../types/index.js";

const InputSchema = z
  .object({
    includeFlaky: z.boolean().optional(),
    outputDir: z.string().optional(),
  })
  .strict();

const FAILING_STATUSES = new Set(["failed", "timedOut", "interrupted"]);

export function getFailedTestsTool(outputDir: string): McpTool<FailedTestsResult> {
  return {
    name: "get_failed_tests",
    description:
      "Lists the failed (and optionally flaky) tests from the most recent run, with error messages and flags for whether AI analysis or a healing payload is available.",
    inputSchema: {
      type: "object",
      properties: {
        includeFlaky: {
          type: "boolean",
          description: "Include flaky tests in the result. Default: false.",
        },
        outputDir: {
          type: "string",
          description: "Ignored — the server uses its configured outputDir.",
        },
      },
      additionalProperties: false,
    },
    async execute(args: unknown): Promise<FailedTestsResult> {
      const parsed = InputSchema.safeParse(args ?? {});
      if (!parsed.success) {
        throw new McpToolError(ERR_INVALID_ARGS, parsed.error.message);
      }
      const includeFlaky = parsed.data.includeFlaky ?? false;

      const report = loadReport(outputDir);
      const aiByName = new Set(report.aiAnalyses?.map(a => `${a.file}::${a.testName}`));
      const healByName = new Set(
        report.healingPayloads?.map(p => `${p.file}::${p.testName}`),
      );

      const isIncluded = (t: NormalizedTestResult): boolean =>
        FAILING_STATUSES.has(t.status) || (includeFlaky && t.flaky);

      const tests: FailedTestEntry[] = report.tests
        .filter(isIncluded)
        .map(t => ({
          id: t.id,
          title: t.title,
          fullName: t.fullName,
          file: t.file,
          suite: t.suite,
          status: t.status,
          flaky: t.flaky,
          retries: t.retries,
          durationMs: t.durationMs,
          errorMessage: t.errorMessage,
          tags: t.tags,
          specPath: t.specPath,
          hasHealingPayload: healByName.has(`${t.file}::${t.title}`),
          aiAnalyzed: aiByName.has(`${t.file}::${t.title}`),
        }));

      return { count: tests.length, includeFlaky, tests };
    },
  };
}
