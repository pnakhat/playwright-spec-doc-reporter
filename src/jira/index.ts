/**
 * Jira test-results integration.
 *
 * How it works:
 *  1. After a Playwright run, scan all test results for tags matching a Jira
 *     issue-key pattern (e.g. @SCRUM-1, @PROJ-42).
 *  2. Group matching tests by issue key.
 *  3. Post one consolidated comment per issue key containing the results of
 *     every test that references it.
 *  4. For UI tests that carry glossy:request / glossy:response annotations,
 *     the API traffic is appended to the comment (when includeApiTraffic is
 *     enabled, which is the default).
 *  5. When includeScreenshots is true, screenshots from test.artifacts.screenshots
 *     are uploaded as Jira attachments and embedded inline in the comment.
 */
import fs from "node:fs";
import path from "node:path";
import type { GlossyReporterConfig, JiraConfig, NormalizedTestResult } from "../types/index.js";
import { buildJiraCommentAdf, type ScreenshotAttachment } from "./commentBuilder.js";
import { JiraClient } from "./jiraClient.js";

/** Matches tags like @SCRUM-1, @PROJ-123, @ABC-9999 */
const ISSUE_KEY_RE = /^@?([A-Z][A-Z0-9]+-\d+)$/;

export interface JiraRunMeta {
  branch?: string;
  commit?: string;
  runNumber?: string;
}

function resolveRunMeta(): JiraRunMeta {
  return {
    branch:
      process.env.GITHUB_HEAD_REF ??
      process.env.GITHUB_REF_NAME ??
      process.env.GIT_BRANCH ??
      process.env.CI_COMMIT_BRANCH ??
      process.env.BRANCH_NAME ??
      undefined,
    commit: (
      process.env.GITHUB_SHA ??
      process.env.GIT_COMMIT ??
      process.env.CI_COMMIT_SHA
    )?.slice(0, 8) ?? undefined,
    runNumber:
      process.env.GITHUB_RUN_NUMBER ??
      process.env.CI_PIPELINE_IID ??
      undefined,
  };
}

/** Extract Jira issue keys from a test's tags array. */
function extractIssueKeys(tags: string[]): string[] {
  const keys: string[] = [];
  for (const tag of tags) {
    const m = tag.match(ISSUE_KEY_RE);
    if (m) keys.push(m[1]);
  }
  return keys;
}

/** Returns true if this test result should be commented on per the config. */
function shouldComment(status: string, cfg: JiraConfig): boolean {
  if (status === "passed"  && (cfg.commentOnPass  ?? true))  return true;
  if ((status === "failed" || status === "timedOut") && (cfg.commentOnFail  ?? true))  return true;
  if (status === "skipped" && (cfg.commentOnSkip  ?? false)) return true;
  return false;
}

/**
 * Main entry point.  Call this at the end of a Playwright run to post
 * Jira comments for all tests tagged with a Jira issue key.
 */
export async function postJiraTestResults(
  tests: NormalizedTestResult[],
  config: GlossyReporterConfig
): Promise<void> {
  const cfg = config.jira;
  if (!cfg?.enabled) return;

  const email     = cfg.email     ?? process.env.JIRA_EMAIL     ?? "";
  const apiToken  = cfg.apiToken  ?? process.env.JIRA_API_TOKEN ?? "";

  if (!email || !apiToken) {
    console.warn("[glossy-reporter] Jira integration enabled but JIRA_EMAIL / JIRA_API_TOKEN are not set.");
    return;
  }

  const client = new JiraClient({ baseUrl: cfg.baseUrl, email, apiToken });
  const includeApiTraffic = cfg.includeApiTraffic ?? true;
  const includeScreenshots = cfg.includeScreenshots ?? true;
  const cooldownMs = cfg.commentCooldownMs ?? 0;
  const outputDirAbs = path.resolve(process.cwd(), config.outputDir ?? "spec-doc-report");
  const runMeta = resolveRunMeta();

  // Group tests by issue key, filtering by commentOnPass/Fail/Skip
  const issueMap = new Map<string, NormalizedTestResult[]>();
  for (const test of tests) {
    if (!shouldComment(test.status, cfg)) continue;
    for (const key of extractIssueKeys(test.tags)) {
      if (!issueMap.has(key)) issueMap.set(key, []);
      issueMap.get(key)!.push(test);
    }
  }

  if (issueMap.size === 0) return;

  const results = await Promise.allSettled(
    [...issueMap.entries()].map(async ([issueKey, issueTests]) => {
      // Upload screenshots for each test and build a testId → attachments map
      const screenshotsByTestId = new Map<string, ScreenshotAttachment[]>();
      if (includeScreenshots) {
        await Promise.all(issueTests.map(async (test) => {
          const uploaded: ScreenshotAttachment[] = [];
          for (const relPath of test.artifacts.screenshots) {
            const absPath = path.resolve(outputDirAbs, relPath);
            if (!fs.existsSync(absPath)) continue;
            try {
              const att = await client.uploadAttachment(issueKey, absPath);
              uploaded.push({ filename: att.filename, contentUrl: att.contentUrl });
            } catch (err) {
              console.warn(`[glossy-reporter] Screenshot upload skipped (${path.basename(absPath)}):`, err);
            }
          }
          if (uploaded.length > 0) screenshotsByTestId.set(test.id, uploaded);
        }));
      }

      // Cooldown check — skip if a comment was posted within the configured window
      if (cooldownMs > 0) {
        const ageMs = await client.lastOwnCommentAgeMs(issueKey);
        if (ageMs < cooldownMs) {
          const remaining = Math.ceil((cooldownMs - ageMs) / 60_000);
          console.log(`[glossy-reporter] Jira comment skipped for ${issueKey} — cooldown active (${remaining}m remaining)`);
          return;
        }
      }

      const adf = buildJiraCommentAdf(issueKey, issueTests, runMeta, includeApiTraffic, screenshotsByTestId);
      await client.addComment(issueKey, adf);
      console.log(`[glossy-reporter] Jira comment posted → ${cfg.baseUrl}/browse/${issueKey} (${issueTests.length} test(s))`);
    })
  );

  for (const r of results) {
    if (r.status === "rejected") {
      console.error("[glossy-reporter] Jira comment failed:", r.reason);
    }
  }
}
