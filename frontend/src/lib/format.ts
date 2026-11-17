import type { Category, IncidentStatus, Priority, Sentiment, TicketStatus } from "./types";

export const CATEGORY_LABEL: Record<Category, string> = {
  ACCOUNT: "Account & access", BILLING: "Billing & payments", TECHNICAL: "Technical",
  FEATURE_REQUEST: "Feature request", GENERAL: "General",
};
export const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Open", IN_PROGRESS: "In progress", WAITING_FOR_USER: "Waiting on customer", RESOLVED: "Resolved", CLOSED: "Closed",
};
export const PRIORITY_LABEL: Record<Priority, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", CRITICAL: "Critical" };
export const SENTIMENT_LABEL: Record<Sentiment, string> = { POSITIVE: "Positive", NEUTRAL: "Neutral", NEGATIVE: "Negative" };

export const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];
export const PRIORITIES: Priority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
export const STATUSES = Object.keys(STATUS_LABEL) as TicketStatus[];

export const ticketRef = (n: number) => `TCK-${String(n).padStart(4, "0")}`;
export const incidentRef = (n: number) => `INC-${String(n).padStart(3, "0")}`;
export const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(s);
  if (abs < 45) return "just now";
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(s / 86400), "day");
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function dueLabel(iso: string | null, now = Date.now()) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  const h = Math.abs(ms) / 3_600_000;
  const span = h < 1 ? `${Math.max(1, Math.round(h * 60))}m` : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`;
  return ms < 0 ? `${span} overdue` : `due in ${span}`;
}

export const fileSize = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`);

export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = { OPEN: "Open", INVESTIGATING: "Investigating", RESOLVED: "Resolved" };
