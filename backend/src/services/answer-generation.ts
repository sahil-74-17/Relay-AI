import { logger } from "../config/logger";
import { extractiveAnswer } from "../domain/extractive-answer";
import {
  type ChatTurn,
  type RetrievedChunk,
  RAG_SYSTEM_PROMPT,
  SUMMARY_SYSTEM_PROMPT,
  buildRagUserPrompt,
  isNoAnswer,
} from "../domain/rag-prompt";
import type { LlmProvider } from "../integrations/llm/llm-provider";

export interface GeneratedAnswer {
  text: string;
  answerable: boolean;
  generator: string;
}

/** Turns retrieved context into an answer (Strategy: LLM or extractive). */
export interface AnswerGenerator {
  readonly name: string;
  answer(question: string, chunks: RetrievedChunk[], history: ChatTurn[]): Promise<GeneratedAnswer>;
}

export class ExtractiveAnswerGenerator implements AnswerGenerator {
  readonly name = "extractive";

  async answer(question: string, chunks: RetrievedChunk[]): Promise<GeneratedAnswer> {
    const text = extractiveAnswer(question, chunks);
    return text
      ? { text: `Here's what the knowledge base says:\n\n${text}`, answerable: true, generator: this.name }
      : { text: "", answerable: false, generator: this.name };
  }
}

export class LlmAnswerGenerator implements AnswerGenerator {
  readonly name: string;

  constructor(private readonly llm: LlmProvider, private readonly fallback: AnswerGenerator) {
    this.name = llm.name;
  }

  async answer(question: string, chunks: RetrievedChunk[], history: ChatTurn[]): Promise<GeneratedAnswer> {
    try {
      const text = await this.llm.complete({
        system: RAG_SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildRagUserPrompt(question, chunks, history) }],
      });
      if (!text || isNoAnswer(text)) return { text: "", answerable: false, generator: this.name };
      return { text, answerable: true, generator: this.name };
    } catch (err) {
      // The knowledge base is still useful without the LLM: degrade, don't fail.
      logger.error({ err }, "LLM answer failed; using extractive fallback");
      return this.fallback.answer(question, chunks, history);
    }
  }
}

export interface TicketDraft {
  title: string;
  description: string;
}

/** Turns a chat transcript into a structured ticket (Strategy: LLM or heuristic). */
export interface TicketSummarizer {
  summarize(turns: ChatTurn[]): Promise<TicketDraft>;
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export class HeuristicTicketSummarizer implements TicketSummarizer {
  async summarize(turns: ChatTurn[]): Promise<TicketDraft> {
    const questions = turns.filter((t) => t.role === "user").map((t) => t.content.trim());
    const title = clip(questions.at(-1) ?? "Support request from chat", 100);
    const description = [
      "Raised from the AI assistant after it couldn't find an answer in the knowledge base.",
      "",
      "What the user asked:",
      ...questions.map((q) => `- ${q}`),
    ].join("\n");
    return { title, description };
  }
}

export class LlmTicketSummarizer implements TicketSummarizer {
  constructor(private readonly llm: LlmProvider, private readonly fallback: TicketSummarizer) {}

  async summarize(turns: ChatTurn[]): Promise<TicketDraft> {
    try {
      const transcript = turns.map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.content}`).join("\n");
      const raw = await this.llm.complete({
        system: SUMMARY_SYSTEM_PROMPT,
        messages: [{ role: "user", content: clip(transcript, 6000) }],
        maxTokens: 400,
      });
      const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as Partial<TicketDraft>;
      if (typeof json.title !== "string" || typeof json.description !== "string") throw new Error("Bad summary shape");
      return { title: clip(json.title.trim(), 100), description: json.description.trim() };
    } catch (err) {
      logger.warn({ err }, "LLM ticket summary failed; using heuristic summary");
      return this.fallback.summarize(turns);
    }
  }
}
