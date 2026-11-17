"use client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import useSWR from "swr";
import { PriorityBadge, StatusBadge } from "@/components/app/badges";
import { Stat } from "@/components/app/stat";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { api, fetcher } from "@/lib/api";
import { CATEGORY_LABEL, dateTime, incidentRef, ticketRef, timeAgo } from "@/lib/format";
import type { IncidentDetail, IncidentStatus } from "@/lib/types";

const NEXT: Record<IncidentStatus, { to: IncidentStatus; label: string }[]> = {
  OPEN: [{ to: "INVESTIGATING", label: "Start investigating" }, { to: "RESOLVED", label: "Mark resolved" }],
  INVESTIGATING: [{ to: "RESOLVED", label: "Mark resolved" }],
  RESOLVED: [{ to: "OPEN", label: "Reopen" }],
};

export default function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { data: i, error, isLoading, mutate } = useSWR<IncidentDetail>(`/incidents/${id}`, fetcher);

  if (error) return <Card><ErrorState message={error.message} onRetry={() => mutate()} /></Card>;
  if (isLoading || !i) return <div className="space-y-4" role="status" aria-label="Loading"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;

  const setStatus = async (status: IncidentStatus) => {
    setBusy(true);
    try {
      await api(`/incidents/${i.id}`, { method: "PATCH", body: { status } });
      await mutate();
      toast.success(`Incident marked ${status.toLowerCase()}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };
  const s = i.signals ?? {};

  return (
    <>
      <Link href="/incidents" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"><ArrowLeft className="h-4 w-4" aria-hidden />Incidents</Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-mono text-ink-muted">{incidentRef(i.number)}</span><PriorityBadge priority={i.severity} /><span className="text-ink-muted">{CATEGORY_LABEL[i.category]}</span></div>
          <h1 className="mt-2 text-[30px] font-semibold leading-[1.1] tracking-[-0.04em] sm:text-[34px]">{i.title}</h1>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink-muted">{i.summary}</p>
        </div>
        <div className="flex gap-2">{NEXT[i.status].map((n) => <Button key={n.to} variant={n.to === "RESOLVED" ? "primary" : "secondary"} onClick={() => setStatus(n.to)} loading={busy}>{n.label}</Button>)}</div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Related tickets", String(i.tickets.length)],
          ["Avg. similarity", s.avgSimilarity ? `${Math.round(s.avgSimilarity * 100)}%` : "Volume only"],
          ["Volume vs normal", s.spikeRatio ? `${s.spikeRatio}×` : "—"],
          ["Detected", timeAgo(i.detectedAt)],
        ].map(([label, value]) => (
          <Stat key={label} label={label} value={value} />
        ))}
      </div>

      <Card>
        <CardHeader title="Related tickets" description={`Grouped within a ${s.windowMinutes ?? 60}-minute window${i.resolvedAt ? `, resolved ${dateTime(i.resolvedAt)}` : ""}`} />
        <ul className="divide-y divide-line">
          {i.tickets.map((t) => (
            <li key={t.id}>
              <Link href={`/tickets/${t.id}`} className="flex flex-col gap-1.5 px-4 py-3 transition-colors hover:bg-paper/70 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                <span className="font-mono text-xs text-ink-muted">{ticketRef(t.number)}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.title}</span>
                <span className="flex items-center gap-2"><StatusBadge status={t.status} /><PriorityBadge priority={t.priority} /></span>
                <span className="text-xs text-ink-muted sm:w-44 sm:text-right sm:whitespace-nowrap">{t.createdBy.name}, {timeAgo(t.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
