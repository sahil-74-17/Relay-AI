"use client";
import { CheckCircle2, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { ConfidenceMeter, PriorityBadge } from "@/components/app/badges";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { api, fetcher } from "@/lib/api";
import { CATEGORIES, CATEGORY_LABEL, PRIORITIES, PRIORITY_LABEL, ticketRef, timeAgo } from "@/lib/format";
import type { AiAnalysis, Category, Paginated, Priority, TicketListItem } from "@/lib/types";

type ReviewItem = TicketListItem & { description: string; aiAnalysis: AiAnalysis | null };

function ReviewCard({ t, onDone }: { t: ReviewItem; onDone: () => void }) {
  const toast = useToast();
  const a = t.aiAnalysis ?? {};
  const [category, setCategory] = useState<Category>(t.category ?? "GENERAL");
  const [priority, setPriority] = useState<Priority>(t.priority);
  const [saving, setSaving] = useState<"ACCEPT" | "CORRECT" | null>(null);
  const changed = category !== t.category || priority !== t.priority;
  const scores = a.ml ? (Object.entries(a.ml.category.scores) as [Category, number][]).sort((x, y) => y[1] - x[1]).slice(0, 3) : [];

  const submit = async (action: "ACCEPT" | "CORRECT") => {
    setSaving(action);
    try {
      await api(`/tickets/${t.id}/review`, { method: "POST", body: action === "ACCEPT" ? { action } : { action, category, priority } });
      toast.success(action === "ACCEPT" ? `${ticketRef(t.number)} confirmed and routed` : `${ticketRef(t.number)} corrected and re-routed`);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save the review");
      setSaving(null);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <span className="font-mono">{ticketRef(t.number)}</span><span>{t.createdBy.name}, {timeAgo(t.createdAt)}</span>
            {a.userCategoryHint && <span className="rounded-full bg-paper px-2 py-0.5 ring-1 ring-line">Customer chose {CATEGORY_LABEL[a.userCategoryHint]}</span>}
          </div>
          <Link href={`/tickets/${t.id}`} className="mt-1 block font-medium hover:text-pine-700">{t.title}</Link>
          <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-ink-muted">{t.description}</p>
          {scores.length > 0 && (
            <div className="mt-4 space-y-2.5">
              <p className="text-xs font-medium text-ink-soft">Model's top guesses</p>
              {scores.map(([k, v]) => <ConfidenceMeter key={k} label={CATEGORY_LABEL[k]} value={v} threshold={k === t.category ? a.review?.threshold : undefined} />)}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-line bg-paper/60 p-4 sm:p-5 lg:border-l lg:border-t-0">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <label className="text-xs text-ink-muted">Category
              <Select className="mt-1" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
              </Select>
            </label>
            <label className="text-xs text-ink-muted">Priority
              <Select className="mt-1" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </Select>
            </label>
          </div>
          <p className="text-xs text-ink-muted">Currently <PriorityBadge priority={t.priority} /> {t.category ? CATEGORY_LABEL[t.category] : ""}</p>
          <div className="mt-auto flex gap-2">
            {changed ? (
              <Button className="flex-1" onClick={() => submit("CORRECT")} loading={saving === "CORRECT"} disabled={!!saving}>Save correction</Button>
            ) : (
              <Button className="flex-1" onClick={() => submit("ACCEPT")} loading={saving === "ACCEPT"} disabled={!!saving}><CheckCircle2 className="h-4 w-4" />Confirm prediction</Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function ReviewPage() {
  const [page, setPage] = useState(1);
  const { data, error, isLoading, mutate } = useSWR<Paginated<ReviewItem>>(`/review-queue?page=${page}&pageSize=10`, fetcher);
  return (
    <>
      <PageHeader title="Review queue" description="Tickets where the model's confidence fell below the threshold. Confirming or correcting routes the ticket and saves the decision as training feedback." />
      {error ? <Card><ErrorState message={error.message} onRetry={() => mutate()} /></Card>
        : isLoading || !data ? <div className="space-y-4">{[1, 2].map((i) => <Skeleton key={i} className="h-56" />)}</div>
        : !data.items.length ? <Card><EmptyState icon={ClipboardCheck} title="Nothing to review" description="Every ticket was classified with enough confidence to route automatically." /></Card>
        : (
          <div className="space-y-4">
            {data.items.map((t) => <ReviewCard key={t.id} t={t} onDone={() => mutate()} />)}
            {data.totalPages > 1 && <Card><Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} /></Card>}
          </div>
        )}
    </>
  );
}
