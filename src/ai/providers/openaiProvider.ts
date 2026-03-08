import type { AIAnalysisInput, AIAnalysisResult, AIProvider, AIProviderConfig } from "../../types/index.js";
import { buildFailurePrompt } from "../prompt.js";

function parseJson<T>(raw: string): T {
  const fenced = raw.match(/```json([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? raw;
  return JSON.parse(candidate.trim()) as T;
}

export class OpenAIProvider implements AIProvider {
  name = "openai";

  async analyzeFailure(input: AIAnalysisInput, config: AIProviderConfig): Promise<AIAnalysisResult> {
    const apiKey = config.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key missing. Set ai.apiKey or OPENAI_API_KEY.");
    }

    const prompt = buildFailurePrompt(input, config.customPrompt);
    const baseURL = config.baseURL ?? "https://api.openai.com/v1";

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens ?? 800,
        temperature: 0.2,
        messages: [
          { role: "system", content: "You produce concise, valid JSON only." },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI response did not include message content.");
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
