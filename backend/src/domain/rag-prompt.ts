export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  index: number;
  content: string;
  similarity: number;
  /** Which retriever found it: embeddings, full-text, or both. */
  matchedBy?: "semantic" | "keyword" | "hybrid";
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export const NO_ANSWER_TOKEN = "NO_ANSWER";

export const RAG_SYSTEM_PROMPT = `You are the support assistant for a software company.
Answer ONLY using the numbered knowledge-base excerpts provided in the user message.
Rules:
- Cite every fact with the excerpt number in square brackets, like [1] or [2].
- Be concise and practical: short paragraphs or numbered steps.
- If the excerpts do not contain the answer, reply with exactly ${NO_ANSWER_TOKEN} and nothing else.
- Never invent policies, prices, links or steps that are not in the excerpts.`;

/** Builds the grounded prompt: numbered context + recent history + the question. */
export function buildRagUserPrompt(question: string, chunks: RetrievedChunk[], history: ChatTurn[], maxContextChars = 6000): string {
  let budget = maxContextChars;
  const context: string[] = [];
  chunks.forEach((c, i) => {
    if (budget <= 0) return;
    const body = c.content.slice(0, budget);
    budget -= body.length;
    context.push(`[${i + 1}] (${c.documentTitle})\n${body}`);
  });
  const recent = history
    .slice(-6)
    .map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.content}`)
    .join("\n");
  return [
    `Knowledge-base excerpts:\n${context.join("\n\n")}`,
    recent ? `Conversation so far:\n${recent}` : "",
    `Question: ${question}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export const isNoAnswer = (text: string) => text.trim().toUpperCase().startsWith(NO_ANSWER_TOKEN);

export const SUMMARY_SYSTEM_PROMPT = `You turn a support chat into a support ticket.
Return ONLY a JSON object with keys "title" (max 100 chars, specific) and "description"
(2-6 sentences: the user's problem, what they already tried, and relevant details). No markdown.`;
