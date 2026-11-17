"use client";
import { clsx } from "clsx";
import { Radar, ScanSearch } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { PriorityBadge } from "@/components/app/badges";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { api, fetcher, qs } from "@/lib/api";
import { CATEGORY_LABEL, INCIDENT_STATUS_LABEL, incidentRef, timeAgo } from "@/lib/format";
import type { Incident, IncidentStatus, Paginated } from "@/lib/types";

const TABS: { value: IncidentStatus | ""; label: string }[] = [
  { value: "", label: "All" }, { value: "OPEN", label: "Open" }, { value: "INVESTIGATING", label: "Investigating" }, { value: "RESOLVED", label: "Resolved" },
];

export default function IncidentsPage() {
  const toast = useToast();
  const [status, setStatus] = useState<IncidentStatus | "">("");
  const [page, setPage] = useState(1);
  const [running, setRunning] = useState(false);
  const { data, error, isLoading, mutate } = useSWR<Paginated<Incident>>(`/incidents${qs({ status, page, pageSize: 15 })}`, fetcher, { refreshInterval: 30_000 });

  const detect = async () => {
    setRunning(true);
    try {
      const r = await api<{ created: number; updated: number; ticketsLinked: number }>("/incidents/detect", { method: "POST" });
      await mutate();
      toast.success(r.created || r.ticketsLinked ? `Detection finished: ${r.created} new, ${r.ticketsLinked} tickets linked` : "Detection finished: no new incidents");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Detection failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Incidents"
        description="Groups of similar tickets that arrived close together, found by comparing ticket embeddings and ticket volume against a normal week. Detection runs automatically after triage and every 5 minutes."
        actions={<Button variant="secondary" onClick={detect} loading={running}><ScanSearch className="h-4 w-4" />Run detection now</Button>}
      />
      <Card>
        <div role="tablist" aria-label="Filter by status" className="flex gap-1.5 overflow-x-auto border-b border-line px-3 py-2.5">
          {TABS.map((t) => (
            <button key={t.value} role="tab" aria-selected={status === t.value} onClick={() => { setStatus(t.value); setPage(1); }}
              className={clsx("whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verve-forest dark:focus-visible:ring-verve-lime", status === t.value ? "bg-verve-forest text-verve-onForest dark:bg-verve-lime dark:text-verve-forest" : "text-ink-muted hover:bg-paper hover:text-ink")}>
              {t.label}
            </button>
          ))}
        </div>
        {error ? <ErrorState message={error.message} onRetry={() => mutate()} />
          : isLoading || !data ? <SkeletonRows />
          : !data.items.length ? <EmptyState icon={Radar} title="No incidents" description="When several similar tickets arrive within the detection window, they'll be grouped here." />
          : (
            <>
              <ul className="divide-y divide-line">
                {data.items.map((i) => (
                  <li key={i.id}>
                    <Link href={`/incidents/${i.id}`} className="flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-paper/70 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                          <span className="font-mono">{incidentRef(i.number)}</span>
                          <span>{CATEGORY_LABEL[i.category]}</span>
                          <span className={clsx("rounded-full px-2 py-0.5 font-semibold", i.status === "RESOLVED" ? "bg-positive-bg text-positive-fg" : i.status === "INVESTIGATING" ? "bg-medium-bg text-medium-fg" : "bg-critical-bg text-critical-fg")}>{INCIDENT_STATUS_LABEL[i.status]}</span>
                        </div>
                        <p className="mt-1 font-medium">{i.title}</p>
                        <p className="mt-0.5 text-sm text-ink-muted">{i.summary}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-4 text-sm sm:flex-col sm:items-end sm:gap-1.5">
                        <PriorityBadge priority={i.severity} />
                        <span className="text-ink-soft">{i._count?.tickets ?? 0} tickets</span>
                        <span className="text-xs text-ink-muted">{timeAgo(i.detectedAt)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
            </>
          )}
      </Card>
    </>
  );
}
