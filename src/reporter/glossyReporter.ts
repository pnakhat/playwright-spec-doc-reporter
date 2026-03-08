import fs from "node:fs";
import path from "node:path";
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
import type { AIAnalysisResult, ApiEntry, AttachmentInfo, GlossyReporterConfig, NormalizedTestResult, TestStepInfo } from "../types/index.js";
import { classifyArtifacts, safeTextFromBuffer, shortId } from "../utils/report.js";

function projectName(test: TestCase): string | undefined {
  const annotations = test.annotations.map((item) => item.type).join(",");
  return annotations || undefined;
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

function extractSteps(steps: TestStep[], outputDirAbs: string): TestStepInfo[] {
  const result: TestStepInfo[] = [];
  for (const step of steps) {
    // Skip internal fixture/hook steps — keep user-visible actions
    if (step.category === 'fixture' || step.category === 'hook') continue;
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
      result.push(...extractSteps(step.steps, outputDirAbs));
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

  constructor(config: GlossyReporterConfig = {}) {
    this.config = {
      ...defaultConfig,
      ...config,
      ai: config.ai,
      healing: config.healing,
      providerFactory: config.providerFactory
    };
  }

  onBegin(globalConfig: FullConfig, suite: Suite): void {
    this.globalConfig = globalConfig;
    this.rootSuiteTitle = suite.title;
    this.runStartedAt = new Date().toISOString();
    this.maxWorkers = globalConfig.workers;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const outputDirAbs = path.resolve(process.cwd(), this.config.outputDir ?? defaultConfig.outputDir);
    const attachments = toAttachmentInfo(result, outputDirAbs);
    const artifacts = classifyArtifacts(attachments);
    const browserName = test.parent.project()?.name;
    const normalized: NormalizedTestResult = {
      id: shortId(`${test.location.file}:${test.location.line}:${test.title}:${result.retry}`),
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
      tags: extractTags(test),
      featureMeta: extractFeatureMeta(test),
      scenarioDescription: extractScenarioDescription(test),
      behaviours: extractBehaviours(test),
      apiEntries: extractApiEntries(test),
      consoleLogs: toConsoleLogs(result),
      steps: extractSteps(result.steps, outputDirAbs),
      startedAt: result.startTime?.toISOString(),
      finishedAt: result.startTime ? new Date(result.startTime.getTime() + result.duration).toISOString() : undefined
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

    await generateReport(finalizedTests, analyses, healingPayloads, this.config, {
      startedAt: this.runStartedAt,
      finishedAt: this.runFinishedAt,
      workers: this.maxWorkers
    });
  }

  printsToStdio(): boolean {
    return false;
  }
}
