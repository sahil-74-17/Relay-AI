import type { Category, Priority, TicketStatus, IncidentStatus } from "../generated/prisma/enums";

export const PRIORITY_ORDER: readonly Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

/** SLA resolution targets, in hours, by priority. */
export const SLA_HOURS: Record<Priority, number> = { CRITICAL: 4, HIGH: 8, MEDIUM: 24, LOW: 72 };

export const OPEN_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_FOR_USER"];
export const CLOSED_STATUSES: TicketStatus[] = ["RESOLVED", "CLOSED"];

/** Allowed ticket status transitions (state machine). */
export const STATUS_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  OPEN: ["IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"],
  IN_PROGRESS: ["OPEN", "WAITING_FOR_USER", "RESOLVED", "CLOSED"],
  WAITING_FOR_USER: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  RESOLVED: ["IN_PROGRESS", "CLOSED"],
  CLOSED: [],
};

/** Allowed incident status transitions, shared by the API and the UI. */
export const INCIDENT_TRANSITIONS: Record<IncidentStatus, readonly IncidentStatus[]> = {
  OPEN: ["INVESTIGATING", "RESOLVED"],
  INVESTIGATING: ["RESOLVED"],
  RESOLVED: ["OPEN"],
};

export const CATEGORY_LABELS: Record<Category, string> = {
  ACCOUNT: "Account & access",
  BILLING: "Billing & payments",
  TECHNICAL: "Technical issue",
  FEATURE_REQUEST: "Feature request",
  GENERAL: "General",
};

export const EMBEDDING_DIM = 384;

export const QUEUES = {
  triage: "ticket-triage",
  ingestion: "document-ingestion",
  incidents: "incident-detection",
} as const;

export const AUTH_COOKIE = "si_token";

/** Human-facing ticket reference, identical to the frontend format. */
export const ticketRef = (n: number) => `TCK-${String(n).padStart(4, "0")}`;
