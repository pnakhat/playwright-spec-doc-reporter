import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

import { getRunSummaryTool } from "./tools/get-run-summary.js";
import { getFailedTestsTool } from "./tools/get-failed-tests.js";
import { getHealingPayloadsTool } from "./tools/get-healing-payloads.js";
import { getTestDetailTool } from "./tools/get-test-detail.js";
import { getTrendsTool } from "./tools/get-trends.js";
import { getTraceabilityTool } from "./tools/get-traceability.js";
import { triggerRerunTool } from "./tools/trigger-rerun.js";
import { createLogger } from "./logger.js";
import { McpToolError } from "./types.js";
import type { McpServer, McpServerConfig, McpTool, SseOptions } from "./types.js";
// Type-only import — erased at compile time, so it does not require express at
// runtime when only the stdio transport is used.
import type { Express, Request, Response, NextFunction } from "express";

const NAME = "playwright-spec-doc-reporter";

// Advertise the package's own version (../../package.json relative to the
// compiled dist/mcp/server.js) rather than a hardcoded value.
function resolveVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require("../../package.json") as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}
const VERSION = resolveVersion();

/**
 * Build and wire the underlying SDK `Server` with the ListTools/CallTool
 * handlers. Exposed (separately from {@link createMcpServer}) so tests can
 * connect it to an in-memory transport without spawning a process.
 */
export function wireServer(config: McpServerConfig): {
  server: Server;
  outputDir: string;
} {
  const outputDir = path.resolve(config.outputDir);
  const log = createLogger(config.logLevel ?? "warn");

  if (!fs.existsSync(outputDir)) {
    throw new Error(
      `outputDir does not exist: ${outputDir}. Point --output at your reporter's output directory.`,
    );
  }

  const tools: McpTool[] = [
    getRunSummaryTool(outputDir),
    getFailedTestsTool(outputDir),
    getTestDetailTool(outputDir),
    getHealingPayloadsTool(outputDir),
    getTrendsTool(outputDir),
    getTraceabilityTool(outputDir),
    triggerRerunTool(outputDir),
  ];
  const toolsByName = new Map(tools.map(t => [t.name, t]));

  const server = new Server(
    { name: NAME, version: VERSION },
    { capabilities: { tools: {}, logging: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async req => {
    const tool = toolsByName.get(req.params.name);
    if (!tool) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }],
        isError: true,
      };
    }
    try {
      log.debug(`tool call: ${tool.name}`, req.params.arguments);
      const result = await tool.execute(req.params.arguments ?? {});
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      const code = err instanceof McpToolError ? err.code : -32000;
      const message = err instanceof Error ? err.message : String(err);
      log.warn(`tool "${tool.name}" failed:`, message);
      return {
        content: [
          { type: "text", text: JSON.stringify({ error: { code, message } }, null, 2) },
        ],
        isError: true,
      };
    }
  });

  return { server, outputDir };
}

/**
 * Create the MCP server exposing the reporter's artifacts as tools.
 *
 * The server reads the artifacts the reporter wrote into `outputDir`
 * (results.json, spec-doc-history.json, traceability.json) on each tool call,
 * so it always reflects the latest run without a restart.
 */
export function createMcpServer(config: McpServerConfig): McpServer {
  const log = createLogger(config.logLevel ?? "warn");
  const { server, outputDir } = wireServer(config);

  // Active SSE transports keyed by their session id (SSE mode only).
  const sseTransports = new Map<string, SSEServerTransport>();
  let watcherClose: (() => Promise<void>) | undefined;
  let httpClose: (() => Promise<void>) | undefined;

  async function startWatching(): Promise<void> {
    let chokidar: typeof import("chokidar");
    try {
      chokidar = await import("chokidar");
    } catch {
      log.warn(
        "--watch requested but 'chokidar' is not installed; skipping watch mode. Install it with: npm install chokidar",
      );
      return;
    }
    const watcher = chokidar.watch(
      [
        path.join(outputDir, "results.json"),
        path.join(outputDir, "spec-doc-history.json"),
        path.join(outputDir, "traceability.json"),
      ],
      { ignoreInitial: true },
    );
    watcher.on("all", (event, file) => {
      log.info(`watch: ${event} ${file}`);
      server
        .sendLoggingMessage({
          level: "info",
          data: { event: "artifacts-updated", file: path.basename(file) },
        })
        .catch(() => {
          /* no client connected yet — ignore */
        });
    });
    watcherClose = () => watcher.close();
    log.info("watching output dir for changes");
  }

  return {
    async startStdio() {
      const transport = new StdioServerTransport();
      await server.connect(transport);
      log.info(`MCP server (stdio) ready — outputDir=${outputDir}`);
      if (config.watch) await startWatching();
    },

    async startSse({ port, token, corsOrigin = "*" }: SseOptions) {
      // `express` resolves with an `export =` callable; load it as `any` and
      // recover precise types via the type-only import above.
      let expressMod: { default?: () => Express } & (() => Express);
      try {
        expressMod = (await import("express")) as unknown as typeof expressMod;
      } catch {
        throw new Error(
          "SSE mode requires 'express'. Install it with: npm install express",
        );
      }
      const createApp: () => Express = expressMod.default ?? expressMod;

      const app: Express = createApp();

      // CORS
      app.use((req: Request, res: Response, next: NextFunction) => {
        res.setHeader("Access-Control-Allow-Origin", corsOrigin);
        res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        if (req.method === "OPTIONS") {
          res.sendStatus(204);
          return;
        }
        next();
      });

      // Optional bearer-token auth.
      if (token) {
        app.use((req, res, next) => {
          const header = req.headers.authorization ?? "";
          if (header !== `Bearer ${token}`) {
            res.status(401).json({ error: "Unauthorized" });
            return;
          }
          next();
        });
      }

      app.get("/sse", async (_req: Request, res: Response) => {
        const transport = new SSEServerTransport("/messages", res);
        sseTransports.set(transport.sessionId, transport);
        res.on("close", () => sseTransports.delete(transport.sessionId));
        await server.connect(transport);
        log.info(`SSE client connected: ${transport.sessionId}`);
      });

      app.post("/messages", async (req: Request, res: Response) => {
        const sessionId = String(req.query.sessionId ?? "");
        const transport = sseTransports.get(sessionId);
        if (!transport) {
          res.status(400).json({ error: "Unknown or expired sessionId" });
          return;
        }
        await transport.handlePostMessage(req, res);
      });

      await new Promise<void>(resolve => {
        const httpServer = app.listen(port, () => {
          log.info(`MCP server (SSE) listening on http://localhost:${port}/sse`);
          resolve();
        });
        httpClose = () =>
          new Promise<void>((res, rej) =>
            httpServer.close(err => (err ? rej(err) : res())),
          );
      });

      if (config.watch) await startWatching();
    },

    async stop() {
      if (watcherClose) await watcherClose();
      if (httpClose) await httpClose();
      for (const transport of sseTransports.values()) {
        await transport.close().catch(() => undefined);
      }
      sseTransports.clear();
      await server.close();
    },
  };
}

export type { McpServer, McpServerConfig } from "./types.js";
