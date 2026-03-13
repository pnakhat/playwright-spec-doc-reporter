import { AnthropicProvider } from "./providers/anthropicProvider.js";
import { AzureProvider } from "./providers/azureProvider.js";
import { OpenAIProvider } from "./providers/openaiProvider.js";
import type {
  AIAnalysisInput,
  AIAnalysisResult,
  AIProvider,
  AIProviderConfig,
  NormalizedTestResult
} from "../types/index.js";

function toIssueCategory(raw?: string): AIAnalysisResult["issueCategory"] {
  const normalized = (raw ?? "unknown").toLowerCase();
  if (
    normalized === "locator_drift" ||
    normalized === "timing_issue" ||
    normalized === "environment_issue" ||
    normalized === "test_data_issue" ||
    normalized === "assertion_issue" ||
    normalized === "app_bug"
  ) {
    return normalized;
  }
  return "unknown";
}

function normalizeResult(result: AIAnalysisResult): AIAnalysisResult {
  return {
    ...result,
    confidence: Math.max(0, Math.min(1, Number.isFinite(result.confidence) ? result.confidence : 0.25)),
    issueCategory: toIssueCategory(result.issueCategory)
  };
}

export function resolveProvider(config: AIProviderConfig, customFactory?: (cfg: AIProviderConfig) => AIProvider): AIProvider {
  if (config.provider === "custom") {
    if (!customFactory) {
      throw new Error("Custom AI provider selected but no providerFactory supplied.");
    }
    return customFactory(config);
  }

  if (config.provider === "openai") return new OpenAIProvider();
  if (config.provider === "anthropic") return new AnthropicProvider();
  if (config.provider === "azure") return new AzureProvider();

  throw new Error(`Unsupported AI provider: ${config.provider}`);
}

export function toAIInput(test: NormalizedTestResult): AIAnalysisInput {
  const failedLocator = test.errorMessage?.match(/locator\((.*?)\)/)?.[1];
  return {
    testName: test.fullName,
    file: test.file,
    errorMessage: test.errorMessage,
    stackTrace: test.stackTrace,
    failedLocator,
    screenshotPath: test.artifacts.screenshots[0],
    tracePath: test.artifacts.traces[0],
    additionalContext: {
      retries: test.retries,
      projectName: test.projectName,
      browser: test.browser,
      durationMs: test.durationMs,
      consoleLogs: test.consoleLogs.slice(-5)
    }
  };
}

export async function analyzeFailures(
  failedTests: NormalizedTestResult[],
  config: AIProviderConfig,
  customFactory?: (cfg: AIProviderConfig) => AIProvider
): Promise<AIAnalysisResult[]> {
  const provider = resolveProvider(config, customFactory);
  const analyses: AIAnalysisResult[] = [];

  for (const test of failedTests) {
    const input = toAIInput(test);
    try {
      const result = await provider.analyzeFailure(input, config);
      analyses.push(normalizeResult(result));
    } catch (error) {
      analyses.push({
        testName: input.testName,
        file: input.file,
        summary: "AI analysis unavailable for this test.",
        likelyRootCause: error instanceof Error ? error.message : "Unknown provider error",
        confidence: 0,
        suggestedRemediation: "Inspect test logs and rerun with trace enabled.",
        issueCategory: "unknown",
        structuredFeedback: {
          actionType: "investigate",
          reasoning: "Provider failed to return a valid analysis."
        }
      });
    }
  }

  return analyses;
}
