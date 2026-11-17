"use client";
import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import useSWR from "swr";
import { TriageReadout } from "@/components/app/triage-readout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ApiError, api, fetcher } from "@/lib/api";
import { CATEGORIES, CATEGORY_LABEL, ticketRef } from "@/lib/format";
import type { TicketDetail, TicketListItem } from "@/lib/types";

function AnalysisResult({ id }: { id: string }) {
  // Poll until the background triage job has finished.
  const { data } = useSWR<TicketDetail>(`/tickets/${id}`, fetcher, {
    refreshInterval: (d) => (d?.triageStatus === "PENDING" ? 1000 : 0),
  });
  return (
    <Card className="animate-rise-in">
      <CardHeader
        title={data ? <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-pine-600" aria-hidden />Ticket {ticketRef(data.number)} created</span> : "Ticket created"}
        description={data?.triageStatus === "PENDING" ? "Running the ML pipeline: classification, priority, sentiment and similarity search." : "Here's how the AI triaged your request."}
      />
      <div className="px-4 py-4 sm:px-5" aria-live="polite">
        {!data ? <p className="flex items-center gap-2 text-sm text-ink-muted"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Loading…</p> : <TriageReadout ticket={data} />}
      </div>
      <div className="flex flex-col gap-2 border-t border-line px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
        <Link href="/tickets/new" onClick={() => window.location.reload()}><Button variant="secondary" className="w-full">Create another</Button></Link>
        <Link href={`/tickets/${id}`}><Button className="w-full">Open ticket</Button></Link>
      </div>
    </Card>
  );
}

export default function NewTicketPage() {
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState({ title: "", description: "", category: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (form.title.trim().length < 5) local.title = "Use at least 5 characters so the team knows what this is about.";
    if (form.description.trim().length < 10) local.description = "Describe the problem in at least 10 characters.";
    setErrors(local);
    if (Object.keys(local).length) return;
    setSaving(true);
    try {
      const t = await api<TicketListItem>("/tickets", { method: "POST", body: { title: form.title, description: form.description, category: form.category || undefined } });
      setCreatedId(t.id);
      toast.success(`Ticket ${ticketRef(t.number)} created`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setErrors(Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [k, v[0]])));
      } else toast.error(err instanceof Error ? err.message : "Couldn't create the ticket");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New ticket" description="Describe the problem in your own words. The AI picks the category, priority and team." />
      {createdId ? <AnalysisResult id={createdId} /> : (
        <Card>
          <form onSubmit={submit} className="space-y-5 p-4 sm:p-6" noValidate>
            <Field label="Title" error={errors.title}>
              {(p) => <Input {...p} maxLength={200} placeholder="e.g. Payment failed but money was deducted" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />}
            </Field>
            <Field label="Description" error={errors.description} hint="What happened, when it started and what you already tried.">
              {(p) => <Textarea {...p} rows={7} maxLength={10000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />}
            </Field>
            <Field label="Category" optional hint="Leave this to the AI if you're unsure. Your choice is shown to the agent as a hint.">
              {(p) => (
                <Select {...p} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="">Let the AI decide</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                </Select>
              )}
            </Field>
            <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" loading={saving}>Submit ticket</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
