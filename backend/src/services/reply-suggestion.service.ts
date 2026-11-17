import { logger } from "../config/logger";
import { buildReplyPrompt, groundedTitles, heuristicReply, REPLY_SYSTEM_PROMPT, type ReplySuggestion } from "../domain/reply-draft";
import type { LlmProvider } from "../integrations/llm/llm-provider";
import type { AuthUser } from "../types/auth";
import type { RagService } from "./rag.service";
import type { TicketService } from "./ticket.service";

/**
 * Drafts a first agent reply from the ticket + retrieved knowledge-base sections.
 * Never sends anything: the agent edits and sends from the normal composer.
 */
export class ReplySuggestionService {
  constructor(
    private readonly rag: RagService,
    private readonly tickets: TicketService,
    private readonly llm: LlmProvider | null,
  ) {}

  async suggest(user: AuthUser, ticketId: string): Promise<ReplySuggestion> {
    const ticket = await this.tickets.get(user, ticketId);
    const input = {
      title: ticket.title,
      description: ticket.description,
      requesterName: ticket.createdBy.name,
      category: ticket.category ?? null,
    };
    // Retrieval failures must not break the agent's workflow: fall back to a draft without KB claims.
    const chunks = await this.rag.retrieve(`${ticket.title}\n${ticket.description}`).catch((err) => {
      logger.warn({ err, ticketId }, "Suggested reply retrieval failed");
      return [];
    });

    if (this.llm) {
      try {
        const text = await this.llm.complete({
          system: REPLY_SYSTEM_PROMPT,
          messages: [{ role: "user", content: buildReplyPrompt(input, chunks) }],
          maxTokens: 500,
          temperature: 0.3,
        });
        if (text && text.trim().length >= 20) {
          return { text: text.trim(), generator: this.llm.name, groundedIn: groundedTitles(chunks) };
        }
      } catch (err) {
        logger.error({ err }, "Suggested reply LLM failed; using fallback");
      }
    }
    return { text: heuristicReply(input, chunks), generator: "template", groundedIn: groundedTitles(chunks) };
  }
}
