import type { Prisma } from "../generated/prisma/client";
import type { Db } from "../lib/prisma";

export class FeedbackRepository {
  constructor(private readonly db: Db) {}

  create(data: Prisma.TicketFeedbackUncheckedCreateInput) {
    return this.db.ticketFeedback.create({ data });
  }

  async stats() {
    const [total, accepted] = await Promise.all([
      this.db.ticketFeedback.count(),
      this.db.ticketFeedback.count({ where: { accepted: true } }),
    ]);
    return { total, accepted };
  }

  recent(limit = 10) {
    return this.db.ticketFeedback.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        reviewer: { select: { id: true, name: true } },
        ticket: { select: { id: true, number: true, title: true } },
      },
    });
  }
}
