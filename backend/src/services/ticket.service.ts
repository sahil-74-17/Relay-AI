import { ANALYTICS_RANGE_KEYS, invalidate } from "../lib/cache";
import type { Prisma, PrismaClient } from "../generated/prisma/client";
import type { TicketSource } from "../generated/prisma/enums";
import { CLOSED_STATUSES, OPEN_STATUSES } from "../config/constants";
import { computeDueAt, slaState } from "../domain/sla";
import { TicketPolicy } from "../domain/ticket-policy";
import type { EventBus } from "../events/event-bus";
import { TicketRepository } from "../repositories/ticket.repository";
import { UserRepository } from "../repositories/user.repository";
import type { AuthUser } from "../types/auth";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/errors";
import { paginate } from "../utils/pagination";
import type { CommentDto, CreateTicketDto, ListTicketsDto, UpdateTicketDto } from "../validators/ticket.validators";
import type { SettingsService } from "./settings.service";

const SORTS: Record<ListTicketsDto["sort"], Prisma.TicketOrderByWithRelationInput[]> = {
  newest: [{ createdAt: "desc" }],
  oldest: [{ createdAt: "asc" }],
  priority: [{ priority: "desc" }, { createdAt: "desc" }],
  due: [{ dueAt: { sort: "asc", nulls: "last" } }],
};

