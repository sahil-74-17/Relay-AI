import { clsx } from "clsx";
import {
  AlertOctagon, ArrowDown, ArrowUp, Archive, CheckCircle2, Circle, CircleDot, Clock, Frown, Meh, Minus, Smile, Timer, TimerOff,
} from "lucide-react";
import { CATEGORY_LABEL, PRIORITY_LABEL, SENTIMENT_LABEL, STATUS_LABEL, dueLabel } from "@/lib/format";
import type { Category, Priority, Sentiment, SlaState, TicketStatus } from "@/lib/types";

const base = "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium";

const PRIORITY_STYLE: Record<Priority, { cls: string; Icon: typeof ArrowUp }> = {
  CRITICAL: { cls: "bg-critical-bg text-critical-fg ring-1 ring-inset ring-critical-line", Icon: AlertOctagon },
  HIGH: { cls: "bg-high-bg text-high-fg", Icon: ArrowUp },
  MEDIUM: { cls: "bg-medium-bg text-medium-fg", Icon: Minus },
  LOW: { cls: "bg-low-bg text-low-fg", Icon: ArrowDown },
};
export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const { cls, Icon } = PRIORITY_STYLE[priority];
  return <span className={clsx(base, cls, className)}><Icon className="h-3 w-3" aria-hidden />{PRIORITY_LABEL[priority]}</span>;
}

const STATUS_STYLE: Record<TicketStatus, { cls: string; Icon: typeof Circle }> = {
  OPEN: { cls: "text-ink-soft border border-line-strong", Icon: Circle },
  IN_PROGRESS: { cls: "text-pine-700 bg-pine-50 border border-pine-100", Icon: CircleDot },
  WAITING_FOR_USER: { cls: "text-medium-fg bg-medium-bg border border-medium-line", Icon: Clock },
  RESOLVED: { cls: "text-positive-fg bg-positive-bg border border-transparent", Icon: CheckCircle2 },
  CLOSED: { cls: "text-ink-muted bg-ink/[0.04] border border-transparent", Icon: Archive },
};
export function StatusBadge({ status }: { status: TicketStatus }) {
  const { cls, Icon } = STATUS_STYLE[status];
  return <span className={clsx(base, cls)}><Icon className="h-3 w-3" aria-hidden />{STATUS_LABEL[status]}</span>;
}

export function CategoryTag({ category }: { category: Category | null }) {
  if (!category) return <span className="text-xs text-ink-faint">Analysing…</span>;
  return <span className="whitespace-nowrap text-xs text-ink-soft">{CATEGORY_LABEL[category]}</span>;
}

const SENTIMENT_ICON = { POSITIVE: Smile, NEUTRAL: Meh, NEGATIVE: Frown } as const;
export function SentimentBadge({ sentiment }: { sentiment: Sentiment | null }) {
  if (!sentiment) return null;
  const Icon = SENTIMENT_ICON[sentiment];
  return (
    <span className={clsx(base, sentiment === "NEGATIVE" ? "text-critical-fg" : sentiment === "POSITIVE" ? "text-positive-fg" : "text-ink-muted", "px-0")}>
      <Icon className="h-3.5 w-3.5" aria-hidden />{SENTIMENT_LABEL[sentiment]}
    </span>
  );
}

export function SlaBadge({ sla, dueAt }: { sla: SlaState | undefined; dueAt: string | null }) {
  if (!sla || sla === "met" || !dueAt) return null;
  const breached = sla === "breached";
  const Icon = breached ? TimerOff : Timer;
  return (
    <span className={clsx(base, "px-0", breached ? "text-critical-fg" : sla === "due_soon" ? "text-high-fg" : "text-ink-muted")}>
      <Icon className="h-3.5 w-3.5" aria-hidden />{dueLabel(dueAt)}
    </span>
  );
}

/** Confidence bar with the review threshold marked, so "why is this in review?" is visible. */
export function ConfidenceMeter({ value, threshold, label = "Confidence" }: { value: number; threshold?: number; label?: string }) {
  const low = threshold !== undefined && value < threshold;
  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-ink-muted">{label}</span>
        <span className={clsx("font-mono font-medium", low ? "text-high-fg" : "text-ink")}>{Math.round(value * 100)}%{low && " (low)"}</span>
      </div>
      <div
        className="relative h-1.5 rounded-full bg-ink/[0.07]"
        role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-label={label}
      >
        <div className={clsx("h-full origin-left animate-fill-bar rounded-full", low ? "bg-high-fg" : "bg-pine-600")} style={{ width: `${value * 100}%` }} />
        {threshold !== undefined && (
          <span className="absolute -top-0.5 h-2.5 w-px bg-ink-soft" style={{ left: `${threshold * 100}%` }} title={`Review threshold ${Math.round(threshold * 100)}%`} />
        )}
      </div>
    </div>
  );
}
