/**
 * Glossy AI Healing Agent
 *
 * Reads healing.md from a spec-doc-report and uses the Claude API to
 * automatically apply the suggested fixes to the failing test files.
 *
 * Usage:
 *   npx tsx src/healing/healingAgent.ts [path/to/healing.md]
 *   npx tsx src/healing/healingAgent.ts --report spec-doc-report/healing.md --backup
 */

import fs from "node:fs/promises";
import path from "node:path";

interface HealingSuggestion {
  testName: string;
  file: string;
  stepName: string;
  action: string;
  confidence: number;
  error: string;
  failedLocator?: string;
  candidateLocators: string[];
  suggestedPatch?: string;
  reasoning: string;
}

interface HealingResult {
  file: string;
  testName: string;
  status: "fixed" | "skipped" | "error";
  message: string;
  diff?: string;
}

// ─── Markdown parser ───────────────────────────────────────────────────────────

function parseHealingMarkdown(content: string): HealingSuggestion[] {
  const suggestions: HealingSuggestion[] = [];
  const sections = content.split(/^## /m).slice(1);

  for (const section of sections) {
    const lines = section.split("\n");
    const testName = lines[0]?.trim() ?? "";

    const get = (key: string): string => {
      const line = lines.find(l => l.startsWith(`- ${key}:`));
      return line ? line.slice(`- ${key}:`.length).trim() : "";
    };

    const candidateLocatorsLine = get("Candidate locators");
    const candidateLocators = candidateLocatorsLine
      ? candidateLocatorsLine.split(",").map(l => l.trim()).filter(Boolean)
      : [];

    let suggestedPatch: string | undefined;
    const patchStart = section.indexOf("```diff\n");
    const patchEnd = section.indexOf("\n```", patchStart + 7);
    if (patchStart >= 0 && patchEnd >= 0) {
      suggestedPatch = section.slice(patchStart + 8, patchEnd).trim();
    }

    const rawFile = get("File");
    if (!rawFile) continue;

    suggestions.push({
      testName,
      file: rawFile,
      stepName: get("Step"),
      action: get("Action"),
      confidence: parseFloat(get("Confidence")) || 0,
      error: get("Error"),
      failedLocator: get("Failed locator") || undefined,
      candidateLocators,
      suggestedPatch,
      reasoning: get("Reasoning"),
    });
  }

  return suggestions;
}

// ─── Group by file ─────────────────────────────────────────────────────────────

function groupByFile(suggestions: HealingSuggestion[]): Map<string, HealingSuggestion[]> {
  const map = new Map<string, HealingSuggestion[]>();
  for (const s of suggestions) {
    const existing = map.get(s.file) ?? [];
    // De-duplicate: skip if same testName + action already present
    const isDuplicate = existing.some(e => e.testName === s.testName && e.action === s.action);
    if (!isDuplicate) existing.push(s);
    map.set(s.file, existing);
  }
  return map;
}

// ─── Claude API call ───────────────────────────────────────────────────────────

async function callClaude(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      temperature: 0.1,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.find(c => c.type === "text")?.text;
  if (!text) throw new Error("No text content in Claude response");
  return text;
}

// ─── Build repair prompt ───────────────────────────────────────────────────────

function buildRepairPrompt(fileContent: string, suggestions: HealingSuggestion[], filePath: string): string {
  const suggestionsText = suggestions.map((s, i) => `
### Suggestion ${i + 1}: ${s.testName}
- **Action**: ${s.action}
- **Confidence**: ${Math.round(s.confidence * 100)}%
- **Error**: ${s.error}
- **Failed locator**: ${s.failedLocator ?? "n/a"}
- **Candidate locators**: ${s.candidateLocators.join(", ") || "n/a"}
- **Suggested patch**: ${s.suggestedPatch ?? "n/a"}
- **Reasoning**: ${s.reasoning}
`).join("\n");

  return `You are an expert Playwright test engineer. Your task is to fix failing Playwright tests based on AI-generated healing suggestions.

## File: ${filePath}

## Current test file content:
\`\`\`typescript
${fileContent}
\`\`\`

## Healing suggestions to apply:
${suggestionsText}

## Instructions:
1. Apply the healing suggestions to fix the failing tests
2. Keep all passing tests completely unchanged
3. Preserve the exact code style, indentation, and structure
4. Only fix the specific failures indicated — do not refactor or improve other code
5. If a suggestion has a "Candidate locators" list, pick the most specific and reliable one
6. If suggestedPatch says to replace a locator, replace only that locator
7. Return ONLY the complete fixed TypeScript file content, with no explanation, no markdown fences, no extra text
8. The output must be valid TypeScript that compiles correctly

Output the fixed file content now:`;
}

// ─── Apply fix to a single file ────────────────────────────────────────────────

async function fixFile(
  filePath: string,
  suggestions: HealingSuggestion[],
  apiKey: string,
  createBackup: boolean
): Promise<HealingResult> {
  // Resolve path relative to CWD
  const absolutePath = path.resolve(process.cwd(), filePath);

  let fileContent: string;
  try {
    fileContent = await fs.readFile(absolutePath, "utf-8");
  } catch {
    return {
      file: filePath,
      testName: suggestions[0]?.testName ?? filePath,
      status: "error",
      message: `Could not read file: ${absolutePath}`,
    };
  }

  // Create backup
  if (createBackup) {
    const backupPath = absolutePath + ".backup";
    await fs.writeFile(backupPath, fileContent, "utf-8");
  }

  let fixedContent: string;
  try {
    const prompt = buildRepairPrompt(fileContent, suggestions, filePath);
    fixedContent = await callClaude(prompt, apiKey);

    // Strip accidental markdown fences if model adds them
    const fenceMatch = fixedContent.match(/```(?:typescript|ts)?\n([\s\S]*?)```/);
    if (fenceMatch) fixedContent = fenceMatch[1];
    fixedContent = fixedContent.trim();
  } catch (err) {
    return {
      file: filePath,
      testName: suggestions[0]?.testName ?? filePath,
      status: "error",
      message: `Claude API error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!fixedContent || fixedContent === fileContent) {
    return {
      file: filePath,
      testName: suggestions[0]?.testName ?? filePath,
      status: "skipped",
      message: "No changes were made",
    };
  }

  try {
    await fs.writeFile(absolutePath, fixedContent, "utf-8");
  } catch (err) {
    return {
      file: filePath,
      testName: suggestions[0]?.testName ?? filePath,
      status: "error",
      message: `Could not write fixed file: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  return {
    file: filePath,
    testName: suggestions[0]?.testName ?? filePath,
    status: "fixed",
    message: `Applied ${suggestions.length} suggestion(s)`,
  };
}

// ─── CLI colors ────────────────────────────────────────────────────────────────

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  white: "\x1b[37m",
};

function log(msg: string) { process.stdout.write(msg + "\n"); }

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  let healingMdPath = "spec-doc-report/healing.md";
  let createBackup = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--report" && args[i + 1]) {
      healingMdPath = args[++i];
    } else if (args[i] === "--backup") {
      createBackup = true;
    } else if (!args[i].startsWith("--")) {
      healingMdPath = args[i];
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    log(`${c.red}${c.bold}Error:${c.reset} ANTHROPIC_API_KEY environment variable is not set.`);
    log(`${c.gray}Set it with: export ANTHROPIC_API_KEY=sk-ant-...${c.reset}`);
    process.exit(1);
  }

  log(`\n${c.bold}${c.cyan}🩹 Glossy AI Healing Agent${c.reset}`);
  log(`${c.gray}${"─".repeat(50)}${c.reset}`);
  log(`${c.gray}Reading: ${c.white}${healingMdPath}${c.reset}`);

  let markdownContent: string;
  try {
    markdownContent = await fs.readFile(path.resolve(process.cwd(), healingMdPath), "utf-8");
  } catch {
    log(`${c.red}Error: Could not read ${healingMdPath}${c.reset}`);
    log(`${c.gray}Make sure you have run the Glossy reporter with AI enabled.${c.reset}`);
    process.exit(1);
  }

  const suggestions = parseHealingMarkdown(markdownContent);
  if (suggestions.length === 0) {
    log(`${c.yellow}No healing suggestions found in ${healingMdPath}${c.reset}`);
    process.exit(0);
  }

  const grouped = groupByFile(suggestions);
  log(`${c.gray}Found ${c.white}${suggestions.length}${c.gray} suggestion(s) across ${c.white}${grouped.size}${c.gray} file(s)${c.reset}\n`);

  if (createBackup) {
    log(`${c.gray}Backup mode: original files will be saved with .backup extension${c.reset}\n`);
  }

  const results: HealingResult[] = [];

  for (const [filePath, fileSuggestions] of grouped) {
    log(`${c.bold}📄 ${filePath}${c.reset}`);
    for (const s of fileSuggestions) {
      const conf = Math.round(s.confidence * 100);
      const confColor = conf >= 70 ? c.green : conf >= 40 ? c.yellow : c.red;
      log(`   ${c.gray}→${c.reset} ${s.testName} ${confColor}(${conf}% confidence)${c.reset}`);
    }
    process.stdout.write(`   ${c.gray}Calling Claude...${c.reset}`);

    const result = await fixFile(filePath, fileSuggestions, apiKey, createBackup);
    results.push(result);

    // Clear "Calling Claude..." line
    process.stdout.write("\r" + " ".repeat(40) + "\r");

    if (result.status === "fixed") {
      log(`   ${c.green}✓ Fixed${c.reset} — ${result.message}`);
    } else if (result.status === "skipped") {
      log(`   ${c.yellow}~ Skipped${c.reset} — ${result.message}`);
    } else {
      log(`   ${c.red}✗ Error${c.reset} — ${result.message}`);
    }
    log("");
  }

  // Summary
  const fixed = results.filter(r => r.status === "fixed").length;
  const errors = results.filter(r => r.status === "error").length;
  const skipped = results.filter(r => r.status === "skipped").length;

  log(`${c.gray}${"─".repeat(50)}${c.reset}`);
  log(`${c.bold}Summary${c.reset}`);
  if (fixed > 0) log(`  ${c.green}✓ ${fixed} file(s) fixed${c.reset}`);
  if (skipped > 0) log(`  ${c.yellow}~ ${skipped} file(s) skipped${c.reset}`);
  if (errors > 0) log(`  ${c.red}✗ ${errors} file(s) errored${c.reset}`);
  log("");

  if (fixed > 0) {
    log(`${c.cyan}Next steps:${c.reset}`);
    log(`  1. Review the changes: ${c.gray}git diff${c.reset}`);
    log(`  2. Run the tests: ${c.gray}npx playwright test${c.reset}`);
    log(`  3. Commit if tests pass\n`);
  }
}

main().catch(err => {
  process.stderr.write(`Fatal error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