export class TicketService {
  private readonly tickets: TicketRepository;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly events: EventBus,
    private readonly settings: SettingsService,
  ) {
    this.tickets = new TicketRepository(prisma);
  }

  async create(user: AuthUser, dto: CreateTicketDto, opts: { source?: TicketSource; conversationId?: string } = {}) {
    const source = opts.source ?? "WEB";
    const ticket = await this.prisma.$transaction(async (tx) => {
      const repo = new TicketRepository(tx);
      const created = await repo.create({
        title: dto.title,
        description: dto.description,
        createdById: user.id,
        source,
        conversationId: opts.conversationId,
        aiAnalysis: dto.category ? { userCategoryHint: dto.category } : undefined,
      });
      await repo.addActivity(created.id, user.id, source === "CHATBOT" ? "ESCALATED_FROM_CHAT" : "CREATED", {
        source,
      });
      return created;
    });
    await invalidate(...ANALYTICS_RANGE_KEYS);
    this.events.emit("ticket.created", { ticketId: ticket.id });
    return ticket;
  }

  async list(user: AuthUser, q: ListTicketsDto) {
    const where: Prisma.TicketWhereInput = {
      status: q.status,
      priority: q.priority,
      category: q.category,
      ...this.scopeFilter(user, q.scope),
    };
    if (q.q) {
      const asNumber = Number(q.q.replace(/^#|^TCK-/i, ""));
      where.OR = [
        { title: { contains: q.q, mode: "insensitive" } },
        { description: { contains: q.q, mode: "insensitive" } },
        ...(Number.isInteger(asNumber) && asNumber > 0 ? [{ number: asNumber }] : []),
      ];
    }
    const { items, total } = await this.tickets.list(where, SORTS[q.sort], q);
    return paginate(
      items.map((t) => ({ ...t, sla: slaState(t.dueAt, t.resolvedAt) })),
      total,
      q,
    );
  }

  private scopeFilter(user: AuthUser, scope: ListTicketsDto["scope"]): Prisma.TicketWhereInput {
    if (!TicketPolicy.isStaff(user)) return { createdById: user.id };
    switch (scope) {
      case "mine":
        return { createdById: user.id };
      case "assigned":
        return { assignedAgentId: user.id };
      case "unassigned":
        return { assignedAgentId: null, status: { in: OPEN_STATUSES } };
      case "team":
        return user.teamId ? { assignedTeamId: user.teamId } : { id: "__none__" };
      default:
        return {};
    }
  }

  async get(user: AuthUser, id: string) {
    const ticket = await this.tickets.findDetail(id);
    if (!ticket) throw new NotFoundError("Ticket");
    if (!TicketPolicy.canView(user, ticket)) throw new NotFoundError("Ticket"); // don't reveal existence
    const staff = TicketPolicy.isStaff(user);
    const config = await this.settings.get();
    const similar = staff
      ? await this.tickets.findSimilarToTicket(id, { limit: 5, minSimilarity: config.similarTicketThreshold })
      : [];
    return {
      ...ticket,
      comments: staff ? ticket.comments : ticket.comments.filter((c) => !c.isInternal),
      feedback: staff ? ticket.feedback : [],
      sla: slaState(ticket.dueAt, ticket.resolvedAt),
      similar: similar.map((s) => ({ ...s, similarity: Number(Number(s.similarity).toFixed(3)) })),
    };
  }

  async update(user: AuthUser, id: string, dto: UpdateTicketDto) {
    if (!TicketPolicy.canManage(user)) throw new ForbiddenError();
    const updated = await this.prisma.$transaction(async (tx) => {
      const repo = new TicketRepository(tx);
      const ticket = await repo.findRaw(id);
      if (!ticket) throw new NotFoundError("Ticket");
      const data: Prisma.TicketUncheckedUpdateInput = {};

      if (dto.status && dto.status !== ticket.status) {
        if (!TicketPolicy.canTransition(ticket.status, dto.status)) {
          throw new BadRequestError(`A ${ticket.status.toLowerCase()} ticket can't move to ${dto.status.toLowerCase()}`);
        }
        data.status = dto.status;
        if (dto.status === "RESOLVED") {
          data.resolvedAt = new Date();
          data.resolution = dto.resolution ?? ticket.resolution;
        } else if (!CLOSED_STATUSES.includes(dto.status)) {
          data.resolvedAt = null;
        }
        await repo.addActivity(id, user.id, "STATUS_CHANGED", { from: ticket.status, to: dto.status });
      } else if (dto.resolution) {
        data.resolution = dto.resolution;
      }

      if (dto.priority && dto.priority !== ticket.priority) {
        data.priority = dto.priority;
        data.dueAt = computeDueAt(dto.priority, ticket.createdAt);
        await repo.addActivity(id, user.id, "PRIORITY_CHANGED", { from: ticket.priority, to: dto.priority });
      }

      if (dto.assignedTeamId !== undefined && dto.assignedTeamId !== ticket.assignedTeamId) {
        data.assignedTeamId = dto.assignedTeamId;
      }

      if (dto.assignedAgentId !== undefined && dto.assignedAgentId !== ticket.assignedAgentId) {
        let agentName: string | null = null;
        if (dto.assignedAgentId) {
          const agent = await new UserRepository(tx).findById(dto.assignedAgentId);
          if (!agent || agent.role === "USER" || !agent.isActive) throw new BadRequestError("Pick an active agent");
          agentName = agent.name;
          if (dto.assignedTeamId === undefined && agent.teamId) data.assignedTeamId = agent.teamId;
        }
        data.assignedAgentId = dto.assignedAgentId;
        await repo.addActivity(id, user.id, "ASSIGNED", { agentId: dto.assignedAgentId, agentName });
      }

      if (!Object.keys(data).length) return repo.update(id, {});
      return repo.update(id, data);
    });
    await invalidate(...ANALYTICS_RANGE_KEYS);
    return updated;
  }

  async addComment(user: AuthUser, id: string, dto: CommentDto) {
    const ticket = await this.tickets.findRaw(id);
    if (!ticket || !TicketPolicy.canView(user, ticket)) throw new NotFoundError("Ticket");
    if (!TicketPolicy.canComment(user, ticket)) throw new BadRequestError("Closed tickets can't receive new comments");
    const isInternal = TicketPolicy.isStaff(user) ? dto.isInternal : false;

    return this.prisma.$transaction(async (tx) => {
      const repo = new TicketRepository(tx);
      const comment = await repo.addComment(id, user.id, dto.body, isInternal);
      await repo.addActivity(id, user.id, "COMMENTED", { internal: isInternal });
      // A customer reply moves a waiting ticket back into the agent's active work.
      if (!TicketPolicy.isStaff(user) && ticket.status === "WAITING_FOR_USER") {
        await repo.update(id, { status: "IN_PROGRESS" });
        await repo.addActivity(id, user.id, "STATUS_CHANGED", { from: "WAITING_FOR_USER", to: "IN_PROGRESS", automatic: true });
      }
      return comment;
    });
  }

  async reanalyze(user: AuthUser, id: string) {
    if (!TicketPolicy.canManage(user)) throw new ForbiddenError();
    const ticket = await this.tickets.findRaw(id);
    if (!ticket) throw new NotFoundError("Ticket");
    if (ticket.status === "CLOSED") throw new BadRequestError("Closed tickets can't be re-analysed");
    if (ticket.reviewStatus === "ACCEPTED" || ticket.reviewStatus === "CORRECTED") {
      throw new BadRequestError("A human already reviewed this ticket. Re-analysis would overwrite that decision.");
    }
    await this.tickets.update(id, { triageStatus: "PENDING" });
    this.events.emit("ticket.reanalyze", { ticketId: id });
    return { queued: true };
  }
}
