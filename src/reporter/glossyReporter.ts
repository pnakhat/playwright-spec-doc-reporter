import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
  TestStep
} from "@playwright/test/reporter";
import { analyzeFailures } from "../ai/analysisService.js";
import { defaultConfig } from "../config/defaults.js";
import { generateReport } from "../generator/reportGenerator.js";
import { createHealingPayloads } from "../healing/payload.js";
import { writePrComment } from "../prComment/generator.js";
import { postJiraTestResults, createJiraBugs } from "../jira/index.js";
import { generateAutofixPR } from "../autofix/prGenerator.js";
import { parseManualResults } from "../manual/parser.js";
import type { AIAnalysisResult, ApiEntry, AttachmentInfo, GlossyReporterConfig, NormalizedTestResult, TestStepInfo } from "../types/index.js";
import { classifyArtifacts, safeTextFromBuffer, shortId } from "../utils/report.js";
import { buildTestFileMapSync } from "../traceability/testMapper.js";
import { parseSpecFiles } from "../traceability/specParser.js";
import { TraceabilityIndex } from "../traceability/TraceabilityIndex.js";
import { parseDiff, type HealingDiff } from "../healing/diffParser.js";
import { detectHealingEvent } from "../healing/healingDetector.js";
import { HealingIndex } from "../healing/HealingIndex.js";
import { writeJson } from "../utils/fs.js";
import { extractCucumberMeta, parseGherkinStepTitle, gherkinStepCategory } from "../cucumber/cucumberDetector.js";
import { enrichBddTest } from "../cucumber/bddEnricher.js";
import { parseCucumberJsonReports } from "../cucumber/adapter.js";

function projectName(test: TestCase): string | undefined {
  return test.parent.project()?.name || undefined;
}

function extractTags(test: TestCase): string[] {
  const tags = new Set<string>();
  // Playwright 1.42+ exposes test.tags as string[]
  if (Array.isArray((test as unknown as { tags?: string[] }).tags)) {
    for (const t of (test as unknown as { tags: string[] }).tags) {
      tags.add(t.startsWith('@') ? t : '@' + t);
    }
  }
  // Also extract @tag patterns from the test title
  const titleTags = test.title.match(/@[\w-]+/g);
  if (titleTags) {
    for (const t of titleTags) tags.add(t);
  }
  // Also extract from annotations with type "tag"
  for (const ann of test.annotations) {
    if (ann.type === 'tag' && ann.description) {
      tags.add(ann.description.startsWith('@') ? ann.description : '@' + ann.description);
    }
  }
  return [...tags];
}

function extractFeatureMeta(test: TestCase): { name: string; description?: string } | undefined {
  const name = test.annotations.find(a => a.type === "feature")?.description;
  const description = test.annotations.find(a => a.type === "feature.description")?.description;
  if (!name) return undefined;
  return description ? { name, description } : { name };
}

function extractScenarioDescription(test: TestCase): string | undefined {
  return test.annotations.find(a => a.type === "scenario")?.description ?? undefined;
}

/**
 * Build the scenario description from feature-file enrichment: the free-form
 * description under the Scenario header, plus the resolved Examples row for
 * Scenario Outline tests.
 */
function composeBddScenarioDescription(
  enrichment: ReturnType<typeof enrichBddTest>
): string | undefined {
  if (!enrichment) return undefined;
  const parts: string[] = [];
  if (enrichment.scenarioDescription) parts.push(enrichment.scenarioDescription);
  if (enrichment.exampleRow) {
    const row = Object.entries(enrichment.exampleRow)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
    if (row) parts.push(`Examples row — ${row}`);
  }
  return parts.length > 0 ? parts.join("\n") : undefined;
}

function extractBehaviours(test: TestCase): string[] | undefined {
  const behaviours = test.annotations
    .filter(ann => ann.type === "behaviour" || ann.type === "behavior")
    .map(ann => ann.description ?? "")
    .filter(Boolean);
  return behaviours.length > 0 ? behaviours : undefined;
}

function extractApiEntries(test: TestCase): ApiEntry[] | undefined {
  const entries = test.annotations
    .filter(ann => ann.type === "glossy:request" || ann.type === "glossy:response")
    .map(ann => {
      try { return JSON.parse(ann.description ?? "{}") as ApiEntry; } catch { return null; }
    })
    .filter(Boolean) as ApiEntry[];
  return entries.length > 0 ? entries : undefined;
}

const GHERKIN_STEP_TITLE_RE = /^(Given|When|Then|And|But)\s+/;

