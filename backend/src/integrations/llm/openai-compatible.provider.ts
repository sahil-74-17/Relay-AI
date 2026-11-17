import { LlmError, type LlmProvider, type LlmRequest } from "./llm-provider";

/**
 * Works with any OpenAI-compatible Chat Completions API: OpenAI, Groq,
 * Google Gemini (OpenAI endpoint), OpenRouter, Ollama, LM Studio...
 */
export class OpenAICompatibleProvider implements LlmProvider {
  readonly name: string;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly timeoutMs: number,
    private readonly baseUrl = "https://api.openai.com/v1",
  ) {
    this.name = `openai-compatible:${model}`;
  }

  async complete({ system, messages, maxTokens = 700, temperature = 0.2 }: LlmRequest): Promise<string> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "system", content: system }, ...messages],
        max_tokens: maxTokens,
        temperature,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) throw new LlmError(`LLM API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as { choices: { message: { content: string | null } }[] };
    return (data.choices[0]?.message.content ?? "").trim();
  }
}
