import { SLA_HOURS } from "../config/constants";
import type { Priority } from "../generated/prisma/enums";

export const computeDueAt = (priority: Priority, from: Date): Date =>
  new Date(from.getTime() + SLA_HOURS[priority] * 3_600_000);

export type SlaState = "met" | "on_track" | "due_soon" | "breached";

export function slaState(dueAt: Date | null, resolvedAt: Date | null, now = new Date()): SlaState | null {
  if (!dueAt) return null;
  if (resolvedAt) return resolvedAt <= dueAt ? "met" : "breached";
  const remaining = dueAt.getTime() - now.getTime();
  if (remaining < 0) return "breached";
  return remaining < 2 * 3_600_000 ? "due_soon" : "on_track";
}
