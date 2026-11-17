import type { Env } from "../../config/env";
import { AnthropicProvider } from "./anthropic.provider";
import type { LlmProvider } from "./llm-provider";
import { OpenAICompatibleProvider } from "./openai-compatible.provider";

const DEFAULT_MODELS = { anthropic: "claude-haiku-4-5-20251001", openai: "gpt-4o-mini" } as const;

/** Picks the LLM adapter from configuration. Returns null when no LLM is configured. */
export function createLlmProvider(config: Pick<Env, "LLM_PROVIDER" | "LLM_API_KEY" | "LLM_MODEL" | "LLM_BASE_URL" | "LLM_TIMEOUT_MS">): LlmProvider | null {
  if (config.LLM_PROVIDER === "none") return null;
  const isLocal = config.LLM_BASE_URL?.includes("localhost") ?? false;
  if (!config.LLM_API_KEY && !isLocal) {
    throw new Error(`LLM_PROVIDER=${config.LLM_PROVIDER} requires LLM_API_KEY`);
  }
  const model = config.LLM_MODEL ?? DEFAULT_MODELS[config.LLM_PROVIDER];
  return config.LLM_PROVIDER === "anthropic"
    ? new AnthropicProvider(config.LLM_API_KEY!, model, config.LLM_TIMEOUT_MS, config.LLM_BASE_URL)
    : new OpenAICompatibleProvider(config.LLM_API_KEY ?? "local", model, config.LLM_TIMEOUT_MS, config.LLM_BASE_URL);
}
