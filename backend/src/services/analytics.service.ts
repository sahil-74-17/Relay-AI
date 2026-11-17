import type { PrismaClient } from "../generated/prisma/client";
import { OPEN_STATUSES } from "../config/constants";
import { CacheKeys, cached } from "../lib/cache";
import type { AuthUser } from "../types/auth";
import { TicketPolicy } from "../domain/ticket-policy";
import { slaState } from "../domain/sla";
import { ticketListSelect } from "../repositories/ticket.repository";

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

export const ANALYTICS_DAYS = [7, 30, 90] as const;

/**
 * Admin analytics over a real date range. Every number is computed from the
 * database (tickets, human reviews and AI answer feedback); nothing is demo data.
 */
export class AnalyticsService {
  constructor(private readonly prisma: PrismaClient) {}

  overview(days = 30) {
    return cached(`${CacheKeys.analyticsOverview}:${days}`, 60, () => this.computeOverview(days));
  }

  private async computeOverview(days: number) {
    const db = this.prisma;
    const now = new Date();
    const from = new Date(now);
    from.setUTCHours(0, 0, 0, 0);
    from.setUTCDate(from.getUTCDate() - (days - 1));

    const range = { createdAt: { gte: from, lte: now } };
    const open = { status: { in: OPEN_STATUSES } };

    const [total, openCount, resolved, highPriority, triaged, autoRouted, feedbackTotal, feedbackAccepted, reviewQueue, activeIncidents, helpful, notHelpful, reasons] =
      await Promise.all([
        db.ticket.count({ where: range }),
        db.ticket.count({ where: { ...range, ...open } }),
        db.ticket.count({ where: { ...range, status: { in: ["RESOLVED", "CLOSED"] } } }),
        db.ticket.count({ where: { ...range, ...open, priority: { in: ["HIGH", "CRITICAL"] } } }),
        db.ticket.count({ where: { ...range, triageStatus: "COMPLETED" } }),
        db.ticket.count({ where: { ...range, triageStatus: "COMPLETED", aiAnalysis: { path: ["review", "required"], equals: false } } }),
        db.ticketFeedback.count({ where: { createdAt: { gte: from, lte: now } } }),
        db.ticketFeedback.count({ where: { createdAt: { gte: from, lte: now }, accepted: true } }),
        // Current queues are "now" states, not range-bound.
        db.ticket.count({ where: { reviewStatus: "PENDING" } }),
        db.incident.count({ where: { status: { in: ["OPEN", "INVESTIGATING"] } } }),
        db.message.count({ where: { feedbackVote: "HELPFUL", feedbackAt: { gte: from, lte: now } } }),
        db.message.count({ where: { feedbackVote: "NOT_HELPFUL", feedbackAt: { gte: from, lte: now } } }),
        db.message.groupBy({ by: ["feedbackReason"], _count: { _all: true }, where: { feedbackReason: { not: null }, feedbackAt: { gte: from, lte: now } } }),
      ]);

    const [avg] = await db.$queryRaw<{ hours: number | null }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600)::float AS "hours"
      FROM "Ticket"
      WHERE "resolvedAt" >= ${from} AND "resolvedAt" <= ${now}`;

    const [breached] = await db.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS "count" FROM "Ticket"
      WHERE "createdAt" >= ${from} AND "createdAt" <= ${now} AND "dueAt" IS NOT NULL
        AND (("resolvedAt" IS NULL AND "dueAt" < ${now}) OR ("resolvedAt" > "dueAt"))`;

    const overTime = await db.$queryRaw<{ day: Date; created: number; resolved: number }[]>`
      SELECT d::date AS "day",
        (SELECT COUNT(*)::int FROM "Ticket" t WHERE t."createdAt"::date = d::date) AS "created",
        (SELECT COUNT(*)::int FROM "Ticket" t WHERE t."resolvedAt"::date = d::date) AS "resolved"
      FROM generate_series(${from}::date, ${now}::date, INTERVAL '1 day') d
      ORDER BY d`;

    const aiConfidence = await db.$queryRaw<{ bucket: string; count: number }[]>`
      SELECT CASE
          WHEN "mlConfidence" < 0.5 THEN '<50%'
          WHEN "mlConfidence" < 0.7 THEN '50–69%'
          WHEN "mlConfidence" < 0.85 THEN '70–84%'
          ELSE '85–100%'
        END AS "bucket",
        COUNT(*)::int AS "count"
      FROM "Ticket"
      WHERE "createdAt" >= ${from} AND "createdAt" <= ${now}
        AND "triageStatus" = 'COMPLETED' AND "mlConfidence" IS NOT NULL
      GROUP BY 1`;

