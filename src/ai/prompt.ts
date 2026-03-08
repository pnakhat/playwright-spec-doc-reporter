import type { AIAnalysisInput } from "../types/index.js";

export function buildFailurePrompt(input: AIAnalysisInput, customPrompt?: string): string {
  const base = [
    "You are an expert Playwright test reliability engineer.",
    "Return ONLY strict JSON with keys:",
    "summary, likelyRootCause, confidence, suggestedRemediation, issueCategory, structuredFeedback.",
    "structuredFeedback keys: actionType, reasoning, suggestedPatch, candidateLocators.",
    "Issue categories allowed: locator_drift, timing_issue, environment_issue, test_data_issue, assertion_issue, app_bug, unknown.",
    "Confidence must be a number 0-1."
  ].join("\n");

  const context = {
    testName: input.testName,
    file: input.file,
    errorMessage: input.errorMessage,
    stackTrace: input.stackTrace,
    domSnippet: input.domSnippet,
    failedLocator: input.failedLocator,
    screenshotPath: input.screenshotPath,
    tracePath: input.tracePath,
    additionalContext: input.additionalContext
  };

  return `${base}\n${customPrompt ?? ""}\nAnalyze this failure context:\n${JSON.stringify(context, null, 2)}`;
}
