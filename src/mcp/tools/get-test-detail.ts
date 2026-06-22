import { z } from "zod";
import { loadReport } from "../loader.js";
import { McpToolError, ERR_INVALID_ARGS, ERR_ARTIFACT_NOT_FOUND } from "../types.js";
import type { McpTool, TestDetailResult } from "../types.js";

const InputSchema = z
  .object({
    testId: z.string().optional(),
    testName: z.string().optional(),
    outputDir: z.string().optional(),
  })
  .strict()
  .refine(v => Boolean(v.testId || v.testName), {
    message: "Provide either testId or testName.",
  });

export function getTestDetailTool(outputDir: string): McpTool<TestDetailResult> {
  return {
    name: "get_test_detail",
    description:
      "Returns the full detail for a single test (steps, error snippet, artifacts, API traffic) plus any AI analysis and healing payloads. Identify the test by testId or by testName (matched against title or fullName).",
    inputSchema: {
      type: "object",
      properties: {
        testId: { type: "string", description: "Stable test id from get_failed_tests." },
        testName: {
          type: "string",
          description: "Test title or full name (substring match, case-insensitive).",
        },
        outputDir: {
          type: "string",
          description: "Ignored — the server uses its configured outputDir.",
        },
      },
      additionalProperties: false,
    },
    async execute(args: unknown): Promise<TestDetailResult> {
      const parsed = InputSchema.safeParse(args ?? {});
      if (!parsed.success) {
        throw new McpToolError(ERR_INVALID_ARGS, parsed.error.message);
      }
      const { testId, testName } = parsed.data;
      const report = loadReport(outputDir);

      const needle = testName?.toLowerCase();
      const test = report.tests.find(t => {
        if (testId) return t.id === testId;
        return (
          t.title.toLowerCase().includes(needle!) ||
          t.fullName.toLowerCase().includes(needle!)
        );
      });

      if (!test) {
        throw new McpToolError(
          ERR_ARTIFACT_NOT_FOUND,
          `No test found matching ${testId ? `id "${testId}"` : `name "${testName}"`}.`,
        );
      }

      const aiAnalysis = report.aiAnalyses?.find(
        a => a.file === test.file && a.testName === test.title,
      );
      const healingPayloads = (report.healingPayloads ?? []).filter(
        p => p.file === test.file && p.testName === test.title,
      );

      return { test, aiAnalysis, healingPayloads };
    },
  };
}
