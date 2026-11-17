"use client";
import { clsx } from "clsx";
import { MessageSquareText, Plus, Ticket } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Stat } from "@/components/app/stat";
import { TicketList } from "@/components/app/ticket-list";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton, SkeletonRows } from "@/components/ui/states";
import { useSession } from "@/hooks/use-session";
import { fetcher } from "@/lib/api";
import { CATEGORY_LABEL, PRIORITY_LABEL } from "@/lib/format";
import type { Dashboard, FeedbackReason, Overview } from "@/lib/types";

// Charts are loaded on demand so recharts only ships to admins who see them.
const VolumeChart = dynamic(() => import("@/components/app/charts").then((m) => m.VolumeChart), { ssr: false, loading: () => <Skeleton className="h-40" /> });
const CategoryChart = dynamic(() => import("@/components/app/charts").then((m) => m.CategoryChart), { ssr: false, loading: () => <Skeleton className="h-40" /> });
const PriorityChart = dynamic(() => import("@/components/app/charts").then((m) => m.PriorityChart), { ssr: false, loading: () => <Skeleton className="h-40" /> });
const SentimentChart = dynamic(() => import("@/components/app/charts").then((m) => m.SentimentChart), { ssr: false, loading: () => <Skeleton className="h-40" /> });
const ConfidenceChart = dynamic(() => import("@/components/app/charts").then((m) => m.ConfidenceChart), { ssr: false, loading: () => <Skeleton className="h-40" /> });
const FeedbackChart = dynamic(() => import("@/components/app/charts").then((m) => m.FeedbackChart), { ssr: false, loading: () => <Skeleton className="h-40" /> });

function StatsSkeleton({ n }: { n: number }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: n }, (_, i) => <Skeleton key={i} className="h-[84px]" />)}</div>;
}

function UserDashboard({ d }: { d: Extract<Dashboard, { role: "USER" }> }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open tickets" value={d.counts.open} href="/tickets" />
        <Stat label="Waiting on you" value={d.counts.waitingForYou} tone={d.counts.waitingForYou ? "warn" : "default"} hint={d.counts.waitingForYou ? "An agent asked for details" : undefined} href="/tickets?status=WAITING_FOR_USER" />
        <Stat label="High priority" value={d.counts.highPriority} />
        <Stat label="Resolved" value={d.counts.resolved} href="/tickets?status=RESOLVED" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader title="Recent tickets" action={<Link href="/tickets" className="text-[12px] font-semibold text-pine-700 underline-offset-4 hover:underline">View all</Link>} />
          {d.recent.length ? <TicketList tickets={d.recent} showAssignee={false} /> : (
            <EmptyState icon={Ticket} title="You don't have any tickets yet." description="When something goes wrong, raise a ticket and we'll route it to the right team." action={<Link href="/tickets/new"><Button><Plus className="h-4 w-4" />Create ticket</Button></Link>} />
          )}
        </Card>
        <Card className="h-fit p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-verve-lime text-verve-forest" aria-hidden>
            <MessageSquareText className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-[16px] font-semibold tracking-[-0.02em] text-verve-ink">Ask the assistant first</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-verve-muted">It answers from our help documentation with sources, and can turn the chat into a ticket if it can't help.</p>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/assistant"><Button className="w-full">Open AI assistant</Button></Link>
            <Link href="/tickets/new"><Button variant="secondary" className="w-full">Create a ticket</Button></Link>
          </div>
        </Card>
      </div>
    </>
  );
}

function StaffCounts({ d }: { d: Extract<Dashboard, { role: "AGENT" | "ADMIN" }> }) {
  const c = d.counts;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Stat label="Assigned to you" value={c.assigned} href="/tickets?scope=assigned" />
      <Stat label="Unassigned" value={c.unassigned} href="/tickets?scope=unassigned" />
      <Stat label="High priority open" value={c.highPriority} href="/tickets?priority=HIGH" />
      <Stat label="Needs review" value={c.reviewQueue} tone={c.reviewQueue ? "warn" : "default"} href="/review" />
      <Stat label="SLA breached" value={c.breached} tone={c.breached ? "danger" : "default"} hint={c.dueSoon ? `${c.dueSoon} due within 2h` : undefined} href="/tickets?sort=due" />
      <Stat label="Active incidents" value={c.activeIncidents} tone={c.activeIncidents ? "danger" : "default"} href="/incidents" />
    </div>
  );
}

