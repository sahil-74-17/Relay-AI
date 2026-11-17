import { clsx } from "clsx";
import { Bot, MessageSquare } from "lucide-react";
import Link from "next/link";
import { ticketRef, timeAgo } from "@/lib/format";
import type { TicketListItem } from "@/lib/types";
import { CategoryTag, PriorityBadge, SlaBadge, StatusBadge } from "./badges";

/** Table on wide screens, stacked rows on small screens: same data, layout fit to the device. */
/** `staff` reveals internal workflow details (review state) that customers shouldn't see. */
export function TicketList({ tickets, showRequester = false, showAssignee = true, staff = false }: { tickets: TicketListItem[]; showRequester?: boolean; showAssignee?: boolean; staff?: boolean }) {
  return (
    <>
      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.13em] text-ink-muted">
            <th scope="col" className="w-[38%] px-4 py-2.5 font-semibold">Ticket</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Priority</th>
            <th scope="col" className="hidden px-3 py-2.5 font-semibold lg:table-cell">Category</th>
            {showAssignee && <th scope="col" className="px-3 py-2.5 font-semibold">Assignee</th>}
            <th scope="col" className="px-4 py-2.5 text-right font-semibold">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {tickets.map((t) => (
            <tr key={t.id} className="group relative transition-colors hover:bg-verve-soft/60">
              <td className="max-w-0 px-4 py-2.5">
                <Link href={`/tickets/${t.id}`} className="block after:absolute after:inset-0 focus-visible:outline-none">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs text-ink-muted">{ticketRef(t.number)}</span>
                    {t.source === "CHATBOT" && <Bot className="h-3.5 w-3.5 text-pine-600" aria-label="Created from AI assistant" />}
                    {staff && t.reviewStatus === "PENDING" && <span className="rounded-full bg-high-bg px-1.5 py-0.5 text-2xs font-semibold text-high-fg">Needs review</span>}
                  </span>
                  <span className="mt-0.5 block truncate font-medium text-ink group-hover:text-pine-700">{t.title}</span>
                  {showRequester && <span className="block truncate text-xs text-ink-muted">{t.createdBy.name}</span>}
                </Link>
              </td>
              <td className="px-3 py-2.5"><StatusBadge status={t.status} /></td>
              <td className="px-3 py-2.5">
                <div className="flex flex-col items-start gap-1"><PriorityBadge priority={t.priority} /><SlaBadge sla={t.sla} dueAt={t.dueAt} /></div>
              </td>
              <td className="hidden px-3 py-2.5 lg:table-cell"><CategoryTag category={t.category} /></td>
              {showAssignee && <td className="px-3 py-2.5 text-ink-soft">{t.assignedAgent?.name ?? <span className="text-ink-faint">Unassigned</span>}</td>}
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs text-ink-muted">
                <span className="inline-flex items-center gap-2">
                  {t._count.comments > 0 && <span className="inline-flex items-center gap-0.5" aria-label={`${t._count.comments} comments`}><MessageSquare className="h-3 w-3" aria-hidden />{t._count.comments}</span>}
                  {timeAgo(t.updatedAt)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-line md:hidden">
        {tickets.map((t) => (
          <li key={t.id}>
            <Link href={`/tickets/${t.id}`} className="block px-4 py-3 transition-colors active:bg-verve-soft">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-ink-muted">{ticketRef(t.number)}</span>
                <span className="text-xs text-ink-muted">{timeAgo(t.updatedAt)}</span>
              </div>
              <p className="mt-0.5 font-medium leading-snug">{t.title}</p>
              <div className={clsx("mt-2 flex flex-wrap items-center gap-1.5")}>
                <StatusBadge status={t.status} /><PriorityBadge priority={t.priority} />
                {staff && t.reviewStatus === "PENDING" && <span className="rounded-full bg-high-bg px-2 py-0.5 text-xs font-semibold text-high-fg">Needs review</span>}
                <SlaBadge sla={t.sla} dueAt={t.dueAt} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