function extractSteps(steps: TestStep[], outputDirAbs: string, includeHookGherkinSteps = false): TestStepInfo[] {
  const result: TestStepInfo[] = [];
  for (const step of steps) {
    // Skip internal fixture/hook steps — keep user-visible actions.
    // Exception: playwright-bdd runs Background steps inside a beforeEach hook,
    // so for BDD tests surface Gherkin-titled steps nested in hooks.
    if (step.category === 'fixture' || step.category === 'hook') {
      if (includeHookGherkinSteps && step.steps.length > 0) {
        const nested = extractSteps(step.steps, outputDirAbs, true)
          .filter(s => GHERKIN_STEP_TITLE_RE.test(s.title));
        result.push(...nested);
      }
      continue;
    }
    const screenshots = step.attachments
      .filter(a => a.contentType?.startsWith('image/'))
      .map(a => a.path ? toWebPath(a.path, outputDirAbs) : '')
      .filter(Boolean);
    result.push({
      title: step.title,
      category: step.category,
      durationMs: step.duration,
      status: step.error ? 'failed' : 'passed',
      error: step.error?.message,
      screenshots,
      startedAt: step.startTime?.toISOString()
    });
    // Recurse into nested steps
    if (step.steps.length > 0) {
      result.push(...extractSteps(step.steps, outputDirAbs, includeHookGherkinSteps));
    }
  }
  return result;
}

/**
 * Distribute test-level screenshot attachments to steps.
 * Failed tests: screenshot goes on the failing step.
 * Passed tests: screenshot goes on the last step.
 */
function distributeScreenshotsToSteps(
  extractedSteps: TestStepInfo[],
  testAttachments: { name: string; contentType?: string; path?: string }[],
  testStatus: string
): void {
  const screenshotPaths = testAttachments
    .filter(a => a.contentType?.startsWith('image/') && a.path)
    .map(a => a.path as string);
  if (screenshotPaths.length === 0 || extractedSteps.length === 0) return;

  // Find the target step to receive the screenshot(s)
  const failedIdx = extractedSteps.findIndex(s => s.status === 'failed');
  const targetIdx = (testStatus === 'failed' || testStatus === 'timedOut') && failedIdx >= 0
    ? failedIdx
    : extractedSteps.length - 1;

  extractedSteps[targetIdx].screenshots.push(...screenshotPaths);
}

/**
 * Extract a source code snippet around the error location from the stack trace.
 * Returns 3 lines before and 3 lines after the error line, similar to Playwright's default reporter.
 */
function extractErrorSnippet(
  error: TestResult["error"]
): { file: string; line: number; column: number; lines: { num: number; text: string; isError: boolean }[] } | undefined {
  if (!error?.stack) return undefined;
  // Find the first "at" line pointing to a .ts or .js file in the project
  const atLineMatch = error.stack.match(/at\s+(?:.*?)\((.*?):(\d+):(\d+)\)|at\s+(.*?):(\d+):(\d+)/);
  if (!atLineMatch) return undefined;
  const file = atLineMatch[1] || atLineMatch[4];
  const line = parseInt(atLineMatch[2] || atLineMatch[5], 10);
  const column = parseInt(atLineMatch[3] || atLineMatch[6], 10);
  if (!file || !line || !fs.existsSync(file)) return undefined;
  try {
    const content = fs.readFileSync(file, "utf-8");
    const allLines = content.split("\n");
    const contextBefore = 3;
    const contextAfter = 3;
    const start = Math.max(0, line - 1 - contextBefore);
    const end = Math.min(allLines.length, line - 1 + contextAfter + 1);
    const snippetLines: { num: number; text: string; isError: boolean }[] = [];
    for (let i = start; i < end; i++) {
      snippetLines.push({ num: i + 1, text: allLines[i], isError: i === line - 1 });
    }
    const relFile = path.relative(process.cwd(), file);
    return { file: relFile, line, column, lines: snippetLines };
  } catch {
    return undefined;
  }
}

function toConsoleLogs(result: TestResult): { stream: "stdout" | "stderr"; message: string }[] {
  const stdout = result.stdout.map((chunk) => ({ stream: "stdout" as const, message: safeTextFromBuffer(chunk) }));
  const stderr = result.stderr.map((chunk) => ({ stream: "stderr" as const, message: safeTextFromBuffer(chunk) }));
  return [...stdout, ...stderr];
}

function toWebPath(filePath: string, outputDirAbs: string): string {
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const rel = path.relative(outputDirAbs, absolute);
  return rel.split(path.sep).join("/");
}

