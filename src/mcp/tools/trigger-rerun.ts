import { z } from "zod";
import { spawn } from "node:child_process";
import {
  McpToolError,
  ERR_INVALID_ARGS,
  ERR_RERUN_FAILED,
} from "../types.js";
import type { McpTool, RerunResult, RerunRunner } from "../types.js";

// Cap captured output so a chatty run can't return megabytes of text.
const MAX_OUTPUT_CHARS = 20_000;

/** True if the string contains any control character (incl. newlines/DEL). */
function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

// A grep is a Playwright title regex. Reject only control characters; spaces and
// regex metacharacters are valid inside a title grep. The value is always passed
// as a discrete argv entry (never through a shell), so shell metacharacters are
// inert — but we still keep it sane and bounded.
const GrepSchema = z
  .string()
  .min(1)
  .max(200)
  .refine(v => !hasControlChar(v), "grep must not contain control characters");

const InputSchema = z
  .object({
    grep: GrepSchema.optional(),
    project: z
      .string()
      .max(100)
      .regex(/^[\w.\- ]+$/, "project must be alphanumeric")
      .optional(),
    headed: z.boolean().optional(),
    outputDir: z.string().optional(),
  })
  .strict();

// Default runner: spawn `npx playwright test` with no shell (argv array only).
const defaultRunner: RerunRunner = (command, args, onChunk) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false });
    child.stdout.on("data", d => onChunk("stdout", d.toString()));
    child.stderr.on("data", d => onChunk("stderr", d.toString()));
    child.on("error", reject);
    child.on("close", code => resolve({ exitCode: code }));
  });

export function triggerRerunTool(
  _outputDir: string,
  runner: RerunRunner = defaultRunner,
): McpTool<RerunResult> {
  return {
    name: "trigger_rerun",
    description:
      "Re-runs the Playwright suite (optionally filtered by a title grep and/or project) and returns the exit code plus captured stdout/stderr. Use this to verify a fix or reproduce a failure.",
    inputSchema: {
      type: "object",
      properties: {
        grep: {
          type: "string",
          description: "Playwright --grep title filter (regex). Keep it specific to avoid long runs.",
        },
        project: {
          type: "string",
          description: "Playwright project name to run (--project).",
        },
        headed: {
          type: "boolean",
          description: "Run headed (--headed). Default: false.",
        },
        outputDir: {
          type: "string",
          description: "Ignored — the server uses its configured outputDir.",
        },
      },
      additionalProperties: false,
    },
    async execute(args: unknown): Promise<RerunResult> {
      const parsed = InputSchema.safeParse(args ?? {});
      if (!parsed.success) {
        throw new McpToolError(ERR_INVALID_ARGS, parsed.error.message);
      }
      const { grep, project, headed } = parsed.data;

      const argv = ["playwright", "test"];
      if (grep) argv.push("--grep", grep);
      if (project) argv.push("--project", project);
      if (headed) argv.push("--headed");

      const command = `npx ${argv.join(" ")}`;
      let stdout = "";
      let stderr = "";
      let truncated = false;
      const started = process.hrtime.bigint();

      const append = (stream: "stdout" | "stderr", chunk: string) => {
        if (stream === "stdout") {
          if (stdout.length < MAX_OUTPUT_CHARS) stdout += chunk;
          else truncated = true;
        } else {
          if (stderr.length < MAX_OUTPUT_CHARS) stderr += chunk;
          else truncated = true;
        }
      };

      let exitCode: number | null;
      try {
        ({ exitCode } = await runner("npx", argv, append));
      } catch (err) {
        throw new McpToolError(
          ERR_RERUN_FAILED,
          `Failed to launch Playwright: ${(err as Error).message}`,
        );
      }

      const durationMs = Number((process.hrtime.bigint() - started) / 1_000_000n);

      return {
        command,
        exitCode,
        durationMs,
        stdout: stdout.slice(0, MAX_OUTPUT_CHARS),
        stderr: stderr.slice(0, MAX_OUTPUT_CHARS),
        truncated,
      };
    },
  };
}
