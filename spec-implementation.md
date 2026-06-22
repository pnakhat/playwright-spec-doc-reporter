# Implementation Plan

## Dependencies

Add to `package.json` dependencies (not devDependencies — needed at runtime):

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.22.0",
    "express": "^4.18.0"
  },
  "optionalDependencies": {
    "chokidar": "^3.6.0"
  }
}
```

`chokidar` is optional — only needed for `--watch` mode. The server starts without it; `--watch` logs a warning and skips watching if chokidar is not installed.

## Package exports to add

In `package.json`:

```json
{
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
    "./reporter": { "import": "./dist/reporter.js", "types": "./dist/reporter.d.ts" },
    "./annotations": { "import": "./dist/annotations.js", "types": "./dist/annotations.d.ts" },
    "./cucumber-annotations": { "import": "./dist/cucumber-annotations.js", "types": "./dist/cucumber-annotations.d.ts" },
    "./mcp": { "import": "./dist/mcp/server.js", "types": "./dist/mcp/server.d.ts" }
  },
  "bin": {
    "playwright-spec-doc-reporter": "./bin/cli.js"
  }
}
```

## CLI entry point

The existing CLI entry point at `bin/cli.js` needs a `mcp` sub-command added:

```typescript
// src/mcp/cli.ts
import { Command } from 'commander'   // if already used in the project
import { createMcpServer } from './server.js'
import path from 'path'

export function registerMcpCommand(program: Command) {
  program
    .command('mcp')
    .description('Start the MCP server for AI agent integration')
    .option('--stdio', 'Use stdio transport')
    .option('--port <n>', 'Use SSE transport on this port', parseInt)
    .option('--output <path>', 'Reporter output directory', 'spec-doc-report')
    .option('--token <secret>', 'Bearer token for SSE auth')
    .option('--cors <origin>', 'CORS origin for SSE mode', '*')
    .option('--log-level <level>', 'Log level', 'warn')
    .option('--watch', 'Watch output dir for changes')
    .action(async (opts) => {
      if (!opts.stdio && !opts.port) {
        console.error('Error: provide --stdio or --port <n>')
        process.exit(1)
      }

      const outputDir = path.resolve(opts.output)
      const server = createMcpServer({ outputDir, logLevel: opts.logLevel, watch: opts.watch })

      if (opts.stdio) {
        await server.startStdio()
      } else {
        await server.startSse({ port: opts.port, token: opts.token, corsOrigin: opts.cors })
      }
    })
}
```

## server.ts skeleton

```typescript
// src/mcp/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import fs from 'fs'
import path from 'path'

import { getRunSummaryTool } from './tools/get-run-summary.js'
import { getFailedTestsTool } from './tools/get-failed-tests.js'
import { getHealingPayloadsTool } from './tools/get-healing-payloads.js'
import { getTestDetailTool } from './tools/get-test-detail.js'
import { getTrendsTool } from './tools/get-trends.js'
import { getTraceabilityTool } from './tools/get-traceability.js'
import { triggerRerunTool } from './tools/trigger-rerun.js'
import type { McpServerConfig, McpServer } from './types.js'

export function createMcpServer(config: McpServerConfig): McpServer {
  const outputDir = path.resolve(config.outputDir)

  if (!fs.existsSync(outputDir)) {
    throw new Error(`outputDir does not exist: ${outputDir}`)
  }

  const tools = [
    getRunSummaryTool(outputDir),
    getFailedTestsTool(outputDir),
    getHealingPayloadsTool(outputDir),
    getTestDetailTool(outputDir),
    getTrendsTool(outputDir),
    getTraceabilityTool(outputDir),
    triggerRerunTool(outputDir),
  ]

  const server = new Server(
    { name: 'playwright-spec-doc-reporter', version: '1.0.0' },
    { capabilities: { tools: {} } }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }))
  }))

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = tools.find(t => t.name === req.params.name)
    if (!tool) throw new Error(`Unknown tool: ${req.params.name}`)
    const result = await tool.execute(req.params.arguments ?? {})
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  })

  return {
    async startStdio() {
      const transport = new StdioServerTransport()
      await server.connect(transport)
    },
    async startSse({ port, token, corsOrigin = '*' }) {
      // express SSE setup — see spec-architecture.md for auth details
    },
    async stop() {
      await server.close()
    },
  }
}
```

## Tool module pattern

Each tool module exports a factory function that captures `outputDir` in a closure:

```typescript
// src/mcp/tools/get-run-summary.ts
import { z } from 'zod'
import fs from 'fs'
import path from 'path'
import type { RunSummary } from '../types.js'

const InputSchema = z.object({
  outputDir: z.string().optional(),   // accepted, ignored
})

export function getRunSummaryTool(outputDir: string) {
  return {
    name: 'get_run_summary' as const,
    description: 'Returns the high-level summary of the most recent Playwright test run.',
    inputSchema: {
      type: 'object',
      properties: {
        outputDir: { type: 'string', description: 'Ignored — server uses its configured outputDir.' },
      },
    },
    async execute(args: unknown): Promise<RunSummary> {
      InputSchema.parse(args)
      const resultsPath = path.join(outputDir, 'results.json')
      if (!fs.existsSync(resultsPath)) {
        throw { code: -32001, message: `results.json not found in ${outputDir}` }
      }
      const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'))
      // ... compute and return RunSummary
    },
  }
}
```

## Milestones

| Milestone | Scope | Effort |
|---|---|---|
| M1 — Core server | stdio transport, `get_run_summary`, `get_failed_tests`, `get_test_detail` | 3 days |
| M2 — Healing + trends | `get_healing_payloads`, `get_trends`, `get_traceability` | 2 days |
| M3 — Action tool | `trigger_rerun` with stdout streaming, grep validation | 2 days |
| M4 — SSE transport | HTTP/SSE mode, bearer token auth, CORS, express setup | 1 day |
| M5 — Watch mode | `--watch` flag, chokidar integration, SSE change events | 1 day |
| M6 — Docs + tests | README section, unit tests per tool, integration test, Claude Code example | 2 days |

**Total: ~11 days**

## Testing approach

- Unit tests in `src/mcp/__tests__/` using vitest (already in the project)
- Fixtures: copy `samples/` output files into `src/mcp/__tests__/fixtures/`
- One test file per tool: `get-run-summary.test.ts`, etc.
- Integration test: spawn the server in stdio mode as a child process, send MCP JSON-RPC calls over stdin, assert response shape
- Test `trigger_rerun` with a mock `exec` to avoid running real Playwright in unit tests

## README additions

Add a new section "MCP Server" to the main README between "Flakiness Scoring" and "Docs Page". Include:
- One-sentence description
- Quick start (stdio mode only, 4 lines)
- Claude Code mcp.json snippet
- Link to full config reference