function toAttachmentInfo(result: TestResult, outputDirAbs: string): AttachmentInfo[] {
  return result.attachments.map((attachment) => ({
    name: attachment.name,
    contentType: attachment.contentType,
    path: attachment.path ? toWebPath(attachment.path, outputDirAbs) : undefined
  }));
}

export class GlossyPlaywrightReporter implements Reporter {
  private readonly config: GlossyReporterConfig;
  private readonly tests: NormalizedTestResult[] = [];
  private rootSuiteTitle = "";
  private globalConfig?: FullConfig;
  private runStartedAt?: string;
  private runFinishedAt?: string;
  private maxWorkers?: number;

  // Traceability — reverse map: relTestFilePath → specPath
  private testToSpecMap: Map<string, string> = new Map();
  /** Directory containing playwright.config — used to locate specs/ and compute relative test paths */
  private projectRoot = process.cwd();

  // Healing
  private diffIndex: Map<string, HealingDiff> = new Map();
  private healingIndex: HealingIndex = new HealingIndex();

  constructor(config: GlossyReporterConfig = {}) {
    this.config = {
      ...defaultConfig,
      ...config,
      ai: config.ai,
      healing: config.healing,
      providerFactory: config.providerFactory
    };
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.globalConfig = config;
    this.rootSuiteTitle = suite.title;
    this.runStartedAt = new Date().toISOString();
    this.maxWorkers = config.workers;
    // In PW ≥1.52 rootDir = resolved testDir; derive project root from config file
    this.projectRoot = config.configFile
      ? path.dirname(config.configFile)
      : process.cwd();

    // Build synchronous test→spec reverse map for use in onTestEnd
    // Use projectRoot so keys match NormalizedTestResult.file (relative to cwd/config dir)
    const specToTests = buildTestFileMapSync(suite, this.projectRoot);
    this.testToSpecMap = new Map();
    for (const [specPath, testFiles] of specToTests) {
      for (const testFile of testFiles) {
        this.testToSpecMap.set(testFile, specPath);
      }
    }

    // Parse git diff to detect Healer-mutated test files.
    // Use the configured testDir (relative to projectRoot) so this works regardless
    // of whether tests live in tests/, e2e/, src/tests/, etc.
    try {
      const testDir = path.relative(this.projectRoot, config.rootDir) || ".";
      const diffText = execSync(`git diff HEAD -- ${testDir}`, {
        cwd: this.projectRoot,
        timeout: 10_000,
        stdio: ["pipe", "pipe", "pipe"]
      }).toString("utf-8");
      const diffs = parseDiff(diffText);
      for (const d of diffs) {
        this.diffIndex.set(d.testFilePath, d);
      }
    } catch {
      // git not available, not a git repo, or no diff — skip silently
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const outputDirAbs = path.resolve(process.cwd(), this.config.outputDir ?? defaultConfig.outputDir);
    const attachments = toAttachmentInfo(result, outputDirAbs);
    const artifacts = classifyArtifacts(attachments);
    const browserName = test.parent.project()?.name;
    const relTestFile = path.relative(this.projectRoot, test.location.file).split(path.sep).join("/");
    const specPath = this.testToSpecMap.get(relTestFile);

    // Detect Healer activity
    const healingEvt = detectHealingEvent(relTestFile, result, this.diffIndex);
    if (healingEvt) this.healingIndex.add(healingEvt);

    // Detect and extract Cucumber/playwright-bdd metadata when enabled (default: true)
    const cucumberEnhance = this.config.cucumber?.enhancePlaywrightBdd !== false;
    const cucumberMeta = cucumberEnhance ? extractCucumberMeta(test) : { isCucumber: false, tags: [] as string[] };

    // For playwright-bdd generated tests, follow the "// Generated from:" header
    // back to the source .feature file for feature description, scenario
    // description, rule name, and tags that the generated spec doesn't carry.
    const bddEnrichment = cucumberMeta.isCucumber ? enrichBddTest(test, this.projectRoot) : undefined;

    // Merge base tags with Cucumber-detected tags, applying autoTags if configured
    let mergedTags = extractTags(test);
    if (cucumberMeta.isCucumber) {
      const autoTags = this.config.cucumber?.autoTags ?? ["@cucumber"];
      const cucumberTagSet = new Set([...mergedTags, ...cucumberMeta.tags, ...(bddEnrichment?.tags ?? []), ...autoTags]);
      mergedTags = [...cucumberTagSet];
    }

    // When playwright-bdd is detected, override steps to include Gherkin keyword categories
    const extractedSteps = extractSteps(result.steps, outputDirAbs, cucumberMeta.isCucumber);
    if (cucumberMeta.isCucumber) {
      for (const step of extractedSteps) {
        const parsed = parseGherkinStepTitle(step.title);
        if (parsed.keyword) {
          step.category = gherkinStepCategory(parsed.keyword);
        }
      }
    }

    const normalized: NormalizedTestResult = {
      id: shortId(`${test.parent.project()?.name ?? ""}:${test.location.file}:${test.location.line}:${test.title}:${result.retry}`),
      suite: test.parent.title || this.rootSuiteTitle,
      file: path.relative(process.cwd(), test.location.file),
      title: test.title,
      fullName: test.titlePath().join(" › "),
      status: result.status,
      expectedStatus: test.expectedStatus,
      flaky: result.status === "passed" && result.retry > 0,
      retries: result.retry,
      retryIndex: result.retry,
      durationMs: result.duration,
      browser: browserName,
      projectName: projectName(test),
      workerIndex: result.workerIndex,
      errorMessage: result.error?.message,
      stackTrace: result.error?.stack,
      errorSnippet: extractErrorSnippet(result.error),
      attachments,
      artifacts: {
        screenshots: this.config.includeScreenshots ? artifacts.screenshots : [],
        videos: this.config.includeVideos ? artifacts.videos : [],
        traces: this.config.includeTraces ? artifacts.traces : []
      },
      tags: mergedTags,
      // Feature-file enrichment > detected Cucumber metadata > plain annotations
      featureMeta: bddEnrichment
        ? { name: bddEnrichment.featureName, description: bddEnrichment.featureDescription }
        : cucumberMeta.isCucumber && cucumberMeta.featureName
          ? { name: cucumberMeta.featureName, description: cucumberMeta.featureDescription }
          : extractFeatureMeta(test),
      scenarioDescription: composeBddScenarioDescription(bddEnrichment)
        ?? (cucumberMeta.isCucumber && cucumberMeta.scenarioName
          ? cucumberMeta.scenarioName
          : extractScenarioDescription(test)),
      featureFilePath: bddEnrichment?.featureFilePath ?? cucumberMeta.featureFilePath,
      ruleName: bddEnrichment?.ruleName ?? cucumberMeta.ruleName,
      behaviours: extractBehaviours(test),
      apiEntries: extractApiEntries(test),
      consoleLogs: toConsoleLogs(result),
      steps: extractedSteps,
      startedAt: result.startTime?.toISOString(),
      finishedAt: result.startTime ? new Date(result.startTime.getTime() + result.duration).toISOString() : undefined,
      specPath,
      healingEvent: healingEvt
        ? {
            outcome: healingEvt.outcome as "auto-healed" | "skipped-app-broken",
            reason: healingEvt.reason,
            patchSummary: healingEvt.diff?.patchSummary,
            locatorsBefore: healingEvt.diff?.locatorsBefore,
            locatorsAfter: healingEvt.diff?.locatorsAfter,
          }
        : undefined,
    };

    // Distribute test-level screenshots to the appropriate step
    if (this.config.includeScreenshots && normalized.steps.length > 0) {
      distributeScreenshotsToSteps(normalized.steps, attachments, result.status);
    }

    this.tests.push(normalized);
  }

  async onEnd(_result: FullResult): Promise<void> {
    this.runFinishedAt = new Date().toISOString();

    const uniqueById = new Map<string, NormalizedTestResult>();
    for (const test of this.tests) {
      uniqueById.set(test.id, test);
    }

    // Merge manual test results if configured
    if (this.config.manualTests?.resultsPath) {
      const manualPath = this.config.manualTests.resultsPath;
      try {
        const content = fs.readFileSync(manualPath, "utf-8");
        let manualTests: NormalizedTestResult[] = [];
        try {
          manualTests = parseManualResults(content, manualPath);
        } catch (parseErr) {
          console.warn(`[glossy-reporter] Failed to parse manual tests from ${manualPath} — skipping. Error:`, parseErr);
        }
        for (const t of manualTests) uniqueById.set(t.id, t);
        if (manualTests.length > 0) {
          console.log(`[glossy-reporter] Merged ${manualTests.length} manual test(s) from ${manualPath}`);
        }
      } catch (err) {
        console.warn(`[glossy-reporter] Could not read manual tests file ${manualPath} — skipping. Error:`, err);
      }
    }

    // Merge Cucumber JSON report(s) if configured
    const cucumberJsonPaths = this.config.cucumber?.jsonReports;
    if (cucumberJsonPaths) {
      const paths = Array.isArray(cucumberJsonPaths) ? cucumberJsonPaths : [cucumberJsonPaths];
      try {
        const autoTags = this.config.cucumber?.autoTags ?? ["@cucumber"];
        const resolvedOutputDir = path.resolve(process.cwd(), this.config.outputDir ?? defaultConfig.outputDir);
        const cucumberTests = parseCucumberJsonReports(paths, resolvedOutputDir);
        // Apply any configured autoTags to all cucumber results
        for (const t of cucumberTests) {
          const tagSet = new Set([...t.tags, ...autoTags]);
          t.tags = [...tagSet];
          uniqueById.set(t.id, t);
        }
        if (cucumberTests.length > 0) {
          console.log(`[glossy-reporter] Merged ${cucumberTests.length} Cucumber scenario(s) from ${paths.join(", ")}`);
        }
      } catch (err) {
        console.warn(`[glossy-reporter] Could not merge Cucumber JSON reports — skipping. Error:`, err);
      }
    }

    const finalizedTests = [...uniqueById.values()];
    const failedTests = finalizedTests.filter((test) => test.status === "failed" || test.status === "timedOut");

    let analyses: AIAnalysisResult[] = [];
    if (this.config.ai?.enabled) {
      const slice = failedTests.slice(0, this.config.ai.maxFailuresToAnalyze ?? failedTests.length);
      analyses = await analyzeFailures(slice, this.config.ai, this.config.providerFactory);
    }

    const healingPayloads = this.config.healing?.enabled
      ? createHealingPayloads(failedTests, analyses)
      : [];

    // Build traceability index
    const outputDir = this.config.outputDir ?? defaultConfig.outputDir;
    let traceabilityIndexData: ReturnType<TraceabilityIndex["toJSON"]> | undefined;
    try {
      const specFiles = await parseSpecFiles(this.projectRoot);
      const traceIndex = new TraceabilityIndex(specFiles, this.testToSpecMap.size > 0
        ? (() => {
            const m = new Map<string, string[]>();
            for (const [testFile, specPath] of this.testToSpecMap) {
              const arr = m.get(specPath) ?? [];
              arr.push(testFile);
              m.set(specPath, arr);
            }
            return m;
          })()
        : new Map());
      if (!traceIndex.isEmpty) {
        traceabilityIndexData = traceIndex.toJSON();
        await writeJson(`${outputDir}/traceability.json`, traceabilityIndexData);
      }
    } catch (err) {
      console.warn("[glossy-reporter] Traceability index failed — skipping.", err);
    }

    // Write healing index
    let healingSummary: ReturnType<HealingIndex["getSummary"]> | undefined;
    if (!this.healingIndex.isEmpty) {
      healingSummary = this.healingIndex.getSummary();
      try {
        await writeJson(`${outputDir}/healing.json`, this.healingIndex.toJSON());
      } catch (err) {
        console.warn("[glossy-reporter] Could not write healing.json — skipping.", err);
      }
    }

    const report = await generateReport(
      finalizedTests,
      analyses,
      healingPayloads,
      this.config,
      {
        startedAt: this.runStartedAt,
        finishedAt: this.runFinishedAt,
        workers: this.maxWorkers,
      },
      traceabilityIndexData,
      healingSummary
    );

    await writePrComment(finalizedTests, report.summary, analyses, this.config);
    await postJiraTestResults(finalizedTests, this.config);

    // Auto-bug creation in Jira for failed tests
    const bugCfg = this.config.jira?.autoBugs;
    if (bugCfg?.enabled) {
      const email = this.config.jira?.email ?? process.env.JIRA_EMAIL ?? "";
      const apiToken = this.config.jira?.apiToken ?? process.env.JIRA_API_TOKEN ?? "";
      const baseUrl = this.config.jira?.baseUrl ?? "";
      if (email && apiToken && baseUrl) {
        const outputDirAbs = path.resolve(process.cwd(), this.config.outputDir ?? defaultConfig.outputDir);
        await createJiraBugs({
          tests: finalizedTests,
          analyses,
          bugConfig: bugCfg,
          jiraBaseUrl: baseUrl,
          email,
          apiToken,
          outputDirAbs,
        });
      } else {
        console.warn("[glossy-reporter] Jira autoBugs enabled but JIRA_EMAIL / JIRA_API_TOKEN / baseUrl are not set.");
      }
    }

    // Auto-PR generation: apply AI patches, push branch, open draft PR
    if (this.config.healing?.generatePR && healingPayloads.length > 0) {
      const autofixConfig = this.config.healing.autofix ?? {};
      await generateAutofixPR({
        payloads: healingPayloads,
        analyses,
        autofixConfig,
        cwd: this.projectRoot,
      });
    }
  }

  printsToStdio(): boolean {
    return false;
  }
}
