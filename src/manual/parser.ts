/**
 * Manual test results parser.
 *
 * Parses a Markdown file containing manually-authored test results into
 * NormalizedTestResult objects that can be merged with automated results.
 *
 * Supported formats
 * -----------------
 * Both Gherkin and non-Gherkin blocks may coexist in the same file.
 *
 * Non-Gherkin:
 *   ## Test title @PASS @SCRUM-1 @smoke
 *   Notes: Tested on Chrome 120
 *   Error: Visible only on FAIL tests
 *
 * Gherkin:
 *   ## Scenario: Standard user can login @PASS @SCRUM-1
 *   Given I am on the login page
 *   When I enter valid credentials
 *   Then I should see the dashboard
 *   Error: Dashboard did not load
 *
 * Feature grouping (optional):
 *   # Feature: Checkout Flow
 *   (applies to all tests below until the next # Feature: heading)
 *
 * Status tags
 * -----------
 *   @PASS  → "passed"
 *   @FAIL  → "failed"
 *   @SKIP  → "skipped"
 *   If none present, status defaults to "passed".
 *
 * @manual is automatically added to every parsed test.
 */
import { createHash } from "node:crypto";
import type { NormalizedTestResult, TestStepInfo } from "../types/index.js";

const GHERKIN_KEYWORDS = /^(given|when|then|and|but)\s+/i;

/** Map @PASS/@FAIL/@SKIP tags to NormalizedTestResult status values. */
function resolveStatus(tags: string[]): NormalizedTestResult["status"] {
  if (tags.includes("@PASS")) return "passed";
  if (tags.includes("@FAIL")) return "failed";
  if (tags.includes("@SKIP")) return "skipped";
  return "passed";
}

/** Extract all @tag tokens from a string. */
function extractTags(text: string): string[] {
  return (text.match(/@[\w-]+/g) ?? []).map(t => t.toUpperCase() === "@PASS" || t.toUpperCase() === "@FAIL" || t.toUpperCase() === "@SKIP" ? t.toUpperCase() : t);
}

/** Strip all @tags and trailing whitespace from the title. */
function cleanTitle(raw: string): string {
  return raw
    .replace(/@[\w-]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Strip a leading "Scenario:" or "Scenario Outline:" prefix (case-insensitive). */
function stripScenarioPrefix(title: string): string {
  return title.replace(/^scenario(\s+outline)?:\s*/i, "").trim();
}

/** Deterministic short id from content. */
function manualId(file: string, title: string): string {
  return createHash("sha1").update(`manual:${file}:${title}`).digest("hex").slice(0, 12);
}

interface RawBlock {
  headingLine: string;
  bodyLines: string[];
}

/** Split the file into H2 (##) blocks. */
function splitIntoBlocks(lines: string[]): { featureLine: string | undefined; block: RawBlock }[] {
  const results: { featureLine: string | undefined; block: RawBlock }[] = [];
  let currentFeature: string | undefined;
  let current: RawBlock | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // # Feature: ... heading
    if (/^#\s+feature:/i.test(trimmed)) {
      currentFeature = trimmed.replace(/^#+\s+/i, "");
      if (current) {
        results.push({ featureLine: currentFeature, block: current });
        current = null;
      }
      continue;
    }

    // ## Test / ## Scenario: heading
    if (/^##\s+/.test(trimmed)) {
      if (current) results.push({ featureLine: currentFeature, block: current });
      current = { headingLine: trimmed.replace(/^#+\s+/, ""), bodyLines: [] };
      continue;
    }

    if (current) {
      current.bodyLines.push(line);
    }
  }

  if (current) results.push({ featureLine: currentFeature, block: current });
  return results;
}

/** Parse body lines into steps (Gherkin), notes, and error. */
function parseBody(bodyLines: string[]): {
  steps: TestStepInfo[];
  notes: string | undefined;
  errorMessage: string | undefined;
  isGherkin: boolean;
} {
  const steps: TestStepInfo[] = [];
  const noteLines: string[] = [];
  let errorMessage: string | undefined;
  let isGherkin = false;

  for (const raw of bodyLines) {
    const line = raw.trim();
    if (!line) continue;

    // Error: line
    if (/^error:\s*/i.test(line)) {
      errorMessage = line.replace(/^error:\s*/i, "").trim();
      continue;
    }

    // Notes: line
    if (/^notes?:\s*/i.test(line)) {
      noteLines.push(line.replace(/^notes?:\s*/i, "").trim());
      continue;
    }

    // Gherkin keyword lines
    if (GHERKIN_KEYWORDS.test(line)) {
      isGherkin = true;
      steps.push({
        title: line,
        category: "gherkin",
        durationMs: 0,
        status: "passed",  // updated below if failure
        screenshots: [],
      });
      continue;
    }

    // Anything else is treated as a note
    noteLines.push(line);
  }

  // If the test failed, mark the last Gherkin step as failed
  // (caller updates this after resolving status)

  const notes = noteLines.length > 0 ? noteLines.join(" ") : undefined;
  return { steps, notes, errorMessage, isGherkin };
}

/**
 * Parse a manual results Markdown file and return NormalizedTestResult[].
 * @param content  Raw file contents.
 * @param filePath The path used as the "file" field (for grouping and dedup).
 */
export function parseManualResults(content: string, filePath: string): NormalizedTestResult[] {
  const lines = content.split(/\r?\n/);
  const blocks = splitIntoBlocks(lines);
  const results: NormalizedTestResult[] = [];

  for (const { featureLine, block } of blocks) {
    const rawTags = extractTags(block.headingLine);
    const status = resolveStatus(rawTags);

    const rawTitle = stripScenarioPrefix(cleanTitle(block.headingLine));
    const title = rawTitle;

    // Always include @manual; remove status control tags from published tags
    const tags = [
      "@manual",
      ...rawTags.filter(t => !["@PASS", "@FAIL", "@SKIP"].includes(t.toUpperCase())),
    ];
    // Remove duplicates
    const uniqueTags = [...new Set(tags)];

    const { steps, notes, errorMessage, isGherkin } = parseBody(block.bodyLines);

    // For failed Gherkin tests, mark the last step as failed
    if (status === "failed" && isGherkin && steps.length > 0) {
      steps[steps.length - 1].status = "failed";
      if (errorMessage) steps[steps.length - 1].error = errorMessage;
    }

    // Feature meta from the # Feature: heading
    let featureMeta: NormalizedTestResult["featureMeta"];
    if (featureLine) {
      const name = featureLine.replace(/^feature:\s*/i, "").trim();
      featureMeta = { name };
    }

    const suite = featureMeta?.name ?? "Manual Tests";
    const fullName = featureMeta ? `${featureMeta.name} › ${title}` : title;
    const id = manualId(filePath, fullName);

    results.push({
      id,
      suite,
      file: filePath,
      title,
      fullName,
      status,
      expectedStatus: "passed",
      source: "manual",
      flaky: false,
      retries: 0,
      retryIndex: 0,
      durationMs: 0,
      tags: uniqueTags,
      featureMeta,
      scenarioDescription: notes,
      errorMessage: status === "failed" ? errorMessage : undefined,
      attachments: [],
      artifacts: { screenshots: [], videos: [], traces: [] },
      consoleLogs: [],
      steps,
    });
  }

  return results;
}