    const [byCategory, byPriority, bySentiment, teams] = await Promise.all([
      db.ticket.groupBy({ by: ["category"], _count: { _all: true }, where: { ...range, category: { not: null } } }),
      db.ticket.groupBy({ by: ["priority"], _count: { _all: true }, where: range }),
      db.ticket.groupBy({ by: ["sentiment"], _count: { _all: true }, where: { ...range, sentiment: { not: null } } }),
      db.team.findMany({ select: { id: true, name: true, _count: { select: { tickets: { where: open } } } }, orderBy: { name: "asc" } }),
    ]);

    const answerFeedbackTotal = helpful + notHelpful;
    return {
      range: { days, from: from.toISOString(), to: now.toISOString() },
      kpis: {
        total,
        open: openCount,
        resolved,
        highPriority,
        avgResolutionHours: avg?.hours ? Math.round(avg.hours * 10) / 10 : null,
        resolutionRate: pct(resolved, total),
        automationRate: pct(autoRouted, triaged),
        modelAgreement: pct(feedbackAccepted, feedbackTotal),
        feedbackCount: feedbackTotal,
        reviewQueue,
        activeIncidents,
        slaBreached: breached?.count ?? 0,
        slaBreachRate: pct(breached?.count ?? 0, total),
        helpfulRate: pct(helpful, answerFeedbackTotal),
        answerFeedbackCount: answerFeedbackTotal,
      },
      aiFeedback: {
        helpful,
        notHelpful,
        total: answerFeedbackTotal,
        reasons: reasons.map((r) => ({ key: r.feedbackReason, count: r._count._all })),
      },
      aiConfidence: ["<50%", "50–69%", "70–84%", "85–100%"].map((bucket) => ({
        bucket,
        count: aiConfidence.find((b) => b.bucket === bucket)?.count ?? 0,
      })),
      ticketsOverTime: overTime.map((r) => ({ day: r.day.toISOString().slice(0, 10), created: r.created, resolved: r.resolved })),
      byCategory: byCategory.map((r) => ({ key: r.category, count: r._count._all })),
      byPriority: byPriority.map((r) => ({ key: r.priority, count: r._count._all })),
      bySentiment: bySentiment.map((r) => ({ key: r.sentiment, count: r._count._all })),
      teamWorkload: teams.map((t) => ({ id: t.id, name: t.name, open: t._count.tickets })),
      generatedAt: new Date().toISOString(),
    };
  }

  /** Role-aware summary for the home dashboard. */
  async dashboard(user: AuthUser) {
    const db = this.prisma;
    const open = { status: { in: OPEN_STATUSES } };
    if (!TicketPolicy.isStaff(user)) {
      const mine = { createdById: user.id };
      const [openCount, resolved, highPriority, waitingForYou, recent] = await Promise.all([
        db.ticket.count({ where: { ...mine, ...open } }),
        db.ticket.count({ where: { ...mine, status: { in: ["RESOLVED", "CLOSED"] } } }),
        db.ticket.count({ where: { ...mine, ...open, priority: { in: ["HIGH", "CRITICAL"] } } }),
        db.ticket.count({ where: { ...mine, status: "WAITING_FOR_USER" } }),
        db.ticket.findMany({ where: mine, orderBy: { updatedAt: "desc" }, take: 5, select: ticketListSelect }),
      ]);
      return { role: user.role, counts: { open: openCount, resolved, highPriority, waitingForYou }, recent };
    }

    const now = new Date();
    const soon = new Date(now.getTime() + 2 * 3_600_000);
    const [assigned, unassigned, highPriority, reviewQueue, breached, dueSoon, activeIncidents, queue] = await Promise.all([
      db.ticket.count({ where: { ...open, assignedAgentId: user.id } }),
      db.ticket.count({ where: { ...open, assignedAgentId: null } }),
      db.ticket.count({ where: { ...open, priority: { in: ["HIGH", "CRITICAL"] } } }),
      db.ticket.count({ where: { reviewStatus: "PENDING" } }),
      db.ticket.count({ where: { ...open, dueAt: { lt: now } } }),
      db.ticket.count({ where: { ...open, dueAt: { gte: now, lt: soon } } }),
      db.incident.count({ where: { status: { in: ["OPEN", "INVESTIGATING"] } } }),
      db.ticket.findMany({
        where: { ...open, assignedAgentId: user.id },
        orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }],
        take: 6,
        select: ticketListSelect,
      }),
    ]);
    return {
      role: user.role,
      counts: { assigned, unassigned, highPriority, reviewQueue, breached, dueSoon, activeIncidents },
      queue: queue.map((t) => ({ ...t, sla: slaState(t.dueAt, t.resolvedAt) })),
    };
  }
}
