#!/usr/bin/env node
// Thin CLI shim. The real implementation lives in the compiled output so it can
// be written in TypeScript and share the project's types.
import { runCli } from "../dist/mcp/cli.js";

runCli(process.argv.slice(2)).catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
