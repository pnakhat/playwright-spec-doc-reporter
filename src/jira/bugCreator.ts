/**
 * Jira Auto-Bug Creator
 *
 * Creates Jira bug tickets automatically for failed Playwright tests.
 * Deduplicates by checking for an existing open bug with the same test name.
 * Attaches Playwright screenshots + videos and embeds API traffic.
 *
 * Required Jira permissions: Create Issues, Add Attachments.
 */
import fs from "node:fs";
import path from "node:path";
import type { AIAnalysisResult, JiraAutoBugConfig, NormalizedTestResult } from "../types/index.js";
import { JiraClient } from "./jiraClient.js";

// ─── ADF helpers (Atlassian Document Format) ──────────────────────────────────

type AdfNode = Record<string, unknown>;

function adfDoc(...content: AdfNode[]): AdfNode {
  return { version: 1, type: "doc", content };
}

function adfHeading(level: number, text: string): AdfNode {
  return {
    type: "heading",
    attrs: { level },
    content: [{ type: "text", text }],
  };
}

function adfParagraph(...inlines: AdfNode[]): AdfNode {
  return { type: "paragraph", content: inlines };
}

function adfText(text: string, bold = false): AdfNode {
  const node: AdfNode = { type: "text", text };
  if (bold) node.marks = [{ type: "strong" }];
  return node;
}

function adfCode(text: string): AdfNode {
  return { type: "text", text, marks: [{ type: "code" }] };
}

function adfCodeBlock(text: string, language = "text"): AdfNode {
  return {
    type: "codeBlock",
    attrs: { language },
    content: [{ type: "text", text }],
  };
}

function adfBulletList(items: AdfNode[][]): AdfNode {
  return {
    type: "bulletList",
    content: items.map(inlines => ({
      type: "listItem",
      content: [{ type: "paragraph", content: inlines }],
    })),
  };
}

function adfRule(): AdfNode {
  return { type: "rule" };
}

// ─── Description builder ───────────────────────────────────────────────────────

