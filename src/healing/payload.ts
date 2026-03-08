import type { AIAnalysisResult, HealingPayload, NormalizedTestResult } from "../types/index.js";

export function createHealingPayload(test: NormalizedTestResult, analysis?: AIAnalysisResult): HealingPayload {
  return {
    testName: test.fullName,
    file: test.file,
    stepName: test.title,
    failedLocator: analysis?.structuredFeedback.candidateLocators?.[0],
    candidateLocators: analysis?.structuredFeedback.candidateLocators ?? [],
    domContext: undefined,
    errorMessage: test.errorMessage,
    suggestedPatch: analysis?.structuredFeedback.suggestedPatch,
    reasoning: analysis?.structuredFeedback.reasoning ?? "No AI reasoning available.",
    confidence: analysis?.confidence ?? 0,
    actionType: analysis?.structuredFeedback.actionType ?? "investigate"
  };
}

export function createHealingPayloads(tests: NormalizedTestResult[], analyses: AIAnalysisResult[]): HealingPayload[] {
  const byTest = new Map(analyses.map((analysis) => [`${analysis.file}::${analysis.testName}`, analysis]));
  return tests.map((test) => {
    const key = `${test.file}::${test.fullName}`;
    return createHealingPayload(test, byTest.get(key));
  });
}

export function healingPayloadsToMarkdown(payloads: HealingPayload[]): string {
  const lines: string[] = ["# Healing Suggestions", ""];

  for (const payload of payloads) {
    lines.push(`## ${payload.testName}`);
    lines.push(`- File: ${payload.file}`);
    lines.push(`- Step: ${payload.stepName ?? "n/a"}`);
    lines.push(`- Action: ${payload.actionType}`);
    lines.push(`- Confidence: ${payload.confidence}`);
    lines.push(`- Error: ${payload.errorMessage ?? "n/a"}`);
    if (payload.failedLocator) lines.push(`- Failed locator: ${payload.failedLocator}`);
    if (payload.candidateLocators.length > 0) {
      lines.push(`- Candidate locators: ${payload.candidateLocators.join(", ")}`);
    }
    if (payload.suggestedPatch) {
      lines.push("- Suggested patch:");
      lines.push("```diff");
      lines.push(payload.suggestedPatch);
      lines.push("```");
    }
    lines.push(`- Reasoning: ${payload.reasoning}`);
    lines.push("");
  }

  return lines.join("\n");
}
