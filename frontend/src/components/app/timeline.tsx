import { clsx } from "clsx";
import { Bot, Lock } from "lucide-react";
import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL, dateTime, timeAgo } from "@/lib/format";
import type { Activity, Category, Comment, Priority, TicketStatus } from "@/lib/types";

function describe(a: Activity): string | null {
  const d = (a.data ?? {}) as Record<string, any>;
  const who = a.actor?.name ?? "System";
  switch (a.type) {
    case "CREATED": return `${who} created the ticket`;
    case "ESCALATED_FROM_CHAT": return `${who} escalated a chat with the AI assistant`;
    case "TRIAGED":
      return d.failed ? "Automatic analysis failed; sent to the General queue"
        : `AI classified it as ${CATEGORY_LABEL[d.category as Category] ?? d.category} with ${PRIORITY_LABEL[d.priority as Priority]?.toLowerCase()} priority (${Math.round((d.confidence ?? 0) * 100)}% confident)${d.needsReview ? ", held for review" : ""}`;
    case "ASSIGNED": return d.agentName ? `${d.automatic || d.afterReview ? "Routed" : `${who} assigned it`} to ${d.agentName}${d.teamName ? ` in ${d.teamName}` : ""}` : `${who} unassigned the ticket`;
    case "STATUS_CHANGED": return `${d.automatic ? "Status" : `${who} moved it`} from ${STATUS_LABEL[d.from as TicketStatus]} to ${STATUS_LABEL[d.to as TicketStatus]}`;
    case "PRIORITY_CHANGED": return `${who} changed priority from ${PRIORITY_LABEL[d.from as Priority]} to ${PRIORITY_LABEL[d.to as Priority]}`;
    case "REVIEWED": return d.action === "ACCEPT" ? `${who} confirmed the AI prediction` : `${who} corrected the AI prediction to ${CATEGORY_LABEL[d.category?.to as Category] ?? "—"}, ${PRIORITY_LABEL[d.priority?.to as Priority]?.toLowerCase()} priority`;
    case "INCIDENT_LINKED": return "Linked to a detected incident";
    case "COMMENTED": return null; // the comment itself is shown
    default: return null;
  }
}

type Entry = { kind: "comment"; at: string; c: Comment } | { kind: "activity"; at: string; a: Activity; text: string };

export function Timeline({ comments, activities }: { comments: Comment[]; activities: Activity[] }) {
  const entries: Entry[] = [
    ...comments.map((c) => ({ kind: "comment" as const, at: c.createdAt, c })),
    ...activities.flatMap((a) => {
      const text = describe(a);
      return text ? [{ kind: "activity" as const, at: a.createdAt, a, text }] : [];
    }),
  ].sort((x, y) => x.at.localeCompare(y.at));

  return (
    <ol className="space-y-4">
      {entries.map((e) =>
        e.kind === "activity" ? (
          <li key={e.a.id} className="flex gap-3 pl-1 text-[13px] text-ink-muted">
            <span aria-hidden className={clsx("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", e.a.actor ? "bg-ink-faint" : "bg-pine-500")} />
            <p className="min-w-0 flex-1">
              {!e.a.actor && <Bot className="mr-1 inline h-3.5 w-3.5 -translate-y-px text-pine-600" aria-label="Automated" />}
              {e.text}<time dateTime={e.at} title={dateTime(e.at)} className="whitespace-nowrap text-ink-faint">, {timeAgo(e.at)}</time>
            </p>
          </li>
        ) : (
          <li key={e.c.id} className={clsx("rounded-2xl border px-4 py-3", e.c.isInternal ? "border-medium-line bg-medium-bg/60" : "border-line bg-surface")}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px]">
              <span className="font-medium text-ink">{e.c.author.name}</span>
              {e.c.author.role !== "USER" && <span className="text-ink-muted">Support</span>}
              {e.c.isInternal && <span className="inline-flex items-center gap-1 text-medium-fg"><Lock className="h-3 w-3" aria-hidden />Internal note</span>}
              <time dateTime={e.at} title={dateTime(e.at)} className="ml-auto text-xs text-ink-faint">{timeAgo(e.at)}</time>
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{e.c.body}</p>
          </li>
        ),
      )}
    </ol>
  );
}