function buildBugDescription(
  test: NormalizedTestResult,
  analysis: AIAnalysisResult | undefined,
  includeApiTraffic: boolean
): AdfNode {
  const content: AdfNode[] = [];

  // ── Overview ──────────────────────────────────────────────────────────────
  content.push(adfHeading(2, "🐛 Failing Test"));
  content.push(
    adfBulletList([
      [adfText("Test: ", true), adfText(test.fullName)],
      [adfText("File: ", true), adfCode(test.file)],
      [adfText("Status: ", true), adfText(test.status)],
      [adfText("Duration: ", true), adfText(`${(test.durationMs / 1000).toFixed(2)}s`)],
      ...(test.browser ? [[adfText("Browser: ", true), adfText(test.browser)]] : []),
      ...(test.retries > 0 ? [[adfText("Retries: ", true), adfText(String(test.retries))]] : []),
    ])
  );

  // ── Error ──────────────────────────────────────────────────────────────────
  if (test.errorMessage) {
    content.push(adfRule());
    content.push(adfHeading(2, "❌ Error"));
    content.push(adfCodeBlock(test.errorMessage, "text"));
  }

  if (test.stackTrace) {
    content.push(adfHeading(3, "Stack Trace"));
    content.push(adfCodeBlock(test.stackTrace.slice(0, 3000), "text"));
  }

  // ── AI Analysis ────────────────────────────────────────────────────────────
  if (analysis) {
    content.push(adfRule());
    content.push(adfHeading(2, "🤖 AI Analysis"));
    const conf = Math.round(analysis.confidence * 100);
    content.push(
      adfBulletList([
        [adfText("Summary: ", true), adfText(analysis.summary)],
        [adfText("Root cause: ", true), adfText(analysis.likelyRootCause)],
        [adfText("Category: ", true), adfCode(analysis.issueCategory)],
        [adfText("Confidence: ", true), adfText(`${conf}%`)],
        [adfText("Action: ", true), adfCode(analysis.structuredFeedback.actionType)],
        [adfText("Remediation: ", true), adfText(analysis.suggestedRemediation)],
      ])
    );

    if (analysis.structuredFeedback.suggestedPatch) {
      content.push(adfHeading(3, "Suggested Patch"));
      content.push(adfCodeBlock(analysis.structuredFeedback.suggestedPatch, "diff"));
    }

    if (analysis.structuredFeedback.candidateLocators?.length) {
      content.push(adfHeading(3, "Candidate Locators"));
      content.push(
        adfBulletList(
          analysis.structuredFeedback.candidateLocators.map(l => [adfCode(l)])
        )
      );
    }
  }

  // ── Steps / Behaviours ────────────────────────────────────────────────────
  if (test.behaviours?.length) {
    content.push(adfRule());
    content.push(adfHeading(2, "📋 Test Steps"));
    content.push(
      adfBulletList(test.behaviours.map(b => [adfText(b)]))
    );
  }

  // ── API Traffic ───────────────────────────────────────────────────────────
  if (includeApiTraffic && test.apiEntries && test.apiEntries.length > 0) {
    content.push(adfRule());
    content.push(adfHeading(2, "🌐 API Traffic"));

    const requests = test.apiEntries.filter(e => e.kind === "request");
    const responses = test.apiEntries.filter(e => e.kind === "response");

    if (requests.length > 0) {
      content.push(adfHeading(3, "Requests"));
      for (const req of requests) {
        const label = `${req.method ?? "GET"} ${req.url ?? ""}`.trim();
        content.push(adfParagraph(adfText(label, true)));
        if (req.body) {
          content.push(adfCodeBlock(
            typeof req.body === "string" ? req.body : JSON.stringify(req.body, null, 2),
            "json"
          ));
        }
      }
    }

    if (responses.length > 0) {
      content.push(adfHeading(3, "Responses"));
      for (const res of responses) {
        const label = `HTTP ${res.status ?? "?"} — ${res.url ?? ""}`.trim();
        content.push(adfParagraph(adfText(label, true)));
        if (res.body) {
          const bodyStr = typeof res.body === "string"
            ? res.body
            : JSON.stringify(res.body, null, 2);
          content.push(adfCodeBlock(bodyStr.slice(0, 2000), "json"));
        }
      }
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  content.push(adfRule());
  content.push(
    adfParagraph(
      adfText("Auto-generated by "),
      adfText("Playwright Glossy Reporter", true),
      adfText(" — auto-bug creation")
    )
  );

  return adfDoc(...content);
}

// ─── Deduplication ─────────────────────────────────────────────────────────────

async function findExistingBug(
  baseUrl: string,
  auth: string,
  projectKey: string,
  testName: string
): Promise<string | null> {
  const jql = encodeURIComponent(
    `project = "${projectKey}" AND issuetype = Bug AND status != Done AND summary ~ "${testName.slice(0, 60).replace(/"/g, "'")}"`
  );

  const res = await fetch(
    `${baseUrl}/rest/api/3/issue/picker?query=${encodeURIComponent(testName.slice(0, 60))}&currentJQL=${jql}`,
    {
      headers: { "Authorization": `Basic ${auth}`, "Accept": "application/json" },
    }
  );

  if (!res.ok) return null;

  // Fallback: JQL search
  const searchRes = await fetch(
    `${baseUrl}/rest/api/3/search?jql=${jql}&maxResults=1&fields=summary,status`,
    {
      headers: { "Authorization": `Basic ${auth}`, "Accept": "application/json" },
    }
  );
  if (!searchRes.ok) return null;

  const data = await searchRes.json() as { issues?: Array<{ key: string }> };
  return data.issues?.[0]?.key ?? null;
}

// ─── Bug creation ──────────────────────────────────────────────────────────────

export interface BugCreationResult {
  testName: string;
  issueKey: string;
  issueUrl: string;
  status: "created" | "duplicate" | "skipped" | "error";
  message?: string;
}

export async function createJiraBugs(opts: {
  tests: NormalizedTestResult[];
  analyses: AIAnalysisResult[];
  bugConfig: JiraAutoBugConfig;
  jiraBaseUrl: string;
  email: string;
  apiToken: string;
  outputDirAbs: string;
}): Promise<BugCreationResult[]> {
  const {
    tests,
    analyses,
    bugConfig: cfg,
    jiraBaseUrl,
    email,
    apiToken,
    outputDirAbs,
  } = opts;

  const baseUrl = jiraBaseUrl.replace(/\/$/, "");
  const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");
  const client = new JiraClient({ baseUrl, email, apiToken });

  const projectKey = cfg.projectKey || process.env.JIRA_PROJECT_KEY || "";
  if (!projectKey) {
    console.warn("[glossy-reporter] autoBugs: projectKey is not set — skipping bug creation. Set jira.autoBugs.projectKey or JIRA_PROJECT_KEY env var.");
    return [];
  }
  const issueType = cfg.issueType ?? "Bug";
  const priority = cfg.defaultPriority ?? "Medium";
  const labels = cfg.labels ?? ["auto-generated", "playwright"];
  const onlyForAI = cfg.onlyForAIAnalyzed ?? true;
  const dedup = cfg.deduplicateByTestName ?? true;
  const includeScreenshots = cfg.includeScreenshots ?? true;
  const includeVideos = cfg.includeVideos ?? true;
  const includeApiTraffic = cfg.includeApiTraffic ?? true;

  const analysisByTest = new Map(analyses.map(a => [a.testName, a]));

  const failedTests = tests.filter(
    t => t.status === "failed" || t.status === "timedOut"
  );

  const results: BugCreationResult[] = [];

  for (const test of failedTests) {
    const analysis = analysisByTest.get(test.title);

    if (onlyForAI && !analysis) {
      results.push({
        testName: test.title,
        issueKey: "",
        issueUrl: "",
        status: "skipped",
        message: "No AI analysis — skipped (onlyForAIAnalyzed: true)",
      });
      continue;
    }

    // Deduplication check
    if (dedup) {
      const existing = await findExistingBug(baseUrl, auth, projectKey, test.title).catch(() => null);
      if (existing) {
        results.push({
          testName: test.title,
          issueKey: existing,
          issueUrl: `${baseUrl}/browse/${existing}`,
          status: "duplicate",
          message: `Existing open bug found: ${existing}`,
        });
        console.log(`[glossy-reporter] Jira bug skipped (duplicate) → ${existing} for: ${test.title}`);
        continue;
      }
    }

    // Build description
    const description = buildBugDescription(test, analysis, includeApiTraffic);
    const summary = `[Playwright] ${test.title.slice(0, 200)}`;

    // Create the issue
    const createRes = await fetch(`${baseUrl}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          issuetype: { name: issueType },
          summary,
          description,
          priority: { name: priority },
          labels,
        },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text().catch(() => "");
      results.push({
        testName: test.title,
        issueKey: "",
        issueUrl: "",
        status: "error",
        message: `Create failed (${createRes.status}): ${err.slice(0, 200)}`,
      });
      console.error(`[glossy-reporter] Jira bug creation failed for "${test.title}": ${createRes.status}`);
      continue;
    }

    const created = await createRes.json() as { key: string };
    const issueKey = created.key;
    const issueUrl = `${baseUrl}/browse/${issueKey}`;

    // Attach screenshots
    if (includeScreenshots && test.artifacts.screenshots.length > 0) {
      for (const relPath of test.artifacts.screenshots) {
        const absPath = path.resolve(outputDirAbs, relPath);
        if (!fs.existsSync(absPath)) continue;
        try {
          await client.uploadAttachment(issueKey, absPath);
          console.log(`[glossy-reporter] Screenshot attached → ${issueKey}: ${path.basename(absPath)}`);
        } catch (err) {
          console.warn(`[glossy-reporter] Screenshot attachment failed for ${issueKey} (${path.basename(absPath)}):`, err instanceof Error ? err.message : err);
        }
      }
    }

    // Attach videos
    if (includeVideos && test.artifacts.videos.length > 0) {
      for (const relPath of test.artifacts.videos) {
        const absPath = path.resolve(outputDirAbs, relPath);
        if (!fs.existsSync(absPath)) continue;
        try {
          await client.uploadAttachment(issueKey, absPath);
          console.log(`[glossy-reporter] Video attached → ${issueKey}: ${path.basename(absPath)}`);
        } catch (err) {
          console.warn(`[glossy-reporter] Video attachment failed for ${issueKey} (${path.basename(absPath)}):`, err instanceof Error ? err.message : err);
        }
      }
    }

    results.push({
      testName: test.title,
      issueKey,
      issueUrl,
      status: "created",
    });

    console.log(`[glossy-reporter] Jira bug created → ${issueUrl} for: ${test.title}`);
  }

  return results;
}
