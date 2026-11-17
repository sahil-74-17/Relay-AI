"use client";
import { Plus, Search, Ticket } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import useSWR from "swr";
import { TicketList } from "@/components/app/ticket-list";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/states";
import { useDebounce } from "@/hooks/use-debounce";
import { useSession } from "@/hooks/use-session";
import { fetcher, qs } from "@/lib/api";
import { CATEGORIES, CATEGORY_LABEL, PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL } from "@/lib/format";
import type { Paginated, TicketListItem } from "@/lib/types";

const SCOPES = [
  { value: "all", label: "All tickets" },
  { value: "assigned", label: "Assigned to me" },
  { value: "unassigned", label: "Unassigned" },
  { value: "team", label: "My team" },
];

function TicketsView() {
  const { isStaff } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const get = (k: string) => params.get(k) ?? "";
  const [search, setSearch] = useState(get("q"));
  const q = useDebounce(search);

  const setParam = (updates: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(updates)) v ? next.set(k, v) : next.delete(k);
    if (!("page" in updates)) next.delete("page");
    router.replace(`${pathname}?${next}`, { scroll: false });
  };
  useEffect(() => {
    if (q !== get("q")) setParam({ q });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const page = Number(get("page") || 1);
  const key = `/tickets${qs({ q: get("q"), status: get("status"), priority: get("priority"), category: get("category"), scope: isStaff ? get("scope") || "all" : undefined, sort: get("sort") || "newest", page, pageSize: 15 })}`;
  const { data, error, isLoading, mutate } = useSWR<Paginated<TicketListItem>>(key, fetcher, { keepPreviousData: true });
  const filtered = !!(get("q") || get("status") || get("priority") || get("category"));

  return (
    <>
      <PageHeader
        title={isStaff ? "Tickets" : "My tickets"}
        description={isStaff ? "Every ticket, already classified and prioritised by the triage pipeline." : "Track the status of your requests."}
        actions={<Link href="/tickets/new"><Button><Plus className="h-4 w-4" />New ticket</Button></Link>}
      />
      <Card>
        <div className="flex flex-col gap-2.5 border-b border-line p-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 lg:min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
            <Input aria-label="Search tickets" placeholder="Search by title, description or ticket number" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:shrink-0">
            {isStaff && (
              <Select aria-label="Scope" className="lg:w-[148px]" value={get("scope") || "all"} onChange={(e) => setParam({ scope: e.target.value === "all" ? "" : e.target.value })}>
                {SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            )}
            <Select aria-label="Status" className="lg:w-[132px]" value={get("status")} onChange={(e) => setParam({ status: e.target.value })}>
              <option value="">Any status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </Select>
            <Select aria-label="Priority" className="lg:w-[132px]" value={get("priority")} onChange={(e) => setParam({ priority: e.target.value })}>
              <option value="">Any priority</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
            </Select>
            <Select aria-label="Category" className="lg:w-[148px]" value={get("category")} onChange={(e) => setParam({ category: e.target.value })}>
              <option value="">Any category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </Select>
            <Select aria-label="Sort" className="lg:w-[148px]" value={get("sort") || "newest"} onChange={(e) => setParam({ sort: e.target.value })}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="priority">Highest priority</option>
              <option value="due">SLA deadline</option>
            </Select>
          </div>
        </div>
        {error ? <ErrorState message={error.message} onRetry={() => mutate()} />
          : isLoading && !data ? <SkeletonRows rows={8} />
          : !data?.items.length ? (
            filtered
              ? <EmptyState icon={Search} title="No tickets match these filters" description="Try a different search or clear the filters." action={<Button variant="secondary" onClick={() => { setSearch(""); router.replace(pathname); }}>Clear filters</Button>} />
              : <EmptyState icon={Ticket} title="You don't have any tickets yet." description="Raise a ticket and the triage pipeline will route it to the right team." action={<Link href="/tickets/new"><Button><Plus className="h-4 w-4" />Create ticket</Button></Link>} />
          ) : (
            <>
              <TicketList tickets={data.items} showRequester={isStaff} showAssignee={isStaff} staff={isStaff} />
              <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={(p) => setParam({ page: String(p) })} />
            </>
          )}
      </Card>
    </>
  );
}

export default function TicketsPage() {
  return <Suspense><TicketsView /></Suspense>;
}
