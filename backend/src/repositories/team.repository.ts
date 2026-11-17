import { OPEN_STATUSES } from "../config/constants";
import type { Prisma } from "../generated/prisma/client";
import type { Category } from "../generated/prisma/enums";
import type { Db } from "../lib/prisma";

export class TeamRepository {
  constructor(private readonly db: Db) {}

  findByCategory(category: Category) {
    return this.db.team.findUnique({ where: { category } });
  }

  findById(id: string) {
    return this.db.team.findUnique({ where: { id } });
  }

  list() {
    return this.db.team.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { members: true, tickets: { where: { status: { in: OPEN_STATUSES } } } } },
        members: { select: { id: true, name: true, role: true }, orderBy: { name: "asc" } },
      },
    });
  }

  create(data: Prisma.TeamCreateInput) {
    return this.db.team.create({ data });
  }

  update(id: string, data: Prisma.TeamUpdateInput) {
    return this.db.team.update({ where: { id }, data });
  }
}
