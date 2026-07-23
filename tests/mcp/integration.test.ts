import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { wireServer } from "../../src/mcp/server.js";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

// Drive the wired SDK server through a real MCP client over an in-memory
// transport — exercises the ListTools/CallTool JSON-RPC wiring end to end.
describe("MCP server integration", () => {
  let client: Client;

  beforeAll(async () => {
    const { server } = wireServer({ outputDir: fixtures, logLevel: "error" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: "test-client", version: "1.0.0" });
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
  });

  afterAll(async () => {
    await client.close();
  });

  it("lists all nine tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map(t => t.name).sort()).toEqual([
      "analyze_run",
      "get_failed_tests",
      "get_healing_payloads",
      "get_root_cause_trends",
      "get_run_summary",
      "get_test_detail",
      "get_traceability",
      "get_trends",
      "trigger_rerun",
    ]);
    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  it("calls get_run_summary and returns JSON text content", async () => {
    const res = await client.callTool({ name: "get_run_summary", arguments: {} });
    const content = res.content as Array<{ type: string; text: string }>;
    expect(content[0].type).toBe("text");
    const parsed = JSON.parse(content[0].text);
    expect(parsed.summary.total).toBe(4);
    expect(parsed.passRate).toBe(50);
  });

  it("reports tool errors as isError results, not transport failures", async () => {
    const res = await client.callTool({
      name: "get_test_detail",
      arguments: { testId: "does-not-exist" },
    });
    expect(res.isError).toBe(true);
    const content = res.content as Array<{ type: string; text: string }>;
    const parsed = JSON.parse(content[0].text);
    expect(parsed.error.code).toBe(-32001);
  });

  it("returns an isError for an unknown tool", async () => {
    const res = await client.callTool({ name: "no_such_tool", arguments: {} });
    expect(res.isError).toBe(true);
  });
});
