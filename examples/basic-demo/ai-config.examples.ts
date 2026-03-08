export const openAIConfig = {
  enabled: true,
  provider: "openai",
  model: "gpt-4.1",
  apiKey: process.env.OPENAI_API_KEY,
  maxFailuresToAnalyze: 10,
  maxTokens: 900
} as const;

export const anthropicConfig = {
  enabled: true,
  provider: "anthropic",
  model: "claude-3-7-sonnet-latest",
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxFailuresToAnalyze: 10,
  maxTokens: 900
} as const;
