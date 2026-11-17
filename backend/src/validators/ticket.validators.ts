import { z } from "zod";
import { Category, Priority, TicketStatus } from "../generated/prisma/enums";
import { pageQuery, trimmed } from "./common";

export const createTicketSchema = z.object({
  title: trimmed(5, 200),
  description: trimmed(10, 10_000),
  /** Optional hint from the user; the ML prediction still runs and is recorded. */
  category: z.nativeEnum(Category).optional(),
});

export const listTicketsSchema = pageQuery.extend({
  q: z.string().trim().max(200).optional(),
  status: z.nativeEnum(TicketStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  category: z.nativeEnum(Category).optional(),
  scope: z.enum(["mine", "assigned", "unassigned", "team", "all"]).default("all"),
  sort: z.enum(["newest", "oldest", "priority", "due"]).default("newest"),
});

export const updateTicketSchema = z
  .object({
    status: z.nativeEnum(TicketStatus).optional(),
    priority: z.nativeEnum(Priority).optional(),
    assignedAgentId: z.string().min(1).nullable().optional(),
    assignedTeamId: z.string().min(1).nullable().optional(),
    resolution: trimmed(3, 5000).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: "Provide at least one field to update" });

export const commentSchema = z.object({
  body: trimmed(1, 5000),
  isInternal: z.boolean().default(false),
});

export const reviewSchema = z
  .object({
    action: z.enum(["ACCEPT", "CORRECT"]),
    category: z.nativeEnum(Category).optional(),
    priority: z.nativeEnum(Priority).optional(),
    note: trimmed(1, 1000).optional(),
  })
  .refine((v) => v.action === "ACCEPT" || v.category || v.priority, {
    message: "A correction needs a category or a priority",
  });

export type CreateTicketDto = z.infer<typeof createTicketSchema>;
export type ListTicketsDto = z.infer<typeof listTicketsSchema>;
export type UpdateTicketDto = z.infer<typeof updateTicketSchema>;
export type CommentDto = z.infer<typeof commentSchema>;
export type ReviewDto = z.infer<typeof reviewSchema>;
