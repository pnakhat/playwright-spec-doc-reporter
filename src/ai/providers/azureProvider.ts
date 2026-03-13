import type { AIAnalysisInput, AIAnalysisResult, AIProvider, AIProviderConfig } from "../../types/index.js";
import { buildFailurePrompt } from "../prompt.js";

function parseJson<T>(raw: string): T {
  const fenced = raw.match(/```json([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? raw;
  return JSON.parse(candidate.trim()) as T;
}

/**
 * Azure AI provider for Claude models deployed via Azure AI Foundry or
 * Azure AI Services (serverless API).
 *
 * Uses the OpenAI-compatible chat completions endpoint that Azure exposes.
 * Authentication uses the `api-key` header (Azure subscription key).
 *
 * Required config:
 *   - `baseURL`: Your Azure AI endpoint, e.g.
 *       "https://<resource>.services.ai.azure.com"
 *       "https://<resource>.openai.azure.com/openai/deployments/<deployment>"
 *   - `model`: Deployment name (e.g. "claude-3-7-sonnet" or your deployment ID)
 *   - `apiKey` or env var `AZURE_API_KEY`
 *
 * Optional:
 *   - `apiVersion`: Azure REST API version (default: "2024-05-01-preview")
 */
export class AzureProvider implements AIProvider {
  name = "azure";

  async analyzeFailure(input: AIAnalysisInput, config: AIProviderConfig): Promise<AIAnalysisResult> {
    const apiKey = config.apiKey ?? process.env.AZURE_API_KEY;
    if (!apiKey) {
      throw new Error("Azure API key missing. Set ai.apiKey or AZURE_API_KEY.");
    }

    if (!config.baseURL) {
      throw new Error(
        "Azure provider requires ai.baseURL. " +
        "Set it to your Azure AI endpoint, e.g. " +
        "\"https://<resource>.services.ai.azure.com\"."
      );
    }

    const apiVersion = config.apiVersion ?? "2024-05-01-preview";
    const baseURL = config.baseURL.replace(/\/$/, "");
    const url = `${baseURL}/chat/completions?api-version=${apiVersion}`;

    const prompt = buildFailurePrompt(input, config.customPrompt);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey
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
      throw new Error(`Azure AI request failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Azure AI response did not include text content.");
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
