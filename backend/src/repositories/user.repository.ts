import { OPEN_STATUSES } from "../config/constants";
import type { Prisma } from "../generated/prisma/client";
import type { Role } from "../generated/prisma/enums";
import type { Db } from "../lib/prisma";
import { type PageParams, toSkipTake } from "../utils/pagination";

export const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  teamId: true,
  createdAt: true,
  team: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect;

export class UserRepository {
  constructor(private readonly db: Db) {}

  findByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.db.user.findUnique({ where: { id }, select: publicUserSelect });
  }

  create(data: { email: string; name: string; passwordHash: string; role?: Role }) {
    return this.db.user.create({ data, select: publicUserSelect });
  }

  /** Replaces any previous reset token: only the newest link stays valid. */
  setPasswordReset(id: string, tokenHash: string, expiresAt: Date) {
    return this.db.user.update({
      where: { id },
      data: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt },
      select: { id: true },
    });
  }

  /**
   * Atomically consumes a valid reset token and sets the new password hash.
   * Returns false when the token is unknown, expired or already used.
   */
  async consumePasswordReset(tokenHash: string, passwordHash: string): Promise<boolean> {
    const result = await this.db.user.updateMany({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { gt: new Date() },
      },
      data: { passwordHash, passwordResetTokenHash: null, passwordResetExpiresAt: null },
    });
    return result.count === 1;
  }

  async list(filter: { q?: string; role?: Role }, page: PageParams) {
    const where: Prisma.UserWhereInput = {
      role: filter.role,
      ...(filter.q && {
        OR: [{ name: { contains: filter.q, mode: "insensitive" } }, { email: { contains: filter.q, mode: "insensitive" } }],
      }),
    };
    const [items, total] = await Promise.all([
      this.db.user.findMany({
        where,
        select: { ...publicUserSelect, _count: { select: { assignedTickets: { where: { status: { in: OPEN_STATUSES } } } } } },
        orderBy: [{ role: "desc" }, { name: "asc" }],
        ...toSkipTake(page),
      }),
      this.db.user.count({ where }),
    ]);
    return { items, total };
  }

  update(id: string, data: Prisma.UserUncheckedUpdateInput) {
    return this.db.user.update({ where: { id }, data, select: publicUserSelect });
  }

  /** Active agents of a team with their current open workload. */
  agentsWithWorkload(teamId: string) {
    return this.db.user.findMany({
      where: { teamId, role: "AGENT", isActive: true },
      select: {
        id: true,
        name: true,
        _count: { select: { assignedTickets: { where: { status: { in: OPEN_STATUSES } } } } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  listAgents() {
    return this.db.user.findMany({
      where: { role: { in: ["AGENT", "ADMIN"] }, isActive: true },
      select: { id: true, name: true, role: true, teamId: true },
      orderBy: { name: "asc" },
    });
  }
}
