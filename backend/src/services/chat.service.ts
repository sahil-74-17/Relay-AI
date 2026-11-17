import { ticketRef } from "../config/constants";
import { ANALYTICS_RANGE_KEYS, invalidate } from "../lib/cache";
import type { Prisma } from "../generated/prisma/client";
import { detectConversationalIntent } from "../domain/conversational-intent";
import type { ChatTurn } from "../domain/rag-prompt";
import type { ConversationRepository } from "../repositories/conversation.repository";
import type { AuthUser } from "../types/auth";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/errors";
import type { TicketSummarizer } from "./answer-generation";
import type { RagService } from "./rag.service";
import type { TicketService } from "./ticket.service";
import type { MessageFeedbackDto } from "../validators/chat.validators";

export class ChatService {
  constructor(
    private readonly conversations: ConversationRepository,
    private readonly rag: RagService,
    private readonly summarizer: TicketSummarizer,
    private readonly tickets: TicketService,
  ) {}

  list(user: AuthUser) {
    return this.conversations.listForUser(user.id);
  }

  create(user: AuthUser, title?: string) {
    return this.conversations.create(user.id, title);
  }

  async get(user: AuthUser, id: string) {
    const conversation = await this.conversations.findWithMessages(id);
    if (!conversation || conversation.userId !== user.id) throw new NotFoundError("Conversation");
    return conversation;
  }

  async send(user: AuthUser, id: string, content: string) {
    const conversation = await this.get(user, id);
    const history: ChatTurn[] = conversation.messages.map((m) => ({
      role: m.role === "USER" ? "user" : "assistant",
      content: m.content,
    }));
    const userMessage = await this.conversations.addMessage(id, "USER", content);
    const answer = await this.rag.answer(content, history);
    const assistantMessage = await this.conversations.addMessage(id, "ASSISTANT", answer.content, {
      sources: answer.sources as unknown as Prisma.InputJsonValue,
      answerable: answer.answerable,
    });
    const isFirst = conversation.messages.length === 0;
    await this.conversations.touch(id, isFirst ? content.slice(0, 60) : undefined);
    return { userMessage, assistantMessage, generator: answer.generator };
  }

  async clear(user: AuthUser, id: string) {
    await this.get(user, id);
    await this.conversations.clearMessages(id);
  }

  /** 👍/👎 on a grounded answer. Small talk and "no answer" messages are not rateable. */
  async rateMessage(user: AuthUser, conversationId: string, messageId: string, dto: MessageFeedbackDto) {
    const conversation = await this.get(user, conversationId);
    const message = conversation.messages.find((m) => m.id === messageId);
    if (!message) throw new NotFoundError("Message");
    if (message.role !== "ASSISTANT" || message.answerable !== true) {
      throw new BadRequestError("Only answers from the knowledge base can be rated");
    }
    const updated = await this.conversations.setMessageFeedback(
      messageId,
      dto.vote,
      dto.vote === "NOT_HELPFUL" ? (dto.reason ?? "OTHER") : null,
      user.id,
    );
    await invalidate(...ANALYTICS_RANGE_KEYS);
    return updated;
  }

  async remove(user: AuthUser, id: string) {
    await this.get(user, id);
    await this.conversations.delete(id);
  }

  /** Chatbot → ticket: summarise the conversation and send it through the normal ML pipeline. */
  async escalate(user: AuthUser, id: string) {
    const conversation = await this.get(user, id);
    if (conversation.ticket) {
      throw new ConflictError(`This conversation is already ${ticketRef(conversation.ticket.number)}`, { ticketId: conversation.ticket.id });
    }
    // Small talk is not part of the support request: drop casual user messages and their
    // small-talk replies (answerable === null) so they never become ticket content.
    const turns: ChatTurn[] = conversation.messages
      .filter((m) => (m.role === "USER" ? !detectConversationalIntent(m.content) : m.answerable !== null))
      .map((m) => ({ role: m.role === "USER" ? "user" : "assistant", content: m.content }));
    if (!turns.some((t) => t.role === "user")) {
      throw new BadRequestError("Ask a support question first, then I can turn it into a ticket");
    }

    const draft = await this.summarizer.summarize(turns);
    const title = draft.title.length >= 5 ? draft.title : `Support request: ${draft.title}`;
    const description = draft.description.length >= 10 ? draft.description : `${draft.description}\n\n(created from chat)`;

    const ticket = await this.tickets.create(user, { title, description }, { source: "CHATBOT", conversationId: id });
    await this.conversations.addMessage(id, "ASSISTANT", `I've created ${ticketRef(ticket.number)} from this conversation. The support team will follow up there.`, {
      answerable: true,
    });
    await this.conversations.touch(id);
    return ticket;
  }
}