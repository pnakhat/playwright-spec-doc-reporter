import path from "node:path";
import type { LogLevel } from "./types.js";

const HELP = `playwright-spec-doc-reporter

Usage:
  playwright-spec-doc-reporter mcp [options]

Start the MCP server exposing the reporter's results as tools for AI agents.

Options:
  --stdio                 Use stdio transport (for local agents like Claude Code)
  --port <n>              Use HTTP/SSE transport on this port
  --output <path>         Reporter output directory (default: spec-doc-report)
  --token <secret>        Bearer token required for SSE requests
  --cors <origin>         CORS allow-origin for SSE mode (default: *)
  --log-level <level>     error | warn | info | debug (default: warn)
  --watch                 Watch the output dir and emit change notifications
  -h, --help              Show this help

Examples:
  playwright-spec-doc-reporter mcp --stdio
  playwright-spec-doc-reporter mcp --port 7337 --token "$MCP_TOKEN"
`;

interface ParsedFlags {
  stdio: boolean;
  port?: number;
  output: string;
  token?: string;
  cors: string;
  logLevel: LogLevel;
  watch: boolean;
}

const LOG_LEVELS: LogLevel[] = ["error", "warn", "info", "debug"];

function parseFlags(argv: string[]): ParsedFlags {
  const flags: ParsedFlags = {
    stdio: false,
    output: "spec-doc-report",
    cors: "*",
    logLevel: "warn",
    watch: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) {
        console.error(`Error: ${arg} requires a value`);
        process.exit(1);
      }
      return value;
    };
    switch (arg) {
      case "--stdio":
        flags.stdio = true;
        break;
      case "--port": {
        const port = parseInt(next(), 10);
        if (Number.isNaN(port)) {
          console.error("Error: --port must be a number");
          process.exit(1);
        }
        flags.port = port;
        break;
      }
      case "--output":
        flags.output = next();
        break;
      case "--token":
        flags.token = next();
        break;
      case "--cors":
        flags.cors = next();
        break;
      case "--log-level": {
        const level = next() as LogLevel;
        if (!LOG_LEVELS.includes(level)) {
          console.error(`Error: --log-level must be one of ${LOG_LEVELS.join(", ")}`);
          process.exit(1);
        }
        flags.logLevel = level;
        break;
      }
      case "--watch":
        flags.watch = true;
        break;
      default:
        console.error(`Error: unknown option "${arg}"`);
        process.exit(1);
    }
  }
  return flags;
}

async function runMcpCommand(argv: string[]): Promise<void> {
  const flags = parseFlags(argv);

  if (!flags.stdio && flags.port === undefined) {
    console.error("Error: provide --stdio or --port <n>");
    process.exit(1);
  }
  if (flags.stdio && flags.port !== undefined) {
    console.error("Error: choose either --stdio or --port, not both");
    process.exit(1);
  }

  // Lazily load the server so the optional MCP dependencies are only required
  // when the user actually starts it.
  let createMcpServer: typeof import("./server.js").createMcpServer;
  try {
    ({ createMcpServer } = await import("./server.js"));
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ERR_MODULE_NOT_FOUND" || code === "MODULE_NOT_FOUND") {
      console.error(
        "The MCP server requires optional dependencies that are not installed.\n" +
          "Install them with:\n\n" +
          "  npm install @modelcontextprotocol/sdk zod express\n",
      );
      process.exit(1);
    }
    throw err;
  }

  const outputDir = path.resolve(flags.output);
  const server = createMcpServer({
    outputDir,
    logLevel: flags.logLevel,
    watch: flags.watch,
  });

  const shutdown = async () => {
    await server.stop().catch(() => undefined);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  if (flags.stdio) {
    await server.startStdio();
  } else {
    await server.startSse({
      port: flags.port!,
      token: flags.token,
      corsOrigin: flags.cors,
    });
  }
}

/** Entry point invoked by bin/cli.js. */
export async function runCli(argv: string[]): Promise<void> {
  const [command, ...rest] = argv;

  if (!command || command === "-h" || command === "--help" || command === "help") {
    console.log(HELP);
    return;
  }

  if (command === "mcp") {
    await runMcpCommand(rest);
    return;
  }

  console.error(`Unknown command: ${command}\n`);
  console.log(HELP);
  process.exit(1);
}