function AgentQueue({ d }: { d: Extract<Dashboard, { role: "AGENT" | "ADMIN" }> }) {
  return (
    <Card className="mt-6">
      <CardHeader title="Your queue" description="Open tickets assigned to you, most urgent deadline first" action={<Link href="/tickets?scope=assigned" className="text-[12px] font-semibold text-pine-700 underline-offset-4 hover:underline">View all</Link>} />
      {d.queue.length ? <TicketList tickets={d.queue} showRequester showAssignee={false} staff /> : (
        <EmptyState icon={Ticket} title="Your queue is clear" description="New tickets are routed to you automatically. Check unassigned tickets or the review queue in the meantime." action={<Link href="/review"><Button variant="secondary">Open review queue</Button></Link>} />
      )}
    </Card>
  );
}

const RANGES = [7, 30, 90] as const;
const REASON_LABEL: Record<FeedbackReason, string> = {
  INCORRECT: "Incorrect answer",
  NOT_RELEVANT: "Not relevant",
  MISSING_INFORMATION: "Missing information",
  OTHER: "Other",
};

function AdminAnalytics() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const { data, error, isLoading, mutate } = useSWR<Overview>(`/analytics/overview?days=${days}`, fetcher, { keepPreviousData: true });
  if (error) return <Card className="mt-6"><ErrorState message={error.message} onRetry={() => mutate()} /></Card>;
  if (isLoading || !data) return <div className="mt-6 space-y-4"><StatsSkeleton n={4} /><Skeleton className="h-72" /></div>;
  const k = data.kpis;
  const rangeLabel = `last ${days} days`;
  const feedbackReasons = data.aiFeedback.reasons.filter((r) => r.key);

  return (
    <>
      <div className="mb-4 mt-9 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-verve-muted">Analytics</p>
          <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-verve-ink">Platform overview</h2>
          <p className="mt-1 text-[12.5px] text-verve-muted">All figures are calculated from tickets and AI feedback in the selected range.</p>
        </div>
        <div role="group" aria-label="Date range" className="inline-flex rounded-full border border-verve-line bg-verve-surface p-1 shadow-[0_1px_0_rgba(12,59,46,0.04)]">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setDays(r)}
              aria-pressed={days === r}
              className={clsx(
                "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verve-forest focus-visible:ring-offset-1 focus-visible:ring-offset-verve-surface dark:focus-visible:ring-verve-lime",
                days === r
                  ? "bg-verve-forest text-verve-onForest dark:bg-verve-lime dark:text-verve-forest"
                  : "text-verve-muted hover:bg-verve-soft hover:text-verve-ink",
              )}
            >
              {r} days
            </button>
          ))}
        </div>
      </div>

      {!k.total && <Card className="mb-6 px-4 py-3 text-sm text-ink-muted sm:px-5">No tickets were created in this range. Try a longer date range.</Card>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Tickets" value={k.total} hint={rangeLabel} href="/tickets" />
        <Stat label="Open now" value={k.open} href="/tickets?status=OPEN" />
        <Stat label="Resolved" value={k.resolved} hint={`${k.resolutionRate}% resolution rate`} href="/tickets?status=RESOLVED" />
        <Stat label="Avg. resolution" value={k.avgResolutionHours != null ? `${k.avgResolutionHours}h` : "—"} hint="From ticket created to resolved" />
        <Stat label="SLA breached" value={k.slaBreached} tone={k.slaBreached ? "danger" : "default"} hint={`${k.slaBreachRate}% of tickets`} href="/tickets?sort=due" />
        <Stat label="High priority open" value={k.highPriority} href="/tickets?priority=HIGH" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="AI automation rate" value={`${k.automationRate}%`} hint="Routed with no human review" />
        <Stat label="Model agreement" value={k.feedbackCount ? `${k.modelAgreement}%` : "—"} hint={`${k.feedbackCount} agent review${k.feedbackCount === 1 ? "" : "s"}`} href="/review" />
        <Stat label="Helpful AI answers" value={k.answerFeedbackCount ? `${k.helpfulRate}%` : "—"} hint={k.answerFeedbackCount ? `${data.aiFeedback.helpful} of ${k.answerFeedbackCount} votes` : "No AI feedback yet"} />
        <Stat label="AI feedback" value={k.answerFeedbackCount} hint="👍 + 👎 on grounded answers" />
        <Stat label="Needs review" value={k.reviewQueue} tone={k.reviewQueue ? "warn" : "default"} href="/review" />
        <Stat label="Active incidents" value={k.activeIncidents} tone={k.activeIncidents ? "danger" : "default"} href="/incidents" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Ticket volume" description={`Created vs resolved, ${rangeLabel}`} action={<Link href="/tickets" className="text-[12px] font-semibold text-pine-700 underline-offset-4 hover:underline">View tickets</Link>} />
          <div className="px-2 py-4 sm:px-4"><VolumeChart data={data.ticketsOverTime} /></div>
        </Card>
        <Card>
          <CardHeader title="Team workload" description="Open tickets per team (now)" />
          <ul className="divide-y divide-line">
            {data.teamWorkload.map((t) => {
              const max = Math.max(1, ...data.teamWorkload.map((x) => x.open));
              return (
                <li key={t.id} className="px-4 py-2.5 sm:px-5">
                  <div className="flex justify-between text-sm"><span>{t.name}</span><span className="font-mono text-ink-muted">{t.open}</span></div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-verve-sunken"><div className="h-full rounded-full bg-verve-forest dark:bg-verve-lime" style={{ width: `${(t.open / max) * 100}%` }} /></div>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card>
          <CardHeader title="By category" description="As classified by the model" action={<Link href="/tickets" className="text-[12px] font-semibold text-pine-700 underline-offset-4 hover:underline">View tickets</Link>} />
          <div className="p-4"><CategoryChart data={data.byCategory} /></div>
          <div className="flex flex-wrap gap-1.5 border-t border-line px-4 py-2.5">
            {data.byCategory.map((c) => (
              <Link key={c.key} href={`/tickets?category=${c.key}`} className="rounded-full border border-verve-line bg-verve-surface px-2.5 py-1 text-[11.5px] font-medium text-verve-muted transition-colors hover:border-verve-forest/30 hover:bg-verve-soft hover:text-verve-ink">
                {CATEGORY_LABEL[c.key]} <span className="font-mono text-verve-ink">{c.count}</span>
              </Link>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="By priority" description="After business rules" action={<Link href="/tickets?sort=priority" className="text-[12px] font-semibold text-pine-700 underline-offset-4 hover:underline">View tickets</Link>} />
          <div className="p-4"><PriorityChart data={data.byPriority} /></div>
          <div className="flex flex-wrap gap-1.5 border-t border-line px-4 py-2.5">
            {data.byPriority.map((p) => (
              <Link key={p.key} href={`/tickets?priority=${p.key}`} className="rounded-full border border-verve-line bg-verve-surface px-2.5 py-1 text-[11.5px] font-medium text-verve-muted transition-colors hover:border-verve-forest/30 hover:bg-verve-soft hover:text-verve-ink">
                {PRIORITY_LABEL[p.key]} <span className="font-mono text-verve-ink">{p.count}</span>
              </Link>
            ))}
          </div>
        </Card>
        <Card><CardHeader title="Customer sentiment" /><div className="p-4"><SentimentChart data={data.bySentiment} /></div></Card>
        <Card>
          <CardHeader title="AI confidence" description="Triage confidence for analysed tickets" />
          <div className="px-2 py-4 sm:px-4"><ConfidenceChart data={data.aiConfidence} /></div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="AI answer feedback" description={`👍/👎 on grounded answers, ${rangeLabel}`} />
          <div className="grid gap-4 p-4 sm:grid-cols-[1fr_220px]">
            <FeedbackChart data={data.aiFeedback} />
            <div>
              <p className="text-xs font-medium text-ink-soft">Negative feedback reasons</p>
              {feedbackReasons.length ? (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {feedbackReasons.map((r) => (
                    <li key={r.key} className="flex items-center justify-between gap-3">
                      <span className="text-ink-muted">{r.key ? REASON_LABEL[r.key] : "Other"}</span>
                      <span className="font-mono text-ink">{r.count}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-2 text-sm text-ink-muted">No negative feedback in this range.</p>}
              <p className="mt-3 text-xs text-ink-faint">{data.aiFeedback.total ? `${data.aiFeedback.total} vote${data.aiFeedback.total === 1 ? "" : "s"} recorded.` : "Ask a question in the AI assistant and rate the answer to collect feedback."}</p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { user } = useSession();
  const { data, error, isLoading, mutate } = useSWR<Dashboard>("/dashboard", fetcher, { refreshInterval: 30_000 });
  const first = user?.name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Hello, ${first}`}
        description={user?.role === "USER" ? "Here's where your support requests stand." : "Here's what needs attention right now."}
        actions={user?.role === "USER" ? <Link href="/tickets/new"><Button><Plus className="h-4 w-4" />New ticket</Button></Link> : undefined}
      />
      {error ? <Card><ErrorState message={error.message} onRetry={() => mutate()} /></Card>
        : isLoading || !data ? <><StatsSkeleton n={4} /><Card className="mt-6"><SkeletonRows /></Card></>
        : data.role === "USER" ? <UserDashboard d={data} />
        : <><StaffCounts d={data} />{data.role === "ADMIN" ? <AdminAnalytics /> : <AgentQueue d={data} />}</>}
    </>
  );
}
