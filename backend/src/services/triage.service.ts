import { ANALYTICS_RANGE_KEYS, invalidate } from "../lib/cache";
import type { PrismaClient } from "../generated/prisma/client";
import type { Prisma } from "../generated/prisma/client";
import { logger } from "../config/logger";
import type { PriorityEngine } from "../domain/priority-engine";
import { computeDueAt } from "../domain/sla";
import type { EventBus } from "../events/event-bus";
import type { MlClient } from "../integrations/ml-client";
import { TicketRepository } from "../repositories/ticket.repository";
import { toPgVector } from "../utils/vector";
import type { RoutingService } from "./routing.service";
import type { SettingsService } from "./settings.service";

const DAY_MS = 86_400_000;

/**
 * The ML-to-business-logic bridge:
 *   ML analysis → related tickets → hybrid priority → confidence gate → routing → SLA.
 * Every decision is written to `aiAnalysis` so the UI can explain it.
 */
export class TriageService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ml: MlClient,
    private readonly priorityEngine: PriorityEngine,
    private readonly routing: RoutingService,
    private readonly settings: SettingsService,
    private readonly events: EventBus,
  ) {}

  async triage(ticketId: string): Promise<void> {
    const tickets = new TicketRepository(this.prisma);
    const ticket = await tickets.findRaw(ticketId);
    if (!ticket) return;
    const config = await this.settings.get();

    const ml = await this.ml.analyze(ticket.title, ticket.description);
    const vector = toPgVector(ml.embedding);

    const similar = await tickets.findSimilarByVector(vector, {
      limit: 5,
      minSimilarity: config.similarTicketThreshold,
      excludeId: ticket.id,
    });
    const recentSimilar = await tickets.findSimilarByVector(vector, {
      limit: 50,
      minSimilarity: config.similarTicketThreshold,
      excludeId: ticket.id,
      since: new Date(Date.now() - DAY_MS),
      onlyOpen: true,
    });

    const priority = this.priorityEngine.evaluate({
      text: `${ticket.title}\n${ticket.description}`,
      mlPriority: ml.priority.label,
      mlPriorityConfidence: ml.priority.confidence,
      sentiment: ml.sentiment.label,
      sentimentCompound: ml.sentiment.compound,
      recentSimilarCount: recentSimilar.length,
    });

    const needsReview = ml.category.confidence < config.confidenceThreshold;
    const route = await this.routing.route(ml.category.label, { assignAgent: !needsReview && !ticket.assignedAgentId });
    const previousAnalysis = (ticket.aiAnalysis ?? {}) as Prisma.JsonObject;

    const analysis = {
      ...previousAnalysis,
      ml: { category: ml.category, priority: ml.priority, sentiment: ml.sentiment, modelVersion: ml.modelVersion },
      priority,
      review: { required: needsReview, threshold: config.confidenceThreshold },
      routing: { team: route.team, agent: route.agent, reason: route.reason },
      similar: similar.map((s) => ({ id: s.id, number: s.number, title: s.title, similarity: Number(s.similarity.toFixed(3)) })),
      recentSimilarCount: recentSimilar.length,
      analyzedAt: new Date().toISOString(),
    };

    await this.prisma.$transaction(async (tx) => {
      const repo = new TicketRepository(tx);
      await repo.update(ticket.id, {
        category: ml.category.label,
        priority: priority.final,
        sentiment: ml.sentiment.label,
        sentimentScore: ml.sentiment.score,
        mlConfidence: ml.category.confidence,
        aiAnalysis: JSON.parse(JSON.stringify(analysis)) as Prisma.InputJsonValue,
        triageStatus: "COMPLETED",
        reviewStatus: needsReview ? "PENDING" : "NOT_REQUIRED",
        assignedTeamId: route.team?.id ?? null,
        ...(route.agent && { assignedAgentId: route.agent.id }),
        dueAt: computeDueAt(priority.final, ticket.createdAt),
      });
      await repo.setEmbedding(ticket.id, vector);
      await repo.addActivity(ticket.id, null, "TRIAGED", {
        category: ml.category.label,
        confidence: ml.category.confidence,
        priority: priority.final,
        needsReview,
      });
      if (route.agent) {
        await repo.addActivity(ticket.id, null, "ASSIGNED", { agentId: route.agent.id, agentName: route.agent.name, teamName: route.team?.name, automatic: true });
      }
    });

    await invalidate(...ANALYTICS_RANGE_KEYS);
    logger.info({ ticketId, category: ml.category.label, priority: priority.final, needsReview }, "Ticket triaged");
    this.events.emit("ticket.triaged", { ticketId });
  }

  /** Graceful degradation after all retries fail: send to General team for a human. */
  async markFailed(ticketId: string, reason: string): Promise<void> {
    const route = await this.routing.route("GENERAL", { assignAgent: false });
    await this.prisma.$transaction(async (tx) => {
      const repo = new TicketRepository(tx);
      await repo.update(ticketId, { triageStatus: "FAILED", reviewStatus: "PENDING", assignedTeamId: route.team?.id ?? null });
      await repo.addActivity(ticketId, null, "TRIAGED", { failed: true, reason });
    });
  }
}
