export { GlossyPlaywrightReporter, GlossyPlaywrightReporter as SpecDocReporter } from "./reporter/glossyReporter.js";
export { generateReport } from "./generator/reportGenerator.js";
export { buildGlossyHtml } from "./generator/htmlTemplate.js";
export type { BuildHtmlOptions } from "./generator/htmlTemplate.js";
export { analyzeFailures, resolveProvider, toAIInput } from "./ai/analysisService.js";
export { OpenAIProvider } from "./ai/providers/openaiProvider.js";
export { AnthropicProvider } from "./ai/providers/anthropicProvider.js";
export { createHealingPayload, createHealingPayloads, healingPayloadsToMarkdown } from "./healing/payload.js";
export type {
  AIAnalysisInput,
  AIAnalysisResult,
  AIConfig,
  AIProvider,
  AIProviderConfig,
  ApiEntry,
  GlossyReporterConfig,
  HealingConfig,
  HealingPayload,
  NormalizedTestResult,
  ReportData,
  ReportSummary,
  TestStatus
} from "./types/index.js";
