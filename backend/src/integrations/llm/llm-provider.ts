export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
  maxTokens?: number;
  temperature?: number;
}

/** Provider-agnostic chat completion interface (Adapter target). */
export interface LlmProvider {
  readonly name: string;
  complete(request: LlmRequest): Promise<string>;
}

export class LlmError extends Error {}
