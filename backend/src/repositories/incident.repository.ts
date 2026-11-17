import type { Prisma } from "../generated/prisma/client";
import type { Category, IncidentStatus } from "../generated/prisma/enums";
import type { Db } from "../lib/prisma";
import { type PageParams, toSkipTake } from "../utils/pagination";

export class IncidentRepository {
  constructor(private readonly db: Db) {}

  async list(status: IncidentStatus | undefined, page: PageParams) {
    const where: Prisma.IncidentWhereInput = { status };
    const [items, total] = await Promise.all([
      this.db.incident.findMany({
        where,
        orderBy: [{ detectedAt: "desc" }],
        include: { _count: { select: { tickets: true } } },
        ...toSkipTake(page),
      }),
      this.db.incident.count({ where }),
    ]);
    return { items, total };
  }

  findDetail(id: string) {
    return this.db.incident.findUnique({
      where: { id },
      include: {
        tickets: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true, number: true, title: true, status: true, priority: true, createdAt: true,
            createdBy: { select: { name: true } }, assignedAgent: { select: { name: true } },
          },
        },
      },
    });
  }

  findActive(category: Category) {
    return this.db.incident.findMany({
      where: { category, status: { in: ["OPEN", "INVESTIGATING"] } },
      include: { tickets: { select: { id: true } } },
    });
  }

  create(data: Prisma.IncidentCreateInput) {
    return this.db.incident.create({ data });
  }

  update(id: string, data: Prisma.IncidentUpdateInput) {
    return this.db.incident.update({ where: { id }, data });
  }

  linkTickets(incidentId: string, ticketIds: string[]) {
    return this.db.ticket.updateMany({ where: { id: { in: ticketIds } }, data: { incidentId } });
  }

  countActive() {
    return this.db.incident.count({ where: { status: { in: ["OPEN", "INVESTIGATING"] } } });
  }
}
