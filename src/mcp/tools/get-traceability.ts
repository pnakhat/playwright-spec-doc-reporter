import { z } from "zod";
import { loadTraceability } from "../loader.js";
import { McpToolError, ERR_INVALID_ARGS } from "../types.js";
import type { McpTool, TraceabilityResult } from "../types.js";
import type { TraceabilityIndexData } from "../../types/index.js";

const InputSchema = z
  .object({
    specPath: z.string().optional(),
    outputDir: z.string().optional(),
  })
  .strict();

export function getTraceabilityTool(outputDir: string): McpTool<TraceabilityResult> {
  return {
    name: "get_traceability",
    description:
      "Returns the spec-to-test traceability index: which specs map to which tests, the reverse mapping, and coverage stats. Optionally narrow to a single specPath.",
    inputSchema: {
      type: "object",
      properties: {
        specPath: {
          type: "string",
          description: "Filter to a single spec file path (e.g. specs/smoke.md).",
        },
        outputDir: {
          type: "string",
          description: "Ignored — the server uses its configured outputDir.",
        },
      },
      additionalProperties: false,
    },
    async execute(args: unknown): Promise<TraceabilityResult> {
      const parsed = InputSchema.safeParse(args ?? {});
      if (!parsed.success) {
        throw new McpToolError(ERR_INVALID_ARGS, parsed.error.message);
      }

      let index = loadTraceability(outputDir);
      const specPath = parsed.data.specPath;
      if (specPath) {
        const filteredSpecs = index.specs.filter(s => s.filePath === specPath);
        const mapping: TraceabilityIndexData["mapping"] = {};
        if (index.mapping[specPath]) mapping[specPath] = index.mapping[specPath];
        const testIds = new Set(Object.values(mapping).flat());
        const reverseMapping: TraceabilityIndexData["reverseMapping"] = {};
        for (const [testId, spec] of Object.entries(index.reverseMapping)) {
          if (testIds.has(testId)) reverseMapping[testId] = spec;
        }
        index = { specs: filteredSpecs, mapping, reverseMapping };
      }

      const coveredSpecCount = index.specs.filter(
        s => (index.mapping[s.filePath]?.length ?? 0) > 0,
      ).length;

      return {
        specCount: index.specs.length,
        coveredSpecCount,
        uncoveredSpecCount: index.specs.length - coveredSpecCount,
        index,
      };
    },
  };
}
