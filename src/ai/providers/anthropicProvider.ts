import type { AIAnalysisInput, AIAnalysisResult, AIProvider, AIProviderConfig } from "../../types/index.js";
import { buildFailurePrompt } from "../prompt.js";

function parseJson<T>(raw: string): T {
  const fenced = raw.match(/```json([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? raw;
  return JSON.parse(candidate.trim()) as T;
}

export class AnthropicProvider implements AIProvider {
  name = "anthropic";

  async analyzeFailure(input: AIAnalysisInput, config: AIProviderConfig): Promise<AIAnalysisResult> {
    const apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("Anthropic API key missing. Set ai.apiKey or ANTHROPIC_API_KEY.");
    }

    const prompt = buildFailurePrompt(input, config.customPrompt);
    const baseURL = config.baseURL ?? "https://api.anthropic.com";

    const response = await fetch(`${baseURL}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens ?? 800,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic request failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const content = data.content?.find((item) => item.type === "text")?.text;
    if (!content) {
      throw new Error("Anthropic response did not include text content.");
    }

    const parsed = parseJson<Omit<AIAnalysisResult, "testName" | "file" | "rawModelResponse">>(content);
    return {
      testName: input.testName,
      file: input.file,
      ...parsed,
      rawModelResponse: data
    };
  }
}
