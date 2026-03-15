/**
 * Builds Atlassian Document Format (ADF) comment bodies for Jira Cloud REST API v3.
 */
import type { ApiEntry, NormalizedTestResult } from "../types/index.js";

// ---------------------------------------------------------------------------
// Minimal ADF node types
// ---------------------------------------------------------------------------

interface AdfMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface AdfNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
  text?: string;
  marks?: AdfMark[];
}

// ---------------------------------------------------------------------------
// ADF primitive helpers
// ---------------------------------------------------------------------------

function txt(value: string, ...marks: AdfMark[]): AdfNode {
  return marks.length ? { type: "text", text: value, marks } : { type: "text", text: value };
}

const bold: AdfMark = { type: "strong" };
const code: AdfMark = { type: "code" };

function para(...nodes: AdfNode[]): AdfNode {
  return { type: "paragraph", content: nodes };
}

function heading(level: 1 | 2 | 3, label: string): AdfNode {
  return { type: "heading", attrs: { level }, content: [txt(label)] };
}

function rule(): AdfNode {
  return { type: "rule" };
}

function codeBlock(content: string, language = "text"): AdfNode {
  return { type: "codeBlock", attrs: { language }, content: [txt(content)] };
}

function bulletList(items: AdfNode[][]): AdfNode {
  return {
    type: "bulletList",
    content: items.map(nodes => ({
      type: "listItem",
      content: [{ type: "paragraph", content: nodes }]
    }))
  };
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function statusEmoji(status: string): string {
  switch (status) {
    case "passed":    return "✅";
    case "failed":    return "❌";
    case "timedOut":  return "⏱️";
    case "skipped":   return "⏭️";
    case "flaky":     return "⚠️";
    default:          return "❓";
  }
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

// ---------------------------------------------------------------------------
// Screenshot embed helpers
// ---------------------------------------------------------------------------

/**
 * Embeds an uploaded Jira attachment as an inline image using ADF mediaSingle.
 * `type: "external"` loads the URL directly — works because the viewer is
 * already authenticated to the same Jira domain.
 */
function mediaImage(contentUrl: string): AdfNode {
  return {
    type: "mediaSingle",
    attrs: { layout: "center" },
    content: [{
      type: "media",
      attrs: { type: "external", url: contentUrl },
    }],
  };
}

// ---------------------------------------------------------------------------
// Per-test section builder
// ---------------------------------------------------------------------------

function buildTestSection(
  test: NormalizedTestResult,
  includeApiTraffic: boolean,
  screenshots: { filename: string; contentUrl: string }[]
): AdfNode[] {
  const emoji = statusEmoji(test.status);
  const statusLabel = test.status.toUpperCase();
  const nodes: AdfNode[] = [];

  // Test title row
  nodes.push(para(
    txt(`${emoji} `),
    txt(test.fullName, bold),
    txt(`  [${statusLabel}]`, bold),
    txt(`  ⏱ ${formatMs(test.durationMs)}`)
  ));

  // File location
  nodes.push(para(txt("📁 "), txt(test.file, code)));

  // BDD documentation — feature / scenario / behaviours
  if (test.featureMeta) {
    nodes.push(para(txt("🏷 Feature: ", bold), txt(test.featureMeta.name)));
    if (test.featureMeta.description) {
      nodes.push(para(txt(test.featureMeta.description)));
    }
  }
  if (test.scenarioDescription) {
    nodes.push(para(txt("📖 Scenario: ", bold), txt(test.scenarioDescription)));
  }
  if (test.behaviours && test.behaviours.length > 0) {
    nodes.push(para(txt("✦ Behaviours:", bold)));
    nodes.push(bulletList(test.behaviours.map(b => [txt(b)])));
  }

  // Error message for failed tests
  if ((test.status === "failed" || test.status === "timedOut") && test.errorMessage) {
    const firstLine = test.errorMessage.split("\n")[0]?.slice(0, 400) ?? test.errorMessage;
    nodes.push(para(txt("Error: ", bold), txt(firstLine)));
    if (test.stackTrace) {
      const stackSnippet = test.stackTrace.split("\n").slice(0, 6).join("\n");
      nodes.push(codeBlock(stackSnippet));
    }
  }

  // Steps (top 10)
  if (test.steps.length > 0) {
    const stepItems = test.steps.slice(0, 10).map(step => {
      const icon = step.status === "failed" ? "❌" : "✅";
      const err = step.error ? `  — ${step.error.split("\n")[0]?.slice(0, 100)}` : "";
      return [txt(`${icon} ${step.title} (${formatMs(step.durationMs)})${err}`)];
    });
    nodes.push(para(txt("Steps:", bold)));
    nodes.push(bulletList(stepItems));
  }

  // API traffic (if present and enabled)
  if (includeApiTraffic && test.apiEntries && test.apiEntries.length > 0) {
    nodes.push(para(txt("API Traffic:", bold)));
    const trafficLines = buildApiTrafficText(test.apiEntries);
    nodes.push(codeBlock(trafficLines, "text"));
  }

  // Screenshots uploaded as Jira attachments — embed inline
  if (screenshots.length > 0) {
    nodes.push(para(txt(`📸 Screenshots (${screenshots.length}):`, bold)));
    for (const s of screenshots) {
      nodes.push(para(txt(s.filename)));
      nodes.push(mediaImage(s.contentUrl));
    }
  }

  return nodes;
}

function buildApiTrafficText(entries: ApiEntry[]): string {
  return entries.map(e => {
    if (e.kind === "request") {
      const bodyStr = e.body ? `\n  Body: ${JSON.stringify(e.body, null, 2).slice(0, 500)}` : "";
      return `→ ${e.method ?? "GET"} ${e.url ?? ""}${bodyStr}`;
    } else {
      const bodyStr = e.body ? `\n  Body: ${JSON.stringify(e.body, null, 2).slice(0, 500)}` : "";
      return `← ${e.status ?? ""} ${e.url ?? ""}${bodyStr}`;
    }
  }).join("\n\n");
}

// ---------------------------------------------------------------------------
// Public: build full ADF document for a Jira comment
// ---------------------------------------------------------------------------

export interface ScreenshotAttachment {
  filename: string;
  contentUrl: string;
}

export function buildJiraCommentAdf(
  issueKey: string,
  tests: NormalizedTestResult[],
  runMeta: { branch?: string; commit?: string; runNumber?: string },
  includeApiTraffic: boolean,
  screenshotsByTestId: Map<string, ScreenshotAttachment[]> = new Map()
): AdfNode {
  const passed  = tests.filter(t => t.status === "passed").length;
  const failed  = tests.filter(t => t.status === "failed" || t.status === "timedOut").length;
  const skipped = tests.filter(t => t.status === "skipped").length;
  const total   = tests.length;

  const metaParts: string[] = [];
  if (runMeta.branch)    metaParts.push(`Branch: ${runMeta.branch}`);
  if (runMeta.commit)    metaParts.push(`Commit: ${runMeta.commit}`);
  if (runMeta.runNumber) metaParts.push(`Run: #${runMeta.runNumber}`);
  metaParts.push(`${new Date().toISOString()}`);

  const content: AdfNode[] = [
    heading(2, `🎭 Playwright Test Results — ${issueKey}`),
    para(txt(metaParts.join("  |  "))),
    para(
      txt("Summary: ", bold),
      txt(`${total} tests  ✅ ${passed} passed  ❌ ${failed} failed  ⏭️ ${skipped} skipped`)
    ),
    rule(),
  ];

  for (const test of tests) {
    const screenshots = screenshotsByTestId.get(test.id) ?? [];
    content.push(...buildTestSection(test, includeApiTraffic, screenshots));
    content.push(rule());
  }

  // Remove trailing rule
  if (content[content.length - 1]?.type === "rule") content.pop();

  return { type: "doc", version: 1, content } as unknown as AdfNode;
}
