import { ANALYTICS_RANGE_KEYS, invalidate } from "../lib/cache";
import type { Prisma, PrismaClient } from "../generated/prisma/client";
import type { Category, Priority } from "../generated/prisma/enums";
import { computeDueAt } from "../domain/sla";
import { FeedbackRepository } from "../repositories/feedback.repository";
import { TicketRepository, ticketListSelect } from "../repositories/ticket.repository";
import type { AuthUser } from "../types/auth";
import { NotFoundError, ConflictError } from "../utils/errors";
import { type PageParams, paginate, toSkipTake } from "../utils/pagination";
import type { ReviewDto } from "../validators/ticket.validators";
import type { RoutingService } from "./routing.service";

/**
 * Human-in-the-loop: agents accept or correct ML predictions. Every decision
 * is stored as TicketFeedback, the labelled data for future retraining.
 */
export class ReviewService {
  constructor(private readonly prisma: PrismaClient, private readonly routing: RoutingService) {}

  async queue(page: PageParams) {
    const where: Prisma.TicketWhereInput = { reviewStatus: "PENDING", status: { notIn: ["CLOSED"] } };
    const [items, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        orderBy: { createdAt: "asc" },
        select: { ...ticketListSelect, description: true, aiAnalysis: true },
        ...toSkipTake(page),
      }),
      this.prisma.ticket.count({ where }),
    ]);
    return paginate(items, total, page);
  }

  async review(user: AuthUser, ticketId: string, dto: ReviewDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const tickets = new TicketRepository(tx);
      const ticket = await tickets.findRaw(ticketId);
      if (!ticket) throw new NotFoundError("Ticket");
      // A decision is final: re-reviewing would duplicate feedback and silently re-route.
      if (ticket.reviewStatus === "ACCEPTED" || ticket.reviewStatus === "CORRECTED") {
        throw new ConflictError("This ticket has already been reviewed");
      }

      const analysis = (ticket.aiAnalysis ?? {}) as { ml?: { category?: { label: Category } } };
      const predictedCategory = analysis.ml?.category?.label ?? ticket.category;
      const predictedPriority = ticket.priority;
      const accepted = dto.action === "ACCEPT";
      const finalCategory: Category | null = accepted ? ticket.category : (dto.category ?? ticket.category);
      const finalPriority: Priority = accepted ? ticket.priority : (dto.priority ?? ticket.priority);

      await new FeedbackRepository(tx).create({
        ticketId,
        reviewerId: user.id,
        predictedCategory,
        correctedCategory: finalCategory,
        predictedPriority,
        correctedPriority: finalPriority,
        confidence: ticket.mlConfidence,
        accepted,
        note: dto.note,
      });

      const data: Prisma.TicketUncheckedUpdateInput = {
        category: finalCategory,
        priority: finalPriority,
        reviewStatus: accepted ? "ACCEPTED" : "CORRECTED",
      };
      if (finalPriority !== ticket.priority) data.dueAt = computeDueAt(finalPriority, ticket.createdAt);

      // Route now if the category changed or the ticket was held without an agent.
      const categoryChanged = finalCategory && finalCategory !== ticket.category;
      if (finalCategory && (categoryChanged || !ticket.assignedAgentId)) {
        const route = await this.routing.route(finalCategory, { assignAgent: true });
        data.assignedTeamId = route.team?.id ?? null;
        if (route.agent) {
          data.assignedAgentId = route.agent.id;
          await tickets.addActivity(ticketId, user.id, "ASSIGNED", { agentId: route.agent.id, agentName: route.agent.name, teamName: route.team?.name, afterReview: true });
        }
      }

      await tickets.addActivity(ticketId, user.id, "REVIEWED", {
        action: dto.action,
        category: { from: ticket.category, to: finalCategory },
        priority: { from: ticket.priority, to: finalPriority },
      });
      return tickets.update(ticketId, data);
    });
    await invalidate(...ANALYTICS_RANGE_KEYS);
    return result;
  }

  recentFeedback() {
    return new FeedbackRepository(this.prisma).recent();
  }
}
