import { LlmError, type LlmProvider, type LlmRequest } from "./llm-provider";

export class AnthropicProvider implements LlmProvider {
  readonly name: string;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly timeoutMs: number,
    private readonly baseUrl = "https://api.anthropic.com/v1",
  ) {
    this.name = `anthropic:${model}`;
  }

  async complete({ system, messages, maxTokens = 700, temperature = 0.2 }: LlmRequest): Promise<string> {
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: this.model, system, messages, max_tokens: maxTokens, temperature }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) throw new LlmError(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    return data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
  }
}
