/**
 * Lightweight, browser-serialisable shape for the agentic analysis data that
 * is embedded into the report HTML and rendered by the Agentic Insights widget.
 * This is distinct from the full `AgenticRunAnalysis` in src/mcp/types.ts —
 * it is trimmed for minimal HTML payload and avoids circular imports.
 */

export interface AgenticInsightOverlapGroup {
  testTitles: string[];
  sharedSteps: string[];
  similarity: number;
  recommendation: string;
}

export interface AgenticInsightApiCandidate {
  testTitle: string;
  conversionClass: string;
  conversionScore: number;
  endpoints: string[];
  suggestion: string;
}

export interface AgenticInsightCorrelation {
  testTitle: string;
  endpoints: string[];
  suggestion: string;
}

export interface AgenticInsightRecommendation {
  priority: string;
  type: string;
  affectedTestTitles: string[];
  action: string;
}

export interface AgenticInsightsData {
  summary: string;
  overlapGroups: AgenticInsightOverlapGroup[];
  apiCandidates: AgenticInsightApiCandidate[];
  timingIssueApiCorrelations: AgenticInsightCorrelation[];
  recommendations: AgenticInsightRecommendation[];
}
