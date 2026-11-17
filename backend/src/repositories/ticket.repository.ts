import { OPEN_STATUSES } from "../config/constants";
import type { Prisma } from "../generated/prisma/client";
import type { ActivityType, Category, Priority, TicketStatus } from "../generated/prisma/enums";
import type { Db } from "../lib/prisma";
import { type PageParams, toSkipTake } from "../utils/pagination";

export const ticketListSelect = {
  id: true,
  number: true,
  title: true,
  status: true,
  priority: true,
  category: true,
  sentiment: true,
  mlConfidence: true,
  triageStatus: true,
  reviewStatus: true,
  source: true,
  dueAt: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
  incidentId: true,
  createdBy: { select: { id: true, name: true } },
  assignedTeam: { select: { id: true, name: true } },
  assignedAgent: { select: { id: true, name: true } },
  _count: { select: { comments: true } },
} satisfies Prisma.TicketSelect;

export interface SimilarTicketRow {
  id: string;
  number: number;
  title: string;
  status: TicketStatus;
  category: Category | null;
  priority: Priority;
  createdAt: Date;
  similarity: number;
}

export interface SimilarityOptions {
  limit: number;
  minSimilarity: number;
  excludeId?: string;
  since?: Date;
  onlyOpen?: boolean;
}

export class TicketRepository {
  constructor(private readonly db: Db) {}

  create(data: Prisma.TicketUncheckedCreateInput) {
    return this.db.ticket.create({ data, select: ticketListSelect });
  }

  findRaw(id: string) {
    return this.db.ticket.findUnique({ where: { id } });
  }

  findDetail(id: string) {
    return this.db.ticket.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTeam: { select: { id: true, name: true, category: true } },
        assignedAgent: { select: { id: true, name: true } },
        incident: { select: { id: true, number: true, title: true, status: true, severity: true } },
        conversation: { select: { id: true, title: true } },
        comments: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" } },
        activities: { include: { actor: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
        feedback: { include: { reviewer: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
      },
    });
  }

  async list(where: Prisma.TicketWhereInput, orderBy: Prisma.TicketOrderByWithRelationInput[], page: PageParams) {
    const [items, total] = await Promise.all([
      this.db.ticket.findMany({ where, orderBy, select: ticketListSelect, ...toSkipTake(page) }),
      this.db.ticket.count({ where }),
    ]);
    return { items, total };
  }

  update(id: string, data: Prisma.TicketUncheckedUpdateInput) {
    return this.db.ticket.update({ where: { id }, data, select: ticketListSelect });
  }

  count(where: Prisma.TicketWhereInput) {
    return this.db.ticket.count({ where });
  }

  addActivity(ticketId: string, actorId: string | null, type: ActivityType, data?: Prisma.InputJsonValue) {
    return this.db.ticketActivity.create({ data: { ticketId, actorId, type, data } });
  }

  addComment(ticketId: string, authorId: string, body: string, isInternal: boolean) {
    return this.db.ticketComment.create({
      data: { ticketId, authorId, body, isInternal },
      include: { author: { select: { id: true, name: true, role: true } } },
    });
  }

  // ---- Vector operations (pgvector, cosine distance `<=>`) ----

  async setEmbedding(id: string, vector: string): Promise<void> {
    await this.db.$executeRaw`UPDATE "Ticket" SET "embedding" = ${vector}::vector WHERE "id" = ${id}`;
  }

  findSimilarByVector(vector: string, o: SimilarityOptions): Promise<SimilarTicketRow[]> {
    return this.db.$queryRaw<SimilarTicketRow[]>`
      SELECT "id", "number", "title", "status", "category", "priority", "createdAt",
             1 - ("embedding" <=> ${vector}::vector) AS "similarity"
      FROM "Ticket"
      WHERE "embedding" IS NOT NULL
        AND "id" <> ${o.excludeId ?? ""}
        AND "createdAt" >= ${o.since ?? new Date(0)}
        AND (${!o.onlyOpen} OR "status"::text = ANY(${OPEN_STATUSES as string[]}))
        AND 1 - ("embedding" <=> ${vector}::vector) >= ${o.minSimilarity}
      ORDER BY "embedding" <=> ${vector}::vector
      LIMIT ${o.limit}`;
  }

  findSimilarToTicket(id: string, o: SimilarityOptions): Promise<SimilarTicketRow[]> {
    return this.db.$queryRaw<SimilarTicketRow[]>`
      SELECT t."id", t."number", t."title", t."status", t."category", t."priority", t."createdAt",
             1 - (t."embedding" <=> src."embedding") AS "similarity"
      FROM "Ticket" t, (SELECT "embedding" FROM "Ticket" WHERE "id" = ${id}) src
      WHERE t."id" <> ${id} AND t."embedding" IS NOT NULL AND src."embedding" IS NOT NULL
        AND 1 - (t."embedding" <=> src."embedding") >= ${o.minSimilarity}
      ORDER BY t."embedding" <=> src."embedding"
      LIMIT ${o.limit}`;
  }

  /** Triaged tickets inside a time window: incident detection input. */
  windowTickets(since: Date) {
    return this.db.ticket.findMany({
      where: { createdAt: { gte: since }, triageStatus: "COMPLETED", category: { not: null } },
      select: { id: true, title: true, category: true, priority: true, incidentId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
  }

  /** Pairwise similarities between the given tickets, same category only, above a threshold. */
  similarityEdges(ids: string[], threshold: number) {
    if (ids.length < 2) return Promise.resolve([] as { a: string; b: string; similarity: number }[]);
    return this.db.$queryRaw<{ a: string; b: string; similarity: number }[]>`
      SELECT x."id" AS "a", y."id" AS "b", 1 - (x."embedding" <=> y."embedding") AS "similarity"
      FROM "Ticket" x JOIN "Ticket" y ON x."id" < y."id" AND x."category" = y."category"
      WHERE x."id" = ANY(${ids}) AND y."id" = ANY(${ids})
        AND x."embedding" IS NOT NULL AND y."embedding" IS NOT NULL
        AND 1 - (x."embedding" <=> y."embedding") >= ${threshold}`;
  }

  countByCategorySince(category: Category, from: Date, to: Date) {
    return this.db.ticket.count({ where: { category, createdAt: { gte: from, lt: to } } });
  }
}
