import { STATUS_TRANSITIONS } from "../config/constants";
import type { TicketStatus } from "../generated/prisma/enums";
import type { AuthUser } from "../types/auth";

/** Central access rules for tickets, so controllers and services never re-implement them. */
export const TicketPolicy = {
  isStaff: (user: AuthUser) => user.role === "AGENT" || user.role === "ADMIN",

  canView(user: AuthUser, ticket: { createdById: string }): boolean {
    return this.isStaff(user) || ticket.createdById === user.id;
  },

  canComment(user: AuthUser, ticket: { createdById: string; status: TicketStatus }): boolean {
    return this.canView(user, ticket) && ticket.status !== "CLOSED";
  },

  canManage(user: AuthUser): boolean {
    return this.isStaff(user);
  },

  canTransition(from: TicketStatus, to: TicketStatus): boolean {
    return from === to || STATUS_TRANSITIONS[from].includes(to);
  },
};
