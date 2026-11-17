import type { Prisma } from "../generated/prisma/client";
import type { MessageRole } from "../generated/prisma/enums";
import type { Db } from "../lib/prisma";

export class ConversationRepository {
  constructor(private readonly db: Db) {}

  create(userId: string, title?: string) {
    return this.db.conversation.create({ data: { userId, ...(title && { title }) } });
  }

  listForUser(userId: string) {
    return this.db.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        ticket: { select: { id: true, number: true } },
        _count: { select: { messages: true } },
      },
    });
  }

  findWithMessages(id: string) {
    return this.db.conversation.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        ticket: { select: { id: true, number: true, status: true } },
      },
    });
  }

  addMessage(conversationId: string, role: MessageRole, content: string, extra: { sources?: Prisma.InputJsonValue; answerable?: boolean | null } = {}) {
    return this.db.message.create({ data: { conversationId, role, content, ...extra } });
  }

  /** Reader feedback on a grounded answer; one vote per message, changed in place. */
  setMessageFeedback(id: string, vote: "HELPFUL" | "NOT_HELPFUL", reason: "INCORRECT" | "NOT_RELEVANT" | "MISSING_INFORMATION" | "OTHER" | null, userId: string) {
    return this.db.message.update({
      where: { id },
      data: { feedbackVote: vote, feedbackReason: reason, feedbackAt: new Date(), feedbackById: userId },
    });
  }

  touch(id: string, title?: string) {
    return this.db.conversation.update({ where: { id }, data: { updatedAt: new Date(), ...(title && { title }) } });
  }

  clearMessages(conversationId: string) {
    return this.db.message.deleteMany({ where: { conversationId } });
  }

  delete(id: string) {
    return this.db.conversation.delete({ where: { id } });
  }
}
