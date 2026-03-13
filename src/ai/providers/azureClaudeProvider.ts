import type { AIAnalysisInput, AIAnalysisResult, AIProvider, AIProviderConfig } from "../../types/index.js";
import { buildFailurePrompt } from "../prompt.js";

function parseJson<T>(raw: string): T {
  const fenced = raw.match(/```json([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? raw;
  return JSON.parse(candidate.trim()) as T;
}

/**
 * Azure Claude provider for Claude models deployed via Azure AI Services
 * (Cognitive Services endpoint).
 *
 * Uses the native Anthropic Messages API format that Azure exposes at:
 *   {baseURL}/anthropic/v1/messages
 *
 * Authentication uses the `x-api-key` header with your Azure API key.
 *
 * Required config:
 *   - `baseURL`: Your Azure Cognitive Services endpoint, e.g.
 *       "https://<resource>.cognitiveservices.azure.com"
 *   - `model`: Your Claude deployment name (e.g. "claude-haiku45-gdf-np-un-001")
 *   - `apiKey` or env var `AZURE_CLAUDE_API_KEY` / `AZURE_API_KEY`
 */
export class AzureClaudeProvider implements AIProvider {
  name = "azure-claude";

  async analyzeFailure(input: AIAnalysisInput, config: AIProviderConfig): Promise<AIAnalysisResult> {
    const apiKey = config.apiKey ?? process.env.AZURE_CLAUDE_API_KEY ?? process.env.AZURE_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Azure Claude API key missing. Set ai.apiKey, AZURE_CLAUDE_API_KEY, or AZURE_API_KEY."
      );
    }

    if (!config.baseURL) {
      throw new Error(
        "Azure Claude provider requires ai.baseURL. " +
        "Set it to your Azure Cognitive Services endpoint, e.g. " +
        "\"https://<resource>.cognitiveservices.azure.com\"."
      );
    }

    const baseURL = config.baseURL.replace(/\/$/, "");
    const url = `${baseURL}/anthropic/v1/messages`;

    const prompt = buildFailurePrompt(input, config.customPrompt);

    const response = await fetch(url, {
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
        system: "You produce concise, valid JSON only.",
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure Claude request failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    const content = data.content?.find((item) => item.type === "text")?.text;
    if (!content) {
      throw new Error("Azure Claude response did not include text content.");
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
